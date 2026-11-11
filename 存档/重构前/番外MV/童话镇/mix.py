#!/usr/bin/env python3
"""Mix the original 48 kHz song with restrained, frame-aligned storybook SFX and export SRT."""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from scipy.io import wavfile

OPUSCAR = Path(os.environ.get("LEMO_OPUSCAR", "/home/user/lemo-opuscar"))
sys.path.insert(0, str(OPUSCAR / "core" / "audio"))
import sfx  # noqa: E402

SR = sfx.SR
HERE = Path(__file__).resolve().parent
REF_MP4 = HERE.parent.parent / "童话镇.mp4"
TIMELINE = HERE / "src" / "timeline.js"


def pulse(freq: float, dur: float, duty: float = 0.25, vol: float = 0.45, sweep: float = 0.0) -> np.ndarray:
    tt = sfx.t_(dur)
    f = freq * (1.0 + sweep * (tt / max(dur, 1e-4)))
    phase = (np.cumsum(f) / SR) % 1.0
    wave = np.where(phase < duty, 1.0, -1.0)
    env = np.minimum(1.0, tt / 0.004) * np.exp(-tt / max(0.03, dur * 0.65))
    return wave * env * vol


def arp(notes, step_d: float = 0.055, duty: float = 0.25, vol: float = 0.42) -> np.ndarray:
    parts = [pulse(float(freq), step_d * 1.35, duty=duty, vol=vol) for freq in notes]
    out = np.zeros(int(round((len(notes) * step_d + 0.12) * SR)), dtype=np.float32)
    for i, part in enumerate(parts):
        start = int(round(i * step_d * SR))
        end = min(len(out), start + len(part))
        out[start:end] += part[: end - start]
    return out


def layer(*parts: np.ndarray) -> np.ndarray:
    """Sum one-shots of different durations without truncating any tail."""
    n = max((len(part) for part in parts), default=0)
    out = np.zeros(n, dtype=np.float32)
    for part in parts:
        out[:len(part)] += part.astype(np.float32, copy=False)
    return out


def synth_event(ev: dict) -> tuple[np.ndarray, float]:
    """Small 16-bit foley/chime palette; gain is kept low under the original vocal."""
    kind = ev["type"]
    if kind == "footstep":
        return sfx.step(0.34), -0.08
    if kind == "jump_sparkle":
        return arp([587.33, 783.99, 1046.5, 1567.98], 0.045, 0.25, 0.46), 0.0
    if kind in {"shimmer", "pixie_dust", "glass_sparkle"}:
        notes = [880, 1174.66, 1567.98] if kind != "glass_sparkle" else [1046.5, 1318.51, 1760]
        return layer(arp(notes, 0.055, 0.5, 0.35), sfx.ding(0.18)[: int(0.24 * SR)]), 0.12
    if kind in {"book_open", "cloak_whoosh", "dragon_wing", "waterfall_rush"}:
        dur = {"book_open": 0.42, "cloak_whoosh": 0.52, "dragon_wing": 0.36, "waterfall_rush": 0.72}[kind]
        vol = 0.42 if kind == "waterfall_rush" else 0.34
        whoosh = sfx.whoosh(dur, vol)
        if kind == "book_open":
            click = sfx.click(0.4, 0.18)
            n = min(len(whoosh), len(click), int(0.16 * SR))
            whoosh[:n] += click[:n]
        return whoosh, -0.05 if kind == "cloak_whoosh" else 0.0
    if kind in {"water_chime", "market_bell", "heart_chime", "clock_bell", "lantern_glow", "mirror_chime", "star_connect"}:
        scales = {
            "water_chime": [659.25, 880, 1318.51],
            "market_bell": [783.99, 1046.5, 1567.98],
            "heart_chime": [659.25, 830.61, 987.77, 1318.51],
            "clock_bell": [880, 1174.66, 1396.91],
            "lantern_glow": [523.25, 783.99, 1046.5],
            "mirror_chime": [587.33, 880, 1174.66],
            "star_connect": [987.77, 1318.51, 1760],
        }
        return layer(arp(scales[kind], 0.06, 0.5, 0.36), sfx.ding(0.12)[: int(0.22 * SR)]), 0.08
    if kind in {"boat_ripple", "water_splash", "water_dive", "bubble_rise", "foam_burst"}:
        if kind == "water_dive":
            pop = sfx.pop(0.3)
            sig = layer(sfx.whoosh(0.38, 0.34), np.pad(pop, (0, max(0, int(0.38 * SR) - len(pop))))[: int(0.38 * SR)])
            return sig, -0.2
        if kind == "water_splash" or kind == "foam_burst":
            pop = sfx.pop(0.42)
            return layer(pop, sfx.whoosh(0.22, 0.22)[:len(pop)]), 0.12
        return layer(arp([523.25, 659.25, 880], 0.06, 0.5, 0.22), sfx.pop(0.20)[: int(0.18 * SR)]), -0.18
    if kind in {"music_box", "harp_gliss", "rainbow_arp"}:
        if kind == "music_box":
            notes = [1046.5, 1318.51, 1567.98, 1318.51]
            step = 0.075
        elif kind == "harp_gliss":
            notes = [523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98]
            step = 0.042
        else:
            notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98]
            step = 0.05
        return arp(notes, step, 0.5, 0.30), 0.16
    if kind in {"forest_rustle", "tiger_dash", "gear_turn", "gate_open"}:
        if kind == "forest_rustle": return sfx.whoosh(0.29, 0.24), -0.12
        if kind == "tiger_dash": return layer(sfx.whoosh(0.22, 0.42), sfx.thump(0.18, 85)), -0.08
        if kind == "gear_turn": return layer(sfx.clack(0.52, 0.38), sfx.creak(0.22)), 0.08
        return sfx.creak(0.48), 0.05
    if kind in {"wolf_glint", "sunbird_flare", "swan_magic", "rainbow_arp"}:
        if kind == "wolf_glint": return arp([392, 587.33, 783.99], 0.07, 0.125, 0.32), -0.2
        if kind == "sunbird_flare": return arp([659.25, 880, 1174.66, 1760], 0.055, 0.5, 0.4), 0.0
        if kind == "swan_magic": return arp([783.99, 987.77, 1318.51, 1567.98], 0.06, 0.5, 0.35), 0.1
    if kind in {"teacup_clink", "puppet_click", "clock_tick", "page_chime"}:
        if kind == "teacup_clink": return layer(sfx.clack(0.72, 0.32), sfx.ding(0.15)[: int(0.15 * SR)]), 0.18
        if kind == "puppet_click": return sfx.click(0.82, 0.34), -0.08
        if kind == "clock_tick": return pulse(1760, 0.038, 0.5, 0.16), 0.0
        return arp([880, 1174.66], 0.045, 0.5, 0.28), 0.0
    if kind in {"candy_pop", "chest_open"}:
        if kind == "candy_pop": return layer(sfx.pop(0.42), arp([880, 1318.51], 0.045, 0.5, 0.2)), 0.12
        return layer(sfx.creak(0.26), arp([523.25, 659.25, 987.77], 0.05, 0.5, 0.32)), 0.15
    if kind == "cloak_whoosh": return sfx.whoosh(0.5, 0.36), -0.15
    if kind == "book_close": return layer(sfx.thump(0.48, 54), sfx.click(0.28, 0.18)), 0.0
    return sfx.click(0.8, 0.18), 0.0


def load_events() -> dict:
    event_file = HERE / "events.json"
    if event_file.exists():
        return json.loads(event_file.read_text(encoding="utf-8"))
    text = TIMELINE.read_text(encoding="utf-8")
    dur_match = re.search(r"export const DUR\s*=\s*([0-9.]+)", text)
    block = text.split("export const EV = [", 1)[1].split("];", 1)[0]
    events = []
    for entry in re.findall(r"\{([^{}]+)\}", block):
        tm = re.search(r"\bt:\s*([0-9.]+)", entry)
        typ = re.search(r"\btype:\s*'([^']+)'", entry)
        if not tm or not typ:
            continue
        event = {"t": float(tm.group(1)), "type": typ.group(1)}
        step = re.search(r"\bstep:\s*([0-9.]+)", entry)
        if step:
            event["step"] = float(step.group(1))
        events.append(event)
    if not dur_match:
        raise RuntimeError("Could not read DUR from src/timeline.js")
    return {"dur": float(dur_match.group(1)), "ev": events}


def export_srt() -> Path:
    tl_text = TIMELINE.read_text(encoding="utf-8")
    subs_block = tl_text.split("export const SUBS = [", 1)[1].split("];", 1)[0]
    pattern = re.compile(r"t0:\s*([0-9.]+),\s*t1:\s*([0-9.]+),\s*speaker:\s*'[^']+',\s*text:\s*'([^']+)'")
    cues = [{"t0": float(m.group(1)), "t1": float(m.group(2)), "text": m.group(3)} for m in pattern.finditer(subs_block)]
    if not cues:
        raise RuntimeError("No subtitle cues found in src/timeline.js")
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as tf:
        json.dump(cues, tf, ensure_ascii=False)
        tmp_json = tf.name
    srt_path = HERE / "tonghuazhen.srt"
    try:
        srt_py = OPUSCAR / "core" / "render" / "srt.py"
        subprocess.run([sys.executable, str(srt_py), tmp_json, str(srt_path)], check=True)
    finally:
        os.unlink(tmp_json)
    return srt_path


def main() -> None:
    if not REF_MP4.exists():
        raise FileNotFoundError(f"Reference video not found: {REF_MP4}")
    out_wav = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "out" / "mix.wav"
    out_wav.parent.mkdir(parents=True, exist_ok=True)

    ev_data = load_events()
    dur = float(ev_data["dur"])
    n_samples = int(round(dur * SR))

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
        tmp_orig = tf.name
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(REF_MP4), "-vn", "-ar", str(SR), "-ac", "2", "-c:a", "pcm_s16le", tmp_orig],
            check=True,
            stderr=subprocess.DEVNULL,
        )
        sr_in, raw = wavfile.read(tmp_orig)
    finally:
        if os.path.exists(tmp_orig):
            os.unlink(tmp_orig)

    if sr_in != SR:
        raise RuntimeError(f"Expected {SR} Hz decoded song, got {sr_in}")
    if raw.ndim == 1:
        raw = np.column_stack([raw, raw])
    if raw.dtype == np.int16:
        song = raw.astype(np.float32) / 32768.0
    else:
        song = raw.astype(np.float32)
        peak = float(np.max(np.abs(song))) or 1.0
        if peak > 1.5:
            song /= 32768.0
    if len(song) < n_samples:
        song = np.pad(song, ((0, n_samples - len(song)), (0, 0)))
    else:
        song = song[:n_samples]

    # Gentle SFX bus: lyric intelligibility and the source music always take priority.
    sfx_bus = np.zeros((n_samples, 2), dtype=np.float32)
    for ev in ev_data["ev"]:
        signal, pan = synth_event(ev)
        sfx.add(sfx_bus, signal.astype(np.float32), float(ev["t"]), gain=0.12, pan=pan)

    mix = song * 0.94 + sfx_bus
    fade_len = min(n_samples, int(0.08 * SR))
    if fade_len:
        mix[-fade_len:] *= np.linspace(1.0, 0.0, fade_len, dtype=np.float32)[:, None]
    mix[:, 0] = sfx.limit(mix[:, 0], ceil=0.94)
    mix[:, 1] = sfx.limit(mix[:, 1], ceil=0.94)
    pcm16 = np.clip(np.round(mix * 32767.0), -32768, 32767).astype(np.int16)
    wavfile.write(str(out_wav), SR, pcm16)
    srt_path = export_srt()
    print(f"Wrote {out_wav} ({dur:.2f}s, {SR}Hz stereo, {len(ev_data['ev'])} story SFX)")
    print(f"Wrote {srt_path} ({len(re.findall(r't0:', TIMELINE.read_text(encoding='utf-8')))} lyric cues)")


if __name__ == "__main__":
    main()
