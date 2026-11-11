"""Build trial forearm/lantern gestures for the lyric-specific rooftop scenes."""
from PIL import Image,ImageDraw
from build_whale import normalized,fit_raw,cutout,OUT,W,H
import math
# Masks are in normalized cel coordinates. Underlays are used only inside the masks.
SPECS={
 'claude_firework': ([(188,192),(205,165),(225,140),(236,12),(330,6),(350,108),(307,170),(298,204),(249,225),(205,231)],(195,220),9),
 'gemini_firework': ([(84,78),(143,95),(145,170),(165,181),(150,220),(115,225),(92,195),(69,160)],(145,205),10),
 'kimi_lantern': ([(228,2),(307,2),(311,125),(286,160),(268,188),(225,190),(205,175),(215,143)],(220,179),7),
}
for name,(poly,pivot,angle) in SPECS.items():
 base,apply=normalized(name); under=apply(cutout(fit_raw(name+'_under')))
 mask=Image.new('L',(W,H));ImageDraw.Draw(mask).polygon(poly,fill=255)
 part=Image.new('RGBA',(W,H));part.paste(base,(0,0),mask)
 body=base.copy();body.paste(under,(0,0),mask)
 sheet=Image.new('RGBA',(W*16,H))
 for f in range(16):
  u=f/15; movement=math.sin(u*math.pi*2)*angle
  layer=part.rotate(movement,Image.Resampling.BICUBIC,center=pivot)
  frame=Image.alpha_composite(body,layer);sheet.alpha_composite(frame,(f*W,0))
 sheet.save(OUT/f'{name}_action.png',optimize=True);print(name)

# Doubao's lantern is its own movable prop.  The incomplete underlay is only
# sampled beneath the raised arms and lamp; the full body is always drawn.
base,apply=normalized('doubao_lantern');under=apply(cutout(fit_raw('doubao_lantern_under')))
lampmask=Image.new('L',(W,H));ImageDraw.Draw(lampmask).polygon([(151,0),(241,0),(241,94),(232,98),(161,98),(151,94)],fill=255)
lamp=Image.new('RGBA',(W,H));lamp.paste(base,(0,0),lampmask);lamp.crop((146,0,246,98)).save(OUT/'doubao_lantern_prop.png')
body=base.copy()
# Clear the entire bottom rim on the body too; it must not remain floating
# between the empty hands after the separated lantern has departed.
clear=Image.new('L',(W,H));ImageDraw.Draw(clear).polygon([(151,0),(241,0),(241,105),(232,108),(161,108),(151,100)],fill=255)
body.paste(under,(0,0),clear)
masks=[]
for poly,pivot in [([(149,103),(170,98),(174,180),(166,219),(151,212),(143,155)],(165,205)), ([(218,100),(242,98),(245,156),(234,218),(217,220),(214,178)],(225,205))]:
 mask=Image.new('L',(W,H));ImageDraw.Draw(mask).polygon(poly,fill=255)
 arm=Image.new('RGBA',(W,H));arm.paste(base,(0,0),mask);body.paste(under,(0,0),mask);masks.append((arm,pivot))
sheet=Image.new('RGBA',(W*16,H))
for f in range(16):
 u=f/15;frame=body.copy()
 for j,(arm,pivot) in enumerate(masks):
  angle=(1 if j else -1)*6*(1-u);frame=Image.alpha_composite(frame,arm.rotate(angle,Image.Resampling.BICUBIC,center=pivot))
 sheet.alpha_composite(frame,(f*W,0))
sheet.save(OUT/'doubao_lantern_action.png',optimize=True)
print('doubao_lantern')
