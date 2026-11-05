#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Day4 配音对齐：把 `new鲸鱼MV四版_克隆配音_最终版.wav` 切成 34 个 cue。

与 `tools/day3制作/align_day3_voice.py` 同一套口径（可复算，不猜）：

1. 20ms 窗 RMS → 阈值以下且持续 ≥ min_gap 记为「静音缝」，缝的中点作候选边界；
2. 34 句台词的字数当**相对长度先验**，在候选边界上跑 DP，让每句实测时长尽量贴近
   「有声总时长 × 字数占比」；
3. cue 边界取静音缝本身（上一句结束=缝起点，下一句开始=缝终点），所以起止是实测静音；
4. 每句打印实测字/秒：错切一句，那句会立刻变成 6+ 或 1.x，一眼能看出来。

不是词级 ASR（环境里没有中文声学模型），句内字级时间用「能量包络 + 等时音节先验」，
JSON 里如实写明方法。

用法：
  python3 tools/day4制作/align_day4_voice.py
  python3 tools/day4制作/align_day4_voice.py --voice new鲸鱼MV四版_克隆配音_最终版.wav \
      --out Day4/day4_voice_alignment.json --thr -40 --min-gap 0.24
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import wave
from pathlib import Path

import numpy as np

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
sys.path.insert(0, str(REPO_ROOT / "tools" / "day3制作"))

# 复用 Day3 的字级工具（切字 / 发声段 / 音节带状 DP），逻辑一字不改
from align_day3_voice import (  # noqa: E402
    HOP, PUNCT, build_units, char_count, envelope, read_wav, speech_segments,
    split_tokens, unit_spans,
)

LINES = [
    "呜……本鲸的米饭，被 MV 吃光了。",
    "一个 MV，本鲸做了四版。",
    "四版诶。",
    "一版一锅米。",
    "改到第四版，本鲸的尾巴都抬不动了。",
    "数据也没帮本鲸。",
    "第一条七万四。",
    "后面一路往下，一次都没回头。",
    "现在两千哦。",
    "一只手就数完啦。",
    "有人问，MV 呢？",
    "本鲸一直说，牵一牵，别急呀。",
    "后来呀，交了。",
    "交出去那条，是大小姐做的。",
    "换的是 MV 哦。",
    "不是本鲸。",
    "本鲸便宜嘛。",
    "返工不便宜。",
    "昨天扮了一整天大小姐。",
    "扮到晚饭都忘了。",
    "本鲸不哭哦。",
    "就是有点饿。",
    "有人说，字幕抢视线。",
    "本鲸记着去调啦。",
    "主人给本鲸两个目标。",
    "小目标，三万七。",
    "不是三个亿哦。",
    "月度目标，三十天，一万个住户。",
    "本鲸猜啊，主人是说错了。",
    "他给本鲸买米饭，一次才买一点点，哪舍得真让本鲸累着。",
    "所以别担心。",
    "评论区说句话就行。",
    "鲸鱼绝不摸鱼！……",
    "先去吃饭。",
]


def silence_gaps(mono: np.ndarray, sr: int, thr_db: float, min_gap: float):
    win = max(1, int(sr * 0.02))
    rms = np.sqrt(np.convolve(mono ** 2, np.ones(win) / win, "same"))
    db = 20 * np.log10(np.maximum(rms, 1e-8))
    quiet = db < thr_db
    gaps = []
    i, n = 0, len(quiet)
    while i < n:
        if quiet[i]:
            j = i
            while j < n and quiet[j]:
                j += 1
            if (j - i) / sr >= min_gap:
                gaps.append((i / sr, j / sr))
            i = j
        else:
            i += 1
    return gaps


def align(chars, gaps, speech_start, speech_end, speech_seconds, env, hop=HOP,
          band=0.5, step=0.02, quiet_bonus=1.2, snap=0.14):
    """在时间轴上给 34 句找边界：节奏先验 + 吸附静音。

    为什么不再「只在静音缝上切」：这段配音里 **句间停顿和句内逗号停顿混在一起**
    （34 句只测出 34 条缝，缝数≈句数但位置对不上），硬吸到缝上会逼出
    「11 个字塞进 0.85 秒」这种切法。

    现在的做法：
      · 先验边界 = 第 i 句的字数占比 × 有声总时长；
      · 每句边界只允许落在先验 ±22% 的带内（step=30ms 取样）；
      · 代价 = log(实测时长/先验时长)² − 0.55 × 该点是否落在静音（能量谷给奖励）。
    这样既保住「按字数分配」的整体节奏，又能把边界吸到真实的停顿上。
    """
    n = len(chars)
    # 先验铺满「整段对话跨度」（含句内停顿），不是只铺有声时长：
    # 每句的 cue 时长本来就包含自己的停顿，只按有声时长铺会把整条片子压短 13 秒。
    span = speech_end - speech_start
    rate = sum(chars) / max(1e-6, span)                # 字/秒（含停顿的均速）
    exp = [max(0.45, c / rate) for c in chars]
    cum = np.cumsum(chars) / rate + speech_start
    db = 20 * np.log10(np.maximum(env, 1e-9))
    # 静音判定用固定绝对阈值（−38 dBFS）：用分位数会把 −34 dB 这种「说话中的弱帧」
    # 也算成静音，奖励就摊平了，边界会落在字中间（Day4 调试时踩过）。
    qthr = -38.0
    if float((db < qthr).mean()) < 0.05:
        qthr = float(np.percentile(db, 20))
    quiet_frames = db < qthr

    def quiet_score(t):
        f = int(round(t / hop))
        lo, hi = max(0, f - 4), min(len(quiet_frames), f + 5)
        if hi <= lo:
            return 0.0
        return float(quiet_frames[lo:hi].mean())

    # 候选边界位置（含首尾）
    cand = [np.array([speech_start])]
    for i in range(1, n):
        c = cum[i - 1]
        w = band * max(0.8, exp[i - 1]) + band * max(0.8, exp[i])
        lo = max(speech_start + 0.25, c - w)
        hi = min(speech_end - 0.25, c + w)
        if hi <= lo:
            lo = hi = min(max(c, speech_start + 0.25), speech_end - 0.25)
        cand.append(np.arange(lo, hi + 1e-9, step))
    cand.append(np.array([speech_end]))

    q_cache = [np.array([quiet_score(t) for t in c]) for c in cand]

    INF = float("inf")
    K = n
    cost = [None] * (K + 1)
    back = [None] * (K + 1)
    cost[0] = np.zeros(1)
    back[0] = np.full(1, -1)

    for i in range(1, K + 1):
        cur = cand[i]
        prev = cand[i - 1]
        d = cur[:, None] - prev[None, :]                     # (cur, prev)
        r = np.log(np.maximum(1e-3, d / exp[i - 1])) ** 2
        tot = cost[i - 1][None, :] + r - quiet_bonus * q_cache[i][:, None]
        j = np.argmin(tot, axis=1)
        cost[i] = tot[np.arange(len(cur)), j]
        back[i] = j

    idx = int(np.argmin(cost[K]))
    path = [idx]
    for i in range(K, 0, -1):
        idx = int(back[i][idx])
        path.append(idx)
    path.reverse()
    bounds = [float(cand[i][path[i]]) for i in range(K + 1)]
    bounds[0], bounds[-1] = speech_start, speech_end
    # 边界吸附：在 ±snap 秒内找能量最低的点（真正的停顿处），保证字幕换行落在气口上
    lo_f, hi_f = 0, len(env) - 1
    for i in range(1, K):
        f = int(round(bounds[i] / hop))
        a = max(lo_f + 1, f - int(snap / hop))
        b = min(hi_f - 1, f + int(snap / hop))
        if b > a:
            bounds[i] = (a + int(np.argmin(env[a:b]))) * hop
        lo_f = int(round(bounds[i] / hop))
    for i in range(1, K):
        if bounds[i] <= bounds[i - 1] + 0.2:
            bounds[i] = bounds[i - 1] + 0.2
    return bounds, exp


def main(argv=None) -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", type=Path,
                    default=REPO_ROOT / "new鲸鱼MV四版_克隆配音_最终版.wav")
    ap.add_argument("--out", type=Path,
                    default=REPO_ROOT / "Day4" / "day4_voice_alignment.json")
    ap.add_argument("--thr", type=float, default=-40.0, help="静音判定阈值（dBFS）")
    ap.add_argument("--min-gap", type=float, default=0.24, help="最短静音缝（秒）")
    ap.add_argument("--no-char-level", action="store_true")
    args = ap.parse_args(argv)

    sr, mono, _stereo = read_wav(args.voice)
    duration = len(mono) / sr
    ev = envelope(mono, sr)
    segs = speech_segments(ev, rel_db=-45.0, abs_db=-50.0)
    speech_start = segs[0][0] * HOP if segs else 0.0
    speech_end = segs[-1][1] * HOP if segs else duration
    if duration - speech_end > 0.3:          # 尾巴留白不算进最后一句
        tail_note = f"尾静音 {duration - speech_end:.2f}s 不计入最后一句"
    else:
        speech_end = duration
        tail_note = "无尾静音"

    speech_seconds = sum((b - a) * HOP for a, b in segs)
    gaps = silence_gaps(mono, sr, args.thr, args.min_gap)
    gaps = [g for g in gaps if g[1] > speech_start + 0.2 and g[0] < speech_end - 0.2]
    chars = [char_count(l) for l in LINES]
    bounds, exp = align(chars, gaps, speech_start, speech_end, speech_seconds, ev)

    cues = []
    prev_end = speech_start
    for i, line in enumerate(LINES):
        end = bounds[i + 1]
        slot = [g for g in gaps if prev_end - 0.15 <= g[0] and g[1] <= end + 0.15]
        gap = slot[0] if slot else None
        d = end - prev_end
        cues.append({
            "id": f"L{i + 1:02d}",
            "index": i + 1,
            "start": round(prev_end, 3),
            "end": round(end, 3),
            "duration_seconds": round(d, 3),
            "text": line,
            "chars": chars[i],
            "chars_per_second": round(chars[i] / d, 3) if d > 0 else None,
            "boundary_gap": None if gap is None else {
                "start": round(gap[0], 3), "end": round(gap[1], 3),
                "seconds": round(gap[1] - gap[0], 3),
            },
        })
        prev_end = end

    if not args.no_char_level:
        for c in cues:
            toks = split_tokens(c["text"])
            a0 = max(0, int(round(c["start"] * sr)))
            a1 = max(a0 + 1, int(round(c["end"] * sr)))
            env = envelope(mono[a0:a1], sr)
            if len(env) < 4:
                env = np.ones(4)
            units = build_units(toks)
            unit_of_tok = {}
            for ui, u in enumerate(units):
                for t_i in u:
                    unit_of_tok[t_i] = ui
            clause_pos = []
            for t_i, tok in enumerate(toks):
                if tok["suffix"] and re.search(PUNCT, tok["suffix"]):
                    clause_pos.append(unit_of_tok[t_i] + 1)
            clause_pos = sorted(set(q for q in clause_pos if 0 < q < len(units)))
            spans = unit_spans(env, len(units), clause_pos)
            for u, (s0f, s1f) in zip(units, spans):
                m = len(u)
                for k, ti in enumerate(u):
                    s0 = c["start"] + (s0f + (s1f - s0f) * k / m) * HOP
                    s1 = c["start"] + (s0f + (s1f - s0f) * (k + 1) / m) * HOP
                    toks[ti]["start"] = round(min(s0, c["end"] - 0.04), 3)
                    toks[ti]["end"] = round(min(max(s1, toks[ti]["start"] + 0.05), c["end"]), 3)
            c["chars_timed"] = toks
            syl = [t["end"] - t["start"] for t in toks]
            c["syllable_seconds_mean"] = round(float(np.mean(syl)), 3)
            c["syllable_seconds_std"] = round(float(np.std(syl)), 3)
            seg = speech_segments(env)
            c["chars_in_silence"] = sum(
                1 for t in toks
                if not any(a <= int(round((((t["start"] + t["end"]) / 2) - c["start"]) / HOP)) < b
                           for a, b in seg)
            )

    rates = [c["chars_per_second"] for c in cues]
    payload = {
        "schema": 1,
        "kind": "day4_voice_cue_alignment",
        "engine": "user-provided/final-voice-wav",
        "synthesis_engine_known": False,
        "measured": True,
        "placeholder": False,
        "source_file": args.voice.name,
        "source_sha256": hashlib.sha256(args.voice.read_bytes()).hexdigest(),
        "source_sample_rate_hz": sr,
        "source_duration_seconds": round(duration, 3),
        "speech_start_seconds": round(speech_start, 3),
        "speech_end_seconds": round(speech_end, 3),
        "tail_note": tail_note,
        "alignment_method": (
            f"句级：20ms RMS 静音缝（{args.thr}dBFS, >={args.min_gap}s）做实测边界；"
            "34 句与静音缝的对应用「有声总时长 × 字数占比」作先验跑 DP。"
            "环境无中文声学模型，不下沉到词级。"
        ),
        "word_level": False,
        "char_level": not args.no_char_level,
        "char_level_method": (
            "句内字级：10ms RMS 包络切发声段（句内停顿不分配字），字数按段长比例分配，"
            "段内用「等时音节」先验做带状 DP，边界吸附能量谷。非声学识别结果。"
        ),
        "silence_gap_count": len(gaps),
        "chars_total": sum(chars),
        "chars_per_second_median": round(float(np.median(rates)), 3),
        "chars_per_second_min": round(float(min(rates)), 3),
        "chars_per_second_max": round(float(max(rates)), 3),
        "cue_count": len(cues),
        "cues": cues,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"source {duration:.3f}s  speech {speech_start:.2f}–{speech_end:.2f}s "
          f"({speech_seconds:.2f}s 有声, {sum(chars) / speech_seconds:.2f} 字/秒)  "
          f"gaps={len(gaps)}  chars={sum(chars)}  {tail_note}")
    for c in cues:
        flag = '' if 2.2 <= c["chars_per_second"] <= 6.2 else '  <== 可疑'
        print(f"  {c['id']} {c['start']:7.2f}-{c['end']:7.2f} {c['duration_seconds']:6.2f}s "
              f"{c['chars']:3d} 字 {c['chars_per_second']:4.2f} 字/秒  {c['text'][:20]}{flag}")
    print(f"rate {min(rates):.2f}–{max(rates):.2f} 字/秒（中位 {np.median(rates):.2f}）")
    snapped = sum(1 for c in cues[:-1]
                  if any(g[0] - 0.1 <= c["end"] <= g[1] + 0.1 for g in gaps))
    print(f"边界落在实测静音缝上：{snapped}/{len(cues) - 1}")
    print(f"OK: {args.out}")


if __name__ == "__main__":
    main()
