"""Offline index builder: fetch public-domain artworks, embed, write artifacts.

Outputs (published as GitHub Release assets and pulled into the backend image):
  data/embeddings.npy   — N x D float32, L2-normalized (D=768 for ViT-L-14)
  data/metadata.jsonl   — rows aligned to the matrix

Idempotent/resumable: raw images are cached in --cache-dir and ids already
present in an existing metadata.jsonl are skipped, so re-running only
downloads/embeds what's missing.

Usage:
  python build_index.py --sources aic:61000,cma:41000,met:20000
  python build_index.py --n 8000            # single-source shorthand (aic)
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
CHECKPOINT_EVERY = 512


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
        path = cache_dir / f"{rec.cache_key}.jpg"
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


def parse_sources(args) -> list[tuple[str, int]]:
    if args.sources:
        pairs = []
        for part in args.sources.split(","):
            name, _, count = part.strip().partition(":")
            if name not in SOURCES:
                raise SystemExit(f"unknown source {name!r}; known: {list(SOURCES)}")
            pairs.append((name, int(count) if count else args.n))
        return pairs
    return [(args.source, args.n)]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=8000)
    ap.add_argument("--source", default="aic", choices=list(SOURCES))
    ap.add_argument("--sources", default=None,
                    help="comma list of source:count, e.g. aic:61000,cma:41000,met:20000")
    ap.add_argument("--model", default="ViT-L-14")
    ap.add_argument("--pretrained", default="laion2b_s32b_b82k")
    ap.add_argument("--out-dir", type=Path, default=Path("data"))
    ap.add_argument("--cache-dir", type=Path, default=Path("image_cache"))
    args = ap.parse_args()

    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(name)s %(message)s")
    logging.getLogger("httpx").setLevel(logging.WARNING)
    args.out_dir.mkdir(parents=True, exist_ok=True)
    args.cache_dir.mkdir(parents=True, exist_ok=True)
    source_plan = parse_sources(args)

    import open_clip
    log.info("Loading %s / %s", args.model, args.pretrained)
    model, _, preprocess = open_clip.create_model_and_transforms(
        args.model, pretrained=args.pretrained)
    model.eval()
    embed_dim = model.visual.output_dim

    rows, emb = load_existing(args.out_dir)
    done_ids = {r["id"] for r in rows}
    log.info("Resuming with %d already-embedded works", len(rows))

    jobs: queue.Queue = queue.Queue(maxsize=DOWNLOAD_CONCURRENCY * 8)
    results: queue.Queue = queue.Queue(maxsize=DOWNLOAD_CONCURRENCY * 4)
    client = httpx.Client(headers={"User-Agent": USER_AGENT}, timeout=60.0)
    workers = [threading.Thread(target=download_worker,
                                args=(client, jobs, results, args.cache_dir),
                                daemon=True)
               for _ in range(DOWNLOAD_CONCURRENCY)]
    for w in workers:
        w.start()

    # Enumeration streams in a feeder thread: for sources like the Met, finding
    # public-domain works costs one API call per candidate, so it must overlap
    # with download/embed instead of blocking upfront.
    state = {"enqueued": 0}
    feeder_done = threading.Event()

    def feeder():
        try:
            for name, count in source_plan:
                log.info("Enumerating %s (target %d)", name, count)
                src = SOURCES[name]()
                for rec in src.iter_records(count):
                    if rec.id in done_ids:
                        continue
                    jobs.put(rec)  # blocks when queue full — natural throttle
                    state["enqueued"] += 1
        finally:
            feeder_done.set()

    threading.Thread(target=feeder, daemon=True).start()

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

    def save():
        all_rows = rows + new_rows
        stacked = (np.stack(new_vecs).astype(np.float32) if new_vecs
                   else np.zeros((0, embed_dim), dtype=np.float32))
        all_emb = np.concatenate([emb, stacked]) if emb is not None else stacked
        np.save(args.out_dir / "embeddings.npy", all_emb)
        with open(args.out_dir / "metadata.jsonl", "w") as f:
            for r in all_rows:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
        return all_emb.shape[0]

    target = sum(c for _, c in source_plan) - len(rows)
    pbar = tqdm(desc="embedding", unit="img", total=max(target, 0))
    processed = 0
    last_ckpt = 0
    while not (feeder_done.is_set() and processed >= state["enqueued"]):
        try:
            rec, path = results.get(timeout=5)
        except queue.Empty:
            continue
        processed += 1
        pbar.update(1)
        if path is not None:
            try:
                img = Image.open(io.BytesIO(path.read_bytes())).convert("RGB")
                batch_imgs.append(preprocess(img))
                batch_recs.append(rec)
            except Exception as e:
                log.warning("Bad image for %s: %s", rec.id, e)
        if len(batch_imgs) >= BATCH_SIZE:
            flush_batch()
        if len(new_vecs) - last_ckpt >= CHECKPOINT_EVERY:
            save()
            last_ckpt = len(new_vecs)

    flush_batch()
    total = save()
    pbar.close()
    for _ in workers:
        jobs.put(None)
    log.info("Done: %d embeddings -> %s", total, args.out_dir / "embeddings.npy")


if __name__ == "__main__":
    main()
