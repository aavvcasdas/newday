"""Build story-action fixed-cell puppet assets from generated poses.
AI redraws are never morphed wholesale between frames: all movement is local.
"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter
import numpy as np, json, math
R=Path(__file__).resolve().parents[3];OUT=R/'assets/ai-girls/lyric-action-v13';S=OUT/'source';W,H=384,416
NAMES=['whale_swim','whale_bird','whale_point','whale_gather_retry']

def fit_raw(name):
 raw=Image.open(S/f'{name}.png').convert('RGBA'); im=Image.new('RGB',raw.size,'white');im.paste(raw,(0,0),raw);scale=min((W-16)/im.width,(H-16)/im.height)
 im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
 result=Image.new('RGB',(W,H),im.getpixel((0,0)));result.paste(im,((W-im.width)//2,H-8-im.height));return result

def cutout(im):
 a=np.array(im); r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
 if g[0,0]>160 and g[0,0]>r[0,0]*1.5:
  mask=(g>80)&(g.astype(float)>r.astype(float)*1.18)&(g.astype(float)>b.astype(float)*1.18)
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


if __name__ == '__main__':
 for n in NAMES:
  im,_=normalized(n);im.save(R/f'tools/mv_extra/cache/v13_{n}.png')

# Each entry is a local limb/prop mask and pivot in the normalized 384x416 cel.
SPECS={
 'whale_swim': ([(7,302),(32,302),(48,306),(78,305),(105,310),(117,323),(109,348),(79,346),(56,338),(38,336),(20,340),(7,330)],(107,326),'swim'),
 'whale_point': ([(225,230),(226,204),(251,186),(281,177),(304,164),(330,164),(334,190),(314,209),(282,226),(254,241),(232,242)],(228,227),'point'),
 'whale_bird': ([(65,220),(80,206),(103,205),(122,218),(143,213),(159,208),(183,216),(213,219),(221,236),(205,253),(171,255),(143,252),(113,245),(85,245)],(212,238),'bird'),
}
def make():
 for name,(poly,pivot,kind) in SPECS.items():
  # The original pointing pose had only one visible foot. Use the complete
  # two-hand, two-foot retry as the base; the underlay is only used inside
  # the arm mask, never as a full character image.
  base,apply=normalized('whale_point_full_retry' if name=='whale_point' else name)
  under=apply(cutout(fit_raw(name+'_under')))
  mask=Image.new('L',(W,H));ImageDraw.Draw(mask).polygon(poly,fill=255)
  part=Image.new('RGBA',(W,H));part.paste(base,(0,0),mask)
  # Remove disconnected hair fragments captured by the limb polygon.
  from collections import deque
  pix=np.asarray(part)[:,:,3]>8; seen=np.zeros((H,W),dtype=bool);components=[]
  for yy in range(H):
   for xx in range(W):
    if not pix[yy,xx] or seen[yy,xx]:continue
    q=deque([(xx,yy)]);seen[yy,xx]=True;component=[]
    while q:
     x,y=q.popleft();component.append((x,y))
     for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
      if 0<=nx<W and 0<=ny<H and pix[ny,nx] and not seen[ny,nx]:seen[ny,nx]=True;q.append((nx,ny))
    components.append(component)
  if components:
   keep=np.zeros((H,W),dtype='uint8')
   for x,y in max(components,key=len):keep[y,x]=255
   arr=np.array(part);arr[:,:,3]=np.minimum(arr[:,:,3],keep);part=Image.fromarray(arr,'RGBA')
  body=base.copy();body.paste(under,(0,0),mask)
  bird=None
  if kind=='bird':
   bmask=Image.new('L',(W,H));ImageDraw.Draw(bmask).polygon([(18,174),(28,157),(48,167),(69,163),(87,178),(83,205),(65,210),(34,207),(18,194)],fill=255)
   pixels=np.array(base); r,g,b=pixels[:,:,0].astype('int16'),pixels[:,:,1].astype('int16'),pixels[:,:,2].astype('int16')
   red=(r>90)&(r>g*1.18)&(r>b*1.25);rm=Image.fromarray((red.astype('uint8')*255),'L').filter(ImageFilter.MaxFilter(3)); rm=Image.fromarray(np.minimum(np.asarray(rm),np.asarray(bmask)).astype('uint8'),'L')
   bird=Image.new('RGBA',(W,H));bird.paste(base,(0,0),rm);body.paste(under,(0,0),bmask)
   bird.crop(bird.getbbox()).save(OUT/'bird_cutout.png')
  sheet=Image.new('RGBA',(W*16,H))
  for i in range(16):
   u=i/15
   if kind=='swim': angle=16*math.sin(u*math.pi*2)
   elif kind=='point':angle=18*(1-u)**2
   else:angle=10*(1-u)**2
   layer=part.rotate(angle,Image.Resampling.BICUBIC,center=pivot)
   frame=Image.alpha_composite(body,layer)
   sheet.alpha_composite(frame,(i*W,0))
  sheet.save(OUT/f'{name}.png',optimize=True);print(name)
if __name__=='__main__':make()
