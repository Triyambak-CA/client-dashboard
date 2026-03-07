# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python backend
FROM python:3.11-slim

WORKDIR /app

# Install Python deps (layer-cached; only reruns when requirements.txt changes)
COPY backend/requirements.txt backend/requirements.txt
RUN pip install -r backend/requirements.txt

# Copy application code
COPY backend/ backend/
COPY database/ database/
COPY start.sh start.sh

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/frontend/dist backend/dist

CMD ["bash", "start.sh"]
