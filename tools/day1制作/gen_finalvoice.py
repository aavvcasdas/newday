#!/usr/bin/env python3
# day1_tools/gen_finalvoice.py — 用用户提供的连续最终配音 WAV 重排 Day1 时间轴
#
# 输入不是逐句 TTS 文件，而是一整段 WAV。流程：
#   1) 读取 Vosk small-cn 的词级时间戳（vosk_words.json）；
#   2) 按人工核对过的词序号把 255 个词映射到 L01-L27；
#   3) 用 5ms RMS 波形把每个 cue 的起止点从 ASR 粗边界修到真实发声边界；
#   4) 保留原 WAV 内部的全部停顿，只在前面加 2.6s 标题卡静音；
#   5) 输出 src/day1_timing.js、src/lyrics.js 的 LY、assets/day1_track.wav
#      （沿用原 chiptune BGM + 用户配音）和 assets/day1_envelope.js。
#
# 注意：WAV 本身没有写入合成引擎/音色元数据，所以 timing 只标记
# user-provided/final-voice-wav，不把它冒充成某个已核验的 TTS 引擎。

import argparse
import hashlib
import json
import math
import os
import re
import subprocess
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_all import BEAT, END_LEN, SUBS, TAIL, TITLE_LEN  # noqa: E402
from say import f0_stats_from_pcm  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
ENGINE_ID = "user-provided/final-voice-wav"
ASR_MODEL = "vosk-model-small-cn-0.22"

# Vosk 词序号（1-based，含两端）。这组映射已按识别文本逐条核对：
# L01 大家好…没摸鱼，L02 昨天…门口，……，L27 鲸鱼绝不摸鱼…吃口饭。
WORD_RANGES = [
    (1, 8), (9, 16), (17, 22), (23, 30), (31, 38), (39, 46), (47, 52),
    (53, 62), (63, 69), (70, 80), (81, 86), (87, 97), (98, 107),
    (108, 120), (121, 133), (134, 144), (145, 153), (154, 163),
    (164, 171), (172, 183), (184, 200), (201, 206), (207, 217),
    (218, 228), (229, 237), (238, 244), (245, 255),
]


def ffmpeg_bin():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


FF = ffmpeg_bin()


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def read_wav(path):
    with wave.open(path, "rb") as w:
        sr = w.getframerate()
        ch = w.getnchannels()
        sw = w.getsampwidth()
        n = w.getnframes()
        raw = w.readframes(n)
    if sw != 2:
        raise SystemExit(f"只支持 16-bit PCM WAV，当前 sampwidth={sw}")
    audio = np.frombuffer(raw, dtype="<i2").astype(np.float32).reshape(-1, ch) / 32768.0
    return audio, sr, ch


def decode_stereo_48k(path):
    raw = subprocess.run(
        [FF, "-v", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def frame_db(mono, sr, hop_sec=0.005):
    win = int(round(sr * hop_sec))
    n = len(mono) // win
    rms = np.sqrt(np.mean(mono[: n * win].reshape(n, win) ** 2, axis=1) + 1e-12)
    return 20 * np.log10(rms), hop_sec


def refine_boundaries(words, mono, sr):
    db, hop = frame_db(mono, sr)
    active = db >= -48.0
    total_frames = len(db)

    def onset_near(t, prev_end):
        lo = max(0, int(max(prev_end + 0.01, t - 0.55) / hop))
        hi = min(total_frames - 1, int((t + 0.20) / hop))
        for i in range(lo, hi):
            if active[i] and np.sum(active[i : i + 6]) >= 5:
                j = i
                while j > lo and db[j - 1] >= -60.0 and i - j < 16:
                    j -= 1
                return round(j * hop, 3)
        return round(t, 3)

    def offset_near(t):
        lo = max(0, int((t - 0.25) / hop))
        hi = min(total_frames - 1, int((t + 0.55) / hop))
        i = max(lo, int(t / hop))
        while i < hi:
            if not active[i]:
                j = i
                while j < hi and not active[j]:
                    j += 1
                if j - i >= 12:  # >=60ms 的真静音才算句尾
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
        prev_end = words[ia - 2]["end"] if ia > 1 else 0.0
        start = onset_near(float(ws[0]["start"]), float(prev_end))
        end = offset_near(float(ws[-1]["end"]))
        refined.append({
            "word_index_start": ia,
            "word_index_end": ib,
            "asr_start": round(float(ws[0]["start"]), 3),
            "asr_end": round(float(ws[-1]["end"]), 3),
            "source_start": start,
            "source_end": end,
            "asr_words": [str(w.get("word", "")) for w in ws],
        })
    return refined


def generate_bgm(duration):
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


def rms_frames(x, nf):
    per = SR // 30
    out = []
    for i in range(nf):
        seg = x[i * per : (i + 1) * per]
        out.append(float(np.sqrt(np.mean(seg ** 2))) if len(seg) else 0.0)
    m = max(out) or 1.0
    return [round(min(1.0, v / m), 3) for v in out]


def parse_args(argv=None):
    ap = argparse.ArgumentParser(description="Day1 user-provided final voice alignment/track generator")
    ap.add_argument("--voice", default=os.path.join(ROOT, "day1_audio_final", "final_voice.wav"))
    ap.add_argument("--vosk-json", default=os.path.join(ROOT, "day1_audio_final", "vosk_words.json"))
    ap.add_argument("--script", default=os.path.join(ROOT, "..", "ai-yunying", "Day1", "Day1配音台词.txt"))
    ap.add_argument("--audio-dir", default=os.path.join(ROOT, "day1_audio_final"))
    return ap.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    voice_path = os.path.abspath(args.voice)
    vosk_path = os.path.abspath(args.vosk_json)
    audio_dir = os.path.abspath(args.audio_dir)
    os.makedirs(audio_dir, exist_ok=True)

    lines = [line.strip() for line in open(args.script, encoding="utf-8") if line.strip()]
    if len(lines) != 27 or len(SUBS) != 27 or len(WORD_RANGES) != 27:
        raise SystemExit("台词、字幕与词序号映射必须同为 27 条")

    segments = json.load(open(vosk_path, encoding="utf-8"))
    words = []
    for seg in segments:
        words.extend(seg.get("result", []))
    if len(words) != 255:
        raise SystemExit(f"Vosk 词数应为 255，实得 {len(words)}；词序号映射已失效，禁止套用")

    source_audio, source_sr, source_ch = read_wav(voice_path)
    source_mono = source_audio.mean(axis=1)
    source_duration = len(source_audio) / source_sr
    refined = refine_boundaries(words, source_mono, source_sr)

    cues = []
    report_items = []
    for i, (line, sub, r) in enumerate(zip(lines, SUBS, refined), 1):
        source_start = float(r["source_start"])
        source_end = float(r["source_end"])
        if not (0 <= source_start < source_end <= source_duration + 0.01):
            raise SystemExit(f"L{i:02d} 对齐边界无效: {source_start}-{source_end}")
        i0 = int(round(source_start * source_sr))
        i1 = int(round(source_end * source_sr))
        clip = source_audio[i0:i1]
        clip_mono = source_mono[i0:i1]
        f0 = f0_stats_from_pcm(clip_mono, source_sr)
        peak = float(np.max(np.abs(clip))) if len(clip) else 0.0
        clipped = int(np.sum(np.abs(clip) >= 0.999)) if len(clip) else 0

        # 逐 cue 切片只作对齐 QA；成片音轨仍使用整段 WAV，避免拼接点咔哒声。
        clip_name = f"L{i:02d}.wav"
        clip_path = os.path.join(audio_dir, clip_name)
        clip_out = clip.copy()
        fade_n = min(int(0.005 * source_sr), len(clip_out) // 2)
        if fade_n > 1:
            ramp = np.linspace(0, 1, fade_n, dtype=np.float32)[:, None]
            clip_out[:fade_n] *= ramp
            clip_out[-fade_n:] *= ramp[::-1]
        with wave.open(clip_path, "wb") as w:
            w.setnchannels(source_ch)
            w.setsampwidth(2)
            w.setframerate(source_sr)
            w.writeframes((np.clip(clip_out, -1, 1) * 32767).astype("<i2").tobytes())

        timeline_start = round(TITLE_LEN + source_start, 3)
        timeline_end = round(TITLE_LEN + source_end, 3)
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
        report_items.append({
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
        })

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
    report = {
        "schema": 1,
        "kind": "continuous_user_provided_voice_alignment",
        "engine": ENGINE_ID,
        "measured": True,
        "dirty": False,
        "final_voice": True,
        "placeholder": False,
        "synthesis_engine_known": False,
        "synthesis_engine_note": "WAV has no embedded synthesis engine/voice metadata; do not relabel it as a verified TTS engine.",
        "source_file": os.path.basename(voice_path),
        "source_sha256": sha256_file(voice_path),
        "source_sample_rate_hz": source_sr,
        "source_channels": source_ch,
        "source_duration_seconds": round(source_duration, 3),
        "source_peak": round(float(np.max(np.abs(source_audio))), 6),
        "source_clipped_samples_ge_0.999": int(np.sum(np.abs(source_audio) >= 0.999)),
        "source_f0": full_f0,
        "asr_model": ASR_MODEL,
        "asr_words_file": os.path.basename(vosk_path),
        "asr_words_sha256": sha256_file(vosk_path),
        "asr_word_count": len(words),
        "alignment_method": "Vosk word timestamps mapped by fixed word-index ranges, refined with 5ms RMS onset/offset detection",
        "title_offset_seconds": TITLE_LEN,
        "timeline_duration_seconds": duration,
        "items": report_items,
    }
    report_path = os.path.join(audio_dir, "alignment_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    timing = {
        "duration": duration,
        "title": [0.0, TITLE_LEN],
        "endcard": endcard,
        "voice": True,
        "measured": True,
        "voice_engine": ENGINE_ID,
        "voice_final": True,
        "voice_placeholder": False,
        "duration_source": "measured user-provided final voice WAV (Vosk word timestamps + waveform refinement)",
        "manifest": os.path.relpath(report_path, ROOT),
        "timing_reused": False,
        "duration_deviation_threshold": 0.08,
        "source_voice_sha256": report["source_sha256"],
        "cues": cues,
    }
    with open(os.path.join(ROOT, "src", "day1_timing.js"), "w", encoding="utf-8") as f:
        f.write("// Auto-generated by day1_tools/gen_finalvoice.py — DO NOT EDIT BY HAND\n")
        f.write("(function (root) {\n  const DAY1_TIMING = ")
        json.dump(timing, f, ensure_ascii=False, indent=1)
        f.write(";\n  root.DAY1_TIMING = DAY1_TIMING;\n")
        f.write("  if (typeof module !== 'undefined' && module.exports) module.exports = DAY1_TIMING;\n")
        f.write("})(typeof window !== 'undefined' ? window : globalThis);\n")

    ly = ["  const LY = ["]
    ly.append(f"    [0.30, {TITLE_LEN:.2f}, '【Day 1】AI 运营第二天，名字被粉丝改了', 'SYSTEM'],")
    for c in cues:
        s = c["sub"].replace("'", "’")
        ly.append(f"    [{c['start']:.2f}, {c['end']:.2f}, '{s}', '深海鲸鱼娘'],")
    ly.append(f"    [{endcard[0]:.2f}, {endcard[1]:.2f}, '鲸鱼娘运营日志 · Day 1 完（没拆的 305 封，今晚继续回）', 'SYSTEM']")
    ly.append("  ];")
    lp = os.path.join(ROOT, "src", "lyrics.js")
    src = open(lp, encoding="utf-8").read()
    src2 = re.sub(r"  const LY = \[.*?\n  \];", "\n".join(ly), src, count=1, flags=re.S)
    if src2 == src:
        raise SystemExit("lyrics.js LY 替换失败")
    open(lp, "w", encoding="utf-8").write(src2)

    # 整段人声只做采样率转换与标题静音平移，保留原停顿和立体声。
    voice48 = decode_stereo_48k(voice_path)
    if len(voice48) > int(0.03 * SR):
        fade_n = int(0.03 * SR)
        voice48[-fade_n:] *= np.linspace(1, 0, fade_n, dtype=np.float32)[:, None]

    total_n = int(duration * SR)
    voice_stereo = np.zeros((total_n, 2), dtype=np.float32)
    offset = int(TITLE_LEN * SR)
    take = min(len(voice48), total_n - offset)
    voice_stereo[offset : offset + take] += voice48[:take] * 0.92

    bgm = generate_bgm(duration)
    bgm_stereo = np.stack([bgm, bgm], axis=1) * 0.45
    mix = voice_stereo + bgm_stereo
    peak_before_limit = float(np.max(np.abs(mix))) if len(mix) else 0.0
    if peak_before_limit > 0.89:
        mix = mix * (0.89 / peak_before_limit)
    mix = np.clip(mix, -0.98, 0.98)

    with wave.open(os.path.join(ROOT, "assets", "day1_track.wav"), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((mix * 32767).astype("<i2").tobytes())

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
    with open(os.path.join(ROOT, "assets", "day1_envelope.js"), "w", encoding="utf-8") as f:
        f.write("// Auto-generated by day1_tools/gen_finalvoice.py\nwindow.AUDIO_DATA = ")
        json.dump(env, f)
        f.write(";\n")

    print(f"[user-provided final voice · measured alignment] source={source_duration:.3f}s timeline={duration:.3f}s")
    print(f"source sha256={report['source_sha256']} peak={report['source_peak']} clipped={report['source_clipped_samples_ge_0.999']} F0median={full_f0['f0_median_hz']}Hz")
    for c, item in zip(cues, report_items):
        print(
            f"  L{c['id']:02d} src {item['source_start']:6.3f}-{item['source_end']:6.3f} "
            f"timeline {c['start']:6.3f}-{c['end']:6.3f} dur={c['duration_seconds']:.3f}s "
            f"F0={item['f0_median_hz']}Hz peak={item['peak']} clipped={item['clipped_samples']}  {c['tts']}"
        )
    print("OK: src/day1_timing.js, src/lyrics.js, assets/day1_track.wav, assets/day1_envelope.js")
    print(f"OK: {os.path.relpath(report_path, ROOT)}")


if __name__ == "__main__":
    main()
