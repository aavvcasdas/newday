"""Build experimental 16-frame story actions from full cels and clean underlays.
Only the polygonal arm/leg region moves; clean plates are never visible alone.
"""
from PIL import Image, ImageDraw
from build_whale import normalized, fit_raw, cutout, OUT, W, H
import math
SPECS={
 'kimi_underwater_final':('kimi_swim_legs_under',[(265,255),(315,250),(383,262),(383,386),(295,386),(259,359)],(271,309),'kick'),
 'claude_place':('claude_place_hands_under',[(145,239),(238,239),(247,305),(225,333),(153,338),(139,313)],(186,260),'lower'),
 'zai_reach':('zai_reach_hands_under',[(137,255),(240,255),(244,360),(226,368),(146,368),(137,350)],(185,272),'lower'),
 'whale_gather_retry':('whale_gather_arm_under',[(72,255),(132,245),(142,289),(140,380),(76,380),(66,340)],(117,274),'reach'),
 'gpt_push_final':('gpt_push_arm_under',[(210,105),(260,80),(330,80),(347,195),(315,220),(245,220),(205,195)],(222,170),'push'),
 'doubao_step':('doubao_step_leg_under',[(228,295),(252,290),(310,320),(310,380),(275,380),(242,355)],(238,301),'step'),
 'qwen_reach':('qwen_reach_hands_under',[(135,215),(220,215),(231,292),(212,305),(151,302),(135,285)],(182,225),'lower'),
 'gemini_swim':('gemini_swim_arms_under',[(74,240),(205,226),(217,292),(200,310),(83,302)],(197,245),'swimarms'),
 'whale_rain_reach':('whale_rain_reach_under',[(247,201),(270,185),(289,180),(299,155),(337,153),(338,185),(315,199),(284,224),(260,230)],(253,215),'rainreach'),
 'whale_walk_retry':('whale_walk_retry_under',[(151,302),(166,304),(170,319),(157,344),(161,384),(125,393),(113,370),(122,343),(138,317)],(157,309),'walk'),
 'kimi_walk_story':('kimi_walk_story_under',[(194,294),(221,295),(226,316),(243,330),(245,378),(214,380),(209,350),(196,335)],(200,306),'walk'),
 'doubao_comfort':('doubao_comfort_under',[(80,175),(106,161),(129,168),(171,160),(189,163),(190,186),(165,193),(126,198),(81,202)],(177,173),'comfort'),
}
for name,(under_name,polygon,pivot,kind) in SPECS.items():
 base,apply=normalized(name); under=apply(cutout(fit_raw(under_name)))
 mask=Image.new('L',(W,H));ImageDraw.Draw(mask).polygon(polygon,fill=255)
 part=Image.new('RGBA',(W,H));part.paste(base,(0,0),mask)
 body=base.copy();body.paste(under,(0,0),mask)
 atlas=Image.new('RGBA',(W*16,H))
 for f in range(16):
  u=f/15
  if kind=='kick':
   angle=5*math.sin(u*math.pi*2); moved=part.rotate(angle,Image.Resampling.BICUBIC,center=pivot)
  elif kind=='reach':
   angle=18*(1-u)**2; moved=part.rotate(angle,Image.Resampling.BICUBIC,center=pivot)
  elif kind=='step':
   angle=15*math.sin(u*math.pi*2); moved=part.rotate(angle,Image.Resampling.BICUBIC,center=pivot)
  elif kind=='rainreach':
   angle=-28*(1-u)**2; moved=part.rotate(angle,Image.Resampling.BICUBIC,center=pivot)
  elif kind=='walk':
   angle=7*math.sin(u*math.pi*2); moved=part.rotate(angle,Image.Resampling.BICUBIC,center=pivot)
  elif kind=='comfort':
   angle=12+14*(1-u)**2; moved=part.rotate(angle,Image.Resampling.BICUBIC,center=pivot)
  elif kind=='swimarms':
   angle=7*math.sin(u*math.pi*2); moved=part.rotate(angle,Image.Resampling.BICUBIC,center=pivot)
  else:
   # Finish at the photographed contact, so the held object never floats away.
   delta=(1-u)**2
   dx=round(-7*delta) if kind=='push' else 0
   dy=round(-12*delta) if kind=='lower' else 0
   moved=Image.new('RGBA',(W,H));moved.alpha_composite(part,(dx,dy))
  frame=Image.alpha_composite(body,moved);atlas.alpha_composite(frame,(f*W,0))
 atlas.save(OUT/f'{name}_action.png',optimize=True);print('built',name)
