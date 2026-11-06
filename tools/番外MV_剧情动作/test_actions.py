"""Technical checks only; human review is still required for motion quality."""
from pathlib import Path
from PIL import Image
import numpy as np,json
R=Path(__file__).resolve().parents[2];A=R/'assets/ai-girls/actions-v12'
manifest=json.loads((R/'tools/番外MV_剧情动作/data/actions.json').read_text())
assert len(manifest)==11
for name,m in manifest.items():
 img=np.asarray(Image.open(A/f'{name}.png').convert('RGBA'));assert img.shape==(416,384*11,4)
 base,peak=img[:,:384],img[:,384*5:384*6]
 diffs=np.any(base!=peak,axis=2)
 assert np.count_nonzero(diffs)>10,(name,'no visible changed pixels')
 assert not np.any(diffs[390:]),(name,'foot baseline unexpectedly changes')
 rgb=img[:,:,:3].astype('int16');a=img[:,:,3]>200
 green=a&(rgb[:,:,1]>160)&(rgb[:,:,1]>rgb[:,:,0]*1.5)&(rgb[:,:,1]>rgb[:,:,2]*1.5)
 assert green.sum()==0,(name,'green screen remnants')
 anim=m['animations']['action'];assert anim['frames']==11 and not anim['loop']
 print(f'{name}: {diffs.sum()} changed pixels; non-looping, baseline fixed, no opaque green')
print('Pass: automated checks do not rate perceived action, seams, or narrative quality.')
