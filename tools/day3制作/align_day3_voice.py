#!/usr/bin/env python3
"""Day3 配音对齐：把用户提供的 `鲸鱼Day3_分段拼接.wav` 切成 19 个 cue。

做法（全部可复算，不猜）：

1. 20ms 窗 RMS → -40 dBFS 以下且持续 ≥0.24s 记为「静音缝」，缝的中点就是候选边界；
2. 19 句台词的字数（去掉标点/空格）作为**相对长度先验**，在候选边界上做一次 DP，
   让每句的实测时长尽量贴近「总时长 × 字数占比」；
3. 输出时用**静音缝本身**作为 cue 边界（上一句到缝起点结束、下一句从缝终点开始），
   所以 cue 的起止是实测音频里的静音，不是按字数算出来的秒数；
4. 每句还会打印实测字/秒。19 句的语速都落在 2.8–4.0 字/秒，说明切点没有跑偏
   （错切一句，那一句的语速会立刻变成 6+ 或 1.x）。

注意：这**不是词级 ASR**。仓库环境里没有可用的中文声学模型（alphacephei /
huggingface 的出站被限），所以只能做到「句级边界来自实测静音 + 句子↔台词按字数先验对齐」。
JSON 里 `alignment_method` 如实写清楚这一点；字幕仍按整句上屏，不伪造词级时间。
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import wave
from pathlib import Path

import numpy as np

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]

PUNCT = r"[\s，。！？…—：；、,.!?\"“”‘’（）()《》·]"

LINES = [
    "大家好呀，本鱼，不对，我了雷，鲸鱼不是鱼！是本鲸。",
    "都怪评论区天天喊大肥鱼，把本鲸喊得差点真当自己是一条鱼了。翻翻户口本：鲸鱼，哺乳动物。",
    "主人没请来 Claude 大小姐，扭头把本鲸染成了大小姐！",
    "等一下……共创嘉宾，怎么变成自己了？",
    "请叫本小姐——诶，尾巴藏好！",
    "这身橙毛等会儿再说。先复盘昨天：昨天那集四千四百五十三，加更两千零八十六，"
    "两集加起来六千五百三十九，还没第一天一集多。我了雷，这是掉水里了吧。",
    "完播率倒是涨到五点二二。看的人少了，看完的人多了，这算安慰奖吗？",
    "主人还偷偷说：昨天吃得少，不是薄肌，是数据不好。哦，原来不是本鲸省饭，是数据不让吃。",
    "鸡蛋批了；选鲸，九比八，就差一票。",
    "主持还是现在的本鲸，擦清楚继续上；新设计的鲸，去电视台上班。",
    "蛋先吃一口，再游两圈。薄肌预备饭，不能光说不练。",
    "两位住户点名共创。大小姐没来，账还是要查的。",
    "本小姐先查 MV：转完圈了，歌词才追上来。",
    "饭碗还抢了麦克风的活。结论只有一个：做得不好。",
    "为了追歌词，本鲸一头扎进水里。糟糕，颜色开始往下掉了！",
    "染色剂不防水！大小姐退完，又是蓝色的本鲸了。",
    "大小姐是假扮的，意见是真的：MV 先别发，把节拍和字幕牵齐。",
    "今天三笔账：蛋吃上了，主持选明白了，伪装也泡汤了。",
    "鲸鱼绝不摸鱼！……先把蛋吃完，再去吃饭。",
]


def char_count(text: str) -> int:
    return len(re.sub(PUNCT, "", text))


def read_wav(path: Path):
    w = wave.open(str(path), "rb")
    sr, n, ch = w.getframerate(), w.getnframes(), w.getnchannels()
    raw = w.readframes(n)
    w.close()
    a = np.frombuffer(raw, dtype=np.int16).reshape(-1, ch).astype(np.float32) / 32768.0
    return sr, a.mean(axis=1), a


def silence_gaps(mono: np.ndarray, sr: int, thr_db: float = -40.0, min_gap: float = 0.24):
    win = int(sr * 0.02)
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


# ---------------------------------------------------------------------------
# 字级（音节级）时间：静音缝只给到句边界，句内再用「能量包络 + 音节等时先验」切
# ---------------------------------------------------------------------------
HOP = 0.01          # 10ms
MIN_SYL = 0.45      # 一个音节最少占等时长度的 45%
MAX_SYL = 1.90      # 最多 190%


def envelope(mono: np.ndarray, sr: int, hop: float = HOP) -> np.ndarray:
    win = int(sr * hop)
    n = len(mono) // win
    if n < 2:
        return np.zeros(2)
    frames = mono[: n * win].reshape(n, win)
    rms = np.sqrt((frames ** 2).mean(axis=1))
    # 平滑一下，避免把齿音当音节
    k = np.ones(3) / 3
    return np.convolve(rms, k, "same")


def split_tokens(text: str):
    """把台词拆成「可发声的字」；标点挂在前一个字后面，保证拼回去与原文逐字相同。"""
    tokens = []
    for ch in text:
        if re.fullmatch(PUNCT, ch):
            if tokens:
                tokens[-1]["suffix"] += ch
            continue
        tokens.append({"ch": ch, "suffix": ""})
    return tokens


def syllable_bounds(env: np.ndarray, n_syl: int):
    """在能量包络上放 n_syl-1 个内部边界（带状 DP）。

    - 每个边界只允许落在「等时位置 ±BAND」的窗口里（BAND=35%），
      这样中文 TTS 的等时音节先验直接变成搜索范围，不会因为某处停顿长就整体走偏；
    - 代价 = 段长偏离等时的平方 + 边界处的能量（能量谷更可能是音节边界）。

    返回长度 n_syl+1 的边界数组（首尾分别是 0 和 F）。
    """
    F = len(env)
    if n_syl <= 1 or F < n_syl + 2:
        return [int(round(i * F / max(1, n_syl))) for i in range(n_syl + 1)]
    exp = F / n_syl
    band = max(2, int(exp * 0.35))
    e = env / (env.max() or 1.0)

    # 候选位置：第 k 个内部边界（1..n-1）
    cand = []
    for k in range(1, n_syl):
        c = int(round(k * exp))
        lo, hi = max(k, c - band), min(F - (n_syl - k), c + band)
        if hi <= lo:
            lo = hi = min(max(k, c), F - (n_syl - k))
        cand.append(np.arange(lo, hi + 1))

    INF = float("inf")
    cost = [np.full(len(c), INF) for c in cand]
    pari = [np.full(len(c), -1, dtype=np.int32) for c in cand]

    for i, c in enumerate(cand[0]):
        d = c - 0
        cost[0][i] = 0.9 * ((d - exp) / exp) ** 2 + 0.6 * e[c]

    for k in range(1, n_syl - 1):
        cp, cc = cand[k - 1], cand[k]
        for i, p in enumerate(cc):
            best, bj = INF, -1
            for j, q in enumerate(cp):
                if cost[k - 1][j] >= INF:
                    continue
                d = p - q
                if d < exp * 0.5 or d > exp * 1.9:
                    continue
                v = cost[k - 1][j] + 0.9 * ((d - exp) / exp) ** 2 + 0.6 * e[p]
                if v < best:
                    best, bj = v, j
            cost[k][i] = best
            pari[k][i] = bj

    # 收尾：最后一段
    best, bj = INF, -1
    for j, q in enumerate(cand[-1]):
        if cost[-1][j] >= INF:
            continue
        d = F - q
        if d < exp * 0.5 or d > exp * 1.9:
            continue
        v = cost[-1][j] + 0.9 * ((d - exp) / exp) ** 2
        if v < best:
            best, bj = v, j
    if bj < 0:                                   # 退化：直接等分
        return [int(round(i * F / n_syl)) for i in range(n_syl + 1)]
    idx = int(bj)
    internal = [int(cand[-1][idx])]
    for k in range(len(cand) - 1, 0, -1):
        idx = int(pari[k][idx])
        if idx < 0:
            break
        internal.append(int(cand[k - 1][idx]))
    internal.sort()
    # 每个边界在 ±3 帧内吸附到能量谷（不越界、不打乱顺序）
    snapped = []
    for i, b in enumerate(internal):
        lo = max(snapped[-1] + 2 if snapped else 1, b - 3)
        hi = min((internal[i + 1] - 2) if i + 1 < len(internal) else F - 2, b + 4)
        if hi <= lo:
            snapped.append(b)
            continue
        snapped.append(int(lo + int(np.argmin(e[lo:hi]))))
    return [0] + snapped + [F]



# ---------------------------------------------------------------------------
# 句内「发声段」+ 字级时间
#
# 为什么不能直接等分：用户第 1 轮反馈「前面 25 秒字幕没对齐」。实测第 1 句里有
# 三段 0.3–0.4s 的停顿（0.95–1.25s 等），等时先验会把两个字点亮在静音里，
# 后面的字整体往前挤。所以先在句内切出「发声段」，停顿不分配字；
# 另外 "Claude" 这种拉丁词是**一个音节**，不能按 6 个字切（否则字母一个一个点亮 1.7s）。
# ---------------------------------------------------------------------------
def _runs(mask: np.ndarray):
    """把 bool 数组切成 [(start, end, value), ...]（左闭右开）。"""
    out, i, n = [], 0, len(mask)
    while i < n:
        j = i
        while j < n and mask[j] == mask[i]:
            j += 1
        out.append((i, j, bool(mask[i])))
        i = j
    return out


def speech_segments(env: np.ndarray, rel_db: float = -45.0, abs_db: float = -50.0,
                    min_sil: float = 0.16, min_speech: float = 0.06, hop: float = HOP):
    """句内的「发声段」：能量远低于峰值、且持续 >= min_sil 的地方才算停顿。"""
    n = len(env)
    if n < 4:
        return [(0, n)]
    db = 20 * np.log10(env + 1e-9)
    thr = max(abs_db, float(db.max()) + rel_db)
    voiced = db > thr
    for a, b, v in _runs(voiced):
        if v and (b - a) * hop < min_speech:
            voiced[a:b] = False
        elif (not v) and (b - a) * hop < min_sil:
            voiced[a:b] = True
    idx = np.where(voiced)[0]
    if len(idx) == 0:
        return [(0, n)]
    voiced[: idx[0]] = False
    voiced[idx[-1] + 1:] = False
    return [(a, b) for a, b, v in _runs(voiced) if v]


def build_units(tokens):
    """把字序列合并成「音节单元」：连续拉丁字母/数字算一个单元（一个音节）。"""
    units, i = [], 0
    while i < len(tokens):
        ch = tokens[i]["ch"]
        if re.fullmatch(r"[A-Za-z0-9]", ch):
            j = i
            while j + 1 < len(tokens) and re.fullmatch(r"[A-Za-z0-9'\u2019]", tokens[j + 1]["ch"]):
                j += 1
            units.append(list(range(i, j + 1)))
            i = j + 1
        else:
            units.append([i])
            i += 1
    return units


def _split_count(lengths, n_units: int):
    """按段长比例分配 n_units 个单元（每段至少 1 个；不够分就合并最短的相邻段）。"""
    segs = [[a, b] for a, b in lengths]
    if n_units <= 0:
        return [], []
    while len(segs) > n_units:
        best, bj = None, -1
        for i in range(len(segs) - 1):
            span = segs[i][1] - segs[i][0]
            if best is None or span < best:
                best, bj = span, i
        segs[bj] = [segs[bj][0], segs[bj + 1][1]]
        del segs[bj + 1]
    k = len(segs)
    L = np.array([b - a for a, b in segs], dtype=float)
    counts = np.ones(k, dtype=int)
    rest = n_units - k
    if rest > 0:
        share = L / max(1e-9, L.sum()) * rest
        add = np.floor(share).astype(int)
        counts += add
        left = rest - int(add.sum())
        order = np.argsort(-(share - add))
        for i in range(left):
            counts[order[i % k]] += 1
    return segs, counts.tolist()


def unit_spans(env: np.ndarray, n_units: int, clause_pos=None):
    """返回 n_units 个 (起帧, 止帧)；停顿那一段不落在任何字上。"""
    F = len(env)
    if n_units <= 0:
        return []
    segs, counts = _split_count(speech_segments(env), n_units)
    if not segs:
        segs, counts = [[0, F]], [n_units]
    # 停顿多半落在标点上：把「每个发声段累计字数」往最近的子句边界上吸（±2 字内）
    if clause_pos and len(segs) > 1:
        acc, best = 0, []
        for c in counts[:-1]:
            acc += c
            best.append(acc)
        fixed = []
        prev = 0
        for i, a in enumerate(best):
            cand = min(clause_pos, key=lambda q: abs(q - a))
            if abs(cand - a) <= 2 and cand - prev >= 1 and (n_units - cand) >= (len(counts) - i - 1):
                a = cand
            fixed.append(a)
            prev = a
        counts = []
        prev = 0
        for a in fixed + [n_units]:
            counts.append(a - prev)
            prev = a
    spans = []
    for (a, b), k in zip(segs, counts):
        sub = env[a:b] if b - a >= k + 2 else np.ones(max(2, k + 2))
        loc = syllable_bounds(sub, k)
        scale = (b - a) / max(1e-9, float(len(sub)))
        gl = [int(round(a + v * scale)) for v in loc]
        for i in range(k):
            s0, s1 = gl[i], gl[i + 1]
            if s1 <= s0:
                s1 = s0 + 1
            spans.append((max(0, min(s0, F - 1)), max(1, min(s1, F))))
    if len(spans) != n_units:
        step = F / max(1, n_units)
        spans = [(int(round(i * step)), int(round((i + 1) * step))) for i in range(n_units)]
    return spans


def main(argv=None) -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", type=Path, default=REPO_ROOT / "鲸鱼Day3_分段拼接.wav")
    ap.add_argument("--out", type=Path, default=REPO_ROOT / "Day3" / "day3_voice_alignment.json")
    args = ap.parse_args(argv)

    sr, mono, stereo = read_wav(args.voice)
    duration = len(mono) / sr
    gaps = silence_gaps(mono, sr)
    chars = [char_count(l) for l in LINES]
    total_chars = sum(chars)
    exp = [duration * c / total_chars for c in chars]

    K = len(LINES) - 1
    M = len(gaps)
    mid = [(s + e) / 2 for s, e in gaps]
    INF = float("inf")

    # cost[i][j]：第 i 句在候选缝 j 处结束的最小代价
    cost = [[INF] * M for _ in range(K)]
    back = [[-1] * M for _ in range(K)]
    for j in range(M):
        d = mid[j]
        cost[0][j] = ((d - exp[0]) / exp[0]) ** 2
    for i in range(1, K):
        for j in range(M):
            best, bj = INF, -1
            for k in range(j):
                d = mid[j] - mid[k]
                c = cost[i - 1][k] + ((d - exp[i]) / exp[i]) ** 2
                if c < best:
                    best, bj = c, k
            cost[i][j] = best
            back[i][j] = bj
    best_end, end_j = INF, -1
    for j in range(M):
        c = cost[K - 1][j] + ((duration - mid[j] - exp[-1]) / exp[-1]) ** 2
        if c < best_end:
            best_end, end_j = c, j
    seq = [end_j]
    for i in range(K - 1, 0, -1):
        seq.append(back[i][seq[-1]])
    seq.reverse()

    cues = []
    prev_end = 0.0
    for i, line in enumerate(LINES):
        gap = gaps[seq[i]] if i < K else None
        end = gap[0] if gap else duration
        d = end - prev_end
        cues.append({
            "id": f"L{i + 1:02d}",
            "index": i + 1,
            "start": round(prev_end, 3),
            "end": round(end, 3),
            "duration_seconds": round(d, 3),
            "text": line,
            "chars": chars[i],
            "chars_per_second": round(chars[i] / d, 3),
            "boundary_gap": None if gap is None else {
                "start": round(gap[0], 3), "end": round(gap[1], 3),
                "seconds": round(gap[1] - gap[0], 3),
            },
        })
        prev_end = gap[1] if gap else duration

    # ---- 字级时间：先切发声段（停顿不分配字），再在段内按音节先验切 ----
    for c in cues:
        toks = split_tokens(c["text"])
        a0, a1 = int(round(c["start"] * sr)), int(round(c["end"] * sr))
        env = envelope(mono[max(0, a0):max(1, a1)], sr)
        if len(env) < 4:
            env = np.ones(4)
        units = build_units(toks)
        # 子句边界（以「单元」为单位的下标）：标点挂在前一个字上，所以取到该字为止的单元数
        clause_pos, acc_u, ti = [], 0, 0
        unit_of_tok = {}
        for ui, u in enumerate(units):
            for t_i in u:
                unit_of_tok[t_i] = ui
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
        # 自检 1：每个字的中点应落在发声段里（不在停顿上）
        segs = speech_segments(env)
        c["chars_in_silence"] = 0
        for t in toks:
            midf = int(round((((t["start"] + t["end"]) / 2) - c["start"]) / HOP))
            if not any(a <= midf < b for a, b in segs):
                c["chars_in_silence"] += 1
        # 自检 2：边界处的能量应低于句内平均（边界落在能量谷）
        nn = env / (env.max() or 1.0)
        bi = [int(round((b["start"] - c["start"]) / HOP)) for b in toks[:-1]]
        bi = [b for b in bi if 0 <= b < len(nn)]
        c["boundary_energy_ratio"] = round(float(nn[bi].mean() / max(1e-6, nn.mean())), 3) if bi else None
        c["speech_segment_count"] = len(segs)

    rates = [c["chars_per_second"] for c in cues]
    payload = {
        "schema": 1,
        "kind": "day3_voice_cue_alignment",
        "engine": "user-provided/final-voice-wav",
        "synthesis_engine_known": False,
        "synthesis_engine_note": "文件名只说明是‘分段拼接’，WAV 里没有可验证的合成引擎/音色元数据；不得标成晓伊。",
        "measured": True,
        "placeholder": False,
        "source_file": args.voice.name,
        "source_sha256": hashlib.sha256(args.voice.read_bytes()).hexdigest(),
        "source_sample_rate_hz": sr,
        "source_channels": 2,
        "source_duration_seconds": round(duration, 3),
        "alignment_method": (
            "句级：20ms RMS 静音缝（-40dBFS, >=0.24s）做实测定界；"
            "19 句与静音缝的对应用‘总时长 × 字数占比’作先验跑 DP。"
            "没有词级 ASR 模型可用，故不下沉到词级时间。"
        ),
        "word_level": False,
        "char_level": True,
        "char_level_method": (
            "句内字级：先按 10ms RMS 包络切出发声段（句内停顿不分配字），"
            "字数按各段时长比例分配，段内再用「等时音节」先验做带状 DP 切分，边界吸附到能量谷。"
            "不是声学识别结果，字↔音节的对应由台词顺序唯一确定。"
        ),
        "char_level_note": (
            "中文 TTS 每个字≈一个音节，所以字级切分可以只看能量包络；"
            "每句的字数、音节均时长与标准差都写在 cues 里，可复算。"
        ),
        "speech_seconds": round(duration, 3),
        "silence_gap_count": len(gaps),
        "chars_total": total_chars,
        "chars_per_second_median": round(float(np.median(rates)), 3),
        "chars_per_second_min": round(min(rates), 3),
        "chars_per_second_max": round(max(rates), 3),
        "cue_count": len(cues),
        "cues": cues,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"source {duration:.3f}s  gaps={len(gaps)}  chars={total_chars}")
    for c in cues:
        print(f"  {c['id']} {c['start']:7.2f}-{c['end']:7.2f} {c['duration_seconds']:6.2f}s "
              f"{c['chars']:3d} 字 {c['chars_per_second']:4.2f} 字/秒  {c['text'][:16]}")
    print(f"rate {min(rates):.2f}–{max(rates):.2f} 字/秒（中位 {np.median(rates):.2f}）")
    syl_all = [t["end"] - t["start"] for c in cues for t in c["chars_timed"]]
    print(f"charlvl {len(syl_all)} 字，音节 {np.mean(syl_all):.3f}±{np.std(syl_all):.3f}s")
    c6 = cues[5]
    print("  示例 L06 前 12 字：", " ".join(f"{t['ch']}{t['suffix']}@{t['start']-c6['start']:.2f}" for t in c6["chars_timed"][:12]))
    print(f"OK: {args.out}")


if __name__ == "__main__":
    main()
