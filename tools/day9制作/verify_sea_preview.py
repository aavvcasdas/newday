"""Verify the three-shot sea-stage trial against its measured source edit, without changing v2."""
import hashlib
import json
import pathlib
import subprocess
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[2]
HERE = pathlib.Path(__file__).resolve().parent
import sys
sys.path.insert(0,str(ROOT/'tools/验收'))
from media_common import binary
FF = binary('ffmpeg')
PROBE = binary('ffprobe')
video = ROOT / 'Day9/成片/Day9_海底联动三镜预览.mp4'
voice = ROOT / 'Day9/配音/鲸鱼看视频_克隆配音_最终版.wav'
edit = json.loads((HERE / '海底联动预览_时间轴.json').read_text())
meta = json.loads(subprocess.check_output([PROBE, '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(video)]))
v = next(s for s in meta['streams'] if s['codec_type'] == 'video')
a = next(s for s in meta['streams'] if s['codec_type'] == 'audio')
assert v['width'] == 1920 and v['height'] == 1080 and v['r_frame_rate'] == '30/1'
assert int(v['nb_frames']) == edit['frames']
assert hashlib.sha256(voice.read_bytes()).hexdigest() == edit['source_sha256']
segments = edit['edits']
# Independently decode the original WAV and apply ONLY the documented source cuts.
labels = ''.join(f'[a{i}]' for i in range(len(segments)))
filters = f'[0:a]apad,asplit={len(segments)}{labels};'
filters += ';'.join(f'[a{i}]atrim=start={e["sourceStart"]}:end={e["sourceEnd"]},asetpts=PTS-STARTPTS[b{i}]' for i,e in enumerate(segments))
filters += ';' + ''.join(f'[b{i}]' for i in range(len(segments))) + f'concat=n={len(segments)}:v=0:a=1[expected]'
expected = np.frombuffer(subprocess.check_output([FF, '-v', 'error', '-i', str(voice), '-filter_complex', filters, '-map', '[expected]', '-ac', '2', '-ar', '44100', '-f', 'f32le', '-']), dtype='<f4').astype('float64')
actual = np.frombuffer(subprocess.check_output([FF, '-v', 'error', '-i', str(video), '-map', '0:a:0', '-ac', '2', '-ar', '44100', '-f', 'f32le', '-']), dtype='<f4').astype('float64')
n = min(len(expected), len(actual))
corr = float(np.corrcoef(expected[:n], actual[:n])[0, 1])
assert corr > .999, corr
result = subprocess.run([FF, '-v', 'error', '-i', str(video), '-f', 'null', '-'], capture_output=True)
assert result.returncode == 0
subprocess.run(['git', 'diff', '--exit-code', '--', 'tools/day9制作/render_day9_v2.mjs', 'tools/day9制作/motion_v2.mjs',
                'tools/day9制作/voice_alignment.json', 'tools/day9制作/subtitle_timing.json', 'tools/engine/whale_rig',
                'Day9/配音', 'Day9/字幕', 'Day9/成片/Day9_笨鱼看同类_动作改进版_v2.mp4'], cwd=ROOT, check=True)
source_subs = json.loads((HERE / 'subtitle_timing.json').read_text())['screens']
subs = []
for e in segments:
    offset = e['outputStartFrame'] / 30 - e['sourceStart']
    for s in source_subs:
        start, end = max(s['start'], e['sourceStart']), min(s['end'], e['sourceEnd'])
        if end > start:
            subs.append(dict(text=s['text'], line=s['line'], start=start+offset, end=end+offset))
assert all(subs[i]['end'] <= subs[i+1]['start']+1e-6 for i in range(len(subs)-1))

def stamp(s):
    n = round(s*1000)
    return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'

(HERE / '海底联动预览_字幕轴.json').write_text(json.dumps(dict(measured=True,kind='measured_source_screens_mapped_through_edit_list',screens=subs),ensure_ascii=False,indent=2)+'\n')
(HERE / '海底联动预览字幕.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(s["start"])} --> {stamp(s["end"])}\n{s["text"]}' for i,s in enumerate(subs))+'\n')
rep = dict(file=str(video.relative_to(ROOT)), bytes=video.stat().st_size,
           sha256=hashlib.sha256(video.read_bytes()).hexdigest(), width=1920, height=1080, fps=30,
           frames=int(v['nb_frames']), video_duration=float(v['duration']), container_duration=float(meta['format']['duration']),
           audio_codec=a['codec_name'], audio_sample_rate=a['sample_rate'], source_speed=1,
           exact_source_edit_zero_offset_pcm_correlation=corr, full_decode_exit_code=result.returncode,
           source_lines=sorted(set(s['line'] for s in subs)), subtitle_screens=len(subs), subtitle_overlap=False,
           source_media_and_v2_preserved=True, scope='three_shot_sea_stage_trial_not_full_episode')
(HERE / '海底联动预览_媒体核验.json').write_text(json.dumps(rep, ensure_ascii=False, indent=2)+'\n')
from check_subtitle_sync import check
rep['subtitle_pixels_and_audio']=check(video,subs)
assert rep['subtitle_pixels_and_audio']['passed'],rep['subtitle_pixels_and_audio']['errors']
(HERE / '海底联动预览_媒体核验.json').write_text(json.dumps(rep, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({k:v for k,v in rep.items() if k!='subtitle_pixels_and_audio'}, ensure_ascii=False, indent=2))
# Encoded samples at shot quarters, including the seams and reaction states.
out = HERE / '海底联动预览抽帧/编码抽查'
out.mkdir(parents=True, exist_ok=True)
indices = [e['outputStartFrame']+round((e['frames']-1)*p) for e in segments for p in [.05,.3,.55,.8,.97]]
selection = '+'.join(f'eq(n\\,{i})' for i in indices)
subprocess.run([FF, '-v', 'error', '-i', str(video), '-vf', 'select='+selection, '-vsync', 'vfr', '-q:v', '2', '-y', str(out/'frame_%02d.jpg')], check=True)
assert len(list(out.glob('frame_*.jpg'))) == 15
