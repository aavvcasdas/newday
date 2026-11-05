#!/usr/bin/env python3
"""Day11 兜底对齐：已知台词锁到波形能量谷，不是 Vosk 词级 ASR。

本集成片没有用这个脚本。现行轴是 align_voice.py + asr_words.json。


GitHub 上的中文 Vosk 模型在本环境 TLS 被断开，下不下来。
本脚本不按整段字数匀铺：先取实测发声段，再用动态规划把 25 行
切到能量谷上，行内字时只铺在该行的发声段里，气口留空。
输出 measured=true 表示边界来自波形，method 写明不是独立识别。
"""
import hashlib
import json
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
FFMPEG = Path('/tmp/node_render/node_modules/@ffmpeg-installer/linux-x64/ffmpeg')
VOICE = ROOT / '鲸鱼找工作_克隆配音_最终版.wav'
SCRIPT = ROOT / 'Day11/Day11配音台词.txt'
OUT = Path(__file__).resolve().parent / 'voice_alignment.json'
SUBS = Path(__file__).resolve().parent / 'subtitle_timing.json'
SRT = ROOT / 'Day11/字幕/Day11字幕.srt'
PUNCT = '，。！？…—；：、'


def han_count(s):
    return sum(1 for c in s if '一' <= c <= '鿿') or 1


def load_mono(path):
    raw = subprocess.check_output([str(FFMPEG), '-v', 'error', '-i', str(path),
                                   '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'])
    return np.frombuffer(raw, dtype='<f4').astype(np.float64), 16000


def speech_segments(mono, sr, thr=-38.0):
    hop = int(sr * 0.01)
    n = len(mono) // hop
    rms = np.sqrt((mono[:n * hop].reshape(n, hop) ** 2).mean(1) + 1e-24)
    db = 20 * np.log10(rms)
    active = db >= thr
    segs = []
    i = 0
    while i < n:
        if not active[i]:
            i += 1
            continue
        j = i
        while j < n and active[j]:
            j += 1
        if (j - i) * 0.01 >= 0.06:
            segs.append([round(i * 0.01, 3), round(j * 0.01, 3)])
        i = j
    merged = []
    for s, e in segs:
        if merged and s - merged[-1][1] < 0.08:
            merged[-1][1] = e
        else:
            merged.append([s, e])
    return merged, db, hop


def assign_lines(segs, weights):
    """把发声段按顺序分给各行。代价：时长偏离期望 + 行内长气口惩罚。"""
    m, k = len(segs), len(weights)
    speech = sum(e - s for s, e in segs)
    expected = [w / sum(weights) * speech for w in weights]
    inf = 1e18
    dp = [[inf] * (k + 1) for _ in range(m + 1)]
    prev = [[None] * (k + 1) for _ in range(m + 1)]
    dp[0][0] = 0.0
    for i in range(m + 1):
        for line in range(k):
            if dp[i][line] >= inf / 2:
                continue
            for j in range(i + 1, m + 1):
                start, end = segs[i][0], segs[j - 1][1]
                dur = end - start
                spoken = sum(segs[t][1] - segs[t][0] for t in range(i, j))
                gap_pen = 0.0
                for t in range(i, j - 1):
                    gap = segs[t + 1][0] - segs[t][1]
                    if gap > 0.45:
                        gap_pen += (gap - 0.45) * 8
                rel = (dur - expected[line]) / max(0.4, expected[line])
                cost = rel * rel + gap_pen + 0.04 * (j - i - 1)
                # 发声太少也罚
                if spoken < expected[line] * 0.35:
                    cost += 2.0
                nxt = dp[i][line] + cost
                if nxt < dp[j][line + 1]:
                    dp[j][line + 1] = nxt
                    prev[j][line + 1] = i
    if prev[m][k] is None:
        raise SystemExit('无法把发声段切成台词行')
    groups = []
    j, line = m, k
    while line:
        i = prev[j][line]
        groups.append(segs[i:j])
        j, line = i, line - 1
    groups.reverse()
    return groups, dp[m][k]


def chars_in_spans(text, spans):
    spoken = [(s, e) for s, e in spans]
    total = sum(e - s for s, e in spoken) or 0.05
    n = len(text)
    out = []
    for i, ch in enumerate(text):
        a = total * i / n
        b = total * (i + 1) / n
        def at(x):
            acc = 0.0
            for s, e in spoken:
                d = e - s
                if acc + d >= x:
                    return s + (x - acc)
                acc += d
            return spoken[-1][1]
        out.append({'ch': ch, 'start': round(at(a), 3), 'end': round(max(at(a) + 0.02, at(b)), 3),
                    'timing_source': 'interpolated inside measured speech span, not independent ASR'})
    return out


def build_screens(cues):
    screens = []
    for cue in cues:
        parts, cur = [], ''
        for ch in cue['text']:
            cur += ch
            if ch in PUNCT:
                parts.append(cur)
                cur = ''
        if cur:
            parts.append(cur)
        merged = []
        for p in parts:
            if merged and len(p.strip(PUNCT)) < 3:
                merged[-1] += p
            elif merged and len(merged[-1].strip(PUNCT)) < 3:
                merged[-1] += p
            else:
                merged.append(p)
        total = sum(len(p) for p in merged) or 1
        acc = 0
        for p in merged:
            st = cue['start'] + (cue['end'] - cue['start']) * acc / total
            acc += len(p)
            en = cue['start'] + (cue['end'] - cue['start']) * acc / total
            for chunk_start in range(0, len(p), 15):
                chunk = p[chunk_start:chunk_start + 15]
                screens.append({'line': cue['index'], 'text': chunk,
                                'start': round(st, 3), 'speech_end': round(en, 3), 'end': round(en, 3)})
    for a, b in zip(screens, screens[1:]):
        a['end'] = min(a['end'], b['start'])
    # 尾挂不超过本句 end+0.24，也不越过下一句，避免门禁「字幕抢跑/尾挂」。
    by_line = {c['index']: c for c in cues}
    for s in screens:
        cue = by_line[s['line']]
        s['end'] = round(min(s['end'], cue['end'] + 0.24), 3)
        if s['end'] <= s['start']:
            s['end'] = round(s['start'] + 0.05, 3)
    return screens


def stamp(t):
    m = round(t * 1000)
    return f'{m // 3600000:02}:{m // 60000 % 60:02}:{m // 1000 % 60:02},{m % 1000:03}'


def main():
    lines = [ln.strip() for ln in SCRIPT.read_text(encoding='utf-8').splitlines() if ln.strip()]
    mono, sr = load_mono(VOICE)
    segs, _, _ = speech_segments(mono, sr)
    groups, cost = assign_lines(segs, [han_count(ln) for ln in lines])
    duration = float(subprocess.check_output([
        str(Path('/tmp/node_render/node_modules/@ffprobe-installer/linux-x64/ffprobe')),
        '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(VOICE)], text=True).strip())
    sha = hashlib.sha256(VOICE.read_bytes()).hexdigest()
    cues = []
    prev_end = 0.0
    for i, (line, group) in enumerate(zip(lines, groups), 1):
        start = max(group[0][0], prev_end)
        end = max(group[-1][1], start + 0.05)
        # 行尾收到最后一个发声段，不把下一行气口算进去
        chars = chars_in_spans(line, group)
        cues.append({'id': f'L{i:02d}', 'index': i, 'start': round(start, 3), 'end': round(end, 3),
                     'text': line, 'chars_timed': chars,
                     'speech_spans': [[round(s, 3), round(e, 3)] for s, e in group]})
        prev_end = cues[-1]['end']
    # 防止重叠
    for a, b in zip(cues, cues[1:]):
        if a['end'] > b['start']:
            a['end'] = b['start']
    alignment = {
        'measured': True,
        'word_level': False,
        'asr': False,
        'method': 'transcript-constrained RMS valley alignment; Vosk Chinese model host unreachable (github TLS EOF), not independent ASR',
        'limitation': '行边界来自实测发声段与能量谷；行内字时是发声段内插值，不是逐字识别。词点接触可能有约一两百毫秒误差。',
        'source_file': VOICE.name,
        'source_duration_seconds': duration,
        'source_sha256': sha,
        'cue_count': len(cues),
        'dp_cost': round(cost, 3),
        'cues': cues,
    }
    screens = build_screens(cues)
    subs = {'measured': True, 'method': alignment['method'], 'source_sha256': sha, 'screens': screens}
    OUT.write_text(json.dumps(alignment, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    SUBS.write_text(json.dumps(subs, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    SRT.parent.mkdir(parents=True, exist_ok=True)
    SRT.write_text('\n\n'.join(
        f'{i}\n{stamp(s["start"])} --> {stamp(s["end"])}\n{s["text"]}' for i, s in enumerate(screens, 1)) + '\n',
        encoding='utf-8')
    print(f'cues={len(cues)} screens={len(screens)} cost={cost:.2f} duration={duration:.2f}')
    for c in cues:
        cps = han_count(c['text']) / max(0.05, c['end'] - c['start'])
        print(f"{c['id']} {c['start']:6.2f}-{c['end']:6.2f} {cps:4.1f}c/s  {c['text']}")


if __name__ == '__main__':
    main()
