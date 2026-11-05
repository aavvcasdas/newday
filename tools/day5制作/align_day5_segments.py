#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Day5 语音对齐（段级）：先切「发声段」，再把发声段成组分配给 40 句。

为什么重写
----------
上一版（`align_day5_voice.py`）是「在时间轴上按字数比例找边界，再吸到能量谷」。
它在长停顿处会把边界放到**停顿中间**，于是：

  · 例：`诶？` 实际在 23.36–23.99，上一版给的 cue 是 22.64–22.92 —— 字幕在**静音里**
    就弹出来了，等声音到的时候已经换屏。这就是用户看到的「字幕没对上」。

这一版换成**段级分配**，从结构上不允许边界落在静音里：

1. 10ms RMS 包络 → 发声段（`speech_segments`），本片 51 段；
2. 51 段要分给 40 句 → 有 11 处句内停顿；
3. DP：第 i 句覆盖段区间 [k, j)，代价 =
      (log(该句有声时长 / 该句字数÷全片语速))²        ← 时长要和字数对得上
    + 0.35 × max(0, 组内段数 − 1 − 该句标点数)²          ← 没有逗号的句子不许乱断
    − 0.06 × 边界处停顿时长                              ← 长停顿更可能是句界
4. 于是 **每句起点=它第一个发声段的起点，终点=最后一个发声段的终点**，
   句与句之间天然是静音，字幕不可能抢在声音前面。

输出 schema 与 `day5_voice_alignment.json` 相同（渲染器不用改），
额外写 `speech_segments` 供字幕脚本复用。

用法：
  python3 tools/day5制作/align_day5_segments.py
  python3 tools/day5制作/align_day5_segments.py --voice day5.wav --out Day5/day5_voice_alignment.json
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

import numpy as np

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
sys.path.insert(0, str(REPO_ROOT / "tools" / "day3制作"))

from align_day3_voice import HOP, envelope, read_wav, speech_segments  # noqa: E402

PUNCT = r"[\s，。！？…—：；、,.!?\"“”‘’（）()《》·]"
PAUSE_PUNCT = r"[，…—]"


def load_lines(path: Path) -> list[str]:
    return [l.strip() for l in path.read_text(encoding="utf-8").splitlines() if l.strip()]


def char_count(text: str) -> int:
    return len(re.sub(PUNCT, "", text)) or 1


def expected_pauses(text: str) -> int:
    return len(re.findall(PAUSE_PUNCT, text))


def assign(lines: list[str], segs: list[tuple[float, float]]):
    """把 segs 成组分给 lines，返回每句的段区间 [(k, j), ...]。"""
    n, m = len(lines), len(segs)
    if m < n:
        raise SystemExit(f"发声段只有 {m} 段，台词却有 {n} 句：配音和台词条数不匹配")
    chars = [char_count(l) for l in lines]
    pauses = [expected_pauses(l) for l in lines]
    dur = np.array([b - a for a, b in segs])
    cum = np.concatenate([[0.0], np.cumsum(dur)])
    rate = chars_total = sum(chars) / max(1e-6, cum[-1])       # 全片语速（字/有声秒）

    # cost[i][k] = 前 i 句正好用完前 k 段的最小代价
    INF = float("inf")
    cost = np.full((n + 1, m + 1), INF)
    back = np.full((n + 1, m + 1), -1, dtype=int)
    cost[0][0] = 0.0
    for i in range(1, n + 1):
        target = chars[i - 1] / rate
        for j in range(i, m - (n - i) + 1):          # 第 i 句cover到 j（不含）
            best, arg = INF, -1
            for k in range(i - 1, j):
                if cost[i - 1][k] == INF:
                    continue
                v = cum[j] - cum[k]
                nseg = j - k
                over = max(0, nseg - 1 - pauses[i - 1])
                c = cost[i - 1][k] + np.log(max(1e-3, v / target)) ** 2 \
                    + 0.35 * over * over
                if k > 0:
                    c -= 0.06 * (segs[k][0] - segs[k - 1][1])      # 长停顿更像句界
                if c < best:
                    best, arg = c, k
            cost[i][j] = best
            back[i][j] = arg
    groups, j = [], m
    for i in range(n, 0, -1):
        k = int(back[i][j])
        groups.append((k, j))
        j = k
    groups.reverse()
    return groups, chars, rate


def main(argv=None) -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", type=Path, default=REPO_ROOT / "day5.wav")
    ap.add_argument("--lines", type=Path, default=REPO_ROOT / "Day5" / "Day5配音台词.txt")
    ap.add_argument("--out", type=Path, default=REPO_ROOT / "Day5" / "day5_voice_alignment.json")
    args = ap.parse_args(argv)

    sr, mono, _ = read_wav(args.voice)
    dur_total = len(mono) / sr
    env = envelope(mono, sr)
    raw = speech_segments(env, rel_db=-45.0, abs_db=-50.0)
    segs = [(a * HOP, b * HOP) for a, b in raw]
    lines = load_lines(args.lines)
    groups, chars, rate = assign(lines, segs)

    cues, prev_end = [], None
    for i, ((k, j), line) in enumerate(zip(groups, lines)):
        s, e = segs[k][0], segs[j - 1][1]
        d = e - s
        inner = j - k - 1
        toks = []
        # 句内字级：只按「发声段 + 字数比例」铺，供老字幕路径兜底（新路径不用它）
        cps = [t for t in re.findall(r"[A-Za-z]+|[\u4e00-\u9fff]|[^\s]", line)]
        total = sum(len(t) if t.isascii() and t.isalpha() else 1 for t in cps) or 1
        acc = 0
        for t in cps:
            n = len(t) if t.isascii() and t.isalpha() else 1
            s0 = s + (e - s) * acc / total
            acc += n
            s1 = s + (e - s) * acc / total
            toks.append({"ch": t, "suffix": "", "start": round(s0, 3), "end": round(s1, 3)})
        cues.append({
            "id": f"L{i + 1:02d}",
            "index": i + 1,
            "start": round(s, 3),
            "end": round(e, 3),
            "duration_seconds": round(d, 3),
            "gap_before": None if prev_end is None else round(max(0.0, s - prev_end), 3),
            "text": line,
            "chars": chars[i],
            "chars_per_second": round(chars[i] / d, 3) if d > 0 else None,
            "speech_segments": inner + 1,
            "segments": [[round(segs[t][0], 3), round(segs[t][1], 3)] for t in range(k, j)],
            "chars_timed": toks,
        })
        prev_end = e

    payload = {
        "schema": 2,
        "kind": "day5_voice_cue_alignment",
        "measured": True,
        "placeholder": False,
        "source_file": args.voice.name,
        "source_sha256": hashlib.sha256(args.voice.read_bytes()).hexdigest(),
        "source_sample_rate_hz": sr,
        "source_duration_seconds": round(dur_total, 3),
        "alignment_method": (
            "段级分配：10ms RMS 发声段 %d 段成组分给 %d 句（DP：时长↔字数 + 段数↔标点数 + 停顿长度）。"
            "每句起点=首个发声段起点，终点=末个发声段终点，句界必落在静音里，字幕不可能抢在声音前面。"
            "不是 ASR，不做词级识别。" % (len(segs), len(lines))
        ),
        "rate_chars_per_voiced_second": round(rate, 3),
        "speech_segment_count": len(segs),
        "chars_total": sum(chars),
        "cue_count": len(cues),
        "chars_per_second_min": round(min(c["chars_per_second"] for c in cues), 3),
        "chars_per_second_max": round(max(c["chars_per_second"] for c in cues), 3),
        "chars_per_second_median": round(float(np.median([c["chars_per_second"] for c in cues])), 3),
        "speech_segments": [[round(a, 3), round(b, 3)] for a, b in segs],
        "cues": cues,
    }
    args.out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"配音 {dur_total:.2f}s  发声段 {len(segs)}  句 {len(lines)}  语速 {rate:.2f} 字/有声秒")
    multi = [(c["id"], c["speech_segments"], c["text"]) for c in cues if c["speech_segments"] > 1]
    print(f"句内有停顿的句子：{len(multi)} 句")
    for mid, ns, txt in multi:
        print(f"   {mid}  {ns} 段  {txt}")
    print(f"  字/秒（含句间静音） min {payload['chars_per_second_min']} / "
          f"中位 {payload['chars_per_second_median']} / max {payload['chars_per_second_max']}")
    for c in cues:
        print(f"  {c['start']:7.2f}-{c['end']:7.2f} ({c['duration_seconds']:5.2f}s) "
              f"{c['chars']:2d}字 {c['chars_per_second']:4.2f}  {c['text']}")


if __name__ == "__main__":
    main()
