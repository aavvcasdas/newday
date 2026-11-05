"""Review data derived from locked v2 files; never import a renderer or old v1 lyrics."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
V2 = ROOT / 'tools/mv_extra/v2'
BASE = ROOT / '番外MV/把回忆拼好给你'
SAMPLE = BASE / '样片/v2_动作与场景_19.8秒有声试剪.mp4'
SOURCE = ROOT / '《把回忆拼好给你》.mp4'

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def data():
    check = json.loads((V2 / 'sample_check.json').read_text())
    timing = json.loads((V2 / 'timing.json').read_text())
    lyrics = (V2 / 'lyrics.txt').read_text().strip().splitlines()
    assert len(lyrics) == len(timing['cues']) == 16
    assert digest(V2 / 'lyrics.txt') == timing['sourceScriptSha256'], 'Locked lyrics changed'
    if SAMPLE.is_file():
        assert digest(SAMPLE) == check['outputSha256'], 'Sample differs from checked v2; refusing stale evidence'
    start, end = check['sourceRangeSeconds']
    cues = []
    for cue, text in zip(timing['cues'], lyrics):
        cues.append({**cue, 'text': text, 'implemented': 6 <= cue['line'] <= 11})
    # These positions are extracted from the actual frame trace, not re-estimated from text.
    trace = json.loads((V2 / 'performance_trace.json').read_text())
    groups = []
    for row in trace:
        if not groups or groups[-1]['id'] != row['shot']:
            groups.append({'id': row['shot'], 'start': row['time'],
                           'local': row['time'] - start, 'events': row['events']})
    titles = ['雨棚下靠近', '低头看积水', '阴霾与陪伴', '拨开阴霾', '抱住快乐',
              '快乐入盒', '把不开心淘汰', '夜城情话', '光迹升空', '烟花落进眼前', '绽放与熄灭']
    assert len(groups) == len(titles) == 11
    for i, shot in enumerate(groups):
        shot['title'] = titles[i]
        shot['end'] = groups[i + 1]['start'] if i + 1 < len(groups) else end
    return {'title': '把回忆拼好给你', 'start': start, 'end': end, 'fps': 30,
            'frames': check['frames'], 'duration': check['videoDuration'],
            'sampleSha256': check['outputSha256'], 'sampleAvailable': SAMPLE.is_file(),
            'sourceAvailable': SOURCE.is_file(), 'cues': cues, 'shots': groups,
            'humanApproved': False, 'fullV2Rendered': False,
            'timingNote': '原片显字参考轴，约 ±0.25 秒；不是 ASR / 音素级对齐。'}

# Explicit public assets only: never serve the repository itself or hidden files.
FILES = {
    '/media/sample.mp4': SAMPLE,
    '/media/source.mp4': SOURCE,
    '/media/cast.jpg': BASE / '分镜/v2_现有形象与透明素材盘点.jpg',
    '/media/storyboard.jpg': BASE / '分镜/v2_动作与场景_试剪分镜.jpg',
    '/media/phases.jpg': BASE / '分镜/v2_编码动作相位.jpg',
    '/media/cover.jpg': BASE / '封面/v2_动作试剪封面.jpg',
    '/docs/director.md': BASE / '分镜/v2_动作与场景导演表.md',
    '/docs/readme.md': BASE / 'README_v2.md',
    '/docs/sample.srt': BASE / '字幕/v2_动作试剪.srt',
}
