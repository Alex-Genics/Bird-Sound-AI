# Deployment Architecture Guide: BirdVoice AI

This guide explains how to deploy **BirdVoice AI** with clean separation between the **Vercel** frontend and the **Railway** backend runtime.

---

## 1. Architecture Overview

- **Frontend (Vercel)**:
  - React 19 + Vite + TypeScript single-page application.
  - Builds static assets with `vite build` into `dist/`.
  - Communicates with the Railway backend via the `VITE_API_URL` environment variable.
  - Does **not** install or execute Python dependencies (`backend/` and Railway configs are ignored via `.vercelignore`).

- **Backend (Railway)**:
  - Express Node.js 22 API server + Python 3.11 with Cornell Lab BirdNET neural inference engine (`birdnetlib`, `tflite-runtime==2.14.0`, `numpy==1.26.4`, `scipy`, `soundfile`).
  - Pre-warms the BirdNET model into memory upon startup.
  - Binds dynamically to `$PORT` and exposes `/api/health`, `/api/samples`, `/api/analyze`, and `/api/species`.
  - Configured with CORS headers to accept cross-origin requests from the Vercel frontend.

---

## 2. Vercel Frontend Deployment

### Automatic Build Separation
1. Backend files and server scripts are excluded using `.vercelignore`:
   - `backend/`
   - `server.ts`
   - `Dockerfile`, `railway.json`, `railway.toml`, `nixpacks.toml`
2. Python dependencies are located strictly in `backend/requirements.txt` (not the root directory), preventing Vercel from triggering `uv pip install` with incompatible Python 3.14 runtimes.

### Configuring Vercel Environment Variables
In the [Vercel Dashboard](https://vercel.com):
1. Navigate to your project **Settings** → **Environment Variables**.
2. Add:
   - **`VITE_API_URL`**: Your public Railway domain (e.g. `https://bird-sound-ai-production.up.railway.app`).
   > **Important:** Do NOT use the private Railway internal hostname (`.railway.internal`). Internal hostnames are only routable between Railway services on the private mesh network, not by browser clients visiting Vercel.

---

## 3. Railway Backend Deployment

### Container & Runtime Configuration
1. **`Dockerfile` (Repository Root)**:
   - Base image: `node:22-bookworm-slim`.
   - Explicitly installs `python3.11`, `python3.11-venv`, `python3-pip`, `ffmpeg`, `libsndfile1`, and `ca-certificates`.
   - Creates a dedicated virtual environment at `/opt/venv` using Python 3.11.
   - Installs backend dependencies from `backend/requirements.txt` (`birdnetlib==0.18.1`, `tflite-runtime==2.14.0`, `numpy==1.26.4`, `scipy`, `soundfile`, `librosa`).
   - Validates model warmup execution during Docker build (`python3 backend/run_inference.py --warmup`).
   - Starts the server with `CMD ["npm", "start"]`.

2. **`railway.json` & `railway.toml`**:
   - Instructs Railway to use `builder = "DOCKERFILE"` with `dockerfilePath = "Dockerfile"`.
   - Configures `/api/health` as the automated deployment healthcheck.

3. **`server.ts`**:
   - **Dynamic Port Resolution**: Binds to `0.0.0.0` using `process.env.PORT`.
   - **CORS Support**: Permissive CORS middleware for cross-origin requests from Vercel.
   - **Resilient Python Discovery**: Discovers `/opt/venv/bin/python3`, `/opt/venv/bin/python3.11`, and system binaries.
   - **Diagnostic Probe**: `/api/health` reports status, Python path, version, and dependency availability.

### Step-by-Step Railway Setup
1. Push changes to GitHub:
   ```bash
   git add .
   git commit -m "fix(deploy): separate Vercel frontend and Railway multi-runtime backend"
   git push origin main
   ```
2. In the [Railway Dashboard](https://railway.com):
   - Select your service → **Settings** → **Build**:
     - **Builder**: `Dockerfile`
     - **Dockerfile Path**: `Dockerfile`
   - Select **Settings** → **Deploy**:
     - **Healthcheck Path**: `/api/health`
     - **Healthcheck Timeout**: `300`
   - Select **Settings** → **Networking**:
     - Click **Generate Domain** (e.g. `https://your-service.up.railway.app`).
3. Copy the public domain and paste it into Vercel's `VITE_API_URL` environment variable.

---

## 4. Verification in Production

### 1. Railway Deploy Logs
During Docker image build:
```text
INFO: Created TensorFlow Lite XNNPACK delegate for CPU.
BirdNetEngine initialized successfully with official BirdNET models.
__BIRDNET_RESULT_JSON_START__
{"success": true, "warmup": true, "version": "BirdNET v2.4 (Cornell Lab of Ornithology & K. Lisa Yang Center for Conservation Bioacoustics)"}
```
At runtime:
```text
BirdVoice AI server listening on http://0.0.0.0:3000 (production)
[BirdVoice AI] Discovered Python runtime: /opt/venv/bin/python3 (Python 3.11.2)
[BirdVoice AI] BirdNET neural model pre-warmed and ready in memory.
```

### 2. Verify Health Endpoint
Open `https://<your-railway-domain>/api/health`:
```json
{
  "status": "ok",
  "birdnet": true,
  "model": "BirdNET v2.4 (Cornell Lab of Ornithology)",
  "species_catalog_count": 6521,
  "inference_engine": "TensorFlow Lite + XNNPACK",
  "port": 3000,
  "environment": "production",
  "python": {
    "available": true,
    "executable": "/opt/venv/bin/python3",
    "version": "Python 3.11.2",
    "dependencies_installed": true
  },
  "audio_formats_supported": ["wav", "mp3", "m4a", "ogg", "flac", "webm"]
}
```

### 3. Verify Frontend on Vercel
Open your Vercel URL, open DevTools console:
- `[BirdVoice] Checking backend health at: https://<your-railway-domain>/api/health`
- Backend health check PASSED.
- Test sample audio or upload recording → Live Cornell Lab BirdNET inference returns real detected species and STFT spectrogram!
