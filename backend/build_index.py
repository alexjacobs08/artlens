"""Offline index builder: fetch public-domain artworks, embed, write artifacts.

Outputs (committed to the repo and baked into the backend image):
  data/embeddings.npy   — N x D float32, L2-normalized (D=768 for ViT-L-14)
  data/metadata.jsonl   — rows aligned to the matrix

Idempotent/resumable: raw images are cached in --cache-dir and ids already
present in an existing metadata.jsonl are skipped, so re-running only
downloads/embeds what's missing.

Usage:
  python build_index.py --n 8000 [--source aic] [--model ViT-L-14 --pretrained laion2b_s32b_b82k]
"""

from __future__ import annotations

import argparse
import io
import json
import logging
import queue
import threading
from pathlib import Path

import httpx
import numpy as np
import torch
from PIL import Image
from tqdm import tqdm

from ingest import SOURCES, USER_AGENT, ArtworkRecord, _get_with_retry

log = logging.getLogger("build_index")

DOWNLOAD_CONCURRENCY = 8  # be a good API citizen
BATCH_SIZE = 16


def load_existing(out_dir: Path) -> tuple[list[dict], np.ndarray | None]:
    meta_path = out_dir / "metadata.jsonl"
    emb_path = out_dir / "embeddings.npy"
    if not meta_path.exists() or not emb_path.exists():
        return [], None
    rows = [json.loads(l) for l in meta_path.read_text().splitlines() if l.strip()]
    emb = np.load(emb_path)
    if len(rows) != emb.shape[0]:
        log.warning("metadata (%d) / embeddings (%d) misaligned; starting fresh",
                    len(rows), emb.shape[0])
        return [], None
    return rows, emb


def download_worker(client: httpx.Client, jobs: queue.Queue, results: queue.Queue,
                    cache_dir: Path):
    while True:
        rec: ArtworkRecord | None = jobs.get()
        if rec is None:
            return
        path = cache_dir / f"{rec.image_id}.jpg"
        try:
            if not path.exists() or path.stat().st_size == 0:
                resp = _get_with_retry(client, rec.image_url)
                path.write_bytes(resp.content)
            results.put((rec, path))
        except Exception as e:
            log.warning("Skipping %s: %s", rec.id, e)
            results.put((rec, None))
        finally:
            jobs.task_done()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=8000)
    ap.add_argument("--source", default="aic", choices=list(SOURCES))
    ap.add_argument("--model", default="ViT-L-14")
    ap.add_argument("--pretrained", default="laion2b_s32b_b82k")
    ap.add_argument("--out-dir", type=Path, default=Path("data"))
    ap.add_argument("--cache-dir", type=Path, default=Path("image_cache"))
    args = ap.parse_args()

    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(name)s %(message)s")
    args.out_dir.mkdir(parents=True, exist_ok=True)
    args.cache_dir.mkdir(parents=True, exist_ok=True)

    import open_clip
    log.info("Loading %s / %s", args.model, args.pretrained)
    model, _, preprocess = open_clip.create_model_and_transforms(
        args.model, pretrained=args.pretrained)
    model.eval()
    torch.set_num_threads(torch.get_num_threads())

    rows, emb = load_existing(args.out_dir)
    done_ids = {r["id"] for r in rows}
    log.info("Resuming with %d already-embedded works", len(rows))

    source = SOURCES[args.source]()
    todo = [r for r in source.iter_records(args.n) if r.id not in done_ids]
    log.info("%d works to download/embed", len(todo))
    if not todo:
        log.info("Nothing to do")
        return

    jobs: queue.Queue = queue.Queue()
    results: queue.Queue = queue.Queue(maxsize=DOWNLOAD_CONCURRENCY * 4)
    client = httpx.Client(headers={"User-Agent": USER_AGENT}, timeout=60.0)
    workers = [threading.Thread(target=download_worker,
                                args=(client, jobs, results, args.cache_dir),
                                daemon=True)
               for _ in range(DOWNLOAD_CONCURRENCY)]
    for w in workers:
        w.start()
    for rec in todo:
        jobs.put(rec)

    new_rows: list[dict] = []
    new_vecs: list[np.ndarray] = []
    batch_imgs: list[torch.Tensor] = []
    batch_recs: list[ArtworkRecord] = []

    def flush_batch():
        if not batch_imgs:
            return
        with torch.no_grad():
            feats = model.encode_image(torch.stack(batch_imgs))
            feats = feats / feats.norm(dim=-1, keepdim=True)
        for rec, vec in zip(batch_recs, feats.cpu().numpy().astype(np.float32)):
            new_rows.append({
                "id": rec.id, "title": rec.title, "artist": rec.artist,
                "date": rec.date, "image_id": rec.image_id, "source": rec.source,
                "thumbnail_url": rec.thumbnail_url, "page_url": rec.page_url,
            })
            new_vecs.append(vec)
        batch_imgs.clear()
        batch_recs.clear()

    def save(final: bool = False):
        if not new_vecs and not final:
            return
        all_rows = rows + new_rows
        stacked = np.stack(new_vecs).astype(np.float32) if new_vecs else \
            np.zeros((0, 768), dtype=np.float32)
        all_emb = np.concatenate([emb, stacked]) if emb is not None else stacked
        np.save(args.out_dir / "embeddings.npy", all_emb)
        with open(args.out_dir / "metadata.jsonl", "w") as f:
            for r in all_rows:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")

    for _ in tqdm(range(len(todo)), desc="embedding", unit="img"):
        rec, path = results.get()
        if path is not None:
            try:
                img = Image.open(io.BytesIO(path.read_bytes())).convert("RGB")
                batch_imgs.append(preprocess(img))
                batch_recs.append(rec)
            except Exception as e:
                log.warning("Bad image for %s: %s", rec.id, e)
        if len(batch_imgs) >= BATCH_SIZE:
            flush_batch()
        if len(new_vecs) and len(new_vecs) % 512 < BATCH_SIZE:
            save()  # periodic checkpoint so interrupts resume cheaply

    flush_batch()
    save(final=True)
    total = len(rows) + len(new_rows)
    log.info("Done: %d embeddings -> %s", total, args.out_dir / "embeddings.npy")


if __name__ == "__main__":
    main()
