"""Build local eye/limb cels from batch-34 sources, preserving source geometry."""
from PIL import Image,ImageDraw
from build_whale import normalized,fit_raw,cutout,OUT,W,H
import math

def blink(base_name,closed_name,rect):
 _,apply=normalized(base_name);closed=apply(cutout(fit_raw(closed_name)))
 atlas=Image.open(OUT/f'{base_name}_action.png').convert('RGBA');out=Image.new('RGBA',(W*16,H))
 mask=Image.new('L',(W,H));ImageDraw.Draw(mask).rectangle(rect,fill=255)
 for f in range(16):
  cell=atlas.crop((f*W,0,(f+1)*W,H))
  if f in (8,9):cell.paste(closed,(0,0),mask)
  out.alpha_composite(cell,(f*W,0))
 out.save(OUT/f'{base_name}_blink_action.png',optimize=True)

blink('kimi_stargaze_seated','kimi_stargaze_closed',(146,79,233,114))
blink('claude_collect','claude_collect_closed',(108,135,220,181))

# A separate, matching pull key for the underwater cut. This is not a
# continuous stroke; preserve the old leg articulation and disclose the cut.
base,apply=normalized('kimi_swim_padded_fixed')
pull=apply(cutout(fit_raw('kimi_swim_pull_key')))
under=apply(cutout(fit_raw('kimi_swim_padded_fixed_under')))
mask=Image.new('L',(W,H));ImageDraw.Draw(mask).polygon([(279,303),(286,286),(301,273),(318,261),(336,260),(357,270),(371,280),(371,295),(356,307),(338,309),(320,320),(299,322)],fill=255)
leg=Image.new('RGBA',(W,H));leg.paste(pull,(0,0),mask);body=pull.copy();body.paste(under,(0,0),mask)
out=Image.new('RGBA',(W*16,H))
for f in range(16):
 cell=Image.alpha_composite(body,leg.rotate(2.5*math.sin(f/15*math.pi*2),Image.Resampling.BICUBIC,center=(279,315)))
 out.alpha_composite(cell,(f*W,0))
out.save(OUT/'kimi_swim_pull_action.png',optimize=True)

