#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Day5 屏级字幕：一屏一句分句，起止取 **ASR 认出来的逐字时间**。

数据来源
--------
`Day5/day5_voice_alignment.json`（`asr_align_day5.py` 产出）里每句带 `chars_timed`：
每个汉字/字母都有 ASR 实测的 start/end。分句的第一字几点开口，字幕就几点上屏；
下一分句的第一字什么时候开口，上一屏就停在哪。

规则
----
1. 按标点把每句切成「分句」（，。！？…—；：、）；
2. 每个分句一屏，`start` = 该分句首字的时间，`end` = 下一分句首字的时间（句末则到句尾）；
3. 短于 `--min-screen`（默认 0.55s）的屏并到相邻分句，避免一闪而过；
4. 句与句之间的气口由渲染器把上一屏挂到下一屏上屏（不空屏）。

用法
  python3 tools/day5制作/build_subtitle_timing.py
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

CLAUSE_END = "，。！？；：、"          # 省略号/破折号不单独切屏（"呜…" 要跟后半句一起）
KEEP = re.compile(r"[^\u4e00-\u9fffA-Za-z0-9]")


def is_timed(ch: str) -> bool:
    return bool(re.match(r"[\u4e00-\u9fffA-Za-z0-9]", ch))


MIN_SCREEN = 0.80          # 一屏至少挂 0.8s，否则并到相邻分句
LEAD = 0.0                 # 不提前：字幕就在开口那一刻上屏（提前会在静音里弹字，用户明确否过）
MAX_SCREEN = 99.0          # 不按字数补刀：短字幕＝一屏一个分句（Day2 加更版口径），不在句中切字
MIN_CHARS = 3              # 补刀后每屏至少 3 个字，别切出「呜…」这种孤字

_CUT = "，。！？；：、"


KEEP_WORDS = ["本鲸", "鲸鲸", "鲸鱼娘", "鲸鱼", "老大", "升级", "收尾", "赔不是",
              "白饭", "伙食费", "私信", "评论", "鲸落", "万物生", "摸鱼", "单休"]


def _jieba_tokens(text: str) -> list[str]:
    """分词只用来找「词边界」，不参与计时；没装 jieba 就退回逐字（也能跑，就是切得碎）。"""
    try:
        import jieba
        for w in KEEP_WORDS:
            jieba.add_word(w)
        return [t for t in jieba.cut(text) if t]
    except ImportError:
        return list(text)


def split_screens(text: str, timed: list[dict], cue_start: float, cue_end: float) -> list[dict]:
    """一句话 → 若干「短屏」：**一屏一个分句**（Day2 加更版的字幕口径）。

    每屏带三个时间：
      · start     —— 这个分句第一个字的 ASR 实测时间（句首屏直接用句子起点）；
      · speech_end—— 这个分句最后一个字的实测**结束**时间（说完那一刻）；
      · end       —— 下一屏上屏时间；
    渲染器用 start 上屏、用 speech_end +HOLD 清屏，所以**说完就撤，不会挂在那儿等下一句**。
    """
    chars = list(text)
    t_of: list[float | None] = []
    e_of: list[float | None] = []
    ti = 0
    for ch in chars:
        if is_timed(ch):
            if ti < len(timed):
                t_of.append(timed[ti]["start"])
                e_of.append(timed[ti]["end"])
            else:
                t_of.append(None)
                e_of.append(None)
            ti += 1
        else:
            t_of.append(None)
            e_of.append(None)
    # 标点跟着后一个字的时间走
    for i in range(len(chars) - 1, -1, -1):
        if t_of[i] is None:
            nxt = next((t_of[k] for k in range(i + 1, len(chars)) if t_of[k] is not None), None)
            t_of[i] = nxt if nxt is not None else (t_of[i - 1] if i > 0 else cue_start)
    for i, t in enumerate(t_of):
        if t is None:
            t_of[i] = cue_start if i == 0 else t_of[i - 1]
    for i in range(len(chars) - 1, -1, -1):
        if e_of[i] is None:
            prev = next((e_of[k] for k in range(i - 1, -1, -1) if e_of[k] is not None), None)
            e_of[i] = prev if prev is not None else cue_end

    def ct(i: int) -> float:
        return t_of[min(i, len(chars) - 1)]

    def ce(i: int) -> float:
        return e_of[min(i, len(chars) - 1)]

    pieces, begin = [], 0
    for i, ch in enumerate(chars):
        if ch in _CUT:
            pieces.append((begin, i + 1))
            begin = i + 1
    if begin < len(chars):
        pieces.append((begin, len(chars)))

    word_starts, pos = [], 0
    for tok in _jieba_tokens(text):
        pos += len(tok)
        if 0 < pos < len(chars):
            word_starts.append(pos)

    def chop(a: int, b: int) -> list[tuple[int, int]]:
        dur = ct(b - 1) - ct(a)
        nchars = sum(1 for c in chars[a:b] if is_timed(c))
        if dur <= MAX_SCREEN or nchars < 2 * MIN_CHARS:
            return [(a, b)]
        inner = [w for w in word_starts if a + MIN_CHARS <= w <= b - MIN_CHARS]
        if not inner:
            return [(a, b)]
        target = ct(a) + dur / 2

        def score(w: int) -> float:
            gap = ct(w) - ct(w - 1)
            return abs(ct(w) - target) - 0.40 * min(gap, 0.35)

        k = min(inner, key=score)
        return chop(a, k) + chop(k, b)

    screens = []
    for n, (a, b) in enumerate(pieces):
        for m, (a2, b2) in enumerate(chop(a, b)):
            s0 = cue_start if (n == 0 and m == 0) else max(cue_start, ct(a2) - LEAD)
            screens.append({
                "text": "".join(chars[a2:b2]).strip(),
                "start": round(s0, 3),
                "speech_end": round(min(cue_end, max(s0, ce(b2 - 1))), 3),
                "end": None,
            })
    for i, sc in enumerate(screens):
        sc["end"] = screens[i + 1]["start"] if i + 1 < len(screens) else cue_end

    # 太短并进相邻屏
    changed = True
    while changed and len(screens) > 1:
        changed = False
        for n, sc in enumerate(screens):
            if sc["end"] - sc["start"] >= MIN_SCREEN:
                continue
            if n + 1 < len(screens):
                screens[n + 1]["text"] = sc["text"] + screens[n + 1]["text"]
                screens[n + 1]["start"] = sc["start"]
            else:
                screens[n - 1]["text"] = screens[n - 1]["text"] + sc["text"]
                screens[n - 1]["end"] = sc["end"]
                screens[n - 1]["speech_end"] = max(screens[n - 1]["speech_end"], sc["speech_end"])
            screens.pop(n)
            changed = True
            break

    for sc in screens:
        sc["start"] = round(max(cue_start, sc["start"]), 3)
        sc["speech_end"] = round(min(cue_end, max(sc["start"], sc["speech_end"])), 3)
        sc["end"] = round(min(cue_end, max(sc["end"], sc["start"] + 0.2)), 3)
    return screens


def main(argv=None) -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--alignment", type=Path, default=REPO_ROOT / "Day5" / "day5_voice_alignment.json")
    ap.add_argument("--out", type=Path, default=REPO_ROOT / "Day5" / "day5_subtitle_timing.json")
    args = ap.parse_args(argv)

    al = json.loads(args.alignment.read_text(encoding="utf-8"))
    screens = []
    for c in al["cues"]:
        for sc in split_screens(c["text"], c.get("chars_timed") or [], c["start"], c["end"]):
            screens.append({
                "line": c["index"],
                "id": c["id"],
                "text": sc["text"],
                "start": sc["start"],
                "end": sc["end"],
                "duration_seconds": round(sc["end"] - sc["start"], 3),
                "speech_end": sc["speech_end"],
                "cue_start": c["start"],
                "cue_end": c["end"],
                "chars": len(KEEP.sub("", sc["text"])),
            })

    durs = [s["duration_seconds"] for s in screens]
    payload = {
        "schema": 3,
        "kind": "day5_subtitle_screens",
        "measured": True,
        "source": args.alignment.name,
        "method": (
            "屏=分句。每屏起点=该分句首字的 ASR 实测时间，终点=下一分句首字时间；"
            "句间气口由渲染器把上一屏挂到下一屏上屏为止（不空屏）。"
        ),
        "screen_count": len(screens),
        "line_count": al["cue_count"],
        "screen_duration_min": round(min(durs), 3),
        "screen_duration_median": round(sorted(durs)[len(durs) // 2], 3),
        "screen_duration_max": round(max(durs), 3),
        "screens": screens,
    }
    args.out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"{al['cue_count']} 句 → {len(screens)} 屏  →  {args.out}")
    print(f"  屏长 min/median/max = {payload['screen_duration_min']:.2f} / "
          f"{payload['screen_duration_median']:.2f} / {payload['screen_duration_max']:.2f}s")
    for s in screens:
        print(f"  {s['start']:7.2f}-{s['end']:7.2f} ({s['duration_seconds']:4.2f}s) {s['chars']:2d}字 "
              f"{s['id']}  {s['text']}")


if __name__ == "__main__":
    main()
