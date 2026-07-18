#!/usr/bin/env bash
# Build and run the Claw3D preview in a container.
# Usage: bash scripts/preview-container.sh
# Then open: http://localhost:3000/preview
set -euo pipefail

IMAGE="claw3d-preview"
NAME="claw3d-preview"

echo "==> Building image (this runs 'next build' — a few minutes the first time)…"
docker build -t "$IMAGE" .

echo "==> Removing any old container…"
docker rm -f "$NAME" >/dev/null 2>&1 || true

echo "==> Starting container on http://localhost:3000 …"
docker run -d --name "$NAME" -p 3000:3000 "$IMAGE"

echo ""
echo "Preview world:  http://localhost:3000/preview"
echo "(The root '/' still shows the old gateway connect screen — that's expected; it's what we're removing.)"
echo ""
echo "Logs:   docker logs -f $NAME"
echo "Stop:   docker rm -f $NAME"
