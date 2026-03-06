FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (cached unless requirements.txt changes)
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Install Node deps (cached unless package-lock.json changes)
COPY frontend/package.json frontend/package-lock.json frontend/
RUN cd frontend && npm ci

# Copy rest of source and build
COPY . .
RUN cd frontend && npm run build && cp -r dist ../backend/dist

CMD ["bash", "start.sh"]
