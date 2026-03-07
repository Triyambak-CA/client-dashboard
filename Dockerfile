FROM python:3.11-slim

WORKDIR /app

# Install Python deps first (cached unless requirements.txt changes)
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt \
    && python -m playwright install-deps chromium \
    && python -m playwright install chromium

# Copy backend source
COPY backend/ backend/
# Copy database schema + migrations (used by seed.py on startup)
COPY database/ database/
COPY start.sh start.sh

# Copy pre-built frontend dist (built on VM before docker build)
COPY frontend/dist backend/dist

CMD ["bash", "start.sh"]
