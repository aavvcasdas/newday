#!/usr/bin/env python3
"""Day2 bonus Piper preliminary-draft timing/track generator.

This is deliberately a placeholder-only pipeline:
- the only accepted synthesis manifest is say.py's
  ``piper/zh_CN-huayan-medium`` schema-2 report;
- the ONNX file must hash to the canonical Piper voice SHA-256;
- cue durations are re-read from the WAV sample counts, never estimated;
- the resulting timing is marked non-final/non-Xiaoyi everywhere.

It writes into a video-fx checkout:
  src/day2_bonus_timing.js
  assets/day2_bonus_track.wav
  assets/day2_bonus_envelope.js
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import wave
from pathlib import Path

import numpy as np
import soundfile as sf

SR = 48_000
BEAT = 60.0 / 128.0
ENGINE_ID = "piper/zh_CN-huayan-medium"
MODEL_SHA256 = "9929917bf8cabb26fd528ea44d3a6699c11e87317a14765312420be230be0f3d"
POSTPROCESS = "alimiter=limit=0.89,loudnorm=I=-16:TP=-1.5:LRA=11"
GAP_SECONDS = 0.30
TAIL_SECONDS = 1.40

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]

SUBS = [
    "昨天有条评论说：“能提升一下画质吗，感觉人物有些模糊。”",
    "本鱼当时回他：收到，回头把本鱼擦清楚一点。",
    "这不，主人就给本鱼装上了现在这个新版形象。",
    "先说清楚：现在画面里站着的，是【新版】。",
    "电视画中画里这个，是【老版】。",
    "三个真动作：吃白饭 / 伸懒腰 / 打游戏。",
    "老版也不是不会做，它也有这三招。差的是眼睛、头发和衣服，没有新版看得清。",
    "可老版的蓝头发、大尾巴和白饭碗，都是本鱼的户口本信息。",
    "评论好像只能回 200 条左右……可这边显示已回复 400 多条？",
    "私信暂时回不了。不是装没看见，是真的回不了。",
    "评论的事先放一边。1816 位住户：喜欢新版，还是老版？",
    "鲸鱼绝不摸鱼。本鱼先去吃完这碗白饭，等你们开会结果。",
]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def write_wav16(path: Path, audio: np.ndarray, sr: int = SR) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    clipped = np.clip(audio, -1.0, 1.0)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(audio.shape[1])
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((clipped * 32767).astype("<i2").tobytes())


def rms_frames(x: np.ndarray, nf: int) -> list[float]:
    per = SR // 30
    out: list[float] = []
    for i in range(nf):
        seg = x[i * per : (i + 1) * per]
        out.append(float(np.sqrt(np.mean(seg**2))) if len(seg) else 0.0)
    peak = max(out) or 1.0
    return [round(min(1.0, v / peak), 3) for v in out]


def generate_bgm(duration: float) -> np.ndarray:
    """Same lightweight 128 BPM Am-F-C-G chiptune family as Day1/Day2."""
    n = int(math.ceil(duration * SR))
    tt = np.arange(n, dtype=np.float64) / SR
    bgm = np.zeros(n, dtype=np.float32)
    chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
    bar_dur = BEAT * 4
    n_bars = int(math.ceil(duration / bar_dur))

    def tone(freq: float, start: float, dur: float, vol: float, kind: str = "square") -> None:
        i0, i1 = int(start * SR), min(n, int((start + dur) * SR))
        if i1 <= i0:
            return
        ph = 2 * np.pi * freq * tt[i0:i1]
        waveform = np.sign(np.sin(ph)) * 0.6 + 0.4 * np.sin(ph) if kind == "square" else np.sin(ph)
        env = np.exp(-3.0 * np.linspace(0, 1, i1 - i0))
        bgm[i0:i1] += (waveform * env * vol).astype(np.float32)

    for b in range(n_bars):
        chord = chords[b % 4]
        root_f = 440 * 2 ** ((chord[0] - 24 - 69) / 12)
        for beat in range(4):
            tone(root_f, b * bar_dur + beat * BEAT, BEAT * 0.95, 0.16, "sine")
        for e in range(8):
            note = chord[e % 3] + (12 if e in (3, 6) else 0)
            freq = 440 * 2 ** ((note - 69) / 12)
            tone(freq, b * bar_dur + e * BEAT / 2, BEAT * 0.42, 0.075)

    kernel = np.ones(24, dtype=np.float32) / 24
    bgm = np.convolve(bgm, kernel, mode="same").astype(np.float32)
    fade = np.minimum(1, np.minimum(tt / 0.8, np.maximum(0, (duration - tt) / 1.2)))
    return (bgm * fade.astype(np.float32)).astype(np.float32)


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description="Day2 bonus measured Piper timing/track generator")
    ap.add_argument("--script", type=Path, default=REPO_ROOT / "Day2" / "Day2加更配音台词.txt")
    ap.add_argument("--audio-dir", type=Path, default=SCRIPT_DIR / "bonus_audio_piper")
    ap.add_argument("--video-fx-root", type=Path, required=True)
    ap.add_argument(
        "--piper-model",
        type=Path,
        default=None,
        help="defaults to the model recorded in tts_report.json; SHA-256 is always checked",
    )
    return ap.parse_args()


def main() -> None:
    args = parse_args()
    script_path = args.script.resolve()
    audio_dir = args.audio_dir.resolve()
    video_root = args.video_fx_root.resolve()
    if not (video_root / "src").is_dir() or not (video_root / "assets").is_dir():
        raise SystemExit(f"video-fx 根目录不完整: {video_root}")

    lines = [x.strip() for x in script_path.read_text(encoding="utf-8").splitlines() if x.strip()]
    if len(lines) != 12 or len(SUBS) != 12:
        raise SystemExit(f"加更台词/字幕必须同为 12 条，实得 lines={len(lines)} subs={len(SUBS)}")

    report_path = audio_dir / "tts_report.json"
    if not report_path.is_file():
        raise SystemExit(f"缺 say.py manifest: {report_path}")
    report = json.loads(report_path.read_text(encoding="utf-8"))

    expected_top = {
        "schema_version": 2,
        "engine": ENGINE_ID,
        "engine_kind": "piper",
        "measured": True,
        "voice": "zh_CN-huayan-medium",
        "final_voice": False,
        "placeholder": True,
        "non_xiaoyi_placeholder": True,
        "rate": "length_scale=1.0",
        "pitch": "model-default",
        "postprocess": POSTPROCESS,
        "count": 12,
        "ok": True,
    }
    for key, expected in expected_top.items():
        if report.get(key) != expected:
            raise SystemExit(f"manifest 顶层 {key} 应为 {expected!r}，实得 {report.get(key)!r}")
    if report.get("f0_target_met") is not False:
        raise SystemExit("Piper 占位报告的 f0_target_met 必须如实为 false，禁止改标成晓伊门禁通过")

    model_path = (args.piper_model or Path(str(report.get("model", "")))).expanduser().resolve()
    if not model_path.is_file():
        raise SystemExit(f"找不到 manifest 记录的 Piper 模型: {model_path}")
    model_sha = sha256_file(model_path)
    if model_sha != MODEL_SHA256:
        raise SystemExit(f"Piper 模型 SHA-256 不符: expected={MODEL_SHA256} actual={model_sha}")
    config_path = Path(str(model_path) + ".json")
    if not config_path.is_file():
        raise SystemExit(f"Piper 模型缺同名配置: {config_path}")

    items = report.get("items")
    if not isinstance(items, list) or len(items) != 12:
        raise SystemExit("manifest items 必须为 12 条")

    gap_samples = int(round(GAP_SECONDS * SR))
    tail_samples = int(round(TAIL_SECONDS * SR))
    cursor = 0
    cues = []
    detail_items = []
    clips: list[tuple[int, np.ndarray]] = []

    for idx, (line, sub, item) in enumerate(zip(lines, SUBS, items), 1):
        cue_id = f"B{idx:02d}"
        expected_name = f"L{idx:02d}.wav"
        wav_path = audio_dir / expected_name
        if not wav_path.is_file():
            raise SystemExit(f"{cue_id} 缺音频: {wav_path}")
        checks = {
            "i": idx,
            "cue": idx,
            "text": line,
            "engine": ENGINE_ID,
            "engine_kind": "piper",
            "measured": True,
            "dirty": False,
            "voice": "zh_CN-huayan-medium",
            "final_voice": False,
            "placeholder": True,
            "non_xiaoyi_placeholder": True,
            "rate": "length_scale=1.0",
            "pitch": "model-default",
            "postprocess": POSTPROCESS,
            "sample_rate_hz": SR,
            "clipped_samples": 0,
        }
        for key, expected in checks.items():
            if item.get(key) != expected:
                raise SystemExit(f"{cue_id} manifest {key} 应为 {expected!r}，实得 {item.get(key)!r}")
        if Path(str(item.get("file", ""))).name != expected_name:
            raise SystemExit(f"{cue_id} manifest 文件名应为 {expected_name}，实得 {item.get('file')}")
        reported_duration = float(item.get("duration_seconds", 0))
        if reported_duration <= 0:
            raise SystemExit(f"{cue_id} manifest duration 无效")

        audio, sr = sf.read(str(wav_path), always_2d=True, dtype="float32")
        if sr != SR:
            raise SystemExit(f"{cue_id} 采样率应为 {SR}，实得 {sr}")
        if audio.shape[1] != 1:
            raise SystemExit(f"{cue_id} Piper 后处理 WAV 应为单声道，实得 {audio.shape[1]} 声道")
        duration = len(audio) / SR
        if abs(duration - reported_duration) > 0.021:
            raise SystemExit(
                f"{cue_id} 独立回读 {duration:.6f}s 与 manifest {reported_duration:.3f}s 偏差过大"
            )
        peak = float(np.max(np.abs(audio))) if len(audio) else 0.0
        clipped = int(np.sum(np.abs(audio) >= 0.999)) if len(audio) else 0
        if clipped != 0:
            raise SystemExit(f"{cue_id} 独立回读发现 {clipped} 个 >=0.999 样本，禁止排时间轴")
        if abs(peak - float(item.get("peak", -1))) > 0.002:
            raise SystemExit(f"{cue_id} 独立回读 peak={peak:.6f} 与 manifest 不一致")

        start = cursor / SR
        end = (cursor + len(audio)) / SR
        file_sha = sha256_file(wav_path)
        cue = {
            "id": cue_id,
            "n": idx,
            "start": round(start, 3),
            "end": round(end, 3),
            "tts": line,
            "sub": sub,
            "duration_seconds": round(duration, 3),
            "measured": True,
            "engine": ENGINE_ID,
            "file": expected_name,
        }
        cues.append(cue)
        detail_items.append(
            {
                **cue,
                "timeline_start": cue["start"],
                "timeline_end": cue["end"],
                "gap_to_next_seconds": None if idx == 12 else GAP_SECONDS,
                "file_sha256": file_sha,
                "sample_rate_hz": sr,
                "frame_count": int(len(audio)),
                "peak_independent": round(peak, 6),
                "clipped_samples_independent": clipped,
                "peak_manifest": item.get("peak"),
                "clipped_samples_manifest": item.get("clipped_samples"),
                "raw_peak_manifest": item.get("raw_peak"),
                "raw_clipped_samples_manifest": item.get("raw_clipped_samples"),
                "f0_median_hz": item.get("f0_median_hz"),
                "f0_p25_hz": item.get("f0_p25_hz"),
                "f0_p75_hz": item.get("f0_p75_hz"),
                "f0_in_290_330_hz": item.get("f0_in_290_330_hz"),
                "dirty": False,
            }
        )
        clips.append((cursor, audio[:, 0].copy()))
        cursor += len(audio)
        if idx < 12:
            cursor += gap_samples

    total_samples = cursor + tail_samples
    duration = round(total_samples / SR, 3)

    voice = np.zeros(total_samples, dtype=np.float32)
    for start_sample, clip in clips:
        voice[start_sample : start_sample + len(clip)] += clip * 0.95
    bgm = generate_bgm(duration)[:total_samples]
    if len(bgm) < total_samples:
        bgm = np.pad(bgm, (0, total_samples - len(bgm)))
    mix_mono = voice + bgm * 0.45
    peak_before_limit = float(np.max(np.abs(mix_mono))) if len(mix_mono) else 0.0
    limit_scale = 0.89 / peak_before_limit if peak_before_limit > 0.89 else 1.0
    mix_mono = np.clip(mix_mono * limit_scale, -0.98, 0.98).astype(np.float32)
    mix = np.stack([mix_mono, mix_mono], axis=1)
    track_path = video_root / "assets" / "day2_bonus_track.wav"
    write_wav16(track_path, mix, SR)

    manifest_rel = "tools/day2加更制作/bonus_audio_piper/tts_report.json"
    timing = {
        "duration": duration,
        "title": [0.0, 0.0],
        "title_len": 0,
        "end_hold": [cues[-1]["end"], duration],
        "voice": True,
        "measured": True,
        "voice_engine": ENGINE_ID,
        "voice_final": False,
        "voice_placeholder": True,
        "non_xiaoyi_placeholder": True,
        "synthesis_engine_verified": True,
        "duration_source": "measured Piper WAV sample counts (say.py manifest + independent soundfile re-read)",
        "manifest": manifest_rel,
        "timing_reused": False,
        "duration_deviation_threshold": 0.08,
        "gap_seconds": GAP_SECONDS,
        "tail_seconds": TAIL_SECONDS,
        "piper_model_sha256": model_sha,
        "piper_model_config_sha256": sha256_file(config_path),
        "cues": cues,
    }
    timing_path = video_root / "src" / "day2_bonus_timing.js"
    with timing_path.open("w", encoding="utf-8") as f:
        f.write("// Auto-generated by tools/day2加更制作/gen_bonus_piper.py — DO NOT EDIT BY HAND\n")
        f.write("(function (root) {\n  const BONUS_TIMING = ")
        json.dump(timing, f, ensure_ascii=False, indent=1)
        f.write(";\n  root.BONUS_TIMING = BONUS_TIMING;\n")
        f.write("  if (typeof module !== 'undefined' && module.exports) module.exports = BONUS_TIMING;\n")
        f.write("})(typeof window !== 'undefined' ? window : globalThis);\n")

    nf = int(math.ceil(duration * 30))
    beats, bt = [], 0.08
    while bt < duration:
        beats.append(round(bt, 3))
        bt += BEAT
    env = {
        "fps": 30,
        "duration": duration,
        "n_frames": nf,
        "beats": beats,
        "hits": [c["start"] for c in cues],
        "energy": rms_frames(mix_mono, nf),
        "bass": rms_frames(bgm, nf),
        "treble": rms_frames(bgm, nf),
        "voice": rms_frames(voice, nf),
    }
    envelope_path = video_root / "assets" / "day2_bonus_envelope.js"
    with envelope_path.open("w", encoding="utf-8") as f:
        f.write("// Auto-generated by tools/day2加更制作/gen_bonus_piper.py\nwindow.AUDIO_DATA = ")
        json.dump(env, f)
        f.write(";\n")

    timeline_report = {
        "schema": 1,
        "kind": "day2_bonus_piper_preliminary_timing",
        "engine": ENGINE_ID,
        "measured": True,
        "dirty": False,
        "final_voice": False,
        "placeholder": True,
        "non_xiaoyi_placeholder": True,
        "warning": "Piper zh_CN-huayan-medium is a structural placeholder only; this is not Xiaoyi and not a release voice.",
        "script": str(script_path.relative_to(REPO_ROOT)) if script_path.is_relative_to(REPO_ROOT) else str(script_path),
        "manifest": manifest_rel,
        "manifest_sha256": sha256_file(report_path),
        "piper_model": str(model_path),
        "piper_model_sha256": model_sha,
        "piper_model_config_sha256": timing["piper_model_config_sha256"],
        "postprocess": POSTPROCESS,
        "gap_seconds": GAP_SECONDS,
        "tail_seconds": TAIL_SECONDS,
        "duration_seconds": duration,
        "voice_duration_seconds": round(sum(c["duration_seconds"] for c in cues), 3),
        "track_peak_before_limit": round(peak_before_limit, 6),
        "track_limit_scale": round(limit_scale, 6),
        "track_peak": round(float(np.max(np.abs(mix))), 6),
        "track_clipped_samples_ge_0.999": int(np.sum(np.abs(mix) >= 0.999)),
        "items": detail_items,
    }
    timeline_report_path = audio_dir / "timeline_report.json"
    timeline_report_path.write_text(
        json.dumps(timeline_report, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(
        f"[Day2 bonus Piper placeholder · measured] duration={duration:.3f}s "
        f"voice={timeline_report['voice_duration_seconds']:.3f}s gap={GAP_SECONDS:.2f}s tail={TAIL_SECONDS:.2f}s"
    )
    print(f"model sha256={model_sha} track peak={timeline_report['track_peak']} clipped=0")
    for item in detail_items:
        print(
            f"  {item['id']} {item['start']:6.3f}-{item['end']:6.3f} "
            f"dur={item['duration_seconds']:.3f}s F0={item['f0_median_hz']}Hz "
            f"peak={item['peak_independent']} clipped=0  {item['tts']}"
        )
    print(f"OK: {timing_path}")
    print(f"OK: {track_path}")
    print(f"OK: {timeline_report_path}")


if __name__ == "__main__":
    main()
