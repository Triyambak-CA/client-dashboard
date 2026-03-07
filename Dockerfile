FROM python:3.11-slim

WORKDIR /app

# Install Python deps (layer-cached; only reruns when requirements.txt changes)
COPY backend/requirements.txt backend/requirements.txt
RUN pip install -r backend/requirements.txt

# Copy application code
COPY backend/ backend/
COPY database/ database/
COPY start.sh start.sh
COPY frontend/dist backend/dist

CMD ["bash", "start.sh"]
