"""Construct two-beat step-touch choreography from separately masked limbs.

Feet, forearms and torso are separate layers; this is a procedural 2D puppet,
not hand-drawn animation. One foot remains planted during each step. The
clean plates and original Day12/project art are retained for reproducibility.
"""
import json, math
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2]; OUT=ROOT/'assets/ai-girls/dance-v11'; S=OUT/'source'
OLD=ROOT/'assets/ai-girls/animated-v10'; W,H=384,416
# Pair of leg polygons and hip pivots. Foreground hem covers the cut joints.
R={
'whale':([([(120,355),(163,355),(168,407),(120,407)],(142,355)), ([(191,353),(230,353),(239,407),(191,407)],(207,353))],355),
'gemini':([([(155,317),(183,317),(181,349),(182,380),(184,404),(157,404),(155,381)],(169,318)), ([(196,317),(225,317),(224,348),(220,381),(217,404),(192,404),(193,381)],(210,318))],318),
'doubao':([([(146,284),(186,284),(186,381),(187,410),(144,410),(145,382)],(167,284)), ([(190,284),(232,284),(235,410),(190,410)],(210,284))],284),
'gpt':([([(143,297),(170,297),(178,321),(177,377),(181,405),(150,405),(147,380)],(153,297)), ([(195,341),(219,350),(220,385),(222,405),(191,405),(191,381)],(202,344))],299),
'kimi':([([(151,299),(181,299),(181,347),(187,358),(189,407),(145,407),(148,357)],(166,300)), ([(194,299),(226,299),(229,351),(235,358),(235,407),(191,407),(196,355)],(210,300))],300),
'qwen':([([(163,351),(184,351),(185,370),(188,400),(158,400),(159,374)],(173,351)), ([(198,351),(219,351),(218,372),(221,404),(192,404),(193,374)],(207,351))],352),
'zai':([([(158,351),(183,351),(184,371),(186,405),(158,405),(157,370)],(170,351)), ([(198,351),(223,351),(223,370),(224,405),(196,405),(195,370)],(210,351))],352),
'claude':([([(156,343),(181,343),(183,407),(156,407)],(169,343)), ([(195,343),(220,343),(222,407),(193,407)],(207,343))],344),
}

def under(name):
 if name in ('doubao','claude'):return Image.new('RGBA',(W,H))
 im=Image.open(S/f'{name}_legunder.png').convert('RGB').resize((W,H),Image.Resampling.LANCZOS)
 a=np.asarray(im); delta=a.max(2)-a.min(2);bright=a.mean(2)
 return Image.fromarray(np.dstack((a,np.where((delta<5)&(bright>185),0,255).astype('uint8'))),'RGBA')

def claude_arm_frames():
 base=Image.open(S/'claude_stand_cutout.png').convert('RGBA')
 plate=Image.open(OLD/'source/claude_under.png').convert('RGB').resize((W,H),Image.Resampling.LANCZOS)
 a=np.asarray(plate);delta=a.max(2)-a.min(2);bright=a.mean(2);plate=Image.fromarray(np.dstack((a,np.where((delta<5)&(bright>185),0,255).astype('uint8'))),'RGBA')
 mask=Image.new('L',(W,H));ImageDraw.Draw(mask).polygon([(83,154),(108,152),(120,173),(139,189),(148,212),(133,228),(112,215),(100,195),(82,187)],fill=255)
 arm=Image.new('RGBA',(W,H));arm.paste(base,(0,0),mask)
 body=base.copy();body.paste(plate,(0,0),mask)
 frames=[]
 for deg in (0,-12,-22,-12,0,12,22,12,0):
  frames.append(base if deg==0 else Image.alpha_composite(body,arm.rotate(deg,Image.Resampling.BICUBIC,center=(140,217))))
 return frames

def separate(name,base,plate):
 specs,hem=R[name];body=base.copy(); limbs=[]
 for polygon,pivot in specs:
  mask=Image.new('L',(W,H));ImageDraw.Draw(mask).polygon(polygon,fill=255)
  limb=Image.new('RGBA',(W,H));limb.paste(base,(0,0),mask)
  limbs.append((limb,pivot));body.paste(plate,(0,0),mask)
 foreground=Image.new('RGBA',(W,H));foreground.paste(base.crop((0,0,W,hem)),(0,0))
 return body,limbs,foreground

def pose(name,base,plate,phase,kind="dance"):
 sad = kind == "sadDance"
 body,legs,front=separate(name,base,plate)
 s=math.sin(phase); strength=0.55 if sad else 1.0
 # Torso and hair lean around the waist; both feet remain independent.
 lean=(2.2 if kind == "kick" else 1.5)*s*strength; pivot=(192, min(320,R[name][1]-15))
 body=body.rotate(lean,Image.Resampling.BICUBIC,center=pivot)
 front=front.rotate(lean,Image.Resampling.BICUBIC,center=pivot)
 # Each half cycle plants one leg while the other swings out and lifts.
 for i,(limb,hip) in enumerate(legs):
  amount=max(0,s if i==0 else -s)*strength
  extent=33 if kind == "kick" else 24
  angle=(-extent if i==0 else extent)*amount
  rot=limb.rotate(angle,Image.Resampling.BICUBIC,center=hip)
  lift=round((9 if kind == "kick" else 4)*amount)
  shifted=Image.new('RGBA',(W,H));shifted.alpha_composite(rot,(0,-lift))
  body=Image.alpha_composite(body,shifted)
 return Image.alpha_composite(body,front)

meta={}
for name in R:
 old=Image.open(OLD/f'{name}.png').convert('RGBA')
 wave=[old.crop((i*W,H,(i+1)*W,H*2)) for i in range(9)] if name!='claude' else claude_arm_frames()
 sadframes=[old.crop((i*W,H*2,(i+1)*W,H*3)) for i in range(9)] if name=='whale' else None
 rows=[('dance',wave),('kick',wave)]+([('sadDance',sadframes)] if sadframes else [])
 sheet=Image.new('RGBA',(W*16,H*len(rows)));plate=under(name)
 seq=[0,1,2,3,4,5,6,7,8,7,6,5,4,3,2,1]
 for row,(kind,srcframes) in enumerate(rows):
  for i in range(16):
   frame=pose(name,srcframes[seq[i]],plate,2*math.pi*i/16,kind=kind)
   sheet.alpha_composite(frame,(i*W,row*H))
 sheet.save(OUT/f'{name}.png',optimize=True)
 path=f'projectassets/ai-girls/dance-v11/{name}.png'
 timing=[106,106,107,106,106,106,107,106,106,106,107,106,106,106,107,106]
 animation={'dance':{'row':0,'frames':16,'durationsMs':timing,'loop':True},'kick':{'row':1,'frames':16,'durationsMs':timing,'loop':True}}
 if name=='whale':animation['sadDance']={'row':2,'frames':16,'durationsMs':[160]*16,'loop':True}
 meta[name]={'file':path,'cellW':W,'cellH':H,'footY':408,'standPx':400,'animations':animation}
print('Prepared independent leg and torso/arm choreography for',', '.join(meta))
p=ROOT/'tools/番外MV_全身舞步/data/sprites.json';data=json.loads(p.read_text())
for n,m in meta.items():data['characters'][n]['dance']=m
p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
