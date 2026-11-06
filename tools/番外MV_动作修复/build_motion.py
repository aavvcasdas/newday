"""Build fixed-baseline, local cutout-arm animation with separated clean plates.
No original pets artwork is included. Not hand-drawn in-between animation.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image,ImageDraw
R=Path(__file__).resolve().parents[2]
O=R/'assets/ai-girls/animated-v10';S=O/'source'; PREV=R/'assets/ai-girls/reference-motion'; W,H=384,416
# Forearm/hand region plus elbow pivot in the common fixed cell coordinates.
RIG={
 'whale':([(229,214),(235,191),(256,174),(265,153),(295,153),(300,187),(281,204),(270,223),(248,235)],(235,224)),
 'gemini':([(228,232),(240,218),(246,202),(254,198),(271,204),(271,226),(252,241),(239,256),(227,252)],(231,248)),
 'doubao':([(98,154),(123,153),(135,170),(140,193),(141,209),(132,224),(119,222),(106,197),(98,178)],(133,212)),
 'kimi':([(98,132),(122,132),(132,152),(144,164),(155,184),(141,197),(125,188),(110,168),(99,156)],(145,185)),
 'qwen':([(130,146),(149,144),(158,161),(158,176),(169,188),(152,200),(140,183),(128,169)],(161,190)),
 'claude':([(83,154),(108,152),(120,173),(139,189),(148,212),(133,228),(112,215),(100,195),(82,187)],(140,217)),
 'gpt':([(222,194),(230,174),(235,152),(248,145),(268,149),(275,164),(265,180),(249,194),(239,217),(225,216)],(225,210)),
 'whale_sad':([(235,227),(255,232),(272,252),(294,270),(296,291),(282,301),(257,289),(241,281),(230,259)],(235,242)),
 'zai':([(126,203),(142,200),(157,208),(159,226),(166,240),(161,254),(147,258),(135,244),(127,231),(122,219)],(157,249)),
}

def cleanplate(name,base):
 # Background in generator output may be literal white/checkerboard. It is
 # removed only in the localized arm polygon; it is never used as a backdrop.
 im=Image.open(S/f'{name}_under.png').convert('RGB').resize((W,H),Image.Resampling.LANCZOS)
 data=np.array(im); rng=np.max(data,axis=2)-np.min(data,axis=2); bright=np.mean(data,axis=2)
 alpha=np.where((rng<5)&(bright>185),0,255).astype('uint8')
 return Image.fromarray(np.dstack((data,alpha)),'RGBA')

def frames(name,base):
 polygon,pivot=RIG[name];mask=Image.new('L',(W,H));ImageDraw.Draw(mask).polygon(polygon,fill=255)
 arm=Image.new('RGBA',(W,H));arm.paste(base,(0,0),mask)
 clean=base.copy();clean.paste(cleanplate(name,base),(0,0),mask)
 def draw(degrees):
  if not degrees:return base.copy()
  return Image.alpha_composite(clean,arm.rotate(degrees,resample=Image.Resampling.BICUBIC,center=pivot))
 return [draw(deg) for deg in (0,-12,-22,-12,0,12,22,12,0)]

def blink_for(name,base):
 if name=='whale':
  src=Image.open(R/'assets/ai-girls/full-v9/whale.png').convert('RGBA');return src.crop((5*W,H,6*W,2*H))
 prev=Image.open(PREV/f'{name}.png').convert('RGBA');normal=prev.crop((0,0,W,H));closed=prev.crop((W,0,2*W,H))
 if name in ('gpt','zai'):
  # Only the eyes from the same-character blink, never a full redraw.
  box=(120,95,245,155) if name=='gpt' else (120,135,245,195)
  out=base.copy();out.paste(closed.crop(box),box);return out
 return closed

meta={'characters':{}}
for name in [n for n in RIG if n != 'whale_sad']:
 base=Image.open(S/f'{name}.png').convert('RGBA');assert base.size==(W,H)
 still=Image.open(PREV/f'{name}.png').convert('RGBA');idle=still.crop((0,0,W,H));idleblink=still.crop((W,0,2*W,H))
 wave=frames(name,base);wave.append(blink_for(name,base));wave.append(base)
 atlas=Image.new('RGBA',(W*len(wave),H*(3 if name=='whale' else 2)));
 atlas.alpha_composite(idle,(0,0));atlas.alpha_composite(idleblink,(W,0))
 for i,im in enumerate(wave):atlas.alpha_composite(im,(i*W,H))
 if name=='whale':
  sad=Image.open(S/'whale_sad.png').convert('RGBA'); sadframes=frames('whale_sad',sad)+[sad,sad]
  for i,im in enumerate(sadframes): atlas.alpha_composite(im,(i*W,2*H))
 atlas.save(O/f'{name}.png',optimize=True)
 path=f'projectassets/ai-girls/animated-v10/{name}.png'
 meta['characters'][name]={'preview':path,'pet':{'file':path,'cellW':W,'cellH':H,'footY':408,'standPx':400,
 'animations':{'idle':{'row':0,'frames':2,'durationsMs':[2200,140],'loop':True},
 'wave':{'row':1,'frames':11,'durationsMs':[300,115,115,115,115,115,115,115,150,140,1000],'loop':True}}}}
meta['characters']['whale']['pet']['animations']['sad']={'row':2,'frames':11,'durationsMs':[400,140,140,140,140,140,140,140,200,500,900],'loop':True}
meta['characters']['whale']['meal']={'file':'projectassets/ai-girls/whale-pet-study/whale.png','cellW':W,'cellH':H,'footY':408,'standPx':400,'animations':{'working':{'row':5,'frames':6,'durationsMs':[120,120,120,120,120,220],'loop':True}}}
(R/'tools/番外MV_动作修复/data/sprites.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
