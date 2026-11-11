#!/usr/bin/env python3
"""口播片：台词 + 配音 → 每句的实测起止（cues.json，measured=true）。一般由 film.mjs align 调用。

两条路，按可信度从高到低：

  A. --words <ASR 词级时间戳.json>（Vosk 的 {"result":[{word,start,end}…]} 或词列表）
     把台词逐字与 ASR 字符序列对齐，再用 5ms RMS 把粗边界修到真实的发声边界。
     这是旧项目 Day13 用的口径，照搬过来。

  B. 不给 --words：按停顿切句
     1) 20ms RMS 找出「有声段」，段与段之间就是停顿；
     2) N 句台词需要 N−1 个句界：停顿刚好 N−1 个 → 唯一解（mapping=unique）；
        停顿更多 → 按「每句字数占比」用动态规划挑出最合理的 N−1 个（mapping=by-proportion）；
        停顿不够 → 直接失败，不编时间；
     3) 复核每句语速：任何一句的「字/秒」偏离中位数 0.55–1.8 倍 → 判定切错了，直接失败
        （确实是故意念得忽快忽慢，加 --accept-uneven 放行）。

  两条路都失败时不会写出 cues.json——宁可没有轴，也不给一份看起来像实测的假轴。

  python3 align_voice.py --wav <16k.wav> --lines <lines.json> --out cues.json
        --audio-name 素材/配音.wav --audio-sha256 <hex> --script-name 台词.txt --script-sha256 <hex>
        [--words asr.json] [--min-pause 0.16] [--accept-uneven]
只依赖 numpy。
"""
import argparse
import difflib
import json
import sys
import wave

import numpy as np

PUNCT = set('，。！？…—；：、,.!?;:~～ \t“”"\'‘’（）()《》')


def read_wav(path):
    w = wave.open(path, 'rb')
    sr = w.getframerate()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').reshape(-1, w.getnchannels()).astype(np.float64) / 32768
    return sr, x.mean(axis=1)


def units(text):
    """一句话要念多久的度量：汉字算 1，英文字母 / 数字算 0.5，标点不算"""
    return sum(0 if ch in PUNCT else (0.5 if ord(ch) < 128 else 1) for ch in text)


def frame_db(mono, sr, win_s):
    win = max(1, int(sr * win_s))
    n = len(mono) // win
    rms = np.sqrt((mono[:n * win].reshape(n, win) ** 2).mean(axis=1) + 1e-24)
    return 20 * np.log10(rms), win / sr


def voiced_segments(mono, sr, min_pause):
    """有声段列表 [(start, end)]：短于 min_pause 的停顿并进同一段，短于 60ms 的孤立响声丢掉"""
    db, hop = frame_db(mono, sr, 0.02)
    ref, floor = np.percentile(db, 95), np.percentile(db, 5)
    thr = max(floor + 9.0, ref - 35.0)
    if ref - floor < 12:
        raise SystemExit(f'✗ 这条音频几乎没有强弱变化（95% 电平 {ref:.1f} dB，底噪 {floor:.1f} dB）：不像是干声配音，没法按停顿切句')
    on = db >= thr
    segs, i, n = [], 0, len(on)
    while i < n:
        if on[i]:
            j = i
            while j < n and on[j]:
                j += 1
            segs.append([i * hop, j * hop])
            i = j
        else:
            i += 1
    merged = []
    for s in segs:
        if merged and s[0] - merged[-1][1] < min_pause:
            merged[-1][1] = s[1]
        else:
            merged.append(s)
    return [(a, b) for a, b in merged if b - a >= 0.06], thr


def refine(mono, sr, start, end, lo_limit, hi_limit):
    """5ms RMS：把边界修到 −48 dB（相对满刻度）的发声边界；找不到就原样返回"""
    db, hop = frame_db(mono, sr, 0.005)
    n = len(db)
    active = db >= -48.0

    def onset(t):
        lo = max(0, int(max(lo_limit + 0.01, t - 0.55) / hop))
        hi = min(n - 1, int((t + 0.20) / hop))
        for i in range(lo, hi):
            if active[i] and np.sum(active[i:i + 6]) >= 5:
                j = i
                while j > lo and db[j - 1] >= -60.0 and i - j < 16:
                    j -= 1
                return j * hop
        return t

    def offset(t):
        lo = max(0, int((t - 0.25) / hop))
        hi = min(n - 1, int(min(hi_limit, t + 0.55) / hop))
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
                    return k * hop
                i = j
            else:
                i += 1
        return t

    return onset(start), offset(end)


def by_words(lines, words, mono, sr):
    """A 路：台词逐字 ↔ ASR 字符序列对齐（听错的字也落到当时那截声音上）"""
    script = [(ch, li) for li, ln in enumerate(lines) for ch in ln['text'] if ch not in PUNCT]
    asr = [(ch, wi) for wi, w in enumerate(words) for ch in w['word'] if ch not in PUNCT]
    if not asr:
        raise SystemExit('✗ ASR 词轴是空的，拒绝生成实测轴')
    sm = difflib.SequenceMatcher(a=[c for c, _ in asr], b=[c for c, _ in script], autojunk=False)
    char_word = [None] * len(script)
    matched = 0
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag in ('equal', 'replace') and i2 > i1 and j2 > j1:
            if tag == 'equal':
                matched += j2 - j1
            for k in range(j2 - j1):
                char_word[j1 + k] = asr[i1 + min(i2 - i1 - 1, k * (i2 - i1) // (j2 - j1))][1]
    ratio = matched / max(1, len(script))
    if ratio < 0.6:
        raise SystemExit(f'✗ 台词与 ASR 只对上 {ratio:.0%} 的字：ASR 结果和这份台词不像是同一段话')
    out, prev_end = [], 0.0
    dur = len(mono) / sr
    for li, ln in enumerate(lines):
        wis = [char_word[i] for i, (_, l2) in enumerate(script) if l2 == li and char_word[i] is not None]
        if not wis:
            raise SystemExit(f'✗ 第 {li + 1} 句「{ln["text"]}」在 ASR 里一个字都没对上，拒绝伪造时间')
        s, e = refine(mono, sr, words[min(wis)]['start'], words[max(wis)]['end'], prev_end, dur)
        s = max(s, prev_end)
        e = max(e, s + 0.05)
        out.append((s, e))
        prev_end = e
    return out, {'mapping': 'asr-words', 'matched_char_ratio': round(ratio, 3)}


def by_pauses(lines, segs, accept_uneven):
    """B 路：在有声段之间的停顿里挑 N−1 个当句界"""
    n, m = len(lines), len(segs)
    if m < n:
        raise SystemExit(f'✗ 只找到 {m} 个有声段，台词有 {n} 句：停顿不够分句。'
                         '要么把 --min-pause 调小，要么提供 ASR 词级时间戳（--words）')
    u = np.array([max(0.5, units(l['text'])) for l in lines])
    voiced = np.array([b - a for a, b in segs])
    cum = np.concatenate([[0], np.cumsum(voiced)])
    total = cum[-1]
    expect = u / u.sum() * total
    # dp[i][j]：前 i 句占用前 j 个有声段的最小代价；代价 = 每句「实际有声时长 − 按字数应得时长」的相对平方差
    INF = float('inf')
    dp = np.full((n + 1, m + 1), INF)
    back = np.zeros((n + 1, m + 1), dtype=int)
    dp[0][0] = 0
    for i in range(1, n + 1):
        for j in range(i, m - (n - i) + 1):
            for k in range(i - 1, j):
                if dp[i - 1][k] == INF:
                    continue
                got = cum[j] - cum[k]
                c = dp[i - 1][k] + (got - expect[i - 1]) ** 2 / expect[i - 1]
                if c < dp[i][j]:
                    dp[i][j] = c
                    back[i][j] = k
    cuts, j = [], m
    for i in range(n, 0, -1):
        k = back[i][j]
        cuts.append((k, j))
        j = k
    cuts.reverse()
    spans = [(segs[a][0], segs[b - 1][1]) for a, b in cuts]
    got = np.array([cum[b] - cum[a] for a, b in cuts])
    rate = u / np.maximum(got, 1e-6)
    med = float(np.median(rate))
    odd = [i for i in range(n) if not (0.55 * med <= rate[i] <= 1.8 * med)]
    info = {'mapping': 'unique' if m == n else 'by-proportion', 'voiced_segments': m,
            'median_units_per_second': round(med, 2),
            'per_line_units_per_second': [round(float(r), 2) for r in rate]}
    if odd and not accept_uneven:
        rows = '\n'.join(f'    第 {i + 1} 句 {rate[i]:.2f} 字/秒（中位数 {med:.2f}）：{lines[i]["text"]}' for i in odd)
        raise SystemExit('✗ 按停顿切出来的句子语速对不上，多半是切错了：\n' + rows +
                         '\n  处理办法：提供 ASR 词级时间戳（--words），或调整 --min-pause；确实念得忽快忽慢就加 --accept-uneven')
    if odd:
        info['uneven_lines'] = [i + 1 for i in odd]
    return spans, info


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--wav', required=True)
    ap.add_argument('--lines', required=True, help='[{text, who?, face?}] 的 JSON（film.mjs 从 台词.txt 解析出来的）')
    ap.add_argument('--out', required=True)
    ap.add_argument('--audio-name', default='')
    ap.add_argument('--audio-sha256', default='')
    ap.add_argument('--script-name', default='')
    ap.add_argument('--script-sha256', default='')
    ap.add_argument('--words')
    ap.add_argument('--min-pause', type=float, default=0.16)
    ap.add_argument('--accept-uneven', action='store_true')
    a = ap.parse_args()

    lines = json.load(open(a.lines, encoding='utf-8'))
    sr, mono = read_wav(a.wav)
    dur = len(mono) / sr
    if a.words:
        data = json.load(open(a.words, encoding='utf-8'))
        raw = data.get('result') or data.get('words') if isinstance(data, dict) else data
        words = [{'word': str(w.get('word') or w.get('text') or ''), 'start': float(w['start']), 'end': float(w['end'])} for w in raw or []]
        words = [w for w in words if w['word']]
        spans, info = by_words(lines, words, mono, sr)
        method = 'ASR 词级时间戳 + 逐字序列对齐 + 5ms RMS 修边界'
    else:
        segs, thr = voiced_segments(mono, sr, a.min_pause)
        spans, info = by_pauses(lines, segs, a.accept_uneven)
        info['voiced_threshold_db'] = round(float(thr), 1)
        info['min_pause_seconds'] = a.min_pause
        method = '按停顿切句（20ms RMS 有声段）' + ('，停顿数刚好等于句界数' if info['mapping'] == 'unique' else '，句界按字数占比从多个停顿里挑选——建议听一遍核对')

    out_lines = []
    for ln, (s, e) in zip(lines, spans):
        row = {'text': ln['text'], 'start': round(float(s), 3), 'end': round(float(e), 3)}
        for k in ('who', 'face'):
            if ln.get(k):
                row[k] = ln[k]
        out_lines.append(row)
    for i in range(1, len(out_lines)):
        if out_lines[i]['start'] < out_lines[i - 1]['end'] - 1e-6:
            raise SystemExit(f'✗ 第 {i + 1} 句的起点早于上一句的终点，对齐结果自相矛盾')
    gaps = [round(out_lines[i]['start'] - out_lines[i - 1]['end'], 3) for i in range(1, len(out_lines))]
    result = {
        'measured': True,
        'method': method,
        'source': {'script': a.script_name, 'script_sha256': a.script_sha256, 'audio': a.audio_name,
                   'audio_sha256': a.audio_sha256, 'audio_duration': round(dur, 3), 'analysis_sample_rate': sr},
        'beat': None,
        'summary': {**info, 'lines': len(out_lines), 'first_start': out_lines[0]['start'], 'last_end': out_lines[-1]['end'],
                    'shortest_gap': min(gaps) if gaps else None, 'longest_gap': max(gaps) if gaps else None,
                    'warnings': ([] if info['mapping'] != 'by-proportion' else ['句界是按字数占比从多个停顿里挑的，不是逐词对齐：出片前请听一遍核对'])},
        'lines': out_lines,
    }
    with open(a.out, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(f'{"句":>3} {"起":>8} {"止":>8} {"时长":>6}  台词')
    for i, r in enumerate(out_lines):
        print(f'{i + 1:>3} {r["start"]:>8.3f} {r["end"]:>8.3f} {r["end"] - r["start"]:>6.2f}  {r["text"]}')
    print(f'方法：{method}')
    print(f'已写出 {a.out}')


if __name__ == '__main__':
    sys.exit(main())
