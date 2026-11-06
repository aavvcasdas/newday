"""Add a small local arm stroke over the existing leg cels; no whole-cel morphs."""
from PIL import Image,ImageDraw
import numpy as np
from collections import deque
from build_whale import normalized,fit_raw,cutout,OUT,W,H
import math

specs=[
 ('kimi_swim_padded_fixed','kimi_swim_clean_v35',[(5,307),(46,301),(83,302),(110,293),(134,286),(153,299),(155,322),(137,341),(119,352),(80,373),(45,361),(8,346)],(140,306),8),
]
for name,clean_name,polygon,pivot,angle in specs:
 base,apply=normalized(name);clean=apply(cutout(fit_raw(clean_name)))
 mask=Image.new('L',(W,H));ImageDraw.Draw(mask).polygon(polygon,fill=255)
 limb=Image.new('RGBA',(W,H));limb.paste(base,(0,0),mask)
 # Discard small detached hair fragments captured by the arm polygon.
 pixels=np.array(limb);opaque=pixels[:,:,3]>8;seen=np.zeros((H,W),dtype=bool);components=[]
 for y in range(H):
  for x in range(W):
   if not opaque[y,x] or seen[y,x]:continue
   todo=deque([(x,y)]);seen[y,x]=True;pts=[]
   while todo:
    xx,yy=todo.popleft();pts.append((xx,yy))
    for nx,ny in ((xx-1,yy),(xx+1,yy),(xx,yy-1),(xx,yy+1)):
     if 0<=nx<W and 0<=ny<H and opaque[ny,nx] and not seen[ny,nx]:seen[ny,nx]=True;todo.append((nx,ny))
   components.append(pts)
 keep=np.zeros((H,W),dtype=np.uint8)
 for component in components:
  if len(component)>=100:
   for x,y in component:keep[y,x]=255
 pixels[:,:,3]=np.minimum(pixels[:,:,3],keep);limb=Image.fromarray(pixels,'RGBA')
 old=Image.open(OUT/f'{name}_action.png').convert('RGBA');sheet=Image.new('RGBA',(W*16,H))
 for f in range(16):
  cell=old.crop((f*W,0,(f+1)*W,H));cell.paste(clean,(0,0),mask)
  moved=limb.rotate(angle*math.sin(2*math.pi*f/16),Image.Resampling.BICUBIC,center=pivot)
  sheet.alpha_composite(Image.alpha_composite(cell,moved),(f*W,0))
 sheet.save(OUT/f'{name}_stroke35_action.png',optimize=True)

