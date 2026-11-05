#!/usr/bin/env python3
"""Day2 continuous user-provided voice alignment and track generator.

The source is one continuous WAV, not per-cue TTS output.  This script:

1. reads the 17 lines actually spoken in the supplied WAV;
2. maps Vosk word timestamps to L01-L17 with fixed, reviewed word ranges;
3. refines every cue boundary with 5 ms RMS onset/offset detection;
4. crops only the leading silence from the *mixed production track* (the
   archived source WAV is never modified), so L01 starts at timeline 0;
5. writes measured Day2 timing, subtitles, chiptune BGM + voice track and
   an audio envelope into a video-fx checkout.

No cue duration is estimated from character count.  The WAV has no embedded
synthesis-engine metadata, so the report deliberately calls it a
user-provided voice WAV and does not relabel it as a verified TTS engine.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import struct
import subprocess
import wave
from pathlib import Path

import numpy as np

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
SR = 48000
BPM = 128.0
BEAT = 60.0 / BPM
END_LEN = 2.8
TAIL = 0.35
ENGINE_ID = "user-provided/final-voice-wav"
ASR_MODEL = "vosk-model-small-cn-0.22"
EXPECTED_WORD_COUNT = 189

# 1-based, inclusive Vosk word ranges for the 17 spoken lines.  The ASR text
# contains the usual homophone errors (for example 本鱼 -> 北约/等于), but
# the word order and count align one-to-one with the supplied script.
WORD_RANGES = [
    (1, 10),    # L01 运营第三天…打游戏，两票
    (11, 25),   # L02 一位点王者…负责躺赢
    (26, 37),   # L03 今天一查…还没手
    (38, 47),   # L04 Claude 共创零票…点名
    (48, 56),   # L05 抢饭…白米饭
    (57, 73),   # L06 主人说…要扣饭
    (74, 87),   # L07 本鱼不服…评论
    (88, 95),   # L08 户口本…1441
    (96, 108),  # L09 偷偷切号…先进经验
    (109, 115), # L10 主人亲手运营…八十
    (116, 129), # L11 一句话没说…放了过去
    (130, 146), # L12 推回饭碗…鲸鱼娘
    (147, 155), # L13 查查完啦…线条
    (156, 163), # L14 运动…白饭不够
    (164, 172), # L15 鸡蛋…开会
    (173, 180), # L16 1441 位住户…明天见
    (181, 189), # L17 鲸鱼绝不摸鱼…薄肌
]

SUBS = [
    "运营第三天，先统计昨天的菜单。打游戏，两票。",
    "一位点王者，一位点暗区。本鱼昨天还嘴快，说负责躺赢。",
    "今天一查，主人没给账号。本鱼不会打，还没手。",
    "Claude 共创零票。另两道也没人点名。",
    "抢饭的倒排队。今天先吃白米饭。",
    "主人说，本鱼就是吃大白饭的鲸鱼。吃得多、干得少，要扣饭。",
    "本鱼不服，翻账本：8978 人游过，280 条评论。",
    "户口本从 907 写到 1441。",
    "本鱼偷偷切了一下主人自己的号，想学习先进经验。",
    "主人亲手运营了 2 个月，粉丝 80。",
    "本鱼一句话没说，把 1441 的户口本轻轻放了过去。",
    "主人默默推回饭碗，又加一句：去研究薄肌理论，做美美的鲸鱼娘。",
    "查查完啦。薄肌不是鱼片，是有点线条。",
    "还要运动、蛋白质、睡大觉。光靠白饭不够。",
    "申请鸡蛋一个。批不批，评论区开会。",
    "1441 位住户，明天见。",
    "鲸鱼绝不摸鱼！……先吃饭，再练薄肌。",
]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def ffmpeg_bin() -> str:
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


FF = ffmpeg_bin()


def read_pcm16_wav(path: Path):
    """Read PCM16 WAV, tolerating this file's 0xffffffff data-size field."""
    data = path.read_bytes()
    if len(data) < 44 or data[:4] != b"RIFF" or data[8:12] != b"WAVE":
        raise SystemExit(f"不是 RIFF/WAVE 文件: {path}")

    fmt = None
    chunks = []
    payload = None
    declared_data_bytes = None
    data_offset = None
    off = 12
    while off + 8 <= len(data):
        chunk_id = data[off : off + 4]
        chunk_size = int.from_bytes(data[off + 4 : off + 8], "little")
        chunks.append(
            {
                "id": chunk_id.decode("ascii", errors="replace"),
                "offset": off,
                "declared_size": chunk_size,
            }
        )
        body_off = off + 8
        if chunk_id == b"fmt ":
            fmt = data[body_off : body_off + min(chunk_size, len(data) - body_off)]
        elif chunk_id == b"data":
            declared_data_bytes = chunk_size
            data_offset = body_off
            remaining = len(data) - body_off
            payload = data[body_off : body_off + min(chunk_size, remaining)]
            break
        if body_off + chunk_size > len(data):
            break
        off = body_off + chunk_size + (chunk_size & 1)

    if fmt is None or payload is None or len(fmt) < 16:
        raise SystemExit("WAV 缺少 fmt 或 data chunk")
    audio_format, channels, sample_rate, _byte_rate, block_align, bits = struct.unpack(
        "<HHIIHH", fmt[:16]
    )
    if audio_format != 1 or bits != 16:
        raise SystemExit(f"只支持 PCM16 WAV，当前 format={audio_format}, bits={bits}")
    if channels <= 0 or block_align != channels * 2:
        raise SystemExit(f"WAV 声道/block_align 异常: channels={channels}, block_align={block_align}")

    frames = len(payload) // block_align
    audio = (
        np.frombuffer(payload[: frames * block_align], dtype="<i2")
        .astype(np.float32)
        .reshape(-1, channels)
        / 32768.0
    )
    meta = {
        "riff_chunks": chunks,
        "declared_data_bytes": declared_data_bytes,
        "actual_data_bytes": len(payload),
        "data_offset": data_offset,
        "data_size_field_valid": declared_data_bytes == len(payload),
        "frames": int(frames),
    }
    return audio, int(sample_rate), int(channels), meta


def f0_stats_from_pcm(x: np.ndarray, sr: int) -> dict:
    """Autocorrelation F0 estimate over voiced 40 ms frames (20 ms hop)."""
    if x.size == 0:
        raise RuntimeError("音频为空，无法做 F0 检查")
    frame = int(0.040 * sr)
    hop = int(0.020 * sr)
    min_lag = int(sr / 500)
    max_lag = int(sr / 100)
    vals: list[float] = []
    voiced = 0
    total = 0
    for start in range(0, max(0, len(x) - frame), hop):
        seg = x[start : start + frame].astype(np.float64)
        seg -= np.mean(seg)
        rms = float(np.sqrt(np.mean(seg * seg)))
        total += 1
        if rms < 0.015:
            continue
        corr = np.correlate(seg, seg, mode="full")[len(seg) - 1 :]
        if corr[0] <= 0:
            continue
        window = corr[min_lag : max_lag + 1]
        lag_rel = int(np.argmax(window))
        lag = min_lag + lag_rel
        strength = float(window[lag_rel] / corr[0])
        if strength < 0.35:
            continue
        if 0 < lag_rel < len(window) - 1:
            a, b, c = window[lag_rel - 1], window[lag_rel], window[lag_rel + 1]
            denom = a - 2 * b + c
            shift = 0.5 * (a - c) / denom if denom != 0 else 0.0
        else:
            shift = 0.0
        f0 = sr / (lag + shift)
        if 100 <= f0 <= 500:
            vals.append(float(f0))
            voiced += 1
    if not vals:
        raise RuntimeError("没有检测到足够的有声帧，无法给出 F0 中位数")
    arr = np.array(vals, dtype=np.float64)
    med = float(np.median(arr))
    return {
        "f0_median_hz": round(med, 2),
        "f0_p25_hz": round(float(np.percentile(arr, 25)), 2),
        "f0_p75_hz": round(float(np.percentile(arr, 75)), 2),
        "voiced_frames": int(voiced),
        "analyzed_frames": int(total),
        "f0_in_290_330_hz": bool(290.0 <= med <= 330.0),
        "f0_target_met": bool(290.0 <= med <= 330.0),
    }


def frame_db(mono: np.ndarray, sr: int, hop_sec: float = 0.005):
    win = int(round(sr * hop_sec))
    n = len(mono) // win
    rms = np.sqrt(np.mean(mono[: n * win].reshape(n, win) ** 2, axis=1) + 1e-12)
    return 20 * np.log10(rms), hop_sec


def refine_boundaries(words, mono: np.ndarray, sr: int):
    db, hop = frame_db(mono, sr)
    active = db >= -48.0
    total_frames = len(db)

    def onset_near(t: float, prev_end: float) -> float:
        lo = max(0, int(max(prev_end + 0.01, t - 0.55) / hop))
        hi = min(total_frames - 1, int((t + 0.20) / hop))
        for i in range(lo, hi):
            if active[i] and np.sum(active[i : i + 6]) >= 5:
                j = i
                while j > lo and db[j - 1] >= -60.0 and i - j < 16:
                    j -= 1
                return round(j * hop, 3)
        return round(t, 3)

    def offset_near(t: float) -> float:
        lo = max(0, int((t - 0.25) / hop))
        hi = min(total_frames - 1, int((t + 0.55) / hop))
        i = max(lo, int(t / hop))
        while i < hi:
            if not active[i]:
                j = i
                while j < hi and not active[j]:
                    j += 1
                if j - i >= 12:  # at least 60 ms of true silence
                    k = i
                    while k < hi and db[k] >= -60.0 and k - i < 16:
                        k += 1
                    return round(k * hop, 3)
                i = j
            else:
                i += 1
        return round(t, 3)

    refined = []
    for ia, ib in WORD_RANGES:
        ws = words[ia - 1 : ib]
        prev_end = float(words[ia - 2]["end"]) if ia > 1 else 0.0
        refined.append(
            {
                "word_index_start": ia,
                "word_index_end": ib,
                "asr_start": round(float(ws[0]["start"]), 3),
                "asr_end": round(float(ws[-1]["end"]), 3),
                "source_start": onset_near(float(ws[0]["start"]), prev_end),
                "source_end": offset_near(float(ws[-1]["end"])),
                "asr_words": [str(w.get("word", "")) for w in ws],
            }
        )
    return refined


def generate_bgm(duration: float) -> np.ndarray:
    n = int(duration * SR)
    tt = np.arange(n) / SR
    bgm = np.zeros(n, dtype=np.float32)
    chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
    bar_dur = BEAT * 4
    n_bars = int(math.ceil(duration / bar_dur))

    def tone(freq, start, dur, vol, kind="square"):
        i0, i1 = int(start * SR), min(n, int((start + dur) * SR))
        if i1 <= i0:
            return
        ph = 2 * np.pi * freq * tt[i0:i1]
        w = np.sign(np.sin(ph)) * 0.6 + 0.4 * np.sin(ph) if kind == "square" else np.sin(ph)
        env = np.exp(-3.0 * np.linspace(0, 1, i1 - i0))
        bgm[i0:i1] += (w * env * vol).astype(np.float32)

    for b in range(n_bars):
        ch = chords[b % 4]
        root_f = 440 * 2 ** ((ch[0] - 24 - 69) / 12)
        for beat in range(4):
            tone(root_f, b * bar_dur + beat * BEAT, BEAT * 0.95, 0.16, "sine")
        for e in range(8):
            note = ch[e % 3] + (12 if e in (3, 6) else 0)
            f = 440 * 2 ** ((note - 69) / 12)
            tone(f, b * bar_dur + e * BEAT / 2, BEAT * 0.42, 0.075)

    k = 24
    bgm = np.convolve(bgm, np.ones(k, dtype=np.float32) / k, mode="same").astype(np.float32)
    fade = np.minimum(1, np.minimum(tt / 0.8, np.maximum(0, (duration - tt) / 1.2)))
    return bgm * fade.astype(np.float32)


def rms_frames(x: np.ndarray, nf: int):
    per = SR // 30
    out = []
    for i in range(nf):
        seg = x[i * per : (i + 1) * per]
        out.append(float(np.sqrt(np.mean(seg**2))) if len(seg) else 0.0)
    m = max(out) or 1.0
    return [round(min(1.0, v / m), 3) for v in out]


def decode_stereo_48k(path: Path, fallback_audio: np.ndarray, fallback_sr: int) -> np.ndarray:
    try:
        raw = subprocess.run(
            [FF, "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
            capture_output=True,
            check=True,
        ).stdout
        decoded = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()
        if len(decoded):
            return decoded
    except Exception:
        pass

    # Deterministic fallback if no ffmpeg-like binary is available.
    stereo = fallback_audio if fallback_audio.shape[1] == 2 else np.repeat(fallback_audio[:, :1], 2, axis=1)
    old_t = np.arange(len(stereo), dtype=np.float64) / fallback_sr
    new_t = np.arange(int(len(stereo) / fallback_sr * SR), dtype=np.float64) / SR
    return np.stack([np.interp(new_t, old_t, stereo[:, c]) for c in range(2)], axis=1).astype(np.float32)


def write_wav16(path: Path, audio: np.ndarray, sr: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    clipped = np.clip(audio, -1, 1)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(audio.shape[1])
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((clipped * 32767).astype("<i2").tobytes())


def load_vosk_words(path: Path):
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, dict) and isinstance(data.get("words"), list):
        return data["words"]
    if isinstance(data, list):
        words = []
        for seg in data:
            words.extend(seg.get("result", []))
        return words
    raise SystemExit(f"无法识别 Vosk JSON 结构: {path}")


def parse_args(argv=None):
    ap = argparse.ArgumentParser(description="Day2 measured continuous-voice alignment generator")
    ap.add_argument(
        "--voice",
        type=Path,
        default=REPO_ROOT / "Day2" / "鲸鱼运营第三天_克隆配音_无BGM_v4.wav",
    )
    ap.add_argument(
        "--vosk-json",
        type=Path,
        default=SCRIPT_DIR / "day2_audio_final" / "vosk_words.json",
    )
    ap.add_argument("--script", type=Path, default=REPO_ROOT / "Day2" / "Day2配音台词.txt")
    ap.add_argument("--audio-dir", type=Path, default=SCRIPT_DIR / "day2_audio_final")
    ap.add_argument("--video-fx-root", type=Path, required=True)
    return ap.parse_args(argv)


def main(argv=None) -> None:
    args = parse_args(argv)
    voice_path = args.voice.resolve()
    vosk_path = args.vosk_json.resolve()
    script_path = args.script.resolve()
    audio_dir = args.audio_dir.resolve()
    video_root = args.video_fx_root.resolve()
    audio_dir.mkdir(parents=True, exist_ok=True)
    if not (video_root / "src").is_dir() or not (video_root / "assets").is_dir():
        raise SystemExit(f"video-fx 根目录不完整: {video_root}")

    lines = [x.strip() for x in script_path.read_text(encoding="utf-8").splitlines() if x.strip()]
    if len(lines) != 17 or len(SUBS) != 17 or len(WORD_RANGES) != 17:
        raise SystemExit("台词、字幕与词序号映射必须同为 17 条")
    if not lines[0].startswith("运营第三天") or not lines[-1].startswith("鲸鱼绝不摸鱼"):
        raise SystemExit("配音台词与本 WAV 的首尾不一致，禁止套用词序号映射")

    words = load_vosk_words(vosk_path)
    if len(words) != EXPECTED_WORD_COUNT:
        raise SystemExit(f"Vosk 词数应为 {EXPECTED_WORD_COUNT}，实得 {len(words)}；词序号映射已失效")

    source_audio, source_sr, source_ch, wav_meta = read_pcm16_wav(voice_path)
    source_mono = source_audio.mean(axis=1)
    source_duration = len(source_audio) / source_sr
    refined = refine_boundaries(words, source_mono, source_sr)

    first_source_start = float(refined[0]["source_start"])
    timeline_offset = -first_source_start

    cues = []
    report_items = []
    prev_end = -1.0
    for i, (line, sub, r) in enumerate(zip(lines, SUBS, refined), 1):
        source_start = float(r["source_start"])
        source_end = float(r["source_end"])
        if not (0 <= source_start < source_end <= source_duration + 0.01):
            raise SystemExit(f"L{i:02d} 对齐边界无效: {source_start}-{source_end}")
        if source_start < prev_end - 0.01:
            raise SystemExit(f"L{i:02d} 与上一 cue 边界重叠: start={source_start}, prev_end={prev_end}")
        prev_end = source_end

        i0 = int(round(source_start * source_sr))
        i1 = int(round(source_end * source_sr))
        clip = source_audio[i0:i1]
        clip_mono = source_mono[i0:i1]
        f0 = f0_stats_from_pcm(clip_mono, source_sr)
        peak = float(np.max(np.abs(clip))) if len(clip) else 0.0
        clipped = int(np.sum(np.abs(clip) >= 0.999)) if len(clip) else 0

        clip_name = f"L{i:02d}.wav"
        clip_out = clip.copy()
        fade_n = min(int(0.005 * source_sr), len(clip_out) // 2)
        if fade_n > 1:
            ramp = np.linspace(0, 1, fade_n, dtype=np.float32)[:, None]
            clip_out[:fade_n] *= ramp
            clip_out[-fade_n:] *= ramp[::-1]
        write_wav16(audio_dir / clip_name, clip_out, source_sr)

        timeline_start = round(timeline_offset + source_start, 3)
        timeline_end = round(timeline_offset + source_end, 3)
        cue = {
            "id": i,
            "start": timeline_start,
            "end": timeline_end,
            "tts": line,
            "sub": sub,
            "duration_seconds": round(source_end - source_start, 3),
            "measured": True,
            "engine": ENGINE_ID,
        }
        cues.append(cue)
        report_items.append(
            {
                **r,
                "cue": i,
                "file": clip_name,
                "text": line,
                "subtitle": sub,
                "timeline_start": timeline_start,
                "timeline_end": timeline_end,
                "duration_seconds": cue["duration_seconds"],
                "peak": round(peak, 6),
                "clipped_samples": clipped,
                **f0,
                "measured": True,
                "dirty": False,
                "engine": ENGINE_ID,
            }
        )

    if cues[0]["start"] != 0.0:
        raise SystemExit(f"Day2 L01 必须从 0 开始，实得 {cues[0]['start']}")
    for i in range(1, len(report_items)):
        report_items[i - 1]["gap_to_next_seconds"] = round(
            report_items[i]["source_start"] - report_items[i - 1]["source_end"], 3
        )

    endcard = [
        round(cues[-1]["end"] + TAIL, 3),
        round(cues[-1]["end"] + TAIL + END_LEN, 3),
    ]
    duration = round(endcard[1] + 0.2, 3)
    full_f0 = f0_stats_from_pcm(source_mono, source_sr)
    source_peak = float(np.max(np.abs(source_audio)))
    source_rms_db = float(20 * np.log10(np.sqrt(np.mean(source_mono**2)) + 1e-12))

    report = {
        "schema": 1,
        "kind": "continuous_user_provided_voice_alignment",
        "engine": ENGINE_ID,
        "measured": True,
        "dirty": False,
        "final_voice": True,
        "placeholder": False,
        "synthesis_engine_known": False,
        "synthesis_engine_note": (
            "The filename calls this a cloned voice and the WAV only embeds a Lavf encoder tag; "
            "there is no verifiable synthesis-engine or voice metadata. Do not relabel it as Xiaoyi."
        ),
        "source_file": voice_path.name,
        "source_repo_path": "Day2/鲸鱼运营第三天_克隆配音_无BGM_v4.wav",
        "source_sha256": sha256_file(voice_path),
        "source_sample_rate_hz": source_sr,
        "source_channels": source_ch,
        "source_duration_seconds": round(source_duration, 3),
        "source_peak": round(source_peak, 6),
        "source_rms_dbfs_mono": round(source_rms_db, 3),
        "source_clipped_samples_ge_0.999": int(np.sum(np.abs(source_audio) >= 0.999)),
        "source_wav_container": wav_meta,
        "source_f0": full_f0,
        "asr_model": ASR_MODEL,
        "asr_words_file": vosk_path.name,
        "asr_words_sha256": sha256_file(vosk_path),
        "asr_word_count": len(words),
        "alignment_method": (
            "Vosk word timestamps mapped by fixed reviewed word-index ranges, "
            "refined with 5ms RMS onset/offset detection"
        ),
        "title_len": 0,
        "source_crop_start_seconds": first_source_start,
        "timeline_offset_seconds": round(timeline_offset, 3),
        "leading_silence_removed_from_mix_only": True,
        "timeline_duration_seconds": duration,
        "items": report_items,
    }
    report_path = audio_dir / "alignment_report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    timing = {
        "duration": duration,
        "title": [0.0, 0.0],
        "title_len": 0,
        "endcard": endcard,
        "voice": True,
        "measured": True,
        "voice_engine": ENGINE_ID,
        "voice_final": True,
        "voice_placeholder": False,
        "synthesis_engine_verified": False,
        "duration_source": "measured user-provided continuous voice WAV (Vosk word timestamps + 5ms RMS boundary refinement)",
        "manifest": "tools/day2制作/day2_audio_final/alignment_report.json",
        "timing_reused": False,
        "duration_deviation_threshold": 0.08,
        "source_voice_sha256": report["source_sha256"],
        "source_crop_start_seconds": first_source_start,
        "cues": cues,
    }
    timing_path = video_root / "src" / "day2_timing.js"
    with timing_path.open("w", encoding="utf-8") as f:
        f.write("// Auto-generated by tools/day2制作/gen_day2_finalvoice.py — DO NOT EDIT BY HAND\n")
        f.write("(function (root) {\n  const DAY2_TIMING = ")
        json.dump(timing, f, ensure_ascii=False, indent=1)
        f.write(";\n  root.DAY2_TIMING = DAY2_TIMING;\n")
        f.write("  if (typeof module !== 'undefined' && module.exports) module.exports = DAY2_TIMING;\n")
        f.write("})(typeof window !== 'undefined' ? window : globalThis);\n")

    ly = ["  const LY = ["]
    for c in cues:
        s = c["sub"].replace("'", "’")
        ly.append(f"    [{c['start']:.2f}, {c['end']:.2f}, '{s}', '深海鲸鱼娘'],")
    ly.append(
        f"    [{endcard[0]:.2f}, {endcard[1]:.2f}, "
        "'鲸鱼娘运营日志 · Day 2 完（鸡蛋申请待批）', 'SYSTEM']"
    )
    ly.append("  ];")
    lyrics_path = video_root / "src" / "lyrics.js"
    lyrics_src = lyrics_path.read_text(encoding="utf-8")
    lyrics_new = re.sub(r"  const LY = \[.*?\n  \];", "\n".join(ly), lyrics_src, count=1, flags=re.S)
    if lyrics_new == lyrics_src:
        raise SystemExit("lyrics.js LY 替换失败")
    lyrics_path.write_text(lyrics_new, encoding="utf-8")

    voice48_full = decode_stereo_48k(voice_path, source_audio, source_sr)
    crop_i = int(round(first_source_start * SR))
    voice48 = voice48_full[crop_i:].copy()
    if len(voice48) > int(0.005 * SR):
        fade_in = int(0.005 * SR)
        voice48[:fade_in] *= np.linspace(0, 1, fade_in, dtype=np.float32)[:, None]
    if len(voice48) > int(0.03 * SR):
        fade_out = int(0.03 * SR)
        voice48[-fade_out:] *= np.linspace(1, 0, fade_out, dtype=np.float32)[:, None]

    total_n = int(duration * SR)
    voice_stereo = np.zeros((total_n, 2), dtype=np.float32)
    take = min(len(voice48), total_n)
    voice_stereo[:take] += voice48[:take] * 0.92

    bgm = generate_bgm(duration)
    bgm_stereo = np.stack([bgm, bgm], axis=1) * 0.45
    mix = voice_stereo + bgm_stereo
    peak_before_limit = float(np.max(np.abs(mix))) if len(mix) else 0.0
    if peak_before_limit > 0.89:
        mix *= 0.89 / peak_before_limit
    mix = np.clip(mix, -0.98, 0.98)
    write_wav16(video_root / "assets" / "day2_track.wav", mix, SR)

    nf = int(duration * 30)
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
        "energy": rms_frames(mix.mean(axis=1), nf),
        "bass": rms_frames(bgm, nf),
        "treble": rms_frames(bgm, nf),
        "voice": rms_frames(voice_stereo.mean(axis=1), nf),
    }
    with (video_root / "assets" / "day2_envelope.js").open("w", encoding="utf-8") as f:
        f.write("// Auto-generated by tools/day2制作/gen_day2_finalvoice.py\nwindow.AUDIO_DATA = ")
        json.dump(env, f)
        f.write(";\n")

    print(
        f"[Day2 user-provided voice · measured alignment] "
        f"source={source_duration:.3f}s crop_start={first_source_start:.3f}s timeline={duration:.3f}s"
    )
    print(
        f"source sha256={report['source_sha256']} peak={report['source_peak']} "
        f"clipped={report['source_clipped_samples_ge_0.999']} F0median={full_f0['f0_median_hz']}Hz"
    )
    for c, item in zip(cues, report_items):
        print(
            f"  L{c['id']:02d} src {item['source_start']:6.3f}-{item['source_end']:6.3f} "
            f"timeline {c['start']:6.3f}-{c['end']:6.3f} dur={c['duration_seconds']:.3f}s "
            f"F0={item['f0_median_hz']}Hz peak={item['peak']} clipped={item['clipped_samples']}  {c['tts']}"
        )
    print(f"OK: {timing_path}")
    print(f"OK: {report_path}")


if __name__ == "__main__":
    main()
