FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

RUN pip install --no-cache-dir -r backend/requirements.txt
RUN cd frontend && npm ci && npm run build && cp -r dist ../backend/dist

CMD ["bash", "start.sh"]
