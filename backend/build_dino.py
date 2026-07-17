"""Second-pass embedder: DINOv2 vectors aligned to the existing CLIP index.

Reads data/metadata.jsonl (built by build_index.py), embeds each row's cached
image with DINOv2 ViT-B/14, and writes data/embeddings_dino.npy with rows
aligned 1:1 to the CLIP matrix. The backend blends the two score spaces at
query time (CLIP = semantic similarity, DINOv2 = visual/structural
similarity) — no re-embedding needed to retune the blend.

Resumable: an existing embeddings_dino.npy is treated as a prefix (rows are
appended in metadata order). Missing cache files are re-downloaded from the
row's thumbnail_url.

Usage: python build_dino.py [--limit N] [--out data/embeddings_dino.npy]
"""

from __future__ import annotations

import argparse
import io
import json
import logging
from pathlib import Path

import httpx
import numpy as np
import torch
from PIL import Image
from torchvision import transforms
from tqdm import tqdm

from ingest import USER_AGENT, _get_with_retry

log = logging.getLogger("build_dino")

BATCH_SIZE = 32
CHECKPOINT_EVERY = 1024

TRANSFORM = transforms.Compose([
    transforms.Resize(256, interpolation=transforms.InterpolationMode.BICUBIC),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
])


def cache_path_for(row: dict, cache_dir: Path) -> Path:
    # Mirrors ingest.ArtworkRecord.cache_key: AIC rows cache by IIIF image_id,
    # everything else by "source_id" (id with ':' -> '_').
    if row["id"].startswith("aic:"):
        return cache_dir / f"{row['image_id']}.jpg"
    return cache_dir / f"{row['id'].replace(':', '_')}.jpg"


def load_image(row: dict, cache_dir: Path, client: httpx.Client) -> Image.Image | None:
    path = cache_path_for(row, cache_dir)
    try:
        if not path.exists() or path.stat().st_size == 0:
            resp = _get_with_retry(client, row["thumbnail_url"])
            path.write_bytes(resp.content)
        return Image.open(io.BytesIO(path.read_bytes())).convert("RGB")
    except Exception as e:
        log.warning("No image for %s: %s", row["id"], e)
        return None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None, help="embed only first N rows (testing)")
    ap.add_argument("--data-dir", type=Path, default=Path("data"))
    ap.add_argument("--cache-dir", type=Path, default=Path("image_cache"))
    ap.add_argument("--out", type=Path, default=None)
    args = ap.parse_args()
    out = args.out or args.data_dir / "embeddings_dino.npy"

    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(name)s %(message)s")
    logging.getLogger("httpx").setLevel(logging.WARNING)

    # Iterate the file (splits on \n only) — .splitlines() also splits on
    # U+2028/NEL etc., which occur inside JSON strings in museum titles.
    with open(args.data_dir / "metadata.jsonl", encoding="utf-8") as f:
        rows = [json.loads(l) for l in f if l.strip()]
    if args.limit:
        rows = rows[: args.limit]

    log.info("Loading DINOv2 ViT-B/14")
    model = torch.hub.load("facebookresearch/dinov2", "dinov2_vitb14")
    model.eval()

    done = 0
    existing = None
    if out.exists():
        existing = np.load(out)
        done = existing.shape[0]
        if done > len(rows):
            raise SystemExit(f"{out} has {done} rows but metadata has {len(rows)} — wrong file?")
    log.info("Resuming at row %d / %d", done, len(rows))

    client = httpx.Client(headers={"User-Agent": USER_AGENT}, timeout=60.0)
    chunks: list[np.ndarray] = [existing] if existing is not None else []
    batch: list[torch.Tensor | None] = []  # None = missing image -> zero vector
    dim = 768
    since_ckpt = 0

    def flush():
        nonlocal since_ckpt
        if not batch:
            return
        vecs = np.zeros((len(batch), dim), dtype=np.float32)
        tensors = [(i, t) for i, t in enumerate(batch) if t is not None]
        if tensors:
            with torch.no_grad():
                feats = model(torch.stack([t for _, t in tensors]))
                feats = feats / feats.norm(dim=-1, keepdim=True)
            for (i, _), v in zip(tensors, feats.cpu().numpy().astype(np.float32)):
                vecs[i] = v
        # Rows with no image stay all-zero: inert in any cosine ranking.
        chunks.append(vecs)
        since_ckpt += len(batch)
        batch.clear()

    def save():
        np.save(out, np.concatenate(chunks) if chunks else np.zeros((0, dim), np.float32))

    for row in tqdm(rows[done:], desc="dino", unit="img", initial=done, total=len(rows)):
        img = load_image(row, args.cache_dir, client)
        batch.append(TRANSFORM(img) if img is not None else None)
        if len(batch) >= BATCH_SIZE:
            flush()
            if since_ckpt >= CHECKPOINT_EVERY:
                save()
                since_ckpt = 0

    flush()
    save()
    final = np.load(out, mmap_mode="r")
    log.info("Done: %s rows -> %s (metadata has %d)", final.shape, out, len(rows))


if __name__ == "__main__":
    main()
