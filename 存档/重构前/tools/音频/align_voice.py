#!/usr/bin/env python3
"""通用配音对齐：ASR 词级时间戳 + RMS 发声边界 -> 实测时间轴与字幕轴。

与任何单集解耦：词序号映射由台词逐字与 ASR 字符序列对齐自动得到，
不再为每集硬编码 WORD_RANGES。输出 measured=true（仅当 ASR 词轴真实存在时）。
用法：
  python3 tools/音频/align_voice.py --voice DayN/配音/xxx.wav \
    --script DayN/DayN配音台词.txt --words asr_words.json \
    --out tools/dayN制作/voice_alignment.json --subs-out tools/dayN制作/subtitle_timing.json
--words 接受 Vosk 风格 JSON：{"result":[{word,start,end},...]} 或词列表。
"""
import argparse
import difflib
import hashlib
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/验收'))
from media_common import binary, probe  # noqa: E402

PUNCT = '，。！？…—；：、'


def load_words(path):
    data = json.loads(Path(path).read_text(encoding='utf-8'))
    words = data.get('result') or data.get('words') or data
    out = []
    for w in words:
        text = str(w.get('word') or w.get('text') or '')
        if text:
            out.append({'word': text, 'start': float(w['start']), 'end': float(w['end'])})
    if not out:
        raise ValueError('ASR 词轴为空，拒绝生成实测轴')
    return out


def decode_mono(path, sr=16000):
    raw = subprocess.check_output([binary('ffmpeg'), '-v', 'error', '-i', str(path),
                                   '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'])
    return np.frombuffer(raw, dtype='<f4').astype(np.float64), sr


def refine(mono, sr, start, end):
    """5ms RMS：把 ASR 粗边界修到 -48dB 发声边界（方法与系列既有口径一致）。"""
    win = max(1, int(sr * 0.005))
    n = len(mono) // win
    if not n:
        return start, end
    rms = np.sqrt((mono[:n * win].reshape(n, win) ** 2).mean(axis=1) + 1e-24)
    db = 20 * np.log10(rms)
    hop = win / sr
    active = db >= -48.0

    def onset(t, lo_t):
        lo = max(0, int(max(lo_t + 0.01, t - 0.55) / hop))
        hi = min(n - 1, int((t + 0.20) / hop))
        for i in range(lo, hi):
            if active[i] and np.sum(active[i:i + 6]) >= 5:
                j = i
                while j > lo and db[j - 1] >= -60.0 and i - j < 16:
                    j -= 1
                return round(j * hop, 3)
        return round(t, 3)

    def offset(t):
        lo = max(0, int((t - 0.25) / hop))
        hi = min(n - 1, int((t + 0.55) / hop))
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

    return onset(start, 0.0), offset(end)


def build_cues(lines, words, mono, sr):
    script_chars = [ch for ln in lines for ch in ln]
    asr_chars = []
    for wi, w in enumerate(words):
        for ch in w['word']:
            asr_chars.append((ch, wi))
    sm = difflib.SequenceMatcher(a=[c for c, _ in asr_chars], b=script_chars, autojunk=False)
    char_word = [None] * len(script_chars)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        # 听错的字也要落到当时那一截声音上，不能整段丢给上一词。
        if tag in ('equal', 'replace') and i2 > i1 and j2 > j1:
            span_i, span_j = i2 - i1, j2 - j1
            for k in range(span_j):
                src = i1 + min(span_i - 1, k * span_i // span_j)
                char_word[j1 + k] = asr_chars[src][1]
    # 未匹配字按邻近词插值归属
    last = 0
    for i, v in enumerate(char_word):
        if v is None:
            char_word[i] = last
        else:
            last = v
    cues = []
    pos = 0
    prev_end = 0.0
    for li, line in enumerate(lines):
        idx = list(range(pos, pos + len(line)))
        pos += len(line)
        wis = [char_word[i] for i in idx if char_word[i] is not None]
        if not wis:
            raise ValueError(f'L{li + 1:02d} 无 ASR 对应词，拒绝伪造时间')
        start, end = refine(mono, sr, words[min(wis)]['start'], words[max(wis)]['end'])
        start = max(start, prev_end)
        chars = []
        for k, i in enumerate(idx):
            wi = char_word[i] if char_word[i] is not None else wis[min(k, len(wis) - 1)]
            w = words[wi]
            chars.append({'ch': line[k], 'start': round(float(w['start']), 3), 'end': round(float(w['end']), 3),
                          'timing_source': 'ASR sequence alignment + RMS refine'})
        cues.append({'id': f'L{li + 1:02d}', 'index': li + 1, 'start': start, 'end': max(end, start + 0.05),
                     'text': line, 'chars_timed': chars})
        prev_end = cues[-1]['end']
    return cues


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
        # 尾挂最多 0.24s，不把气口整段挂进下一句，否则门禁判「字幕尾挂超过 0.3s」。
        a['end'] = min(b['start'], round(a['speech_end'] + 0.24, 3))
        if a['end'] <= a['start']:
            a['end'] = round(a['start'] + 0.05, 3)
    if screens:
        screens[-1]['end'] = round(screens[-1]['speech_end'] + 0.24, 3)
    return screens


def main(argv=None):
    ap = argparse.ArgumentParser(description='通用配音实测对齐')
    ap.add_argument('--voice', type=Path, required=True)
    ap.add_argument('--script', type=Path, required=True)
    ap.add_argument('--words', type=Path, required=True, help='ASR 词级 JSON（Vosk result 格式）')
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--subs-out', type=Path, required=True)
    args = ap.parse_args(argv)
    lines = [ln.strip() for ln in args.script.read_text(encoding='utf-8').splitlines() if ln.strip()]
    words = load_words(args.words)
    mono, sr = decode_mono(args.voice)
    cues = build_cues(lines, words, mono, sr)
    duration = float(probe(args.voice)['format']['duration'])
    sha = hashlib.sha256(args.voice.read_bytes()).hexdigest()
    alignment = {'measured': True, 'method': 'ASR word timestamps + RMS boundary refine (generic)',
                 'source_file': str(args.voice), 'source_duration_seconds': duration,
                 'source_sha256': sha, 'cue_count': len(cues), 'cues': cues}
    screens = build_screens(cues)
    subs = {'measured': True, 'method': 'clauses from measured cues', 'source_sha256': sha, 'screens': screens}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.subs_out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(alignment, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    args.subs_out.write_text(json.dumps(subs, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'OK cues={len(cues)} screens={len(screens)} duration={duration:.2f}s -> {args.out}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
