#!/usr/bin/env python3
"""mix.py — Master audio mixer & .srt exporter for 《达拉崩吧》 16-bit Pixel RPG MV.
Layers 83 frame-accurate 16-bit RPG chiptune/foley SFX from events.json onto the original
达拉崩吧.mp4 soundtrack (48 kHz stereo), preserving vocal clarity, and exports dalabengba.srt.
"""
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

SR = sfx.SR  # 48000 Hz
HERE = Path(__file__).resolve().parent
REF_MP4 = HERE.parent.parent / "达拉崩吧.mp4"


def pulse(freq, dur, duty=0.25, vol=0.5, sweep=0.0):
    tt = sfx.t_(dur)
    f = freq * (1.0 + sweep * (tt / max(dur, 1e-4)))
    ph = (np.cumsum(f) / SR) % 1.0
    w = np.where(ph < duty, 1.0, -1.0)
    env = np.minimum(1.0, tt / 0.004) * np.exp(-tt / max(0.03, dur * 0.65))
    return w * env * vol


def arp(notes, step_d=0.055, duty=0.25, vol=0.45):
    parts = [pulse(f, step_d * 1.35, duty=duty, vol=vol) for f in notes]
    out = np.zeros(int(round((len(notes) * step_d + 0.12) * SR)))
    for i, p in enumerate(parts):
        s = int(round(i * step_d * SR))
        e = min(len(out), s + len(p))
        out[s:e] += p[: e - s]
    return out


def synth_event(ev):
    k = ev["type"]
    if k == "cursor":
        return pulse(1046.5, 0.045, 0.25, 0.45), 0.0
    if k == "start_confirm":
        return arp([523.25, 659.25, 783.99, 1046.5], 0.055, 0.25, 0.65), 0.0
    if k == "shimmer" or k == "moon_shimmer":
        return sfx.ding(0.45), 0.15
    if k == "book_open":
        return sfx.whoosh(0.42, 0.55), 0.0
    if k == "palette_step":
        st = ev.get("step", 1)
        base = 330.0 * (1.25 ** st)
        return arp([base, base * 1.25, base * 1.5], 0.05, 0.5, 0.4), 0.0
    if k == "thunder_dive":
        return sfx.ignite(0.75), 0.2
    if k == "fireball":
        return sfx.whoosh(0.24, 0.5) + sfx.thump(0.45, 95)[: int(0.24 * SR)], -0.15
    if k == "portal_warp":
        return pulse(440, 0.38, 0.5, 0.45, sweep=-0.65), 0.35
    if k == "alert_ping":
        return arp([880.0, 1318.5], 0.045, 0.125, 0.6), 0.1
    if k == "holy_beam":
        return arp([523.25, 659.25, 783.99, 1046.5, 1318.5], 0.06, 0.5, 0.5), -0.2
    if k == "sword_unsheathe":
        ring = sfx.ding(0.5)[: int(0.35 * SR)]
        return sfx.whoosh(0.22, 0.55) + np.pad(ring, (0, max(0, int(0.22 * SR) - len(ring))))[: int(0.22 * SR)], -0.2
    if k == "map_pin":
        return sfx.pop(0.5), 0.0
    if k == "heart_chime":
        return arp([659.25, 783.99, 1046.5, 1318.5], 0.065, 0.5, 0.55), 0.3
    if k == "window_open":
        return arp([587.33, 880.0], 0.035, 0.25, 0.42), 0.0
    if k == "blip_queen":
        return pulse(698.46, 0.05, 0.5, 0.35), 0.25
    if k == "blip_whale":
        return pulse(587.33, 0.05, 0.25, 0.38), -0.2
    if k == "think_dot":
        return sfx.pop(0.35), -0.1
    if k == "think_bulb":
        return arp([783.99, 1174.66], 0.05, 0.25, 0.55), -0.1
    if k == "rapid_type_whale":
        notes = [523.25 + (i % 5) * 65 for i in range(13)]
        return arp(notes, 0.12, 0.25, 0.32), -0.1
    if k == "overflow_buzz":
        buzz = pulse(145.0, 0.32, 0.125, 0.65, sweep=-0.2)
        cr = sfx.crash(0.55)[: len(buzz)]
        return buzz + cr, 0.3
    if k == "quill_snap":
        return sfx.click(1.3, 0.65), 0.2
    if k == "dizzy_chirp":
        return arp([622.25, 587.33, 554.37], 0.07, 0.5, 0.4), 0.0
    if k == "confirm_ding":
        return arp([783.99, 1046.5], 0.055, 0.25, 0.55), -0.15
    if k == "stone_slam":
        return sfx.thump(0.65, 68), 0.0
    if k == "stone_slam_big":
        return sfx.thump(0.85, 52), 0.0
    if k == "dash_whoosh":
        return sfx.whoosh(0.45, 0.55), -0.2
    if k == "chapter_gong":
        return sfx.ignite(0.55), 0.0
    if k == "card_flip":
        return sfx.click(1.15, 0.45), 0.0
    if k == "seal_stamp":
        return sfx.thump(0.75, 60), -0.3
    if k == "horse_neigh":
        return pulse(740.0, 0.28, 0.25, 0.42, sweep=0.35), -0.1
    if k == "gate_open":
        return sfx.creak(0.45), -0.1
    if k == "sword_slash":
        return sfx.whoosh(0.18, 0.65), 0.0
    if k == "ko_blink":
        return pulse(440.0, 0.16, 0.25, 0.45, sweep=-0.55), 0.2
    if k == "coin_get":
        return arp([987.77, 1318.51], 0.06, 0.25, 0.55), 0.15
    if k == "level_up":
        return arp([523.25, 659.25, 783.99, 1046.5], 0.075, 0.25, 0.65), -0.1
    if k == "chest_open":
        return arp([440.0, 554.37, 659.25, 880.0], 0.05, 0.25, 0.5), 0.2
    if k == "blizzard_gust":
        return sfx.whoosh(0.85, 0.45), 0.0
    if k == "hero_breath":
        return sfx.whoosh(0.32, 0.28), 0.1
    if k == "encounter_swirl":
        return arp([330, 392, 466, 554, 659, 784, 932], 0.055, 0.25, 0.58), 0.0
    if k == "dragon_eyes":
        return sfx.ignite(0.7), 0.25
    if k == "vs_clash":
        return sfx.crash(0.65), 0.0
    if k == "scale_glint":
        return arp([880 + i * 55 for i in range(8)], 0.07, 0.5, 0.32), 0.25
    if k == "fire_rune":
        return sfx.whoosh(0.4, 0.48), 0.1
    if k == "item_pop":
        slot = ev.get("slot", 0)
        return pulse(523.25 * (1.12 ** slot), 0.09, 0.25, 0.52, sweep=0.2), -0.1 + slot * 0.05
    if k == "dragon_flamethrower":
        return sfx.roar(0.95, 0.85) + sfx.ignite(0.75)[: int(0.95 * SR)], 0.1
    return sfx.click(1.0, 0.3), 0.0


def export_srt():
    tl_text = (HERE / "src" / "timeline.js").read_text(encoding="utf-8")
    subs_block = tl_text.split("export const SUBS = [", 1)[1].split("];", 1)[0]
    pattern = re.compile(r"t0:\s*([0-9.]+),\s*t1:\s*([0-9.]+),\s*speaker:\s*'[^']+',\s*text:\s*'([^']+)'")
    cues = [{"t0": float(m.group(1)), "t1": float(m.group(2)), "text": m.group(3)} for m in pattern.finditer(subs_block)]
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as tf:
        json.dump(cues, tf, ensure_ascii=False)
        tmp_json = tf.name
    try:
        srt_path = HERE / "dalabengba.srt"
        subprocess.run([sys.executable, str(OPUSCAR / "core" / "render" / "srt.py"), tmp_json, str(srt_path)], check=True)
    finally:
        os.unlink(tmp_json)


def main():
    out_wav = Path(sys.argv[1]) if len(sys.argv) > 1 else (HERE / "out" / "mix.wav")
    out_wav.parent.mkdir(parents=True, exist_ok=True)

    ev_data = json.loads((HERE / "events.json").read_text(encoding="utf-8"))
    dur = float(ev_data["dur"])
    n_samples = int(round(dur * SR))

    # 1. Decode original MV song at 48 kHz stereo
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

    song = raw.astype(np.float32) / 32768.0
    if len(song) < n_samples:
        song = np.pad(song, ((0, n_samples - len(song)), (0, 0)))
    else:
        song = song[:n_samples]

    # Subtle dungeon-threshold breath dip (109.75–110.45s, non-vocal transition into dark cave)
    t_axis = np.arange(n_samples) / SR
    hush = np.ones(n_samples, dtype=np.float32)
    mask = (t_axis >= 109.75) & (t_axis <= 110.45)
    hush[mask] = 1.0 - 0.24 * np.sin(np.pi * (t_axis[mask] - 109.75) / 0.70)
    song *= hush[:, None]

    # 2. Synthesize 83 16-bit RPG SFX cues onto stereo SFX bus (ducked gently under vocals)
    sfx_bus = np.zeros((n_samples, 2), dtype=np.float32)
    for ev in ev_data["ev"]:
        sig, pan = synth_event(ev)
        sfx.add(sfx_bus, sig.astype(np.float32), float(ev["t"]), gain=0.165, pan=pan)

    mix = song * 0.90 + sfx_bus
    # Clean 60ms tail fade after final smash-cut (132.52–132.77s)
    fade_len = int(0.08 * SR)
    mix[-fade_len:] *= np.linspace(1.0, 0.0, fade_len, dtype=np.float32)[:, None]

    mix[:, 0] = sfx.limit(mix[:, 0], ceil=0.94)
    mix[:, 1] = sfx.limit(mix[:, 1], ceil=0.94)

    pcm16 = np.clip(np.round(mix * 32767.0), -32768, 32767).astype(np.int16)
    wavfile.write(str(out_wav), SR, pcm16)
    print(f"Wrote {out_wav} ({dur:.2f}s, {SR}Hz stereo, {len(ev_data['ev'])} RPG SFX layered)")

    export_srt()


if __name__ == "__main__":
    main()
