# Railway Deployment Guide: BirdVoice AI

This guide explains how to deploy **BirdVoice AI** to Railway with both **Node.js** and **Python 3 / BirdNET bioacoustic runtime** enabled in the same environment.

---

## 1. Problem & Root Cause

In Railway's default Node.js environment (Nixpacks/Buildpack), only Node.js is installed. Because BirdVoice AI executes the Cornell Lab BirdNET neural model via a Python child process (`/app/backend/run_inference.py`), the Node server crashed at startup with:

```text
Error: spawn python3 ENOENT
```

Furthermore:
- The Python script requires system libraries (`ffmpeg` for audio standardization and `libsndfile1` for raw audio I/O).
- Railway dynamically assigns an external listening port through the `PORT` environment variable (`0.0.0.0:$PORT`).

---

## 2. Solution Overview

The repository now contains a complete, containerized multi-runtime deployment:

1. **`Dockerfile`**: Builds a Debian Bookworm image with **Node.js 22**, **Python 3.11**, **FFmpeg**, and **libsndfile1**. It creates a dedicated virtual environment (`/opt/venv`), installs all Python bioacoustics packages, builds the Vite frontend, and validates the BirdNET model during image build.
2. **`requirements.txt`**: Specifies exact dependencies (`birdnetlib==0.18.1`, `tflite-runtime==2.14.0`, `numpy==1.26.4`, `scipy`, `soundfile`, `librosa`).
3. **`railway.json`**: Instructs Railway to use the `DOCKERFILE` builder and configures `/api/health` as the automated health check probe.
4. **`nixpacks.toml`**: Provides an automated fallback if the project is built via Nixpacks.
5. **`server.ts`**:
   - Dynamic port binding: listens on `0.0.0.0` using Railway's `PORT` in production.
   - Resilient Python discovery: dynamically resolves the working Python binary (`PYTHON_PATH`, `/opt/venv/bin/python3`, system `python3`), tests its execution, and attaches error traps so failed processes output actionable diagnostics instead of crashing.
   - Comprehensive `/api/health` diagnostics: provides immediate visibility into Python path, version, and dependency status.

---

## 3. Step-by-Step Railway Setup

### Step A: Connect Repository
1. Log in to [Railway.app](https://railway.com).
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select your `BirdVoice AI` repository.

### Step B: Verify Service Settings
Because `railway.json` and `Dockerfile` are in the repository root, Railway automatically configures the following:
- **Build**:
  - **Builder**: `Dockerfile` (or verify in **Settings** → **Build** → **Builder** is set to `Dockerfile`).
  - **Dockerfile Path**: `Dockerfile`.
- **Deploy**:
  - **Start Command**: `npm start` (or leave default to use `CMD` from Dockerfile).
  - **Healthcheck Path**: `/api/health`.
  - **Healthcheck Timeout**: `300` seconds.

### Step C: Environment Variables (Optional)
Railway automatically provisions `PORT`. The application defaults are preconfigured in the container, but you can set these if desired:

| Variable | Recommended Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Enables production static asset delivery |
| `PYTHON_PATH` | `/opt/venv/bin/python3` | Explicit Python binary path (optional, auto-discovered) |

### Step D: Generate Public Domain
1. In your Railway service, go to **Settings** → **Networking** → **Public Networking**.
2. Click **Generate Domain** (e.g., `birdvoice-ai-production.up.railway.app`).

---

## 4. Verification in Production

### 1. Inspect Railway Deploy Logs
During build and container boot, you should see:
```text
INFO: Created TensorFlow Lite XNNPACK delegate for CPU.
BirdNetEngine initialized successfully with official BirdNET models.
BirdVoice AI server listening on http://0.0.0.0:xxxx (production)
[BirdVoice AI] Discovered Python runtime: /opt/venv/bin/python3 (Python 3.11.2)
[BirdVoice AI] BirdNET neural model pre-warmed and ready in memory.
```

### 2. Verify Health Endpoint
Open `https://<your-railway-domain>/api/health` in your browser. You will receive:

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

### 3. Verify Audio Inference
1. Navigate to the web app in your browser.
2. Click any of the preloaded authentic bird song samples (e.g. *European Robin* or *Northern Cardinal*) or record your microphone.
3. Confirm that the BirdNET classification card, STFT bioacoustic spectrogram, and timeline detections render without error.
