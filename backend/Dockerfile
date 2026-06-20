# ── FastAPI backend with Docling + GLiNER2 ─────────────────────────────────
# Layer order: deps first (cached) → code last (changes often)
# Build:  docker build -t smart-dossier-backend .
# Run:    docker run -p 8000:8000 --env-file .env smart-dossier-backend

FROM python:3.11-slim

WORKDIR /app

# System deps — rarely changes, cached after first build
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ \
    libpq-dev \
    poppler-utils \
    tesseract-ocr \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Python deps — only re-installs when requirements.txt changes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Code — changes most often, last layer
COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
