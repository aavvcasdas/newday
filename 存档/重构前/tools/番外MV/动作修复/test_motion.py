"""Validate that every cast member has distinct fixed-baseline arm frames.
This is not an aesthetic quality test and does not certify limb anatomy.
"""
import json
from pathlib import Path
from PIL import Image
import numpy as np
R=Path(__file__).resolve().parents[2];D=R/'assets/ai-girls/animated-v10'
m=json.loads((R/'tools/番外MV/动作修复/data/sprites.json').read_text())
for name,item in m['characters'].items():
 im=np.asarray(Image.open(D/f'{name}.png').convert('RGBA'))
 assert im.shape==(1248 if name=='whale' else 832,4224,4), (name,im.shape)
 base=im[416:832,0:384]; left=im[416:832,768:1152]; right=im[416:832,2304:2688]
 for label,frame in [('left',left),('right',right)]:
  changed=np.any(base!=frame,axis=2)
  assert changed.sum()>100, (name,label,'not enough changed pixels')
  assert not changed[300:,:].any(), (name,label,'lower body changed')
 assert np.any(left!=right),name
 for a in item['pet']['animations'].values():
  assert len(a['durationsMs'])==a['frames'] and all(d>0 for d in a['durationsMs'])
 print(name,'distinct left/right limb frames; feet unchanged')
