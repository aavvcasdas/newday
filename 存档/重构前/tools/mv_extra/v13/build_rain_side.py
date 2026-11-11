"""Experimental side-view walk and crouch from consistently aligned source cels."""
from PIL import Image, ImageDraw
from build_whale import fit_raw,cutout,OUT,W,H
import math

def rig(name,under_name,poly,pivot,amplitude,out_name):
 base=cutout(fit_raw(name));under=cutout(fit_raw(under_name))
 mask=Image.new('L',(W,H));ImageDraw.Draw(mask).polygon(poly,fill=255)
 body=base.copy();body.paste(under,(0,0),mask)
 part=Image.new('RGBA',(W,H));part.paste(base,(0,0),mask)
 atlas=Image.new('RGBA',(W*16,H))
 for f in range(16):
  frame=Image.alpha_composite(body,part.rotate(amplitude*math.sin(f*math.pi/8),Image.Resampling.BICUBIC,center=pivot))
  atlas.alpha_composite(frame,(f*W,0))
 atlas.save(OUT/out_name,optimize=True)

rig('whale_side_rainwalk','whale_side_rainwalk_leg_under',
 [(115,288),(132,288),(160,294),(164,308),(151,328),(142,348),(133,367),(131,385),(119,410),(95,410),(50,397),(48,370),(77,359),(94,357),(103,345),(111,321)],(149,297),6,'whale_side_rainwalk_action.png')
rig('whale_sit_side_attempt','whale_sit_side_arm_under',
 [(40,204),(60,203),(76,199),(93,199),(108,200),(123,200),(144,204),(165,209),(168,221),(157,233),(137,240),(117,248),(101,257),(80,257),(65,257),(49,256),(42,250),(42,237),(38,232)],(158,219),5,'whale_side_crouch_action.png')
