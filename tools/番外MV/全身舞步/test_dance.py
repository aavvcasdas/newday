"""Animation layout and visible lower/upper-body change checks.
These checks do not assess perceived motion, drawing quality or foot sliding.
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image
R=Path(__file__).resolve().parents[2];A=R/'assets/ai-girls/dance-v11'
manifest=json.loads((R/'tools/番外MV/全身舞步/data/sprites.json').read_text())
for n,m in manifest['characters'].items():
 im=np.asarray(Image.open(A/f'{n}.png').convert('RGBA'));assert im.shape==(416*(3 if n=='whale' else 2),6144,4)
 def cel(i,row=0):return im[row*416:(row+1)*416,i*384:(i+1)*384]
 base,left,right=cel(0),cel(4),cel(12)
 def changes(a,b):return int(np.any(a!=b,axis=2).sum())
 assert changes(base[365:410,100:185],left[365:410,100:185])>300, (n,'left leg')
 assert changes(base[365:410,195:260],right[365:410,195:260])>300, (n,'right leg')
 assert changes(base[:300],left[:300])>100, (n,'upper body')
 for name in ('dance','kick'):
  x=m['dance']['animations'][name]; assert x['frames']==16 and sum(x['durationsMs'])==1700
  assert changes(cel(4,0),cel(4,1))>100,(n,'phrase variations')
 print(n,'left + right legs, upper body and both phrases OK')
