"""Prepare fixed-cell animation art for the reference-style pilot.
Only the facial rectangle is taken from each generated blink edit; the rest
of each cel remains pixel-identical. No interpolation of entire drawings.
"""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFilter
R=Path(__file__).resolve().parents[2]
A=R/'assets/ai-girls/reference-motion'; S=A/'source'; W,H=384,416
characters={
 'gemini':('assets/ai-girls/lyric-v8/source/gemini_wave.png',(.36,.265,.63,.385)),
 'doubao':('assets/ai-girls/lyric-v8/source/doubao_wave.png',(.18,.215,.82,.32)),
 'kimi':('assets/ai-girls/lyric-v8/source/kimi_wave.png',(.30,.21,.69,.305)),
 'qwen':('assets/ai-girls/lyric-v8/source/qwen_wave.png',(.30,.205,.70,.31)),
 'claude':('tools/mv_extra/cache/day12_actors/claude_chibi/pose_wave_hi.png',(.35,.25,.67,.40)),
 'zai':('assets/ai-girls/reference-motion/source/zai_base.png',(.36,.265,.65,.37)),
}
def chroma(im):
 im=im.convert('RGBA'); data=im.load()
 for y in range(im.height):
  for x in range(im.width):
   r,g,b,a=data[x,y]
   if g>180 and g>r*1.6 and g>b*1.5: data[x,y]=(r,g,b,0)
 return im

def fit(im):
 scale=min((W-16)/im.width,(H-16)/im.height)
 im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
 dst=Image.new('RGBA',(W,H));dst.alpha_composite(im,((W-im.width)//2,H-8-im.height));return dst
meta={'characters':{}}
for n,(source,box) in characters.items():
 im=Image.open(R/source).convert('RGBA'); edit=Image.open(S/f'{n}_blink.png').convert('RGBA').resize(im.size,Image.Resampling.LANCZOS)
 if n=='zai': im=chroma(im); edit=chroma(edit)
 w,h=im.size;rect=tuple(round(v*s) for v,s in zip(box,(w,h,w,h)))
 mask=Image.new('L',(w,h));ImageDraw.Draw(mask).rounded_rectangle(rect,radius=max(3,round(w*.02)),fill=255);mask=mask.filter(ImageFilter.GaussianBlur(max(2,w*.008)))
 closed=Image.composite(edit,im,mask)
 atlas=Image.new('RGBA',(W*2,H));atlas.alpha_composite(fit(im),(0,0));atlas.alpha_composite(fit(closed),(W,0));atlas.save(A/f'{n}.png',optimize=True)
 meta['characters'][n]={'preview':f'projectassets/ai-girls/reference-motion/{n}.png','pet':{'file':f'projectassets/ai-girls/reference-motion/{n}.png','cellW':W,'cellH':H,'footY':408,'standPx':400,'animations':{'idle':{'row':0,'frames':2,'durationsMs':[2600,140],'loop':True}}}}
# Retain the Day12 whale baseline, use only the aligned open and blink cells.
for n,path,row,cols in [('whale','assets/ai-girls/lyric-v8/whale.png',0,[0,2]),('gpt','assets/ai-girls/pet-v7/dragon.png',0,[0,2])]:
 im=Image.open(R/path).convert('RGBA'); atlas=Image.new('RGBA',(W*2,H))
 base=im.crop((cols[0]*W,row*H,(cols[0]+1)*W,(row+1)*H))
 closed=im.crop((cols[1]*W,row*H,(cols[1]+1)*W,(row+1)*H))
 # Restrict the source cel differences to the face, as with the other cast.
 rect=(110,85,245,155) if n=='gpt' else (110,135,245,195)
 blink=base.copy(); blink.paste(closed.crop(rect),rect)
 atlas.alpha_composite(base,(0,0)); atlas.alpha_composite(blink,(W,0))
 atlas.save(A/f'{n}.png',optimize=True)
 meta['characters'][n]={'preview':f'projectassets/ai-girls/reference-motion/{n}.png','pet':{'file':f'projectassets/ai-girls/reference-motion/{n}.png','cellW':W,'cellH':H,'footY':408,'standPx':400,'animations':{'idle':{'row':0,'frames':2,'durationsMs':[2400,140],'loop':True}}}}
(R/'tools/番外MV/参考动作试片/data/sprites.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
