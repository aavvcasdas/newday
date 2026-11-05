#!/usr/bin/env python3
"""无声结构样片规划轴：按 3.35 字/秒含气口估算，measured=false，禁止当正式字幕/词点。"""
import json
from pathlib import Path
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
lines = (ROOT / 'Day11/Day11配音台词.txt').read_text(encoding='utf-8').strip().splitlines()
han = lambda s: sum(1 for c in s if '一' <= c <= '鿿')
cues, t = [], 0.0
for i, line in enumerate(lines, 1):
    dur = max(0.9, han(line) / 3.35)
    chars, step = [], dur / max(len(line), 1)
    for k, ch in enumerate(line):
        chars.append({'ch': ch, 'start': round(t + k * step, 3), 'end': round(t + (k + 1) * step, 3),
                      'timing_source': 'estimated for silent sample only'})
    cues.append({'id': f'L{i:02d}', 'index': i, 'start': round(t, 3), 'end': round(t + dur, 3),
                 'text': line, 'chars_timed': chars})
    t += dur + 0.22
screens = [{'line': c['index'], 'text': c['text'], 'start': c['start'], 'speech_end': c['end'], 'end': c['end']}
           for c in cues]
for a, b in zip(screens, screens[1:]):
    a['end'] = b['start']
align = {'measured': False, 'kind': 'silent_structural_sample_planning',
         'note': '估时轴，仅供无声样片排布；正式制作必须换实测轴',
         'source_duration_seconds': round(t, 3), 'source_sha256': 'SILENT_SAMPLE_NO_VOICE',
         'cue_count': len(cues), 'cues': cues}
subs = {'measured': False, 'method': 'estimated screens for silent sample', 'screens': screens}
(HERE / '无声样片_规划轴.json').write_text(json.dumps(align, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
(HERE / '无声样片_规划字幕.json').write_text(json.dumps(subs, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'planning cues={len(cues)} duration={t:.1f}s measured=false')
