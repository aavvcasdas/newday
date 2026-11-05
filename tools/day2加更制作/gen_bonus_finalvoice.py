#!/usr/bin/env python3
"""Day2 bonus final user-provided voice alignment and production-track builder.

The source is one continuous WAV supplied by the user.  This script maps Vosk
word timestamps to the nine actually spoken cues, refines boundaries with 5 ms
RMS onset/offset detection, crops only the leading silence from the production
mix, and writes measured timing/envelope files into a video-fx checkout.  The
scripted dialogue is never paused for the visual catalog: the 42-second TV
catalog starts in B03, continues underneath B06, and ends in the measured
B06/B07 gap.  Clause subtitles use the same Vosk word timestamps; no cue or
clause duration is estimated from character counts.

The WAV only embeds a Lavf encoder tag.  It is therefore recorded strictly as
``user-provided/final-voice-wav``; no synthesis engine or voice identity is
inferred from the filename.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import struct
import subprocess
import wave
from pathlib import Path

import numpy as np

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
SR = 48_000
BPM = 128.0
BEAT = 60.0 / BPM
ENGINE_ID = "user-provided/final-voice-wav"
ASR_MODEL = "vosk-model-small-cn-0.22"
EXPECTED_WORD_COUNT = 213
CATALOG_DURATION_SECONDS = 42.0
CATALOG_START_AFTER_B03_SECONDS = 0.35
END_HOLD_SECONDS = 1.6

# 1-based inclusive Vosk word ranges for the nine spoken lines.  ASR contains
# homophone errors (本鱼 -> 等于/本月/北约 etc.), but the reviewed word order
# and count align with the supplied script.  Two short “诶?” interjections in
# B04/B06 were not emitted as ASR words; they lie inside these cue ranges and
# are retained by the RMS-refined start/end boundaries.
WORD_RANGES = [
    (1, 14),    # B01 昨天……有些模糊
    (15, 25),   # B02 本鱼立刻……清楚一点
    (26, 56),   # B03 主人没有……选一选
    (57, 77),   # B04 左边……白饭碗呀 (plus unrecognized 诶)
    (78, 105),  # B05 两边……哪边好呢
    (106, 133), # B06 对了……转不过来了 (plus unrecognized 诶)
    (134, 153), # B07 私信……回不了哦
    (154, 187), # B08 好啦……新设计的鱼呀
    (188, 213), # B09 鲸鱼绝不摸鱼……摸鱼吧
]

SUBS = [
    "昨天，有人跟本鱼说：“能提升一下画质吗？感觉人物有些模糊。”",
    "本鱼立刻回他：“收到，回头把本鱼擦清楚一点。”",
    "主人没有偷偷把本鱼换掉哦。他给现在的本鱼准备了新动作，还另外设计了一条新的鱼，都放进电视里，先让大家选一选。",
    "左边，是现在的本鱼在学新动作。右边，是主人新设计的鱼。诶？它怎么也捧着白饭碗呀？",
    "两边都动起来看看吧！左边还是有点糊糊的，右边清楚一点。蓝头发、大尾巴、白饭碗都还在……到底选哪边好呢？",
    "对了，评论好像只能回复 200 条左右。可是本鱼这边已经显示回复 400 多条了……诶？本鱼的小脑袋有点转不过来了。",
    "私信也暂时回不了。不是本鱼躲起来，也不是本鱼偷懒，是真的回不了哦。",
    "好啦，先不数了。1931 位住户，帮本鱼选一选嘛：是留住现在的本鱼，让她继续学新动作，还是换成右边新设计的鱼呀？",
    "鲸鱼绝不摸鱼！本鱼先把这碗白饭吃完，等你们开会选好。边吃边等，应该不算摸鱼吧？",
]

UNRECOGNIZED_INTERJECTIONS = {
    "B04": {"source_start": 26.67, "source_end": 27.01, "text": "诶？"},
    "B06": {"source_start": 50.08, "source_end": 50.43, "text": "诶？"},
}

# Clause-level subtitles, in the spirit of the Day videos' short timed lines.
# Tuple form is (first Vosk word index, last Vosk word index, display text),
# using the same 1-based inclusive indexing as WORD_RANGES.  The special
# __INTERJECTION__ marker uses the RMS-reviewed source range above because
# Vosk did not emit those two short utterances as words.  The builder asserts
# that concatenating each cue's display texts reproduces SUBS exactly.
SUBTITLE_SEGMENT_RANGES = [
    [
        (1, 5, "昨天，有人跟本鱼说："),
        (6, 10, "“能提升一下画质吗？"),
        (11, 14, "感觉人物有些模糊。”"),
    ],
    [
        (15, 19, "本鱼立刻回他：“收到，"),
        (20, 25, "回头把本鱼擦清楚一点。”"),
    ],
    [
        (26, 31, "主人没有偷偷把本鱼换掉哦。"),
        (32, 40, "他给现在的本鱼准备了新动作，"),
        (41, 48, "还另外设计了一条新的鱼，"),
        (49, 52, "都放进电视里，"),
        (53, 56, "先让大家选一选。"),
    ],
    [
        (57, 64, "左边，是现在的本鱼在学新动作。"),
        (65, 70, "右边，是主人新设计的鱼。"),
        ("__INTERJECTION__", None, "诶？"),
        (71, 77, "它怎么也捧着白饭碗呀？"),
    ],
    [
        (78, 83, "两边都动起来看看吧！"),
        (84, 88, "左边还是有点糊糊的，"),
        (89, 91, "右边清楚一点。"),
        (92, 99, "蓝头发、大尾巴、白饭碗都还在……"),
        (100, 105, "到底选哪边好呢？"),
    ],
    [
        (106, 106, "对了，"),
        (107, 114, "评论好像只能回复 200 条左右。"),
        (115, 123, "可是本鱼这边已经显示回复 400 多条了……"),
        ("__INTERJECTION__", None, "诶？"),
        (124, 133, "本鱼的小脑袋有点转不过来了。"),
    ],
    [
        (134, 139, "私信也暂时回不了。"),
        (140, 143, "不是本鱼躲起来，"),
        (144, 147, "也不是本鱼偷懒，"),
        (148, 153, "是真的回不了哦。"),
    ],
    [
        (154, 158, "好啦，先不数了。"),
        (159, 165, "1931 位住户，"),
        (166, 169, "帮本鱼选一选嘛："),
        (170, 174, "是留住现在的本鱼，"),
        (175, 179, "让她继续学新动作，"),
        (180, 187, "还是换成右边新设计的鱼呀？"),
    ],
    [
        (188, 191, "鲸鱼绝不摸鱼！"),
        (192, 199, "本鱼先把这碗白饭吃完，"),
        (200, 203, "等你们开会选好。"),
        (204, 208, "边吃边等，"),
        (209, 213, "应该不算摸鱼吧？"),
    ],
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
    data = path.read_bytes()
    if len(data) < 44 or data[:4] != b"RIFF" or data[8:12] != b"WAVE":
        raise SystemExit(f"不是 RIFF/WAVE 文件: {path}")
    fmt = None
    payload = None
    chunks = []
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
        raise SystemExit("WAV 声道/block_align 异常")
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
        "embedded_encoder_tag": "Lavf63.1.100" if b"Lavf63.1.100" in data[:512] else None,
    }
    return audio, int(sample_rate), int(channels), meta


def f0_stats_from_pcm(x: np.ndarray, sr: int) -> dict:
    if x.size == 0:
        raise RuntimeError("音频为空，无法做 F0 检查")
    frame = int(0.040 * sr)
    hop = int(0.020 * sr)
    min_lag = int(sr / 500)
    max_lag = int(sr / 100)
    vals: list[float] = []
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
    if not vals:
        raise RuntimeError("没有检测到足够的有声帧，无法给出 F0 中位数")
    arr = np.array(vals, dtype=np.float64)
    med = float(np.median(arr))
    return {
        "f0_median_hz": round(med, 2),
        "f0_p25_hz": round(float(np.percentile(arr, 25)), 2),
        "f0_p75_hz": round(float(np.percentile(arr, 75)), 2),
        "voiced_frames": int(len(vals)),
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
                if j - i >= 12:
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


def build_subtitle_segments(cue_index: int, words, base_offset: float, cue_start: float, cue_end: float):
    """Build clause subtitles from measured ASR/RMS timestamps.

    Internal boundaries are the first Vosk word timestamp of each clause;
    the two ASR-missing interjections use their reviewed RMS source ranges.
    A clause remains on screen until the next clause starts, matching the
    short timed-line presentation used by the Day videos without ever
    estimating a boundary from character counts.
    """
    cue_id = f"B{cue_index:02d}"
    specs = SUBTITLE_SEGMENT_RANGES[cue_index - 1]
    expected = SUBS[cue_index - 1]
    if "".join(str(spec[2]) for spec in specs) != expected:
        raise SystemExit(f"{cue_id} 分句字幕拼接与批准字幕不一致")

    raw = []
    for first, last, text in specs:
        if first == "__INTERJECTION__":
            hit = UNRECOGNIZED_INTERJECTIONS.get(cue_id)
            if not hit or hit["text"] != text:
                raise SystemExit(f"{cue_id} 缺少未识别语气词的实测边界")
            source_start = float(hit["source_start"])
            source_end = float(hit["source_end"])
            raw.append({
                "text": text,
                "word_index_start": None,
                "word_index_end": None,
                "source_start": round(source_start, 3),
                "source_end": round(source_end, 3),
                "boundary_source": "RMS-reviewed ASR-missing interjection",
            })
        else:
            first_i = int(first)
            last_i = int(last)
            if not (1 <= first_i <= last_i <= len(words)):
                raise SystemExit(f"{cue_id} 分句词序号越界: {first_i}-{last_i}")
            raw.append({
                "text": text,
                "word_index_start": first_i,
                "word_index_end": last_i,
                "source_start": round(float(words[first_i - 1]["start"]), 3),
                "source_end": round(float(words[last_i - 1]["end"]), 3),
                "boundary_source": "Vosk word timestamp",
            })

    segments = []
    for i, item in enumerate(raw):
        start = cue_start if i == 0 else round(base_offset + item["source_start"], 3)
        start = max(cue_start, min(start, cue_end))
        if segments and start <= segments[-1]["start"]:
            start = round(segments[-1]["start"] + 0.001, 3)
        segments.append({**item, "start": round(float(start), 3)})
    for i, segment in enumerate(segments):
        segment["end"] = segments[i + 1]["start"] if i + 1 < len(segments) else cue_end
        if not (cue_start <= segment["start"] < segment["end"] <= cue_end):
            raise SystemExit(f"{cue_id} 分句字幕边界无效: {segment}")
    return segments


def generate_bgm(duration: float) -> np.ndarray:
    n = int(math.ceil(duration * SR))
    tt = np.arange(n, dtype=np.float64) / SR
    bgm = np.zeros(n, dtype=np.float32)
    chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
    bar_dur = BEAT * 4
    n_bars = int(math.ceil(duration / bar_dur))

    def tone(freq, start, dur, vol, kind="square"):
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
    bgm = np.convolve(bgm, np.ones(24, dtype=np.float32) / 24, mode="same").astype(np.float32)
    fade = np.minimum(1, np.minimum(tt / 0.8, np.maximum(0, (duration - tt) / 1.2)))
    return (bgm * fade.astype(np.float32)).astype(np.float32)


def rms_frames(x: np.ndarray, nf: int):
    per = SR // 30
    out = []
    for i in range(nf):
        seg = x[i * per : (i + 1) * per]
        out.append(float(np.sqrt(np.mean(seg**2))) if len(seg) else 0.0)
    peak = max(out) or 1.0
    return [round(min(1.0, v / peak), 3) for v in out]


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
    ap = argparse.ArgumentParser(description="Day2 bonus final continuous-voice alignment generator")
    ap.add_argument("--voice", type=Path, default=REPO_ROOT / "鲸鱼选鱼_克隆配音_最终版.wav")
    ap.add_argument(
        "--vosk-json",
        type=Path,
        default=SCRIPT_DIR / "bonus_audio_final" / "vosk_words.json",
    )
    ap.add_argument("--script", type=Path, default=REPO_ROOT / "Day2" / "Day2加更配音台词.txt")
    ap.add_argument("--audio-dir", type=Path, default=SCRIPT_DIR / "bonus_audio_final")
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
    if len(lines) != 9 or len(SUBS) != 9 or len(WORD_RANGES) != 9 or len(SUBTITLE_SEGMENT_RANGES) != 9:
        raise SystemExit("台词、字幕、分句字幕与词序号映射必须同为 9 条")
    if not lines[0].startswith("昨天，有人跟本鱼说") or not lines[-1].startswith("鲸鱼绝不摸鱼"):
        raise SystemExit("配音台词与本 WAV 的首尾不一致，禁止套用词序号映射")
    if "一千九百三十一位住户" not in lines[7]:
        raise SystemExit("B08 必须是 1931 位住户的最终稿")

    words = load_vosk_words(vosk_path)
    if len(words) != EXPECTED_WORD_COUNT:
        raise SystemExit(f"Vosk 词数应为 {EXPECTED_WORD_COUNT}，实得 {len(words)}；词序号映射已失效")

    source_audio, source_sr, source_ch, wav_meta = read_pcm16_wav(voice_path)
    source_mono = source_audio.mean(axis=1)
    source_duration = len(source_audio) / source_sr
    refined = refine_boundaries(words, source_mono, source_sr)

    first_source_start = float(refined[0]["source_start"])
    base_offset = -first_source_start

    # First pass: unshifted (post-leading-crop) cue positions.
    base_positions = []
    prev_end = -1.0
    for r in refined:
        source_start = float(r["source_start"])
        source_end = float(r["source_end"])
        if not (0 <= source_start < source_end <= source_duration + 0.01):
            raise SystemExit(f"对齐边界无效: {source_start}-{source_end}")
        if source_start < prev_end - 0.01:
            raise SystemExit("cue 边界重叠")
        prev_end = source_end
        base_positions.append(
            (round(base_offset + source_start, 3), round(base_offset + source_end, 3))
        )

    catalog_start = round(base_positions[2][0] + CATALOG_START_AFTER_B03_SECONDS, 3)
    catalog_end = round(catalog_start + CATALOG_DURATION_SECONDS, 3)
    # No production pause is inserted.  The visual catalog keeps running
    # underneath B06 and must land in the measured silence between B06 and
    # B07, so all 28+39 items finish before the private-message beat.
    insert_duration = 0.0
    if not (base_positions[5][1] < catalog_end < base_positions[6][0]):
        raise SystemExit(
            "目录必须在 B06 台词下方继续，并在 B06/B07 实测间隔内结束，"
            f"实得 catalog_end={catalog_end}, B06={base_positions[5]}, B07={base_positions[6]}"
        )

    cues = []
    report_items = []
    for i, (line, sub, r, (base_start, base_end)) in enumerate(
        zip(lines, SUBS, refined, base_positions), 1
    ):
        source_start = float(r["source_start"])
        source_end = float(r["source_end"])
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

        shift = 0.0
        timeline_start = round(base_start + shift, 3)
        timeline_end = round(base_end + shift, 3)
        subtitle_segments = build_subtitle_segments(
            i, words, base_offset, timeline_start, timeline_end
        )
        cue = {
            "id": f"B{i:02d}",
            "n": i,
            "start": timeline_start,
            "end": timeline_end,
            "tts": line,
            "sub": sub,
            "subtitle_segments": [
                {
                    "start": segment["start"],
                    "end": segment["end"],
                    "text": segment["text"],
                    "word_index_start": segment["word_index_start"],
                    "word_index_end": segment["word_index_end"],
                }
                for segment in subtitle_segments
            ],
            "duration_seconds": round(source_end - source_start, 3),
            "measured": True,
            "engine": ENGINE_ID,
        }
        cues.append(cue)
        report_items.append(
            {
                **r,
                "cue": cue["id"],
                "file": clip_name,
                "text": line,
                "subtitle": sub,
                "subtitle_segments": subtitle_segments,
                "base_timeline_start": base_start,
                "base_timeline_end": base_end,
                "production_shift_seconds": round(shift, 3),
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
        raise SystemExit(f"B01 必须从 0 开始，实得 {cues[0]['start']}")
    for i in range(1, len(report_items)):
        report_items[i - 1]["source_gap_to_next_seconds"] = round(
            report_items[i]["source_start"] - report_items[i - 1]["source_end"], 3
        )
        report_items[i - 1]["production_gap_to_next_seconds"] = round(
            cues[i]["start"] - cues[i - 1]["end"], 3
        )

    duration = round(cues[-1]["end"] + END_HOLD_SECONDS, 3)
    end_hold = [cues[-1]["end"], duration]
    full_f0 = f0_stats_from_pcm(source_mono, source_sr)
    source_peak = float(np.max(np.abs(source_audio)))
    source_rms_db = float(20 * np.log10(np.sqrt(np.mean(source_mono**2)) + 1e-12))
    source_sha = sha256_file(voice_path)

    catalog = {
        "start": catalog_start,
        "end": catalog_end,
        "duration": CATALOG_DURATION_SECONDS,
        "insert_start_base_timeline": None,
        "insert_duration": insert_duration,
        "silent_remainder_start": None,
        "silent_remainder_end": None,
        "dialogue_overlap_start": cues[5]["start"],
        "dialogue_overlap_end": catalog_end,
        "script_pause_inserted": False,
        "pixel_count": 28,
        "pixel_item_seconds": round(CATALOG_DURATION_SECONDS / 28, 6),
        "pose_count": 39,
        "pose_item_seconds": round(CATALOG_DURATION_SECONDS / 39, 6),
    }

    report = {
        "schema": 1,
        "kind": "day2_bonus_continuous_user_provided_voice_alignment",
        "engine": ENGINE_ID,
        "measured": True,
        "dirty": False,
        "final_voice": True,
        "placeholder": False,
        "synthesis_engine_known": False,
        "synthesis_engine_note": (
            "The filename calls this a cloned voice and the WAV only embeds a Lavf63.1.100 tag; "
            "there is no verifiable synthesis-engine or voice metadata. Do not relabel it as Xiaoyi."
        ),
        "source_file": voice_path.name,
        "source_repo_path": "鲸鱼选鱼_克隆配音_最终版.wav",
        "source_sha256": source_sha,
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
        "unrecognized_interjections_inside_cues": [
            {"cue": cue_id, **hit}
            for cue_id, hit in UNRECOGNIZED_INTERJECTIONS.items()
        ],
        "title_len": 0,
        "source_crop_start_seconds": first_source_start,
        "leading_silence_removed_from_mix_only": True,
        "catalog": catalog,
        "timeline_duration_seconds": duration,
        "end_hold": end_hold,
        "items": report_items,
    }
    report_path = audio_dir / "alignment_report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    timing = {
        "duration": duration,
        "title": [0.0, 0.0],
        "title_len": 0,
        "end_hold": end_hold,
        "voice": True,
        "measured": True,
        "voice_engine": ENGINE_ID,
        "voice_final": True,
        "voice_placeholder": False,
        "synthesis_engine_verified": False,
        "duration_source": "measured user-provided continuous voice WAV (Vosk word timestamps + 5ms RMS boundary refinement)",
        "manifest": "tools/day2加更制作/bonus_audio_final/alignment_report.json",
        "timing_reused": False,
        "duration_deviation_threshold": 0.08,
        "source_voice_sha256": source_sha,
        "source_crop_start_seconds": first_source_start,
        "catalog": catalog,
        "cues": cues,
    }
    timing_path = video_root / "src" / "day2_bonus_final_timing.js"
    with timing_path.open("w", encoding="utf-8") as f:
        f.write("// Auto-generated by tools/day2加更制作/gen_bonus_finalvoice.py — DO NOT EDIT BY HAND\n")
        f.write("(function (root) {\n  const DAY2_BONUS_FINAL_TIMING = ")
        json.dump(timing, f, ensure_ascii=False, indent=1)
        f.write(";\n  root.DAY2_BONUS_FINAL_TIMING = DAY2_BONUS_FINAL_TIMING;\n")
        f.write("  if (typeof module !== 'undefined' && module.exports) module.exports = DAY2_BONUS_FINAL_TIMING;\n")
        f.write("})(typeof window !== 'undefined' ? window : globalThis);\n")

    voice48_full = decode_stereo_48k(voice_path, source_audio, source_sr)
    crop_i = int(round(first_source_start * SR))
    voice48_cropped = voice48_full[crop_i:].copy()
    total_n = int(round(duration * SR))
    voice_stereo = np.zeros((total_n, 2), dtype=np.float32)

    # The dialogue remains one continuous take after the leading-silence
    # crop.  In particular, B06 starts at its measured base-timeline time;
    # no music-only section is inserted between B05 and B06.
    voice_take = min(len(voice48_cropped), total_n)
    if voice_take > 0:
        voice_stereo[:voice_take] += voice48_cropped[:voice_take]

    # A 5 ms fade only at the production-track head; the archived source WAV
    # itself is untouched.
    fade_n = int(0.005 * SR)
    if total_n > fade_n:
        voice_stereo[:fade_n] *= np.linspace(0, 1, fade_n, dtype=np.float32)[:, None]
    voice_stereo *= 0.92

    bgm = generate_bgm(duration)[:total_n]
    if len(bgm) < total_n:
        bgm = np.pad(bgm, (0, total_n - len(bgm)))
    mix = voice_stereo + np.stack([bgm, bgm], axis=1) * 0.45
    peak_before_normalize = float(np.max(np.abs(mix))) if len(mix) else 0.0
    normalize_scale = 0.89 / peak_before_normalize if peak_before_normalize > 0 else 1.0
    mix = np.clip(mix * normalize_scale, -0.98, 0.98).astype(np.float32)
    write_wav16(video_root / "assets" / "day2_bonus_final_track.wav", mix, SR)

    # Add final mix measurements to the report after the track exists.
    report["production_track"] = {
        "file": "assets/day2_bonus_final_track.wav (video-fx working copy)",
        "sample_rate_hz": SR,
        "channels": 2,
        "peak_before_normalize": round(peak_before_normalize, 6),
        "normalize_scale_to_peak_0.89": round(float(normalize_scale), 6),
        "peak": round(float(np.max(np.abs(mix))), 6),
        "clipped_samples_ge_0.999": int(np.sum(np.abs(mix) >= 0.999)),
        "bgm": "generated 128 BPM Am-F-C-G chiptune family, stereo duplicated mono, gain 0.45 before final peak normalization",
        "voice_gain_before_normalize": 0.92,
        "inserted_music_only_duration_seconds": insert_duration,
    }
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

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
        "energy": rms_frames(mix.mean(axis=1), nf),
        "bass": rms_frames(bgm, nf),
        "treble": rms_frames(bgm, nf),
        "voice": rms_frames(voice_stereo.mean(axis=1), nf),
    }
    with (video_root / "assets" / "day2_bonus_final_envelope.js").open("w", encoding="utf-8") as f:
        f.write("// Auto-generated by tools/day2加更制作/gen_bonus_finalvoice.py\nwindow.AUDIO_DATA = ")
        json.dump(env, f)
        f.write(";\n")

    print(
        f"[Day2 bonus user-provided voice · measured] source={source_duration:.3f}s "
        f"crop_start={first_source_start:.3f}s insert={insert_duration:.3f}s duration={duration:.3f}s"
    )
    print(
        f"source sha256={source_sha} peak={round(source_peak,6)} clipped={report['source_clipped_samples_ge_0.999']} "
        f"F0median={full_f0['f0_median_hz']}Hz"
    )
    print(
        f"catalog {catalog_start:.3f}-{catalog_end:.3f}s; pixel item={catalog['pixel_item_seconds']}s; "
        f"pose item={catalog['pose_item_seconds']}s"
    )
    for cue, item in zip(cues, report_items):
        print(
            f"  {cue['id']} src {item['source_start']:6.3f}-{item['source_end']:6.3f} "
            f"timeline {cue['start']:6.3f}-{cue['end']:6.3f} dur={cue['duration_seconds']:.3f}s "
            f"F0={item['f0_median_hz']}Hz peak={item['peak']} clipped={item['clipped_samples']}  {cue['tts']}"
        )
    print(f"OK: {timing_path}")
    print(f"OK: {report_path}")


if __name__ == "__main__":
    main()
