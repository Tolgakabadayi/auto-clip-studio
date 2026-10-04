#!/usr/bin/env python3
"""
Whisper Word-Level Transcription Worker for AutoClip AI.
Uses faster-whisper with CUDA GPU acceleration if available.
Outputs real-time progress and final JSON with word-level timestamps.
"""

import sys
import json
import os
import argparse
import time

def parse_args():
    parser = argparse.ArgumentParser(description="Transcribe audio with word-level timestamps")
    parser.add_argument("--audio", required=True, help="Path to WAV audio file")
    parser.add_argument("--model", default="small", help="Whisper model size (tiny, base, small, medium, large-v3)")
    parser.add_argument("--language", default=None, help="Spoken language code (e.g., tr, en) or None for auto")
    parser.add_argument("--device", default="auto", help="Compute device (auto, cuda, cpu)")
    parser.add_argument("--output", default=None, help="Output JSON path (optional)")
    return parser.parse_args()

def emit_progress(step: str, percent: float, message: str):
    payload = {
        "type": "progress",
        "step": step,
        "percent": round(percent, 2),
        "message": message,
        "timestamp": time.time()
    }
    print(f"__PROGRESS__{json.dumps(payload)}__PROGRESS__", flush=True)

def main():
    args = parse_args()
    audio_path = os.path.abspath(args.audio)
    
    if not os.path.exists(audio_path):
        print(f"Error: Audio file not found: {audio_path}", file=sys.stderr)
        sys.exit(1)

    emit_progress("init", 5.0, f"Loading Whisper model '{args.model}'...")

    try:
        from faster_whisper import WhisperModel
        import torch

        # Determine device
        if args.device == "auto":
            device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            device = args.device

        compute_type = "float16" if device == "cuda" else "int8"
        
        emit_progress("init", 10.0, f"Running on {device.upper()} ({compute_type})...")
        
        # Load model
        model = WhisperModel(args.model, device=device, compute_type=compute_type)
        
        emit_progress("transcribing", 20.0, "Model loaded. Starting audio transcription...")

        # Transcribe with word timestamps
        segments_generator, info = model.transcribe(
            audio_path,
            beam_size=5,
            word_timestamps=True,
            language=args.language,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500)
        )

        detected_lang = info.language
        duration = info.duration
        emit_progress("transcribing", 25.0, f"Detected language: {detected_lang} (Duration: {duration:.1f}s)")

        segments_data = []
        full_transcript = []

        for segment in segments_generator:
            words_data = []
            if segment.words:
                for w in segment.words:
                    words_data.append({
                        "word": w.word.strip(),
                        "start": round(w.start, 3),
                        "end": round(w.end, 3),
                        "probability": round(w.probability, 3)
                    })

            seg_dict = {
                "id": segment.id,
                "start": round(segment.start, 3),
                "end": round(segment.end, 3),
                "text": segment.text.strip(),
                "words": words_data
            }
            segments_data.append(seg_dict)
            full_transcript.append(segment.text.strip())

            # Calculate progress based on audio duration
            if duration > 0:
                current_percent = 25.0 + min(70.0, (segment.end / duration) * 70.0)
                emit_progress("transcribing", current_percent, f"Transcribing [{segment.end:.1f}s / {duration:.1f}s]")

        emit_progress("transcribing", 95.0, "Consolidating transcript data...")

        result = {
            "language": detected_lang,
            "duration": round(duration, 3),
            "text": " ".join(full_transcript),
            "segments": segments_data
        }

        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            emit_progress("completed", 100.0, f"Transcription saved to {args.output}")

        # Free GPU VRAM so Ollama can take over without VRAM exhaustion / pagefile swapping
        del model
        try:
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                torch.cuda.ipc_collect()
        except Exception:
            pass
        import gc
        gc.collect()

        # Output final result tag
        print(f"__RESULT__{json.dumps(result, ensure_ascii=False)}__RESULT__", flush=True)

    except Exception as e:
        import traceback
        err_msg = f"Transcription error: {str(e)}\n{traceback.format_exc()}"
        print(err_msg, file=sys.stderr)
        emit_progress("error", 0.0, str(e))
        sys.exit(1)

if __name__ == "__main__":
    main()
