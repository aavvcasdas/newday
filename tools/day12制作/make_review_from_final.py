"""Four exact-time clips from the newly encoded BGM master; edited review, not a continuous episode."""
import hashlib,json,os,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'tools/验收'))
from media_common import binary,probe
os.chdir(ROOT)
video=Path('Day12/成片/Day12_鲸鱼摇人_有声BGM版.mp4');out=Path('Day12/样片/Day12_v2_四段动态审看_有声.mp4')
clips=[(0,4),(19,26),(66,75),(91.2,104.3)]
f=[]
for i,(a,b)in enumerate(clips):
 f.extend([f'[0:v]trim=start={a}:end={b},setpts=PTS-STARTPTS[v{i}]',f'[0:a]atrim=start={a}:end={b},asetpts=PTS-STARTPTS[a{i}]'])
f.append(''.join(f'[v{i}][a{i}]'for i in range(4))+'concat=n=4:v=1:a=1[v][a]')
subprocess.run([binary('ffmpeg'),'-v','error','-y','-i',str(video),'-filter_complex',';'.join(f),'-map','[v]','-map','[a]','-c:v','libx264','-crf','19','-preset','veryfast','-pix_fmt','yuv420p','-r','30','-c:a','aac','-ac','2','-ar','44100','-movflags','+faststart',str(out)],check=True)
m=probe(out);v=next(s for s in m['streams']if s['codec_type']=='video');assert int(v['nb_frames'])==993
subprocess.run([binary('ffmpeg'),'-v','error','-xerror','-i',str(out),'-f','null','-'],check=True)
report={'video':str(out),'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'sourceMaster':str(video),'sourceMasterSha256':hashlib.sha256(video.read_bytes()).hexdigest(),'clips':clips,'frames':993,'duration':33.1,'fullDecodePassed':True,'audio':'BGM master exact segment audio; original voice unchanged in the master','humanDynamicReview':'pending; automatic checks/stills are not human playback approval'}
(ROOT/'tools/day12制作/v2_review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('PASS four current-master review clips; HUMAN APPROVAL PENDING')
