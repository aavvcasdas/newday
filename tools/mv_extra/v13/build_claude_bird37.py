"""A restrained farewell gesture using a local arm and eye replacement."""
from PIL import Image,ImageDraw,ImageFilter
from build_whale import normalized,fit_raw,cutout,OUT,W,H
import math
base,apply=normalized('claude_bird_wave37')
under=apply(cutout(fit_raw('claude_bird_clean36')))
closed=apply(cutout(fit_raw('claude_bird_closed37')))
mask=Image.new('L',(W,H));ImageDraw.Draw(mask).polygon([(107,180),(121,175),(145,177),(152,192),(161,197),(175,206),(174,233),(159,248),(141,249),(125,242),(116,226),(106,212)],fill=255)
part=Image.new('RGBA',(W,H));part.paste(base,(0,0),mask)
body=base.copy();body.paste(under,(0,0),mask)
eye=Image.new('L',(W,H));ImageDraw.Draw(eye).rounded_rectangle((144,127,237,169),radius=7,fill=255);eye=eye.filter(ImageFilter.GaussianBlur(2))
out=Image.new('RGBA',(W*16,H))
for f in range(16):
 cell=body.copy()
 if f in (9,10):cell.paste(closed,(0,0),eye)
 cell=Image.alpha_composite(cell,part.rotate(5*math.sin(f*math.pi/8),Image.Resampling.BICUBIC,center=(166,221)))
 out.alpha_composite(cell,(f*W,0))
out.save(OUT/'claude_bird_wave37_action.png',optimize=True)
