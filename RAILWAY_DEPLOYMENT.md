# Railway Deployment Guide: BirdVoice AI

This guide explains how to deploy **BirdVoice AI** to Railway with both **Node.js** and **Python 3 / BirdNET bioacoustic runtime** enabled in the same environment.

---

## 1. Problem & Root Cause

In Railway's default deployment, if a project is deployed without specifying a Dockerfile, Railway uses its Node.js builder/Nixpacks image. Because that image contains only Node.js, the server crashes at startup with:

```text
Error: spawn python3 ENOENT
spawnargs: ['/app/backend/run_inference.py', '--warmup']
```

Furthermore:
- The Python script requires system libraries (`ffmpeg` for audio conversion and `libsndfile1` for audio I/O).
- Railway dynamically assigns an external listening port through the `PORT` environment variable (`0.0.0.0:$PORT`).
- Unhandled `'error'` events on child processes trigger fatal Node.js crashes, leading to an endless restart loop in Railway.

---

## 2. Solution Implemented in Repository

1. **`Dockerfile` (Repository Root)**:
   - Base image: `node:22-bookworm-slim`.
   - Installs system packages: `python3`, `python3-pip`, `python3-venv`, `ffmpeg`, `libsndfile1`, `ca-certificates`.
   - Creates a dedicated virtual environment at `/opt/venv` and prepends `/opt/venv/bin` to `PATH`.
   - Installs Python dependencies from `requirements.txt` (`birdnetlib==0.18.1`, `tflite-runtime==2.14.0`, `numpy==1.26.4`, `scipy`, `soundfile`, `librosa`).
   - Runs `npm install` and `npm run build` to compile the Vite React client into `dist/`.
   - Validates model execution during the build phase (`python3 backend/run_inference.py --warmup`).
   - Sets the default startup command: `CMD ["npm", "start"]`.

2. **`requirements.txt`**:
   - Pinned official dependencies matching the real BirdNET inference runtime.

3. **`railway.json` & `railway.toml`**:
   - Explicitly instructs Railway to use `builder = "DOCKERFILE"` with `dockerfilePath = "Dockerfile"`.
   - Configures `/api/health` as the automated deployment healthcheck.

4. **`nixpacks.toml`**:
   - Dual-runtime configuration (`providers = ["...", "python"]` with `ffmpeg` and `libsndfile`) as a fallback if Nixpacks is selected in the Railway dashboard.

5. **`server.ts`**:
   - **Dynamic Port Resolution**: Binds to `0.0.0.0` using `process.env.PORT` on Railway.
   - **Resilient Python Discovery**: Searches `PYTHON_PATH`, `/opt/venv/bin/python3`, local venvs, and system binaries.
   - **Crash-Proof Process Handling**: Attaches safe `'error'` listeners to all spawned processes. A missing or degraded Python runtime logs actionable diagnostics instead of crashing Node.js into a restart loop.
   - **Honest Failure Handling**: If Python is ever unavailable, live inference requests return an honest HTTP 503 with actionable remediation advice.
   - **Production Diagnostic Probe**: `/api/health` reports status, Python path, version, and dependency check.

---

## 3. How to Commit & Deploy to Railway

### Step 1: Commit and Push All Changes
From your local terminal, commit and push the repository changes to GitHub:

```bash
git add .
git commit -m "fix(railway): configure multi-runtime Dockerfile, requirements.txt, and resilient Python discovery"
git push origin main
```

### Step 2: Verify Settings in Railway Dashboard
In the [Railway Dashboard](https://railway.com):

1. Click on your **BirdVoice AI** service.
2. Go to **Settings** → **Build**:
   - **Builder**: Verify it is set to **`Dockerfile`**.
     *(If it currently says `Nixpacks` or `Railpack`, click it and select **Dockerfile** to ensure Railway uses the multi-runtime container).*
   - **Dockerfile Path**: Ensure it is set to `Dockerfile` (or leave default).
3. Go to **Settings** → **Deploy**:
   - **Start Command**: Set to `npm start` (or leave blank to use the `CMD` in Dockerfile).
   - **Healthcheck Path**: `/api/health`.
   - **Healthcheck Timeout**: `300`.
4. Go to **Settings** → **Networking**:
   - Under **Public Networking**, click **Generate Domain** if you haven't already.

---

## 4. Verification in Production

### 1. Inspect Railway Deploy Logs
During image build and container boot, you should see:

```text
# Docker Build Stage
INFO: Created TensorFlow Lite XNNPACK delegate for CPU.
BirdNetEngine initialized successfully with official BirdNET models.
__BIRDNET_RESULT_JSON_START__
{"success": true, "warmup": true, "version": "BirdNET v2.4 (Cornell Lab of Ornithology & K. Lisa Yang Center for Conservation Bioacoustics)"}

# Application Boot Stage
BirdVoice AI server listening on http://0.0.0.0:xxxx (production)
[BirdVoice AI] Discovered Python runtime: /opt/venv/bin/python3 (Python 3.11.2)
[BirdVoice AI] BirdNET neural model pre-warmed and ready in memory.
```

### 2. Verify Health Endpoint
Open `https://<your-railway-domain>/api/health` in your browser. You will see:

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

### 3. Verify Live Audio Inference
- Open the web application.
- Click any sample (European Robin, Asian Koel, Northern Cardinal) or record via microphone.
- Observe the real Cornell Lab BirdNET predictions, confidence scores, species taxonomy cards, and the STFT spectrogram render in real time.
