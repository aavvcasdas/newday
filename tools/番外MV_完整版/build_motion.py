"""Local, bounded cutout motion for the paper-film; no global bouncing.

The source art is not a hand-drawn animation. Each fixed 384x416 cell gets
an eye blink and two small localized warp poses. All other pixels are kept
unchanged. Generated frames are emitted ahead of time for deterministic use.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
R=Path(__file__).resolve().parents[2]
IN=R/'assets/ai-girls/reference-motion'; OUT=R/'assets/ai-girls/full-v9'; OUT.mkdir(exist_ok=True)
W,H=384,416
# x,y,radiusX,radiusY, displacementX,displacementY, intended local part
parts={'whale':(320,309,55,59,5,0,'尾尖'), 'claude':(103,175,30,38,4,0,'抬手'),
 'gemini':(261,222,30,35,4,0,'抬手'), 'doubao':(128,177,28,35,4,0,'抬手'),
 'gpt':(310,345,50,40,5,0,'尾尖'), 'kimi':(114,150,28,38,4,0,'抬手'),
 'qwen':(140,165,27,36,4,0,'抬手'), 'zai':(190,260,34,28,2,0,'书和手')}

def move(im,part,direction):
    cx,cy,rx,ry,dx,dy,_=part
    pix=np.asarray(im,dtype=np.float32)
    # Preserve color at alpha edges by interpolating premultiplied alpha.
    prem=pix.copy();prem[:,:,:3]*=prem[:,:,3:4]/255
    yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
    r=((xx-cx)/rx)**2+((yy-cy)/ry)**2
    strength=np.maximum(0,1-r)**2
    sx=np.clip(xx-dx*direction*strength,0,W-1.001);sy=np.clip(yy-dy*direction*strength,0,H-1.001)
    x0=sx.astype(int);y0=sy.astype(int);x1=x0+1;y1=y0+1
    a=sx-x0;b=sy-y0
    z=(prem[y0,x0]*(1-a)[...,None]*(1-b)[...,None]+prem[y0,x1]*a[...,None]*(1-b)[...,None]+prem[y1,x0]*(1-a)[...,None]*b[...,None]+prem[y1,x1]*a[...,None]*b[...,None])
    alpha=z[:,:,3:4];z[:,:,:3]=np.divide(z[:,:,:3]*255,alpha,out=np.zeros_like(z[:,:,:3]),where=alpha>0.01)
    z=np.clip(z,0,255).astype(np.uint8)
    # exact preservation outside the region including fully transparent pixels
    z[r>=1]=np.asarray(im)[r>=1]
    return Image.fromarray(z,'RGBA')

def fit(im):
    s=min((W-16)/im.width,(H-16)/im.height)
    im=im.resize((round(im.width*s),round(im.height*s)),Image.Resampling.LANCZOS)
    out=Image.new('RGBA',(W,H));out.alpha_composite(im,((W-im.width)//2,H-8-im.height));return out

def whale_wave():
    im=Image.open(R/'assets/ai-girls/lyric-v8/source/whale_wave.png').convert('RGBA')
    blink=Image.open(R/'assets/ai-girls/lyric-v8/source/whale_blink.png').convert('RGBA')
    w,h=im.size;box=(round(w*.29),round(h*.34),round(w*.63),round(h*.45))
    wink=im.copy();wink.paste(blink.crop(box),box)
    return fit(im),fit(wink)

meta={'characters':{}}
for name,part in parts.items():
    src=Image.open(IN/f'{name}.png').convert('RGBA');base=src.crop((0,0,W,H));blink=src.crop((W,0,2*W,H))
    rows=[(base,blink,part)]
    if name=='whale': rows.append((*whale_wave(),(285,165,38,42,5,0,'挥手')))
    atlas=Image.new('RGBA',(W*6,H*len(rows)))
    for row,(pose,closed,local) in enumerate(rows):
        frames=[pose,move(pose,local,1),pose,move(pose,local,-1),pose,closed]
        for i,frame in enumerate(frames): atlas.alpha_composite(frame,(i*W,row*H))
    atlas.save(OUT/f'{name}.png',optimize=True)
    durations=[800,180,150,180,1150,140]
    anim={'idle':{'row':0,'frames':6,'durationsMs':durations,'loop':True}}
    if name=='whale': anim['wave']={'row':1,'frames':6,'durationsMs':durations,'loop':True}
    p=f'projectassets/ai-girls/full-v9/{name}.png'
    meta['characters'][name]={'preview':p,'pet':{'file':p,'cellW':W,'cellH':H,'footY':408,'standPx':400,'animations':anim},'motion':part[-1]}
(R/'tools/番外MV_完整版/data/sprites.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
