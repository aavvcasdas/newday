"""Decode every final frame, compare 28 source/encoded critical-event frames; not an OCR/listening claim."""
import hashlib,json,os,subprocess
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent
video=ROOT/'Day12/成片/Day12_鲸鱼摇人_有声BGM版.mp4';evidence=HERE/'production_review_frames'
report=json.loads((HERE/'production_check.json').read_text());frames=set(report['sampleFrames'])
ff=os.environ.get('FFMPEG','ffmpeg');p=subprocess.Popen([ff,'-v','error','-xerror','-i',str(video),'-an','-vf','scale=640:360','-pix_fmt','rgb24','-f','rawvideo','-'],stdout=subprocess.PIPE)
n=0;black=[];flat=[];comparisons=[]
while True:
    need=640*360*3;chunks=[]
    while need:
        buf=p.stdout.read(need)
        if not buf:break
        chunks.append(buf);need-=len(buf)
    if not chunks:break
    if need:raise ValueError('Partial decoded frame')
    a=np.frombuffer(b''.join(chunks),dtype=np.uint8).reshape(360,640,3)
    if a.mean()<5:black.append(n)
    if a.std()<5:flat.append(n)
    if n in frames:
        im=Image.fromarray(a);im.save(evidence/f'encoded_{n}.jpg',quality=95)
        expected=np.array(Image.open(evidence/f'expected_{n}.png').resize((640,360),Image.Resampling.BICUBIC).convert('RGB'))
        mae=float(abs(a.astype(float)-expected).mean());comparisons.append(dict(frame=n,time=n/30,mean_absolute_error=mae,passed=mae<3))
    n+=1
if p.wait()!=0:raise ValueError('Full decode failed')
passed=n==report['frames'] and not black and not flat and len(comparisons)==len(frames) and all(c['passed']for c in comparisons)
result={'passed':passed,'video':str(video.relative_to(ROOT)),'sha256':hashlib.sha256(video.read_bytes()).hexdigest(),'decoded_frames':n,'black_frames':black,'flat_frames':flat,'encoded_reference_matches':comparisons,'scope':'Every-frame decode/black-flat check + 28 exact-frame reference comparisons, not OCR or human listening'}
(HERE/'encoded_check.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False,indent=2))
if not passed:raise SystemExit(1)
