#!/usr/bin/env python3
"""Decode the supplied reference audio once, measure loudness/onsets, and keep
the original bitstream policy for export. No singing synthesis or tempo edits."""
from __future__ import annotations

import hashlib
import json
import math
import os
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
SOURCE = ROOT / "《把回忆拼好给你》.mp4"
SOURCE_SHA = "fa26fc78c5459fae6300e986c73a4fe56eb25de51b2db827257d757202989248"
SR = 22050
FPS = 60


def ffmpeg() -> str:
    if os.environ.get("FFMPEG_PATH"):
        return os.environ["FFMPEG_PATH"]
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


def main() -> None:
    assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == SOURCE_SHA
    ff = ffmpeg()
    audio_dir = HERE / "assets/audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    wav = audio_dir / "reference.wav"
    # Full-rate stereo PCM for browser preview. Export still copies the original AAC.
    subprocess.run([ff, "-v", "error", "-i", str(SOURCE), "-vn", "-ac", "2", "-ar", "44100",
                    "-c:a", "pcm_s16le", "-y", str(wav)], check=True)
    raw = subprocess.check_output([ff, "-v", "error", "-i", str(SOURCE), "-vn", "-ac", "1",
                                   "-ar", str(SR), "-f", "s16le", "-"])
    x = np.frombuffer(raw, dtype="<i2").astype(np.float64) / 32768.0
    hop, win = 368, 1024
    n = max(1, math.ceil(len(x) / hop))
    rms, low, mid, high = [], [], [], []
    window = np.hanning(win)
    for i in range(n):
        a = x[i * hop:i * hop + win]
        if len(a) < win:
            a = np.pad(a, (0, win - len(a)))
        rms.append(float(np.sqrt(np.mean(a * a))))
        spec = np.abs(np.fft.rfft(a * window)) ** 2
        freqs = np.fft.rfftfreq(win, 1 / SR)
        low.append(float(spec[freqs < 250].sum()))
        mid.append(float(spec[(freqs >= 250) & (freqs < 2000)].sum()))
        high.append(float(spec[freqs >= 2000].sum()))
    rms_a = np.array(rms)
    norm = float(rms_a.max()) or 1.0
    bands = np.array([low, mid, high]).T
    bands /= bands.max(axis=0, keepdims=True) + 1e-9
    flux = np.maximum(0, np.diff(rms_a, prepend=rms_a[0]))
    flux += np.maximum(0, np.diff(bands[:, 2], prepend=bands[0, 2])) * 0.05
    threshold = float(flux.mean() + flux.std() * 0.8)
    onsets, last = [], -100
    for i in range(2, len(flux) - 2):
        if flux[i] >= threshold and flux[i] == max(flux[i - 2:i + 3]) and i - last >= 12:
            onsets.append(round(i / FPS, 4))
            last = i
    # Rough tempo only; lyric cuts are locked to the reviewed reference tiles.
    f = flux - flux.mean()
    corr = np.correlate(f, f, mode="full")[len(f) - 1:]
    lo, hi = int(FPS * 60 / 150), int(FPS * 60 / 70)
    lag = lo + int(np.argmax(corr[lo:hi]))
    bpm = round(60 * FPS / lag, 2)
    features = {
        "sourceSha256": SOURCE_SHA,
        "sampleRate": SR, "featureFps": FPS,
        "decodedMonoSamples": len(x),
        "decodedMonoDuration": round(len(x) / SR, 6),
        "previewWav": "assets/audio/reference.wav",
        "exportAudioPolicy": "copy original AAC bitstream from source MP4",
        "bpmEstimate": bpm,
        "bpmIsGroundTruth": False,
        "onsets": onsets,
        "rms": [round(v / norm, 4) for v in rms],
        "low": [round(v, 4) for v in bands[:, 0]],
        "mid": [round(v, 4) for v in bands[:, 1]],
        "high": [round(v, 4) for v in bands[:, 2]],
    }
    (HERE / "data/audio_features.json").write_text(json.dumps(features, ensure_ascii=False, indent=2) + "\n")
    print(f"audio {len(x)/SR:.3}s mono / preview wav {wav.stat().st_size/1048576:.2f} MiB / bpm estimate {bpm}")


if __name__ == "__main__":
    main()
