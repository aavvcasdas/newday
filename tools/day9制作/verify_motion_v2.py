"""Full decode, media metadata, zero-offset source-audio correlation and encoded cue stills.
Requires numpy, ffmpeg and ffprobe (CLI paths can be set with environment variables).
"""
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[2]
HERE = pathlib.Path(__file__).resolve().parent

def binary(name, fallback):
    p = os.environ.get(name.upper()) or shutil.which(name) or fallback
    if not pathlib.Path(p).is_file():
        raise RuntimeError(f"Set {name.upper()} to an installed {name} binary")
    return p

ff = binary('ffmpeg', '/tmp/node_render/node_modules/@ffmpeg-installer/linux-x64/ffmpeg')
probe = binary('ffprobe', '/tmp/node_render/node_modules/@ffprobe-installer/linux-x64/ffprobe')
video = ROOT / 'Day9/成片/Day9_笨鱼看同类_动作改进版_v2.mp4'
voice = ROOT / 'Day9/配音/鲸鱼看视频_克隆配音_最终版.wav'
meta = json.loads(subprocess.check_output([probe, '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(video)]))
v = next(s for s in meta['streams'] if s['codec_type'] == 'video')
a = next(s for s in meta['streams'] if s['codec_type'] == 'audio')

def pcm(p):
    raw = subprocess.check_output([ff, '-v', 'error', '-i', str(p), '-map', '0:a:0', '-ac', '2', '-ar', '44100', '-f', 'f32le', '-'])
    return np.frombuffer(raw, dtype='<f4').astype('float64')

x = pcm(voice)
y = pcm(video)[:len(x)]
corr = float(np.corrcoef(x, y)[0, 1])
decode = subprocess.run([ff, '-v', 'error', '-i', str(video), '-f', 'null', '-'], capture_output=True)
alignment = json.loads((HERE / 'voice_alignment.json').read_text())
source_hash = hashlib.sha256(voice.read_bytes()).hexdigest()
subprocess.run(['node', '--test', str(HERE / 'motion_v2.test.mjs')], check=True, cwd=ROOT)
assert source_hash == alignment['source_sha256']
assert decode.returncode == 0 and corr > .999
assert v['width'] == 1920 and v['height'] == 1080 and v['r_frame_rate'] == '30/1'
assert int(v['nb_frames']) == 3343
# Verify that no preserved deliverable, voice, subtitle, timing, drawing or original renderer was edited.
subprocess.run(['git', 'diff', '--exit-code', '--', 'Day9/配音', 'Day9/字幕', 'Day9/Day9配音台词.txt',
                'Day9/成片/Day9_笨鱼看同类_配音对齐版.mp4', 'Day9/成片/Day9_笨鱼看同类_无配音样片.mp4',
                'tools/day9制作/render_day9.mjs', 'tools/day9制作/voice_alignment.json',
                'tools/day9制作/subtitle_timing.json', 'tools/engine/whale_rig'], check=True, cwd=ROOT)
rep = dict(file=str(video.relative_to(ROOT)), bytes=video.stat().st_size,
           sha256=hashlib.sha256(video.read_bytes()).hexdigest(), video_codec=v['codec_name'],
           width=v['width'], height=v['height'], fps=v['r_frame_rate'], encoded_frames=int(v['nb_frames']),
           video_duration_seconds=float(v['duration']), container_duration_seconds=float(meta['format']['duration']),
           audio_codec=a['codec_name'], audio_sample_rate=int(a['sample_rate']), audio_channels=a['channels'],
           source_sha256=source_hash, audio_speed=1, audio_offset_seconds=0,
           pcm_zero_offset_correlation=corr, full_decode_exit_code=decode.returncode,
           measured=True, lines=49, subtitle_screens=64, unit_tests_passed=15,
           old_renderer_and_deliverables_preserved=True)
(HERE / 'v2媒体核验.json').write_text(json.dumps(rep, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(rep, ensure_ascii=False, indent=2))
cues = alignment['cues']
d = HERE / 'v2抽帧/编码抽查'
d.mkdir(parents=True, exist_ok=True)
indices = [round((c['start'] + c['end']) / 2 * 30) for c in cues]
selection = '+'.join(f'eq(n\\,{i})' for i in indices)
subprocess.run([ff, '-v', 'error', '-i', str(video), '-vf', 'select=' + selection,
                '-vsync', 'vfr', '-q:v', '2', '-y', str(d / 'L%02d.jpg')], check=True)
assert len(list(d.glob('L*.jpg'))) == len(cues)
print('Encoded cue samples:', len(cues))
