# ArtLens — fine-art reverse-image search

Upload any image and get back the most visually similar public-domain (CC0)
artworks from the open-access collections of the Art Institute of Chicago,
the Cleveland Museum of Art, and The Metropolitan Museum of Art.

- **Live app:** https://frontend-production-32e9.up.railway.app
- **API:** https://backend-production-91b4.up.railway.app (`POST /search`, `GET /healthz`)

## How it works

```
build_index.py (offline)                      Railway
┌──────────────────────────────┐   ┌────────────────────────────┐
│ AIC public API (CC0 works)   │   │ backend: FastAPI + OpenCLIP │
│  → download IIIF images      │   │  loads embeddings.npy +     │
│  → embed with OpenCLIP       │──▶│  metadata.jsonl at startup  │
│  → embeddings.npy (N×768)    │   │  /search: embed upload,     │
│  → metadata.jsonl            │   │  exact cosine over matrix   │
└──────────────────────────────┘   └────────────▲───────────────┘
     artifacts committed to repo,               │ multipart upload
     baked into the Docker image   ┌────────────┴───────────────┐
                                   │ frontend: React/Vite static │
                                   │ (Caddy), drag-drop upload   │
                                   └────────────────────────────┘
```

- **Model:** OpenCLIP `ViT-L-14` / `laion2b_s32b_b82k` — the *same* weights embed
  both the corpus and every query (mixing models breaks the vector space).
  All embeddings are L2-normalized; similarity is cosine via inner product.
- **Search:** exact brute-force matmul over a float32 matrix — sub-millisecond at
  ~8k vectors. Only consider an ANN index (FAISS/pgvector) beyond ~100k vectors.
- **Corpus:** ~100k public-domain (CC0) works — the
  [Art Institute of Chicago](https://api.artic.edu/docs/) (~61k),
  the [Cleveland Museum of Art](https://openaccess-api.clevelandart.org/) (~41k),
  and a curated slice of
  [The Met](https://metmuseum.github.io/) (paintings-heavy departments).
  None need an API key. Thumbnails are served straight from each museum's
  CDN/IIIF servers; we store no images.
- **Index artifacts** are published as assets on the `index` GitHub Release
  (they outgrow git's 100 MB limit); the backend Docker build downloads them.
  `backend/publish_index.sh` uploads fresh artifacts, bumps the cache-busting
  `INDEX_VERSION` Railway variable, and redeploys.
- **Ingest is pluggable:** `backend/ingest.py` defines a `Source` protocol —
  add Rijksmuseum / Smithsonian / WikiArt by implementing `iter_records()`
  and registering in `SOURCES`.

## Local development

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt

# Build (or rebuild) the index — idempotent and resumable; images are cached
# in image_cache/ and already-embedded ids are skipped on re-run.
python build_index.py --n 8000        # quick single-source build (~1–2 h, 4-core CPU)
python build_index.py --sources aic:61000,cma:41474,met:20000  # full corpus (~15–18 h)

# Run the API
uvicorn app:app --port 8000           # FRONTEND_ORIGIN=... to set CORS origin

# Test
python -m pytest tests/
curl -F "file=@image_cache/<some>.jpg;type=image/jpeg" localhost:8000/search
```

### Frontend

```bash
cd frontend
npm install
VITE_API_URL=http://localhost:8000 npm run dev
```

## Deploying (Railway, from scratch)

1. `railway init -n artlens`
2. `railway add --service backend` and `railway add --service frontend`
3. `railway domain --service backend` / `--service frontend` to mint domains
4. Wire env vars across services:
   - backend: `FRONTEND_ORIGIN=https://<frontend-domain>` (CORS allowlist)
   - frontend: `VITE_API_URL=https://<backend-domain>` (build-time)
5. First deploy: `cd backend && railway up --ci --service backend`, then the
   same from `frontend/` (the CLI's `railway up <path>` form is broken in 4.x —
   run it from inside the directory)
6. Auto-deploy on push: create a project token
   (`projectTokenCreate` via the Railway GraphQL API or dashboard), save it as
   the `RAILWAY_TOKEN` GitHub Actions secret — `.github/workflows/deploy.yml`
   redeploys the service whose directory changed on each push to `main`.

Backend config-as-code lives in `backend/railway.json` (health check on
`/healthz`, generous timeout for the model-loading cold start).

### Notes / gotchas

- The backend image is large (CPU torch ≈ 2 GB + 1.7 GB baked model weights);
  first build and cold start are slow. Weights are downloaded at *build* time
  so restarts don't re-download them.
- ViT-L-14 wants ~2–3 GB RAM resident. If that's painful, the sanctioned
  downgrade is `ViT-B-32` (`CLIP_MODEL`/`CLIP_PRETRAINED` env vars + rebuild the
  index with the same flags — never mix models between index and query).
- The AIC `/artworks/search` endpoint caps at `page*limit ≤ 10000`; the plain
  `/artworks` listing is used instead, filtering `is_public_domain` client-side
  and deduping shared `image_id`s.

## Attribution

Artwork data and images are CC0 from the
[Art Institute of Chicago](https://www.artic.edu/open-access). Each result
links to its artic.edu page; `metadata.jsonl` retains full attribution.
