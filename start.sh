#!/bin/bash
set -e

# Install Playwright Chromium on first start; skipped on subsequent starts
# because the browser is persisted via the playwright_cache Docker volume.
if [ ! -d "/root/.cache/ms-playwright" ]; then
  echo "=== Installing Playwright Chromium (first run only) ==="
  python -m playwright install chromium
fi

# Build frontend only if not already built (e.g. during Docker build)
if [ ! -d "backend/dist" ]; then
  echo "=== Building frontend ==="
  cd frontend
  npm ci
  npm run build
  cp -r dist ../backend/dist
  cd ..
fi

echo "=== Seeding database ==="
cd backend
python seed.py

echo "=== Starting server ==="
uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
