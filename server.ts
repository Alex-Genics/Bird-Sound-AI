/**
 * BirdVoice AI - Server Entry Point
 * Express server with Vite middleware integration in dev mode,
 * bioacoustic audio processing endpoints, and real BirdNET model execution.
 */

import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { spawn, spawnSync } from 'child_process';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Port resolution: Railway and production deployments assign dynamic $PORT.
// Development mode in AI Studio binds to 3000 (reverse-proxied by nginx from 8080).
function resolvePort(): number {
  const portArgIdx = process.argv.indexOf('--port');
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    const parsed = parseInt(process.argv[portArgIdx + 1], 10);
    if (!isNaN(parsed)) return parsed;
  }

  // AI Studio development environment has an internal nginx proxy (8080 -> 3000)
  if (process.env.APPLET_ID && process.env.NODE_ENV !== 'production') {
    return 3000;
  }

  // In Railway or production deployments, listen to Railway's assigned PORT
  if (process.env.PORT) {
    const envPort = parseInt(process.env.PORT, 10);
    if (!isNaN(envPort)) return envPort;
  }

  return 3000;
}

const PORT = resolvePort();
const IS_DEV = process.env.NODE_ENV !== 'production';

// -------------------------------------------------------------
// Python Runtime Discovery & Verification
// -------------------------------------------------------------

interface PythonRuntimeInfo {
  executable: string;
  version: string;
  valid: boolean;
  error?: string;
}

let cachedPython: PythonRuntimeInfo | null = null;

function getPythonRuntime(): PythonRuntimeInfo {
  if (cachedPython && cachedPython.valid) {
    return cachedPython;
  }

  const candidates: string[] = [];

  // 1. Explicit user/Railway environment variable configuration
  if (process.env.PYTHON_PATH) candidates.push(process.env.PYTHON_PATH);
  if (process.env.PYTHON_BIN) candidates.push(process.env.PYTHON_BIN);
  if (process.env.PYTHON_EXECUTABLE) candidates.push(process.env.PYTHON_EXECUTABLE);

  // 2. Container virtual environment paths
  candidates.push(
    '/opt/venv/bin/python3',
    '/opt/venv/bin/python3.11',
    '/opt/venv/bin/python',
    path.join(__dirname, '.venv', 'bin', 'python3'),
    path.join(__dirname, '.venv', 'bin', 'python'),
    path.join(__dirname, 'venv', 'bin', 'python3'),
    path.join(__dirname, 'venv', 'bin', 'python')
  );

  // 3. System paths
  candidates.push('python3.11', 'python3', 'python', '/usr/bin/python3.11', '/usr/bin/python3', '/usr/local/bin/python3');

  const uniqueCandidates = Array.from(new Set(candidates.filter(Boolean)));
  const failedAttempts: { path: string; reason: string }[] = [];

  for (const candidate of uniqueCandidates) {
    try {
      if (candidate.includes('/') || candidate.includes('\\')) {
        if (!fs.existsSync(candidate)) {
          failedAttempts.push({ path: candidate, reason: 'File does not exist' });
          continue;
        }
      }

      const proc = spawnSync(candidate, ['-c', 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")'], {
        encoding: 'utf-8',
        timeout: 4000,
      });

      if (proc.status === 0 && proc.stdout) {
        const ver = proc.stdout.trim();
        const major = parseInt(ver.split('.')[0], 10);
        if (major >= 3) {
          cachedPython = {
            executable: candidate,
            version: `Python ${ver}`,
            valid: true,
          };
          console.log(`[BirdVoice AI] Discovered Python runtime: ${candidate} (${cachedPython.version})`);
          return cachedPython;
        }
      } else {
        const err = proc.error?.message || proc.stderr?.trim() || `Exit code ${proc.status}`;
        failedAttempts.push({ path: candidate, reason: err });
      }
    } catch (err: any) {
      failedAttempts.push({ path: candidate, reason: err.message });
    }
  }

  const diagnostics = failedAttempts.map((f) => `  - ${f.path}: ${f.reason}`).join('\n');
  const errorMsg = `No functional Python 3 executable was found. Candidate checks:\n${diagnostics}\n` +
    `Ensure Python 3 is installed in the deployed environment (e.g. via Dockerfile with backend/requirements.txt), or set the PYTHON_PATH environment variable.`;

  console.error(`[BirdVoice AI Error] ${errorMsg}`);
  cachedPython = {
    executable: process.env.PYTHON_PATH || 'python3',
    version: 'Unknown',
    valid: false,
    error: errorMsg,
  };
  return cachedPython;
}

function checkBirdNetDependencies(pythonExec: string): { ready: boolean; error?: string } {
  try {
    const res = spawnSync(pythonExec, ['-c', 'import birdnetlib, numpy, scipy, soundfile; print("OK")'], {
      encoding: 'utf-8',
      timeout: 8000,
    });
    if (res.status === 0 && res.stdout.includes('OK')) {
      return { ready: true };
    }
    return {
      ready: false,
      error: res.stderr?.trim() || res.stdout?.trim() || `Process exited with code ${res.status}`,
    };
  } catch (err: any) {
    return { ready: false, error: err.message };
  }
}

// Pre-warm BirdNET neural model in memory asynchronously
function warmupBirdNetModel() {
  const py = getPythonRuntime();
  if (!py.valid) {
    console.warn(`[BirdVoice AI Warmup Warning] Skipping model warmup: ${py.error || 'Python not available'}`);
    return;
  }

  const pyScript = path.join(__dirname, 'backend', 'run_inference.py');
  if (!fs.existsSync(pyScript)) {
    console.warn(`[BirdVoice AI Warmup Warning] Inference script not found at ${pyScript}`);
    return;
  }

  console.log(`[BirdVoice AI] Pre-warming BirdNET model with ${py.executable}...`);
  try {
    const pyProcess = spawn(py.executable, [pyScript, '--warmup'], {
      cwd: __dirname,
      env: {
        ...process.env,
        TF_CPP_MIN_LOG_LEVEL: '3',
        TF_ENABLE_ONEDNN_OPTS: '0',
      },
    });

    pyProcess.on('error', (err) => {
      console.warn(`[BirdVoice AI Warmup Notice] Model warmup spawn notice: ${err.message}. Live requests will still attempt execution.`);
    });

    pyProcess.on('close', (code) => {
      if (code === 0) {
        console.log('[BirdVoice AI] BirdNET neural model pre-warmed and ready in memory.');
      } else {
        console.warn(`[BirdVoice AI Warmup Notice] Warmup finished with exit code ${code}.`);
      }
    });
  } catch (err: any) {
    console.warn(`[BirdVoice AI Warmup Notice] Failed to start warmup process: ${err.message}`);
  }
}

const app = express();

// Enable CORS for Vercel and cross-origin frontend requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Storage for uploaded audio recordings
const uploadDir = path.join(__dirname, 'tmp_uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.wav';
    const unique = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(wav|mp3|m4a|ogg|flac|webm|aac)$/i;
    if (allowed.test(file.originalname) || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported audio format. Please upload WAV, MP3, M4A, OGG, FLAC, or WEBM.'));
    }
  },
});

// Samples catalog
const SAMPLES = [
  {
    id: 'robin',
    name: 'European Robin (Song)',
    species: 'Erithacus rubecula',
    common_name: 'European Robin',
    duration: 7.0,
    description: 'Rich liquid warble recorded in temperate woodland habitat. Highly territorial song with rapid pitch changes.',
    audio_url: '/api/samples/robin/audio',
    sample_file: 'robin.mp3'
  },
  {
    id: 'cardinal',
    name: 'Northern Cardinal (Whistle)',
    species: 'Cardinalis cardinalis',
    common_name: 'Northern Cardinal',
    duration: 7.0,
    description: 'Clear resonant whistle notes followed by rapid trill recorded in Massachusetts, USA.',
    audio_url: '/api/samples/cardinal/audio',
    sample_file: 'cardinal.mp3'
  },
  {
    id: 'koel',
    name: 'Asian Koel (Breeding Call)',
    species: 'Eudynamys scolopaceus',
    common_name: 'Asian Koel',
    duration: 6.5,
    description: "Loud repetitive 'ko-el' breeding crescendo recorded in tropical canopy.",
    audio_url: '/api/samples/koel/audio',
    sample_file: 'koel.mp3'
  }
];

// Helper: Run Python BirdNET inference script
function runBirdNetInference(
  audioFilePath: string,
  minConfidence = 0.05,
  lat?: number,
  lon?: number,
  week?: number
): Promise<any> {
  return new Promise((resolve, reject) => {
    const py = getPythonRuntime();
    if (!py.valid) {
      return reject(new Error(`Python environment not ready: ${py.error || 'Executable not found'}`));
    }

    const pyScript = path.join(__dirname, 'backend', 'run_inference.py');
    if (!fs.existsSync(pyScript)) {
      return reject(new Error(`Inference runner script not found at ${pyScript}`));
    }

    const args = [pyScript, audioFilePath, '--min-confidence', minConfidence.toString()];
    if (lat !== undefined && !isNaN(lat)) args.push('--lat', lat.toString());
    if (lon !== undefined && !isNaN(lon)) args.push('--lon', lon.toString());
    if (week !== undefined && !isNaN(week)) args.push('--week', week.toString());

    const env = {
      ...process.env,
      TF_CPP_MIN_LOG_LEVEL: '3',
      TF_ENABLE_ONEDNN_OPTS: '0',
    };

    const pyProcess = spawn(py.executable, args, { env, cwd: __dirname });

    let stdoutData = '';
    let stderrData = '';

    pyProcess.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    pyProcess.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    pyProcess.on('close', (code) => {
      const startTag = '__BIRDNET_RESULT_JSON_START__';
      const endTag = '__BIRDNET_RESULT_JSON_END__';
      const sIdx = stdoutData.indexOf(startTag);
      const eIdx = stdoutData.indexOf(endTag);

      let parsed: any = null;
      if (sIdx !== -1 && eIdx !== -1 && eIdx > sIdx) {
        const jsonStr = stdoutData.substring(sIdx + startTag.length, eIdx).trim();
        try {
          parsed = JSON.parse(jsonStr);
        } catch (err: any) {
          console.error('JSON parse error from BirdNET output:', err);
        }
      }

      if (parsed) {
        if (parsed.success === false) {
          reject(new Error(parsed.error || 'BirdNET inference failed'));
        } else {
          resolve(parsed);
        }
      } else {
        const errorMsg = stderrData || stdoutData || `Python exited with code ${code}`;
        reject(new Error(`Failed to parse BirdNET output: ${errorMsg}`));
      }
    });

    pyProcess.on('error', (err) => {
      reject(new Error(`Failed to execute Python process (${py.executable}): ${err.message}`));
    });
  });
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Comprehensive health check for production diagnostics & Railway health monitoring
app.get('/api/health', (_req: Request, res: Response) => {
  const py = getPythonRuntime();
  const dep = py.valid ? checkBirdNetDependencies(py.executable) : { ready: false, error: 'Python unavailable' };
  const isHealthy = py.valid && dep.ready;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    birdnet: true,
    model: 'BirdNET v2.4 (Cornell Lab of Ornithology)',
    species_catalog_count: 6521,
    inference_engine: 'TensorFlow Lite + XNNPACK',
    port: PORT,
    environment: IS_DEV ? 'development' : 'production',
    python: {
      available: py.valid,
      executable: py.executable,
      version: py.version,
      dependencies_installed: dep.ready,
      error: py.error || dep.error,
    },
    audio_formats_supported: ['wav', 'mp3', 'm4a', 'ogg', 'flac', 'webm']
  });
});

// Samples list
app.get('/api/samples', (_req: Request, res: Response) => {
  res.json({ samples: SAMPLES });
});

// Sample audio stream
app.get('/api/samples/:id/audio', (req: Request, res: Response) => {
  const sampleId = req.params.id;
  const sample = SAMPLES.find((s) => s.id === sampleId);
  if (!sample) {
    return res.status(404).json({ error: 'Sample not found' });
  }

  const sampleDir = path.join(__dirname, 'public', 'samples');
  for (const ext of ['mp3', 'wav', 'ogg']) {
    const filePath = path.join(sampleDir, `${sampleId}.${ext}`);
    if (fs.existsSync(filePath)) {
      const mime = ext === 'mp3' ? 'audio/mpeg' : (ext === 'wav' ? 'audio/wav' : 'audio/ogg');
      res.setHeader('Content-Type', mime);
      return fs.createReadStream(filePath).pipe(res);
    }
  }

  res.status(404).json({ error: `Audio file for sample ${sampleId} not found` });
});

// Species information endpoint
app.get('/api/species/:scientificName', async (req: Request, res: Response) => {
  const sciName = decodeURIComponent(req.params.scientificName);
  const commonName = req.query.common_name ? String(req.query.common_name) : undefined;
  
  const py = getPythonRuntime();
  if (!py.valid) {
    return res.json({
      scientific_name: sciName,
      common_name: commonName || sciName,
      description: `Avian vocalizer documented in the BirdNET bioacoustic archive.`
    });
  }

  const pyScript = `
import json, sys
sys.path.insert(0, '${__dirname}')
from backend.species_info import get_species_info
info = get_species_info('${sciName.replace(/'/g, "\\'")}', '${(commonName || sciName).replace(/'/g, "\\'")}')
print(json.dumps(info))
`;
  
  try {
    const pyProcess = spawn(py.executable, ['-c', pyScript], { cwd: __dirname });
    let out = '';
    pyProcess.stdout.on('data', (d) => { out += d.toString(); });
    pyProcess.on('error', (err) => {
      console.warn(`Species info query notice (${err.message})`);
      res.json({
        scientific_name: sciName,
        common_name: commonName || sciName,
        description: `Avian vocalizer documented in the BirdNET bioacoustic archive.`
      });
    });
    pyProcess.on('close', () => {
      try {
        res.json(JSON.parse(out.trim()));
      } catch {
        res.json({
          scientific_name: sciName,
          common_name: commonName || sciName,
          description: `Avian vocalizer documented in the BirdNET bioacoustic archive.`
        });
      }
    });
  } catch {
    res.json({
      scientific_name: sciName,
      common_name: commonName || sciName,
      description: `Avian vocalizer documented in the BirdNET bioacoustic archive.`
    });
  }
});

// Audio analysis endpoint
app.post(
  '/api/analyze',
  (req: Request, res: Response, next) => {
    upload.single('audio')(req, res, (err: any) => {
      if (err) {
        console.error('Multer file upload error:', err);
        return res.status(400).json({
          success: false,
          error: err.message || 'Audio file upload error',
        });
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No audio file provided in request.' });
    }

    const uploadedPath = req.file.path;
    const minConfidence = req.body.min_confidence ? parseFloat(req.body.min_confidence) : 0.05;
    const latitude = req.body.latitude ? parseFloat(req.body.latitude) : undefined;
    const longitude = req.body.longitude ? parseFloat(req.body.longitude) : undefined;
    const week = req.body.week ? parseInt(req.body.week, 10) : undefined;

    try {
      const analysisResult = await runBirdNetInference(
        uploadedPath,
        minConfidence,
        latitude,
        longitude,
        week
      );
      res.json(analysisResult);
    } catch (error: any) {
      console.error('Inference error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error occurred during BirdNET neural analysis',
      });
    } finally {
      // Delete temporary upload safely
      if (fs.existsSync(uploadedPath)) {
        try {
          fs.unlinkSync(uploadedPath);
        } catch (err) {
          console.error('Failed to unlink uploaded temp file:', err);
        }
      }
    }
  }
);

// Fallback for unmatched /api routes - guarantee JSON response, never HTML
app.all('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API endpoint not found' });
});

// API-specific error handler
app.use('/api', (err: any, _req: Request, res: Response, _next: any) => {
  console.error('API Error intercepted:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal API server error',
  });
});

// -------------------------------------------------------------
// Vite Middleware / Static Server
// -------------------------------------------------------------

async function startServer() {
  if (IS_DEV) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BirdVoice AI server listening on http://0.0.0.0:${PORT} (${IS_DEV ? 'development' : 'production'})`);
    
    // Pre-warm BirdNET neural model in memory asynchronously with diagnostic error traps
    setTimeout(warmupBirdNetModel, 150);
  });
}

startServer().catch((err) => {
  console.error('Server startup failure:', err);
  process.exit(1);
});
