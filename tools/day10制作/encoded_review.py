"""Encoded keyframes/temporal neighbors; analytical contact + pixel QA is not OCR or full live viewing."""
import json,subprocess,hashlib
from pathlib import Path
R=Path(__file__).resolve().parents[2];H=Path(__file__).resolve().parent
import sys
sys.path.insert(0,str(R/'tools/验收'))
from media_common import binary
p=R/'Day10/成片/Day10_鲸鱼架空_配音对齐版.mp4';out=H/'有声编码抽查';out.mkdir(exist_ok=True)
indices=[0,150,356,357,358,409,457,458,637,707,871,872,873,874,935,1002,1074,1155,1302,1353,1455,1602,1755,1783]
subprocess.run([binary('ffmpeg'),'-v','error','-y','-i',str(p),'-vf','select='+ '+'.join(f'eq(n\\,{i})' for i in indices),'-vsync','vfr','-q:v','2',str(out/'frame_%02d.jpg')],check=True)
assert len(list(out.glob('frame_*.jpg')))==len(indices)
for target,expected in [('Day10/成片/Day10_词点互动_无声结构样片.mp4','c22619d1b9719901dfb7d98f4a0706bab8c7c967b0c33ef1392901fa889f8857'),('Day9/成片/Day9_海底联动三镜预览.mp4','df7ff9770fb716a8cb882b586f7dd309ebc4c852e52901ef2ce32184a1ec6826')]:assert hashlib.sha256((R/target).read_bytes()).hexdigest()==expected
for target in ['tools/day9制作/motion_v2.mjs','tools/day3制作/whale_girl_src/whale_rig.mjs','Day10/Day10配音台词.txt']:
 expected=subprocess.check_output(['git','show','7d600c5:'+target],cwd=R);assert (R/target).read_bytes()==expected
(H/'有声_编码抽查索引.json').write_text(json.dumps({'video_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'frames':[{'file':f'frame_{i+1:02}.jpg','frame':f,'time':f/30} for i,f in enumerate(indices)],'original_media_and_locked_script_preserved':True,'scope':'encoded keyframes and collision neighbor strip, not complete real-time human playback'},ensure_ascii=False,indent=2)+'\n')
print('Encoded frames:',len(indices),'bytes:',p.stat().st_size)
