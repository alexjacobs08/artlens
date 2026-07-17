"""API tests using a stub embedder + tiny fixture index (no model download)."""

import io
import json

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

import app as app_module


def make_png(color, size=(32, 32)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture()
def client(monkeypatch):
    rng = np.random.default_rng(0)
    emb = rng.normal(size=(10, 768)).astype(np.float32)
    emb /= np.linalg.norm(emb, axis=1, keepdims=True)
    meta = [{"id": f"aic:{i}", "title": f"Work {i}", "artist": f"Artist {i}",
             "date": "1900", "image_id": f"img{i}", "source": "AIC",
             "thumbnail_url": f"https://x/{i}.jpg", "page_url": f"https://x/{i}"}
            for i in range(10)]
    app_module.state.update(embeddings=emb, metadata=meta)

    # Stub: red image embeds exactly to index vector 3, else vector far away.
    def fake_embed(img):
        if img.getpixel((0, 0))[0] > 200:
            return emb[3]
        return -emb[3]

    monkeypatch.setattr(app_module, "embed_image", fake_embed)
    # No context manager: keeps startup lifespan (real model load) from running.
    yield TestClient(app_module.app)


def test_healthz(client):
    r = client.get("/healthz")
    assert r.status_code == 200


def test_self_match_top1(client):
    r = client.post("/search", files={"file": ("q.png", make_png((255, 0, 0)), "image/png")},
                    data={"k": "3"})
    assert r.status_code == 200
    results = r.json()["results"]
    assert len(results) == 3
    assert results[0]["title"] == "Work 3"
    assert results[0]["score"] > 0.99
    assert set(results[0]) == {"score", "title", "artist", "date", "page_url", "thumbnail_url"}


def test_rejects_bad_type(client):
    r = client.post("/search", files={"file": ("q.txt", b"hello", "text/plain")})
    assert r.status_code == 415


def test_rejects_undecodable(client):
    r = client.post("/search", files={"file": ("q.png", b"notanimage", "image/png")})
    assert r.status_code == 400


def test_rejects_oversize(client):
    big = b"\x00" * (10 * 1024 * 1024 + 10)
    r = client.post("/search", files={"file": ("q.png", big, "image/png")})
    assert r.status_code == 413
