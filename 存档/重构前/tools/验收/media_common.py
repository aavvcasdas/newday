"""媒体工具解析，不把某台机器的/tmp依赖当作唯一环境。"""
import os
import shutil
import subprocess
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def binary(name):
    override = os.environ.get(name.upper())
    if override:
        found = shutil.which(override)
        if not found:
            raise ValueError(f'{name.upper()} 指定的程序不可执行：{override}')
        return found
    found = shutil.which(name)
    if found:
        return found
    package = '@ffmpeg-installer' if name == 'ffmpeg' else '@ffprobe-installer'
    for base in [ROOT/'node_modules', Path('/tmp/node_render/node_modules')]:
        candidate = base/package/'linux-x64'/name
        if candidate.is_file() and os.access(candidate, os.X_OK):
            return str(candidate)
    raise ValueError(f'找不到{name}；安装到PATH或设置{name.upper()}')

def probe(video):
    return json.loads(subprocess.check_output([binary('ffprobe'), '-v','error','-show_streams','-show_format','-of','json',str(video)]))

def read_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))

def validate_timing(alignment, subtitles, lines, voice):
    import hashlib
    import math
    if subtitles.get('measured') is not True:
        raise ValueError('字幕必须 measured=true')
    if alignment.get('measured') is not True:
        raise ValueError('alignment 必须 measured=true')
    if hashlib.sha256(Path(voice).read_bytes()).hexdigest() != alignment.get('source_sha256'):
        raise ValueError('源音频SHA256不匹配')
    cues = alignment.get('cues', [])
    if not cues or [c['text'] for c in cues] != lines:
        raise ValueError('cue与外置台词数量/逐句文本不一致')
    screens = subtitles.get('screens', [])
    if not screens or ''.join(s['text'] for s in screens) != ''.join(lines):
        raise ValueError('字幕与台词逐字不一致')
    for label, items in [('cue',cues),('subtitle',screens)]:
        prev = 0
        for item in items:
            st,en = float(item['start']),float(item['end'])
            if not (math.isfinite(st) and math.isfinite(en) and 0 <= st < en and st >= prev-1e-7):
                raise ValueError(f'{label}时间无效/重叠')
            prev = en
    duration = float(alignment['source_duration_seconds'])
    if not math.isfinite(duration) or duration<=0:
        raise ValueError('实测源时长无效')
    if cues[-1]['end'] > duration+.03:
        raise ValueError('cue超过音源长度')
    # 同时支持line与id；不能把不存在的行悄悄映射到第一句。
    cue_ids = {c.get('id') or f'L{i+1:02d}':i for i,c in enumerate(cues)}
    for s in screens:
        idx = int(s['line'])-1 if 'line' in s else cue_ids.get(s.get('id'))
        if idx is None or not 0 <= idx < len(cues):
            raise ValueError('字幕缺有效line/id')
        cue = cues[idx]
        if s['start'] < cue['start']-.04 or s['end'] > cue['end']+.301:
            raise ValueError('字幕抢跑/尾挂超过0.3s')
        length = sum(ch.isalnum() for ch in s['text'])
        if length > 15:
            raise ValueError(f'单屏超过15字：{s["text"]}')
    for i,c in enumerate(cues):
        owned=[s['text'] for s in screens if (s.get('line') == i+1 or ('line' not in s and s.get('id') == (c.get('id') or f'L{i+1:02d}')))]
        if ''.join(owned)!=c['text']:
            raise ValueError('字幕行归属与cue文本不一致')
    return cues, screens
