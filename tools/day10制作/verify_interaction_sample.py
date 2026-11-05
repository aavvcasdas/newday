"""Independent media validation; intentionally NOT the formal audio/final gate."""
import hashlib,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
movie=ROOT/'Day10/成片/Day10_词点互动_无声结构样片.mp4'
ff='/tmp/node_render/node_modules/@ffmpeg-installer/linux-x64/ffmpeg'
probe='/tmp/node_render/node_modules/@ffprobe-installer/linux-x64/ffprobe'
p=json.loads(subprocess.check_output([probe,'-v','error','-count_frames','-show_streams','-show_format','-of','json',str(movie)]))
v=[s for s in p['streams'] if s['codec_type']=='video'];a=[s for s in p['streams'] if s['codec_type']=='audio']
assert len(v)==1 and not a
v=v[0]
assert (v['width'],v['height'])==(1920,1080)
assert v['r_frame_rate']=='30/1' and int(v['nb_read_frames'])==570
assert abs(float(p['format']['duration'])-19)<.001
result=subprocess.run([ff,'-v','error','-i',str(movie),'-f','null','-'],capture_output=True,text=True)
assert result.returncode==0,result.stderr
plan=json.loads((HERE/'互动样片_规划轴.json').read_text())
assert plan['measured'] is False and all(e['measured'] is False for e in plan['events'])
for left,right in zip(plan['screens'],plan['screens'][1:]):assert left['end']<=right['start']
assert abs(plan['screens'][-1]['end']+.2-19)<1e-9
# Verify original Day9 media/source hashes against the committed baseline, not new acceptance guesses.
protected=['Day9/成片/Day9_海底联动三镜预览.mp4','tools/day9制作/motion_v2.mjs','tools/day3制作/whale_girl_src/whale_rig.mjs','tools/场景/sea_stage.mjs']
unchanged={}
for item in protected:
 original=subprocess.check_output(['git','show','8c5b30f:'+item],cwd=ROOT)
 unchanged[item]=hashlib.sha256(original).digest()==hashlib.sha256((ROOT/item).read_bytes()).digest()
assert all(unchanged.values())
report={'scope':'silent_structure_preview_only','measured':False,'width':1920,'height':1080,'fps':'30/1','frames':570,'seconds':19,'audio_streams':0,'full_decode_exit':result.returncode,'sha256':hashlib.sha256(movie.read_bytes()).hexdigest(),'bytes':movie.stat().st_size,'planned_subtitle_screens':len(plan['screens']),'planned_subtitles_nonoverlap':True,'original_protected_files_unchanged':unchanged,'tests':{'node_pass':42,'python_unittest_total':17,'python_unittest_skipped':5},'limitations':['no Day10 audio or measured alignment','analytical contacts are not independent image recognition','keyframe review, not complete real-time viewing']}
(HERE/'互动样片_媒体验收.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
