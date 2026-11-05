from pathlib import Path
from PIL import Image,ImageDraw
import json,re
root=Path(__file__).resolve().parents[2]; cache=root.parent/'day8-gif-cache';cache.mkdir(exist_ok=True)
manifest={}
for p in (root/'Day8/素材/GIF').glob('*.gif'):
 im=Image.open(p); dest=cache/p.stem;dest.mkdir(exist_ok=True);frames=[]
 for i in range(im.n_frames):
  im.seek(i);rgba=im.convert('RGBA')
  if p.stem.startswith('老大_'):
   mask=rgba.convert('RGB').convert('L').point(lambda v:255 if v<24 else 0)
   for xy in [(0,0),(rgba.width-1,0),(0,rgba.height-1),(rgba.width-1,rgba.height-1)]:
    if mask.getpixel(xy)==255:ImageDraw.floodfill(mask,xy,128)
   alpha=mask.point(lambda v:0 if v==128 else 255);rgba.putalpha(alpha)
  f=dest/f'{i:03}.png';rgba.save(f);frames.append({'file':str(f),'ms':im.info.get('duration',100)})
 manifest[p.stem]={'source':str(p.relative_to(root)),'size':list(im.size),'frames':frames,'duration_ms':sum(x['ms'] for x in frames)}
(root/'tools/day8制作/gif_manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
lines=(root/'Day8/Day8配音台词.txt').read_text().splitlines();cues=[];screens=[];t=0
for i,line in enumerate(lines,1):
 # Planning only: no measured voice exists.
 start=t;words=re.findall(r'[^，。！？；：、]+[，。！？；：、]?',line)
 for cl in words:
  d=max(.7,len(re.sub(r'[^\w\u4e00-\u9fff]','',cl))/3.6);screens.append({'id':f'L{i:02}','text':cl,'start':round(t,3),'end':round(t+d,3),'speech_end':round(t+d,3)});t+=d+.12
 cues.append({'id':f'L{i:02}','index':i,'text':line,'start':round(start,3),'end':round(t-.12,3)});t+=.12
(root/'tools/day8制作/样片归档/sample_cues.json').write_text(json.dumps({'measured':False,'kind':'silent_storyboard_estimate','method':'无配音临时排布；3.6字符/秒+分句气口；不得用于终版对齐','cues':cues},ensure_ascii=False,indent=2))
(root/'tools/day8制作/样片归档/sample_subtitles.json').write_text(json.dumps({'measured':False,'screens':screens},ensure_ascii=False,indent=2))
print(len(lines),'lines',round(t,2),'seconds')
