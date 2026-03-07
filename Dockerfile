FROM mcr.microsoft.com/playwright/python:v1.49.0-jammy

WORKDIR /app

# Install Python deps (Playwright + Chromium already baked into base image)
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source
COPY backend/ backend/
# Copy database schema + migrations (used by seed.py on startup)
COPY database/ database/
COPY start.sh start.sh

# Copy pre-built frontend dist (built on VM before docker build)
COPY frontend/dist backend/dist

CMD ["bash", "start.sh"]
