#!/usr/bin/env python3
"""从实测轴和分镜词点生成 BGM 词点音效表。只声明 kind/time，不改人声。"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
al = json.loads((HERE / 'voice_alignment.json').read_text(encoding='utf-8'))
KIND = {
    'tug_grab': 'whoosh', 'unroll_scroll': 'whoosh', 'sink_drop': 'bonk',
    'slap_deflect': 'whoosh', 'mark_strike': 'knock', 'handoff': 'whoosh',
    'knock_bowl': 'knock', 'drop_bonk': 'bonk',
}
# 与 episode.spec.mjs 保持同一词点；改分镜时两处一起改。
points = [
    (2, '帮', 'stamp_thud'),
    (1, '翻', 'whoosh'),
    (4, '扒', 'whoosh'),
    (9, '石', 'bonk'),
    (13, '嫌', 'whoosh'),
    (15, '标', 'knock'),
    (17, '划', 'knock'),
    (18, '标', 'knock'),
    (19, '熬', 'knock'),
    (22, '递', 'whoosh'),
    (23, '吃', 'knock'),
]
events = []
for line, ch, kind in points:
    cue = al['cues'][line - 1]
    hit = next(c for c in cue['chars_timed'] if c['ch'] == ch)
    events.append({'kind': kind, 'time': hit['start'], 'line': line, 'char': ch})
out = HERE / 'sfx_events.json'
out.write_text(json.dumps(events, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'{len(events)} events -> {out}')
