FROM python:3.12-slim

WORKDIR /app

# CPU-only torch first (its own index), then the rest from PyPI.
RUN pip install --no-cache-dir torch==2.13.0 torchvision==0.28.0 \
    --index-url https://download.pytorch.org/whl/cpu
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Bake model weights into the image so cold starts don't download ~1.7 GB.
ARG CLIP_MODEL=ViT-L-14
ARG CLIP_PRETRAINED=laion2b_s32b_b82k
ENV CLIP_MODEL=${CLIP_MODEL} CLIP_PRETRAINED=${CLIP_PRETRAINED}
RUN python -c "import open_clip, os; open_clip.create_model_and_transforms(os.environ['CLIP_MODEL'], pretrained=os.environ['CLIP_PRETRAINED'])"
RUN python -c "import torch; torch.hub.load('facebookresearch/dinov2', 'dinov2_vitb14')"

COPY app.py ingest.py ./

# Index artifacts are published as GitHub Release assets (too large for git at
# ~100k works). The repo is private, so assets are fetched via the GitHub API
# with GH_TOKEN (Railway service variable, surfaced as a build arg).
# INDEX_VERSION only busts the layer cache — bump it whenever the release
# assets are updated.
ARG INDEX_VERSION=dev
ARG GH_TOKEN
# ARG values are exported into RUN's environment automatically; never inline
# ${GH_TOKEN} into the command line — it would be printed in build logs.
RUN echo "index version: ${INDEX_VERSION}" && python - <<'EOF'
import os
import httpx

repo = "alexjacobs08/artlens"
auth = {"Authorization": f"Bearer {os.environ['GH_TOKEN']}"}
rel = httpx.get(f"https://api.github.com/repos/{repo}/releases/tags/index",
                headers={**auth, "Accept": "application/vnd.github+json"},
                timeout=30)
rel.raise_for_status()
assets = {a["name"]: a["id"] for a in rel.json()["assets"]}
os.makedirs("data", exist_ok=True)
for name, required in (("embeddings.npy", True), ("metadata.jsonl", True),
                       ("embeddings_dino.npy", False)):
    if name not in assets:
        if required:
            raise SystemExit(f"required asset {name} missing from release")
        print(name, "not in release yet — blended search disabled")
        continue
    print("fetching", name)
    # httpx drops the Authorization header on the cross-host redirect to
    # storage, which is exactly what GitHub's asset endpoint requires.
    with httpx.stream("GET",
                      f"https://api.github.com/repos/{repo}/releases/assets/{assets[name]}",
                      headers={**auth, "Accept": "application/octet-stream"},
                      follow_redirects=True, timeout=120) as r:
        r.raise_for_status()
        with open(f"data/{name}", "wb") as f:
            for chunk in r.iter_bytes(1 << 20):
                f.write(chunk)
EOF

# Railway injects PORT.
CMD uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}
