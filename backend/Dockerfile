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
COPY data/ data/

# Railway injects PORT.
CMD uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}
