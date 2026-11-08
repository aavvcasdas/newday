"""Basic structural guarantees; visual quality still requires human review."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
R=Path(__file__).resolve().parents[2]
assets=R/'assets/ai-girls/full-v9'
meta=json.loads((R/'tools/番外MV/完整版/data/sprites.json').read_text())
for n,info in meta['characters'].items():
 im=np.asarray(Image.open(assets/f'{n}.png').convert('RGBA'))
 assert im.shape==(416*(2 if n=='whale' else 1),384*6,4),n
 for row in range(im.shape[0]//416):
  y=row*416;base=im[y:y+416,:384];blink=im[y:y+416,5*384:6*384]
  assert np.any(base!=blink),n
  assert np.array_equal(base[250:],blink[250:]),f'{n} blink changed lower body'
  for col in (1,3):
   frame=im[y:y+416,col*384:(col+1)*384]; assert np.any(base!=frame), f'{n} pose {col}'
   assert np.array_equal(base[404:],frame[404:]),f'{n} foot baseline changed'
 for anim in info['pet']['animations'].values(): assert anim['frames']==len(anim['durationsMs']) and all(d>0 for d in anim['durationsMs'])
 print(n,info['motion'],'validated')
