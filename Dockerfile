FROM python:3.11-slim

WORKDIR /app

# System libraries required by Chromium at runtime.
# Listed explicitly to avoid 'playwright install-deps' which pulls unavailable
# font packages (ttf-unifont / ttf-***-font-family) on Debian bookworm-slim.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
        libcups2 libdrm2 libdbus-1-3 libxkbcommon0 libgbm1 \
        libx11-6 libxcomposite1 libxdamage1 libxext6 libxfixes3 \
        libxrandr2 libpango-1.0-0 libcairo2 libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps (layer-cached; only reruns when requirements.txt changes)
COPY backend/requirements.txt backend/requirements.txt
RUN pip install -r backend/requirements.txt

# Copy application code
COPY backend/ backend/
COPY database/ database/
COPY start.sh start.sh
COPY frontend/dist backend/dist

CMD ["bash", "start.sh"]
