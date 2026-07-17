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

COPY app.py ingest.py ./

# Index artifacts are published as GitHub Release assets (too large for git at
# ~100k works). INDEX_VERSION only busts the layer cache — bump it (Railway
# service variable) whenever the release assets are updated.
ARG INDEX_BASE_URL=https://github.com/alexjacobs08/artlens/releases/download/index
ARG INDEX_VERSION=dev
RUN echo "index version: ${INDEX_VERSION}" && python - <<EOF
import os, urllib.request
base = "${INDEX_BASE_URL}"
os.makedirs("data", exist_ok=True)
for name in ("embeddings.npy", "metadata.jsonl"):
    print("fetching", name)
    urllib.request.urlretrieve(f"{base}/{name}", f"data/{name}")
EOF

# Railway injects PORT.
CMD uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}
