"""
Audio preprocessing and acoustic feature extraction for BirdVoice AI.
Handles standardizing audio formats, calculating bioacoustic metrics,
and computing true Short-Time Fourier Transform (STFT) spectrogram matrices.
"""

import os
import subprocess
import numpy as np
import soundfile as sf
from scipy import signal
from typing import Dict, Any

def convert_to_standard_wav(input_path: str, output_path: str, sample_rate: int = 48000) -> bool:
    """
    Converts any supported audio format (WAV, MP3, M4A, OGG, FLAC, WEBM)
    into a standardized single-channel 48kHz 16-bit WAV file using FFmpeg.
    """
    cmd = [
        "ffmpeg",
        "-y",
        "-i", input_path,
        "-ac", "1",
        "-ar", str(sample_rate),
        "-c:a", "pcm_s16le",
        output_path
    ]
    try:
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return True
    except Exception as e:
        print(f"FFmpeg conversion error: {e}")
        return False

def compute_spectrogram(audio_path: str, max_freq_hz: int = 12000, n_time_bins: int = 250, n_freq_bins: int = 80) -> Dict[str, Any]:
    """
    Computes a true bioacoustic spectrogram from the audio file using Scipy STFT.
    Returns downsampled 2D intensity matrix (0.0 to 1.0) along with time and frequency axes.
    """
    try:
        data, sr = sf.read(audio_path)
        if data.ndim > 1:
            data = data.mean(axis=1)
        
        duration = float(len(data) / sr)
        if duration < 0.1:
            return {
                "duration": round(duration, 2),
                "sample_rate": sr,
                "rms": 0.0,
                "peak": 0.0,
                "time_bins": 0,
                "freq_bins": 0,
                "max_frequency_khz": 12.0,
                "grid": []
            }
        
        rms = float(np.sqrt(np.mean(data**2)))
        peak = float(np.max(np.abs(data)))
        
        nperseg = min(1024, len(data))
        noverlap = nperseg // 2
        f, t, Sxx = signal.spectrogram(data, fs=sr, window='hann', nperseg=nperseg, noverlap=noverlap, scaling='density')
        
        freq_mask = f <= max_freq_hz
        Sxx_filtered = Sxx[freq_mask, :]
        
        log_spec = 10 * np.log10(Sxx_filtered + 1e-10)
        min_db = -80.0
        max_db = 0.0
        norm_spec = np.clip((log_spec - min_db) / (max_db - min_db), 0.0, 1.0)
        
        spec_flipped = np.flipud(norm_spec)
        
        from scipy.ndimage import zoom
        orig_h, orig_w = spec_flipped.shape
        zoom_y = n_freq_bins / max(1, orig_h)
        zoom_x = n_time_bins / max(1, orig_w)
        
        downsampled = zoom(spec_flipped, (zoom_y, zoom_x), order=1)
        downsampled = np.clip(downsampled, 0.0, 1.0)
        
        grid = np.round(downsampled, 2).tolist()
        
        return {
            "duration": round(duration, 2),
            "sample_rate": sr,
            "rms": round(rms, 4),
            "peak": round(peak, 4),
            "time_bins": n_time_bins,
            "freq_bins": n_freq_bins,
            "max_frequency_khz": round(max_freq_hz / 1000.0, 1),
            "grid": grid
        }
    except Exception as e:
        print(f"Spectrogram calculation notice: {e}")
        return {
            "duration": 0.0,
            "sample_rate": 48000,
            "rms": 0.0,
            "peak": 0.0,
            "time_bins": 0,
            "freq_bins": 0,
            "max_frequency_khz": 12.0,
            "grid": []
        }
