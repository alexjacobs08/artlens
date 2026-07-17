#!/usr/bin/env bash
# Overnight orchestrator: wait for the running CLIP build+publish chain, then
# run the DINOv2 pass over the finished corpus and publish everything.
set -uo pipefail
cd "$(dirname "$0")"

echo "$(date -u) waiting for CLIP build/publish chain to finish"
while pgrep -f "build_index.py|publish_index.sh" >/dev/null; do sleep 120; done

# If the CLIP build died mid-run, resume it (idempotent) before the dino pass.
for i in 1 2 3; do
  grep -q "build_index Done:" build_100k.log && break
  echo "$(date -u) CLIP build incomplete — resuming (attempt $i)"
  .venv/bin/python build_index.py --sources aic:61000,cma:41474,met:20000 >> build_100k.log 2>&1
done

echo "$(date -u) starting DINOv2 pass"
for i in 1 2 3; do
  .venv/bin/python build_dino.py > build_dino.log 2>&1 && break
  echo "$(date -u) dino attempt $i failed; retrying in 60s"
  sleep 60
done

echo "$(date -u) publishing full index (CLIP + DINOv2)"
for i in 1 2; do
  ./publish_index.sh > publish_final.log 2>&1 && break
  echo "$(date -u) publish attempt $i failed; retrying in 120s"
  sleep 120
done
echo "$(date -u) orchestrator finished"
