#!/usr/bin/env python3
"""
CLI runner for BirdNET inference.
Allows running bioacoustic analysis on an audio file and outputting JSON with clean boundaries.
Used by Express server and command-line execution.
"""

import sys
import os
import json
import argparse
import pathlib

# Ensure workspace root is in sys.path
BASE_DIR = pathlib.Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Suppress TensorFlow verbose logging
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

def main():
    parser = argparse.ArgumentParser(description="BirdNET Audio Analyzer CLI")
    parser.add_argument("audio_path", nargs="?", default="", help="Path to input audio file")
    parser.add_argument("--min-confidence", type=float, default=0.05, help="Minimum confidence threshold (0.01-0.99)")
    parser.add_argument("--lat", type=float, default=None, help="Optional latitude")
    parser.add_argument("--lon", type=float, default=None, help="Optional longitude")
    parser.add_argument("--week", type=int, default=None, help="Optional week (1-52)")
    parser.add_argument("--warmup", action="store_true", help="Warmup BirdNET model")
    
    args = parser.parse_args()

    if args.warmup:
        try:
            from backend.birdnet_service import engine
            output = {"success": True, "warmup": True, "version": engine.version}
            print("__BIRDNET_RESULT_JSON_START__")
            print(json.dumps(output))
            print("__BIRDNET_RESULT_JSON_END__")
            sys.exit(0)
        except Exception as e:
            output = {"success": False, "error": str(e)}
            print("__BIRDNET_RESULT_JSON_START__")
            print(json.dumps(output))
            print("__BIRDNET_RESULT_JSON_END__")
            sys.exit(1)
    
    audio_file = pathlib.Path(args.audio_path)
    if not audio_file.is_file():
        output = {"success": False, "error": f"Audio file not found: {args.audio_path}"}
        print("__BIRDNET_RESULT_JSON_START__")
        print(json.dumps(output))
        print("__BIRDNET_RESULT_JSON_END__")
        sys.exit(1)

    try:
        from backend.audio_analyzer import convert_to_standard_wav
        from backend.birdnet_service import engine

        # Convert to standardized 48kHz mono 16-bit WAV using FFmpeg
        import tempfile
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
        tmp.close()
        
        converted = convert_to_standard_wav(str(audio_file), tmp.name, 48000)
        if converted and os.path.exists(tmp.name) and os.path.getsize(tmp.name) > 100:
            wav_path = tmp.name
            is_temp = True
        else:
            wav_path = str(audio_file)
            is_temp = False
            try:
                os.remove(tmp.name)
            except Exception:
                pass

        result = engine.run_inference(
            wav_path,
            min_confidence=args.min_confidence,
            latitude=args.lat,
            longitude=args.lon,
            week=args.week
        )

        if is_temp and os.path.exists(wav_path):
            try:
                os.remove(wav_path)
            except Exception:
                pass

        print("__BIRDNET_RESULT_JSON_START__")
        print(json.dumps(result))
        print("__BIRDNET_RESULT_JSON_END__")
    except Exception as e:
        import traceback
        err_msg = str(e)
        output = {"success": False, "error": err_msg, "trace": traceback.format_exc()}
        print("__BIRDNET_RESULT_JSON_START__")
        print(json.dumps(output))
        print("__BIRDNET_RESULT_JSON_END__")
        sys.exit(1)

if __name__ == "__main__":
    main()
