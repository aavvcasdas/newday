"""S28: locally animate the holding pose without morphing a whole image."""
from PIL import Image, ImageDraw, ImageFilter
import numpy as np, math
from build_whale import normalized, fit_raw, cutout, OUT, W, H

base,apply=normalized('whale_ribbon_hold')
ribbon_under=apply(cutout(fit_raw('whale_ribbon_hold_under')))
tail_under=apply(cutout(fit_raw('whale_ribbon_hold_tail_under')))
closed=apply(cutout(fit_raw('whale_ribbon_hold_closed')))

def poly(pts):
 m=Image.new('L',(W,H)); ImageDraw.Draw(m).polygon(pts,fill=255); return m

tail_mask=poly([(232,338),(266,342),(292,340),(298,321),(291,294),(294,275),(303,270),(324,287),(339,276),(359,266),(369,279),(366,313),(361,339),(345,362),(320,373),(285,380),(247,376)])
# Isolate the scarf beyond the fingers, including its dark edge, not the hands.
a=np.asarray(base);r,g,b=[a[:,:,i].astype('int16') for i in range(3)]
red=(r>105)&(r>g*1.3)&(r>b*1.3)
clip=np.asarray(poly([(191,222),(202,223),(220,245),(240,255),(268,253),(292,241),(320,223),(355,224),(365,243),(350,251),(320,247),(294,254),(270,268),(241,275),(216,267),(199,248),(190,238)]))>0
ribbon_mask=Image.fromarray((red&clip).astype('uint8')*255).filter(ImageFilter.MaxFilter(5))
ribbon_mask=Image.fromarray(np.minimum(np.asarray(ribbon_mask),np.asarray(poly([(191,222),(202,223),(220,245),(240,255),(268,253),(292,241),(320,223),(355,224),(365,243),(350,251),(320,247),(294,254),(270,268),(241,275),(216,267),(199,248),(190,238)]))).astype('uint8'))
part=Image.new('RGBA',(W,H));part.paste(base,(0,0),ribbon_mask)
tail=Image.new('RGBA',(W,H));tail.paste(base,(0,0),tail_mask)
body=base.copy();body.paste(tail_under,(0,0),tail_mask);body.paste(ribbon_under,(0,0),ribbon_mask)
eye=poly([(122,148),(231,148),(233,187),(120,187)])
atlas=Image.new('RGBA',(W*16,H))
for f in range(16):
 u=f/16
 frame=Image.alpha_composite(body,tail.rotate(2*math.sin(2*math.pi*u),Image.Resampling.BICUBIC,center=(248,358)))
 if f in (9,10): frame.paste(closed,(0,0),eye)
 frame=Image.alpha_composite(frame,part.rotate(2*math.sin(2*math.pi*u),Image.Resampling.BICUBIC,center=(191,226)))
 # Enclosed white background gaps in the loose hair are not costume whites.
 pixels=np.array(frame); yy,xx=np.indices((H,W));
 gaps=((xx<75)&(yy>195)&(yy<315))|((xx>300)&(yy>190)&(yy<345))
 white=(pixels[:,:,0]>238)&(pixels[:,:,1]>238)&(pixels[:,:,2]>238)
 pixels[:,:,3][gaps&white]=0;frame=Image.fromarray(pixels,'RGBA')
 atlas.alpha_composite(frame,(f*W,0))
atlas.save(OUT/'whale_ribbon_hold_action.png',optimize=True)
