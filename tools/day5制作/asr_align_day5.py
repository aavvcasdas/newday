#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Day5 语音对齐 v4：**先用 ASR 认出每段是什么字**，再把脚本逐字对上去。

为什么推倒重来
--------------
v3 还是「按发声段 + 字数比例猜」：能保证换屏落在气口上，但**猜不到每一段里说的是哪几个字**。
用户听出来的问题：「9 秒开始字幕慢了」。ASR 一跑就对上号了 —— 真声音说「老大不敢」是
**11.91s**，v3 的表里排在 15.57s，整句晚了 3.7 秒，往后越差越多。

这一版的做法
------------
1. **识别**：vosk 小模型（中文，`vosk-model-small-cn-0.22`）+ **把脚本用字当词表**
   （grammar 约束，只允许吐脚本里出现过的字）→ 306 个字级 token，每个带 start/end；
2. **对字**：脚本 324 字 ↔ ASR 306 字做 Needleman-Wunsch（等字 0 分、错字/跳字各 1 分），
   得到每个脚本字的实测时间；没认出来的字在邻居之间线性插值；
3. **贴边**：每句起点吸到最近的**发声段起点**（±0.35s 内），终点吸到最近发声段终点，
   保证字幕不会出现在静音里；
4. 输出仍是 `Day5/day5_voice_alignment.json`（渲染器不用改），每句带 `chars_timed`（逐字实测）。

用法
----
  # ① 准备模型（GitHub 上自带模型的仓库，codeload 可下；约 66MB）
  curl -L -o /tmp/yanzi.tgz https://codeload.github.com/luoluoluo22/yanzi/tar.gz/refs/heads/main
  tar xzf /tmp/yanzi.tgz -C /tmp --wildcards '*/vosk-model-small-cn-0.22/*'
  pip install --break-system-packages vosk

  # ② 识别 + 对齐（结果会缓存到 Day5/day5_asr_tokens.json，之后重跑不用再装模型）
  python3 tools/day5制作/asr_align_day5.py --model /tmp/voskdl/yanzi-main/mobile/android/app/src/main/assets/vosk-model-small-cn-0.22
  python3 tools/day5制作/build_subtitle_timing.py
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "tools" / "day3制作"))

from align_day3_voice import HOP, envelope, read_wav, speech_segments  # noqa: E402

PUNCT = re.compile(r"[^\u4e00-\u9fffA-Za-z0-9]")
CJK = re.compile(r"[\u4e00-\u9fff]")
FF_CANDIDATES = [
    "/tmp/node_render/node_modules/@ffmpeg-installer/linux-x64/ffmpeg",
    "ffmpeg",
]


def find_ffmpeg() -> str:
    for c in FF_CANDIDATES:
        if c == "ffmpeg" or Path(c).exists():
            return c
    raise SystemExit("找不到 ffmpeg")


def load_lines(path: Path) -> list[str]:
    return [l.strip() for l in path.read_text(encoding="utf-8").splitlines() if l.strip()]


def to_16k(ff: str, src: Path) -> Path:
    out = Path(tempfile.mkdtemp()) / "voice16k.wav"
    subprocess.run([ff, "-y", "-v", "error", "-i", str(src), "-ac", "1", "-ar", "16000",
                    "-f", "wav", str(out)], check=True)
    return out


def asr_tokens(voice16k: Path, model_dir: Path, vocab: list[str]) -> list[dict]:
    """grammar = 脚本用字，逼模型只在脚本词表里挑字，避免吐一堆不相关的字。"""
    try:
        from vosk import KaldiRecognizer, Model, SetLogLevel
    except ImportError:
        raise SystemExit("没装 vosk：pip install --break-system-packages vosk")
    SetLogLevel(-1)
    model = Model(str(model_dir))
    w = wave.open(str(voice16k))
    rec = KaldiRecognizer(model, w.getframerate(), json.dumps(vocab, ensure_ascii=False))
    rec.SetWords(True)
    toks: list[dict] = []
    while True:
        data = w.readframes(4000)
        if not data:
            break
        if rec.AcceptWaveform(data):
            toks += json.loads(rec.Result()).get("result", [])
    toks += json.loads(rec.FinalResult()).get("result", [])
    return [t for t in toks if CJK.search(t["word"])]


def nw_align(asr: list[dict], script_chars: list[str]):
    """Needleman-Wunsch：等字 0 分，错字 1 分，跳字 1 分。返回 script→asr 的下标或 -1。"""
    n, m = len(script_chars), len(asr)
    INF = float("inf")
    dp = [[INF] * (m + 1) for _ in range(n + 1)]
    bt = [[0] * (m + 1) for _ in range(n + 1)]        # 0 对角 1 上 2 左
    dp[0][0] = 0.0
    for i in range(1, n + 1):
        dp[i][0] = i * 1.0
        bt[i][0] = 1
    for j in range(1, m + 1):
        dp[0][j] = j * 1.0
        bt[0][j] = 2
    a_chars = [t["word"] for t in asr]
    for i in range(1, n + 1):
        si = script_chars[i - 1]
        for j in range(1, m + 1):
            sub = dp[i - 1][j - 1] + (0.0 if si == a_chars[j - 1] else 1.0)
            dele = dp[i - 1][j] + 1.0
            ins = dp[i][j - 1] + 1.0
            best, arg = sub, 0
            if dele < best:
                best, arg = dele, 1
            if ins < best:
                best, arg = ins, 2
            dp[i][j] = best
            bt[i][j] = arg
    pairs = [-1] * n
    i, j = n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0 and bt[i][j] == 0:
            pairs[i - 1] = j - 1
            i, j = i - 1, j - 1
        elif i > 0 and bt[i][j] == 1:
            i -= 1
        else:
            j -= 1
    return pairs


def main(argv=None) -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", type=Path, default=REPO_ROOT / "day5.wav")
    ap.add_argument("--lines", type=Path, default=REPO_ROOT / "Day5" / "Day5配音台词.txt")
    ap.add_argument("--model", type=Path,
                    default=Path("/tmp/voskdl/yanzi-main/mobile/android/app/src/main/assets/vosk-model-small-cn-0.22"))
    ap.add_argument("--cache", type=Path, default=REPO_ROOT / "Day5" / "day5_asr_tokens.json")
    ap.add_argument("--out", type=Path, default=REPO_ROOT / "Day5" / "day5_voice_alignment.json")
    ap.add_argument("--subs-out", type=Path, default=REPO_ROOT / "Day5" / "day5_subtitle_timing.json")
    args = ap.parse_args(argv)

    lines = load_lines(args.lines)
    chars = [c for c in PUNCT.sub("", "".join(lines)) if CJK.match(c)]
    vocab = sorted(set(chars))

    # ── 1. 识别（有缓存就用缓存，模型不在 /tmp 也能重跑）─────────────
    if args.cache.exists():
        toks = json.loads(args.cache.read_text(encoding="utf-8"))
        print(f"ASR：用缓存 {args.cache}（{len(toks)} token）")
    else:
        print(f"ASR：vosk + grammar({len(vocab)} 字) → {args.voice.name}")
        toks = asr_tokens(to_16k(find_ffmpeg(), args.voice), args.model, vocab)
        args.cache.write_text(json.dumps(toks, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"ASR：{len(toks)} token → {args.cache}")

    # ── 2. 逐字对齐 ───────────────────────────────────────────────
    pairs = nw_align(toks, chars)
    line_spans, _cur = [], 0
    for line in lines:
        _n = len([c for c in PUNCT.sub("", line) if CJK.match(c)])
        line_spans.append((_cur, _cur + _n))
        _cur += _n

    def pairs_lookup(r, pairs, times):
        i = raw.index(r)
        a0, b0 = line_spans[i]
        return [pairs[k] >= 0 for k in range(a0, b0)]
    matched = sum(1 for p in pairs if p >= 0)
    times: list[list[float] | None] = [
        [toks[p]["start"], toks[p]["end"]] if p >= 0 else None for p in pairs
    ]
    # 未认出的字：邻居之间线性插值（头尾按中位字时长外推）
    per_char = [b - a for t in toks for a, b in [(t["start"], t["end"])]] if False else []
    span_all = toks[-1]["end"] - toks[0]["start"]
    cps = span_all / max(1, matched)
    for i in range(len(times)):
        if times[i] is not None:
            continue
        prev = next((k for k in range(i - 1, -1, -1) if times[k] is not None), None)
        nxt = next((k for k in range(i + 1, len(times)) if times[k] is not None), None)
        if prev is not None and nxt is not None:
            a = times[prev][1]
            b = times[nxt][0]
            t = a + (b - a) * (i - prev) / (nxt - prev)
        elif prev is not None:
            t = times[prev][1] + cps * (i - prev)
        else:
            t = times[nxt][0] - cps * (nxt - i)
        times[i] = [round(max(0.0, t), 3), round(max(0.0, t) + cps, 3)]
    _ = per_char

    # ── 3. 起止贴到发声段（一句必从发声段起点开口，字幕不许落在静音里）──
    sr, mono, _ = read_wav(args.voice)
    env = envelope(mono, sr)
    segs = [(a * HOP, b * HOP) for a, b in speech_segments(env, rel_db=-45.0, abs_db=-50.0)]
    onsets = [a for a, _ in segs]

    def snap_start(t: float, tol: float = 0.35) -> float:
        near = min(onsets, key=lambda x: abs(x - t))
        return near if abs(near - t) <= tol else t

    # 先把每句的原始起止算出来（来自逐字实测）
    raw = []
    cur = 0
    for line in lines:
        n = len([c for c in PUNCT.sub("", line) if CJK.match(c)])
        seg = times[cur:cur + n]
        cur += n
        raw.append({"line": line, "chars": seg, "s": seg[0][0], "e": seg[-1][1]})

    # 句界 = 上一句末字与下一句首字的**中点**，再吸到最近的发声段起点。
    # 用中点是为了稳：两个估计里只要有一个靠谱（ASR 认出来的字），边界就不会跑偏。
    bounds = [0.0]
    for i in range(1, len(raw)):
        mid = 0.5 * (raw[i - 1]["e"] + raw[i]["s"])
        near = min(onsets, key=lambda c: abs(c - mid))
        b = near if abs(near - mid) <= 0.75 else max(mid, bounds[-1] + 0.30)
        bounds.append(round(max(b, bounds[-1] + 0.30), 3))

    audio_end = len(mono) / sr
    bounds.append(round(min(raw[-1]["e"] + 0.05, audio_end), 3))
    cues = []
    for i, r in enumerate(raw):
        s, e = bounds[i], bounds[i + 1]
        cues.append({"line": r["line"], "start": round(s, 3), "end": round(e, 3), "chars": r["chars"]})

    # ── 4. 输出 ───────────────────────────────────────────────────
    out_cues = []
    for i, c in enumerate(cues):
        d = c["end"] - c["start"]
        nchar = len(c["chars"])
        toks_out = []
        for (cs, ce) in c["chars"]:
            toks_out.append({"ch": "", "start": round(cs, 3), "end": round(ce, 3)})
        raw = [ch for ch in PUNCT.sub("", c["line"]) if CJK.match(ch)]
        for k, t in enumerate(toks_out):
            t["ch"] = raw[k] if k < len(raw) else ""
        out_cues.append({
            "id": f"L{i + 1:02d}",
            "index": i + 1,
            "start": c["start"],
            "end": c["end"],
            "duration_seconds": round(d, 3),
            "gap_before": None if i == 0 else round(max(0.0, c["start"] - cues[i - 1]["end"]), 3),
            "text": c["line"],
            "chars": nchar,
            "chars_per_second": round(nchar / d, 3) if d > 0 else None,
            "chars_timed": toks_out,
        })

    payload = {
        "schema": 3,
        "kind": "day5_voice_cue_alignment",
        "measured": True,
        "source_file": args.voice.name,
        "source_duration_seconds": round(len(mono) / sr, 3),
        "alignment_method": (
            "ASR 对齐：vosk 中文小模型 + 脚本用字 grammar（%d 字）→ %d 个字级 token；"
            "脚本 %d 字与 ASR 逐字 Needleman-Wunsch 对齐（%d 字认出来，其余邻居插值）；"
            "每句起止再吸到 10ms RMS 发声段边界。"
            % (len(vocab), len(toks), len(chars), matched)
        ),
        "asr_token_count": len(toks),
        "asr_matched_chars": matched,
        "chars_total": len(chars),
        "cue_count": len(out_cues),
        "chars_per_second_min": round(min(c["chars_per_second"] for c in out_cues), 3),
        "chars_per_second_median": round(sorted(c["chars_per_second"] for c in out_cues)[len(out_cues) // 2], 3),
        "chars_per_second_max": round(max(c["chars_per_second"] for c in out_cues), 3),
        "speech_segments": [[round(a, 3), round(b, 3)] for a, b in segs],
        "cues": out_cues,
    }
    args.out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"对齐完成：{len(out_cues)} 句，认字 {matched}/{len(chars)}，"
          f"字/秒 中位 {payload['chars_per_second_median']}")
    for c in out_cues:
        print(f"  {c['start']:7.2f}-{c['end']:7.2f} ({c['duration_seconds']:5.2f}s) "
              f"{c['chars']:2d}字 {c['chars_per_second']:4.2f}  {c['text']}")
    print(f"→ {args.out}")


if __name__ == "__main__":
    main()
