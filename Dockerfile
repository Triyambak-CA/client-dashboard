FROM python:3.11-slim

WORKDIR /app

# Install Chromium system dependencies manually.
# 'playwright install-deps chromium' fails on slim images (ttf-unifont /
# ttf-***-font-family are unavailable). These packages cover everything
# headless Chromium needs for network-only operation (no display, no fonts).
RUN apt-get update && apt-get install -y --no-install-recommends \
        libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
        libcups2 libdrm2 libdbus-1-3 libxkbcommon0 libgbm1 \
        libx11-6 libxcomposite1 libxdamage1 libxext6 libxfixes3 \
        libxrandr2 libpango-1.0-0 libcairo2 libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps + Playwright Chromium binary
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt \
    && python -m playwright install chromium

# Copy backend source
COPY backend/ backend/
# Copy database schema + migrations (used by seed.py on startup)
COPY database/ database/
COPY start.sh start.sh

# Copy pre-built frontend dist (built on VM before docker build)
COPY frontend/dist backend/dist

CMD ["bash", "start.sh"]
