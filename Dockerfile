# Multi-runtime container for Railway: Node.js 22 + Python 3.11 + BirdNET Neural Engine
FROM node:22-bookworm-slim

# Prevent interactive prompts during apt installs
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    NODE_ENV=production \
    PORT=3000

# Install system dependencies:
# - python3, python3-pip, python3-venv for Python runtime
# - ffmpeg for audio transcoding (WAV, MP3, M4A, OGG, FLAC, WEBM) to 48kHz WAV
# - libsndfile1 for soundfile C audio I/O
# - ca-certificates for secure HTTPS
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    libsndfile1 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Setup Python virtual environment & install Python dependencies (cached layer)
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHON_PATH="/opt/venv/bin/python3"

COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 2. Install Node.js dependencies (cached layer)
COPY package.json ./
RUN npm install

# 3. Copy application source code
COPY . .

# 4. Build client-side assets with Vite
RUN npm run build

# 5. Ensure temp upload directory exists
RUN mkdir -p /app/tmp_uploads && chmod 777 /app/tmp_uploads

# 6. Verify Python BirdNET model runtime during build
RUN python3 backend/run_inference.py --warmup

EXPOSE 3000

# Railway binds to $PORT dynamically
CMD ["npm", "start"]
