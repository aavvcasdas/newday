"""Add a brief local eye blink to the existing seated reach arm animation."""
from PIL import Image,ImageDraw
from build_whale import normalized,fit_raw,cutout,OUT,W,H
_,apply=normalized('whale_rain_reach')
closed=apply(cutout(fit_raw('whale_rain_reach_closed2')))
mask=Image.new('L',(W,H));ImageDraw.Draw(mask).polygon([(140,137),(242,137),(245,174),(140,174)],fill=255)
old=Image.open(OUT/'whale_rain_reach_action.png').convert('RGBA');out=Image.new('RGBA',(W*16,H))
for f in range(16):
 cell=old.crop((f*W,0,(f+1)*W,H))
 if f in (9,10):cell.paste(closed,(0,0),mask)
 out.alpha_composite(cell,(f*W,0))
out.save(OUT/'whale_rain_reach_blink_action.png',optimize=True)
