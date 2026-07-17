"""ArtLens search API.

Loads the OpenCLIP model and the prebuilt index (embeddings.npy +
metadata.jsonl, baked into the image) once at startup. Search is exact
brute-force cosine over the float32 matrix — at ~8k vectors this is
sub-millisecond. If the corpus ever exceeds ~100k vectors, swap the
matmul in `search()` for an ANN index (FAISS/pgvector); that is the
only seam that needs to change.
"""

from __future__ import annotations

import io
import json
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

import numpy as np
import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

log = logging.getLogger("artlens")
logging.basicConfig(level=logging.INFO)

MODEL_NAME = os.environ.get("CLIP_MODEL", "ViT-L-14")
PRETRAINED = os.environ.get("CLIP_PRETRAINED", "laion2b_s32b_b82k")
DATA_DIR = Path(os.environ.get("DATA_DIR", "data"))
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/tiff"}

state: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    import open_clip

    # Containers report the host's core count; without a cap torch oversubscribes
    # threads against the cgroup CPU quota and inference slows to a crawl.
    threads = int(os.environ.get("TORCH_THREADS", "4"))
    torch.set_num_threads(threads)
    torch.set_num_interop_threads(1)
    log.info("torch threads=%d (host reports %s cpus)", threads, os.cpu_count())

    log.info("Loading model %s/%s ...", MODEL_NAME, PRETRAINED)
    model, _, preprocess = open_clip.create_model_and_transforms(
        MODEL_NAME, pretrained=PRETRAINED)
    model.eval()
    embeddings = np.load(DATA_DIR / "embeddings.npy")
    metadata = [json.loads(l) for l in
                (DATA_DIR / "metadata.jsonl").read_text().splitlines() if l.strip()]
    assert embeddings.shape[0] == len(metadata), "index artifacts misaligned"
    state.update(model=model, preprocess=preprocess,
                 embeddings=embeddings, metadata=metadata)
    import time
    t0 = time.monotonic()
    embed_image(Image.new("RGB", (224, 224)))  # warm up kernels/allocator
    log.info("Ready: %d artworks indexed; warmup inference %.2fs",
             len(metadata), time.monotonic() - t0)
    yield
    state.clear()


app = FastAPI(title="ArtLens", lifespan=lifespan)

frontend_origin = os.environ.get("FRONTEND_ORIGIN")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in frontend_origin.split(",")] if frontend_origin
    else ["http://localhost:5173"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.get("/healthz")
def healthz():
    return {"ok": True, "indexed": len(state.get("metadata", []))}


def embed_image(img: Image.Image) -> np.ndarray:
    tensor = state["preprocess"](img).unsqueeze(0)
    with torch.no_grad():
        feat = state["model"].encode_image(tensor)
        feat = feat / feat.norm(dim=-1, keepdim=True)
    return feat[0].cpu().numpy().astype(np.float32)


@app.post("/search")
async def search(file: UploadFile = File(...), k: int = Form(8)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(415, f"Unsupported file type: {file.content_type}")
    raw = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Image too large (max 10 MB)")
    try:
        img = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception:
        raise HTTPException(400, "Could not decode image")

    k = max(1, min(int(k), 50))
    q = embed_image(img)
    scores = state["embeddings"] @ q  # cosine: both sides L2-normalized
    top = np.argsort(-scores)[:k]
    return {"results": [
        {
            "score": round(float(scores[i]), 4),
            "title": state["metadata"][i]["title"],
            "artist": state["metadata"][i]["artist"],
            "date": state["metadata"][i]["date"],
            "page_url": state["metadata"][i]["page_url"],
            # Rows indexed before THUMB_WIDTH went 200->600 still carry 200px
            # IIIF urls; upgrade at serve time so old artifacts render sharp.
            "thumbnail_url": state["metadata"][i]["thumbnail_url"].replace(
                "/full/200,/", "/full/600,/"),
            "source": state["metadata"][i].get("source", ""),
        }
        for i in top
    ]}
