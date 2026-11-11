"""Build story-action fixed-cell puppet assets from generated poses.
AI redraws are never morphed wholesale between frames: all movement is local.
"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter
import numpy as np, json, math
R=Path(__file__).resolve().parents[2];OUT=R/'assets/ai-girls/actions-v12';S=OUT/'source';W,H=384,416
NAMES=['whale_camera','whale_letter','whale_sparkler','gemini_shell','gpt_letter','doubao_cup','qwen_lantern','kimi_photo','zai_read','claude_letter','gpt_heart']

def fit_raw(name):
 raw=Image.open(S/f'{name}.png').convert('RGBA'); im=Image.new('RGB',raw.size,'white');im.paste(raw,(0,0),raw);scale=min((W-16)/im.width,(H-16)/im.height)
 im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
 result=Image.new('RGB',(W,H),im.getpixel((0,0)));result.paste(im,((W-im.width)//2,H-8-im.height));return result

def cutout(im):
 a=np.array(im); r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
 if g[0,0]>160 and g[0,0]>r[0,0]*1.5:
  mask=(g>140)&(g.astype(float)>r.astype(float)*1.45)&(g.astype(float)>b.astype(float)*1.45)
 else:mask=(r>232)&(g>232)&(b>232)
 # Only flood border-connected backdrop; preserve pale clothing internally.
 from collections import deque
 todo=deque();seen=np.zeros((H,W),dtype=bool)
 for x in range(W):
  if mask[0,x]:seen[0,x]=1;todo.append((x,0))
  if mask[H-1,x]:seen[H-1,x]=1;todo.append((x,H-1))
 for y in range(H):
  if mask[y,0] and not seen[y,0]:seen[y,0]=1;todo.append((0,y))
  if mask[y,W-1] and not seen[y,W-1]:seen[y,W-1]=1;todo.append((W-1,y))
 while todo:
  x,y=todo.popleft()
  for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
   if 0<=nx<W and 0<=ny<H and mask[ny,nx] and not seen[ny,nx]:seen[ny,nx]=1;todo.append((nx,ny))
 if g[0,0]>160 and g[0,0]>r[0,0]*1.5: seen |= mask
 alpha=np.where(seen,0,255).astype('uint8');return Image.fromarray(np.dstack((a,alpha)),'RGBA')

def normalized(name):
 base=cutout(fit_raw(name)); bbox=base.getbbox(); assert bbox
 l,t,r,b=bbox; l=max(0,l-2);r=min(W,r+2);t=max(0,t-2);b=min(H,b+2)
 scale=min((W-16)/(r-l),(H-16)/(b-t)); nw=round((r-l)*scale);nh=round((b-t)*scale); offset=((W-nw)//2,H-8-nh)
 def apply(im):
  im=im.crop((l,t,r,b)).resize((nw,nh),Image.Resampling.LANCZOS)
  dst=Image.new('RGBA',(W,H));dst.paste(im,offset);return dst
 return apply(base),apply

# Local arm/prop masks, and each pivot (or a small translation for both hands).
RIG={
 'whale_sparkler': ([(241,224),(246,189),(270,170),(282,145),(282,105),(328,105),(330,151),(304,177),(300,220),(278,236),(250,236)],(245,225),6,'rotate'),
 'gemini_shell': ([(218,252),(219,234),(235,225),(244,214),(255,211),(274,216),(283,228),(277,240),(261,245),(245,260),(224,265)],(221,254),-14,'rotate'),
 'qwen_lantern': ([(145,190),(141,177),(130,162),(110,164),(103,178),(92,187),(85,201),(84,244),(101,253),(121,250),(130,235),(135,210),(149,203)],(148,196),-12,'rotate'),
 'kimi_photo': ([(86,120),(126,108),(142,148),(137,170),(165,190),(171,210),(151,220),(120,205),(111,178),(99,160)],(163,204),-13,'rotate'),
 'doubao_cup': ([(141,219),(143,203),(161,196),(166,181),(206,179),(215,190),(238,204),(244,222),(236,242),(211,249),(173,248),(150,243)],(192,241),-7,'translate'),
 'claude_letter': ([(140,237),(145,218),(161,209),(223,208),(249,219),(258,238),(253,258),(230,263),(164,262),(143,256)],(192,255),-7,'translate'),
}

def puppet_frames(name):
 base,apply=normalized(name);under=cutout(fit_raw(name+('_under_retry' if name=='whale_sparkler' else '_under')))
 if name == 'claude_letter':
  # The model drew a checkerboard, not transparency. Remove neutral checks;
  # the clean plate is only sampled inside the masked arm region.
  a=np.array(fit_raw(name+'_under')); d=a.max(2)-a.min(2); ischeck=(d<8)&(a.mean(2)>40)
  alpha=np.where(ischeck,0,255).astype('uint8');under=Image.fromarray(np.dstack((a,alpha)),'RGBA')
 under=apply(under)
 poly,pivot,amt,kind=RIG[name];mask=Image.new('L',(W,H));ImageDraw.Draw(mask).polygon(poly,fill=255)
 part=Image.new('RGBA',(W,H));part.paste(base,(0,0),mask)
 clean=base.copy();clean.paste(under,(0,0),mask)
 frames=[]
 for t in [0,.25,.50,.75,1,1,1,.75,.5,.25,0]:
  if t==0:frame=base.copy()
  else:
   layer=part.rotate(amt*t,Image.Resampling.BICUBIC,center=pivot) if kind=='rotate' else Image.new('RGBA',(W,H))
   if kind=='translate':layer.alpha_composite(part,(0,round(amt*t)))
   frame=Image.alpha_composite(clean,layer)
  frames.append(frame)
 return frames

def patch_frames(name,altname,box,flash=False):
 base,apply=normalized(name);alt=apply(cutout(fit_raw(altname)))
 mask=Image.new('L',(W,H));ImageDraw.Draw(mask).rounded_rectangle(box,radius=5,fill=255);mask=mask.filter(ImageFilter.GaussianBlur(2))
 # Local region only: animated page/hand or closed eyes; no whole-body redraw switch.
 frames=[]
 for i in range(11):
  amount=([0,0,0,0,1,1,1,1,0,0,0][i] if flash else [0,0,0,.4,.8,1,1,.8,.4,0,0][i])
  m=mask.point(lambda x:round(x*amount));frame=Image.composite(alt,base,m)
  if flash and i in (5,6):
   d=ImageDraw.Draw(frame);x,y=181,226
   d.ellipse((x-8,y-8,x+8,y+8),fill=(255,255,242,255));d.line((x-19,y,x+19,y),fill=(255,244,184,255),width=3);d.line((x,y-19,x,y+19),fill=(255,244,184,255),width=3)
  frames.append(frame)
 return frames

def prop_frames(name):
 base,_=normalized(name);frames=[]
 for i in range(11):
  frame=base.copy();d=ImageDraw.Draw(frame)
  # A held card/letter is opened or catches light, without an image-wide jump.
  a=[0,0,.2,.45,.75,1,1,.75,.45,.2,0][i]
  if name=='whale_letter' and a>0:
   d.polygon([(165,226),(191,round(226-14*a)),(217,226)],fill=(255,246,216,255),outline=(167,143,104,255))
  elif name=='gpt_letter' and a>0:
   d.polygon([(161,181),(180,round(181-12*a)),(199,181)],fill=(255,246,222,255),outline=(179,159,140,255))
  elif name=='gpt_heart' and a>0:
   # Tiny heart accent between the hands, scaling in and out once.
   r=round(5*a);x,y=181,178
   d.ellipse((x-r,y-r,x,y),fill=(247,131,156,255));d.ellipse((x,y-r,x+r,y),fill=(247,131,156,255));d.polygon([(x-r,y-2),(x+r,y-2),(x,y+r+3)],fill=(247,131,156,255))
  elif name=='kimi_photo' and a>0:
   # brief reflection crossing the held photo
   x=104+round(15*a);d.line((x,136,x+10,149),fill=(255,255,255,round(220*a)),width=3)
  frames.append(frame)
 return frames

def build():
 manifests={}
 for name in NAMES:
  if name in RIG: frames=puppet_frames(name)
  elif name=='whale_camera':frames=patch_frames(name,'whale_camera_click',(119,153,226,195),True)
  elif name=='zai_read':frames=patch_frames(name,'zai_turn_retry',(135,200,250,278))
  else:frames=prop_frames(name)
  sheet=Image.new('RGBA',(W*len(frames),H))
  for i,frame in enumerate(frames):sheet.alpha_composite(frame,(i*W,0))
  sheet.save(OUT/f'{name}.png',optimize=True)
  manifests[name]={'file':f'projectassets/ai-girls/actions-v12/{name}.png','cellW':W,'cellH':H,'footY':408,'standPx':400,'animations':{'action':{'row':0,'frames':len(frames),'durationsMs':[350,220,180,180,180,400,350,180,180,180,1000],'loop':False}}}
  print('built',name)
 p=R/'tools/番外MV/剧情动作/data/actions.json';p.write_text(json.dumps(manifests,ensure_ascii=False,indent=2)+'\n')

if __name__=='__main__':build()
