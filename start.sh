#!/bin/bash
set -e

echo "=== Building frontend ==="
cd frontend
npm ci
npm run build
cp -r dist ../backend/dist
cd ..

echo "=== Seeding database ==="
cd backend
python seed.py

echo "=== Starting server ==="
uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
