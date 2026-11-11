"""S28-29: retain the lantern while the free hand moves and the eyes blink."""
from PIL import Image,ImageDraw
from build_whale import normalized,fit_raw,cutout,OUT,W,H
import math
base,apply=normalized('qwen_bird_wave36')
clean=apply(cutout(fit_raw('qwen_bird_clean36')))
closed=apply(cutout(fit_raw('qwen_bird_closed36')))
mask=Image.new('L',(W,H));ImageDraw.Draw(mask).polygon([(232,180),(238,165),(244,150),(253,145),(270,149),(276,160),(271,172),(263,180),(260,190),(252,203),(238,205)],fill=255)
hand=Image.new('RGBA',(W,H));hand.paste(base,(0,0),mask)
body=base.copy();body.paste(clean,(0,0),mask)
eye=Image.new('L',(W,H));ImageDraw.Draw(eye).rectangle((149,94,225,126),fill=255)
atlas=Image.new('RGBA',(W*16,H))
for f in range(16):
 cell=body.copy()
 if f in (9,10):cell.paste(closed,(0,0),eye)
 cell=Image.alpha_composite(cell,hand.rotate(6*math.sin(f*math.pi/8),Image.Resampling.BICUBIC,center=(242,190)))
 atlas.alpha_composite(cell,(W*f,0))
atlas.save(OUT/'qwen_bird_wave36_action.png',optimize=True)
