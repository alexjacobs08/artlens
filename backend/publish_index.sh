#!/usr/bin/env bash
# Publish data/embeddings.npy + data/metadata.jsonl to the GitHub Release the
# backend image pulls from, then rebuild/redeploy the backend on Railway.
# Requirements: gh (authed), railway CLI, RAILWAY_TOKEN or a linked project.
set -euo pipefail
cd "$(dirname "$0")"

N=$(wc -l < data/metadata.jsonl)
echo "Publishing index with $N works"

gh release view index --repo alexjacobs08/artlens >/dev/null 2>&1 || \
  gh release create index --repo alexjacobs08/artlens \
    --title "Search index artifacts" \
    --notes "embeddings.npy + metadata.jsonl consumed by the backend Docker build. Updated in place."
gh release upload index data/embeddings.npy data/metadata.jsonl \
  --repo alexjacobs08/artlens --clobber

VERSION="$(date +%Y%m%d%H%M%S)-n$N"
railway variables --service backend --set "INDEX_VERSION=$VERSION" >/dev/null
echo "INDEX_VERSION=$VERSION"

# Rebuild+deploy from a clean staging dir (railway up <path> is broken in CLI 4.x).
STAGE=$(mktemp -d)
cp app.py ingest.py requirements.txt Dockerfile railway.json "$STAGE/"
cd "$STAGE"
railway up --ci --service backend
cd - >/dev/null
rm -rf "$STAGE"
echo "Deployed. Verify: curl -s https://backend-production-91b4.up.railway.app/healthz"
