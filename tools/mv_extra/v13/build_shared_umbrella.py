"""Replace only the canopy pixels in the 16 arm cels with the matching clean plate.
The wider shared canopy and its pole are drawn in scene space so it can cover
both actors rather than being limited by the character atlas cell.
"""
from PIL import Image
from build_whale import normalized,fit_raw,cutout,OUT,W,H
_,apply=normalized('doubao_umbrella_padded_fixed')
clean=apply(cutout(fit_raw('doubao_umbrella_canopy_under')))
old=Image.open(OUT/'doubao_umbrella_padded_fixed_action.png').convert('RGBA')
out=Image.new('RGBA',(W*16,H))
for f in range(16):
 cell=old.crop((f*W,0,(f+1)*W,H))
 # This region contains only the canopy, head and upper rod; lower gesturing
 # arm stays from each original cel. Plate is aligned with the same transform.
 cell.paste(clean.crop((0,0,W,170)),(0,0))
 out.alpha_composite(cell,(f*W,0))
out.save(OUT/'doubao_shared_umbrella_action.png',optimize=True)
