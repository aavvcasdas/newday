"""Experimental fixed-cell narrative rigs; clean plates appear only under masks."""
from PIL import Image, ImageDraw
from build_whale import normalized, fit_raw, cutout, OUT, W, H
import math

def polygon(points):
 m=Image.new('L',(W,H));ImageDraw.Draw(m).polygon(points,fill=255);return m

def part_of(im,mask):
 p=Image.new('RGBA',(W,H));p.paste(im,(0,0),mask);return p

def build(name,under,mask,pivot,angle_fn):
 base,apply=normalized(name);clean=apply(cutout(fit_raw(under)))
 body=base.copy();body.paste(clean,(0,0),mask);part=part_of(base,mask)
 atlas=Image.new('RGBA',(W*16,H))
 for f in range(16):
  u=f/15;frame=Image.alpha_composite(body,part.rotate(angle_fn(u),Image.Resampling.BICUBIC,center=pivot))
  atlas.alpha_composite(frame,(W*f,0))
 atlas.save(OUT/f'{name}_action.png',optimize=True)

build('whale_meet','whale_meet_under',polygon([(221,229),(242,219),(264,224),(275,226),(300,220),(307,242),(289,260),(258,261),(235,254)]),(229,240),lambda u:-18*(1-u)**2)
build('gpt_sweep','gpt_sweep_under',polygon([(147,140),(162,140),(184,168),(195,182),(225,215),(239,243),(260,287),(285,320),(313,370),(300,400),(243,408),(230,389),(220,343),(199,302),(183,268),(169,248),(140,237),(130,216),(136,192)]),(160,176),lambda u:2*math.sin(u*math.pi*2))

# Self-hug: a single arm cluster moves inward slightly; the eyes use a local
# replacement from the matching closed-eye image, never a full-image dissolve.
name='whale_selfkind_retry';base,apply=normalized(name);clean=apply(cutout(fit_raw('whale_selfkind_under')));closed=apply(cutout(fit_raw('whale_selfkind_closed')))
arm=polygon([(117,225),(140,216),(154,224),(169,225),(185,225),(203,217),(223,224),(234,249),(223,272),(199,280),(146,279),(123,268)])
body=base.copy();body.paste(clean,(0,0),arm);hands=part_of(base,arm)
eye=polygon([(119,150),(225,150),(230,191),(120,191)])
atlas=Image.new('RGBA',(W*16,H))
for f in range(16):
 u=f/15;frame=Image.alpha_composite(body,hands.rotate(5*(1-u)**2,Image.Resampling.BICUBIC,center=(176,253)))
 if f in (11,12):frame.paste(closed,(0,0),eye)
 atlas.alpha_composite(frame,(W*f,0))
atlas.save(OUT/'whale_selfkind_retry_action.png',optimize=True)

# Star and arm are independently composited: the star lifts from the hand.
name='gemini_star_toss';base,apply=normalized(name);clean=apply(cutout(fit_raw('gemini_star_toss_under')))
arm=polygon([(90,132),(101,128),(112,132),(117,142),(118,159),(130,173),(166,190),(163,215),(140,212),(120,194),(108,175),(95,166),(85,152),(83,142)])
star=polygon([(68,61),(110,61),(110,104),(68,104)])
clear=polygon([(67,60),(111,60),(111,128),(86,133),(82,119),(67,108)])
body=base.copy();body.paste(clean,(0,0),arm);body.paste(clean,(0,0),clear)
limb=part_of(base,arm);orb=part_of(base,star)
atlas=Image.new('RGBA',(W*16,H))
for f in range(16):
 u=f/15;frame=Image.alpha_composite(body,limb.rotate(14*(1-u)**2,Image.Resampling.BICUBIC,center=(160,205)))
 moved=Image.new('RGBA',(W,H));moved.alpha_composite(orb,(0,round(34*(1-u)**2)));frame=Image.alpha_composite(frame,moved)
 atlas.alpha_composite(frame,(W*f,0))
atlas.save(OUT/'gemini_star_toss_action.png',optimize=True)
print('built narrative rigs')
# The puzzle stays on the ground; only the reaching hand moves toward it.
build('claude_collect','claude_collect_under',polygon([(77,332),(91,323),(119,324),(126,338),(123,365),(113,378),(93,380),(75,368),(71,352)]),(113,328),lambda u:10*(1-u)**2)
# A small book-and-hands tilt, not a simulated page turn.
build('whale_read','whale_read_under',polygon([(177,255),(187,240),(195,229),(250,227),(273,220),(279,246),(273,275),(261,285),(224,291),(193,288),(177,279)]),(191,268),lambda u:3*(1-u))
# Sad walk: one leg articulates; this is not a full natural gait.
build('whale_rainwalk','whale_rainwalk_under',polygon([(158,305),(180,303),(198,306),(212,332),(226,352),(243,364),(246,388),(222,407),(200,406),(188,385),(177,358),(164,337)]),(167,309),lambda u:6*math.sin(u*math.pi*2))
# Small raised-leg motion while holding a spool; string attachment is separate.
build('gemini_kite','gemini_kite_leg_clean',polygon([(203,319),(218,318),(235,323),(240,343),(236,359),(227,369),(213,366),(207,351)]),(207,322),lambda u:6*math.sin(u*math.pi*2))
# Retain the original sad sitting drawing; only substitute the matching eyes.
base,apply=normalized('whale_sit_final_retry');closed=apply(cutout(fit_raw('whale_sit_closed')))
eye=polygon([(120,145),(245,145),(246,187),(120,187)])
atlas=Image.new('RGBA',(W*16,H))
for f in range(16):
 frame=base.copy()
 if f in (8,9):frame.paste(closed,(0,0),eye)
 atlas.alpha_composite(frame,(W*f,0))
atlas.save(OUT/'whale_sit_blink_action.png',optimize=True)
# Purpose-specific gestures; small movements preserve the generated contact.
build('kimi_stargaze_seated','kimi_stargaze_seated_under',polygon([(84,87),(100,86),(112,104),(126,126),(149,136),(153,158),(138,170),(111,164),(94,153),(84,138),(77,120)]),(146,151),lambda u:7*(1-u)**2)
build('zai_clock','zai_clock_under',polygon([(150,230),(164,220),(187,218),(205,218),(225,218),(237,234),(238,259),(221,271),(192,268),(164,268),(150,255)]),(189,249),lambda u:5*(1-u)**2)
build('whale_camera','whale_camera_under',polygon([(118,208),(131,200),(175,199),(196,200),(212,210),(214,242),(201,257),(173,260),(140,257),(121,246)]),(165,230),lambda u:5*(1-u)**2)
# Experimental umbrella pose: the moving free arm is separate from the held rod.
build('doubao_rain_umbrella','doubao_rain_umbrella_under',polygon([(84,155),(109,148),(132,153),(166,150),(190,154),(193,172),(177,186),(152,188),(128,190),(107,199),(86,197),(79,180)]),(183,162),lambda u:12*(1-u)**2)
# Horizontal swim cels use a cropped 384x266 viewing window at draw time.
# Only one leg pivots, not a full simulated swim stroke.
build('qwen_swim_full_retry','qwen_swim_full_retry_under',polygon([(276,262),(284,240),(281,224),(285,211),(306,208),(328,216),(335,227),(327,243),(313,262),(303,281),(290,287)]),(286,274),lambda u:3*math.sin(u*math.pi*2))
build('gemini_swim_full','gemini_swim_full_under',polygon([(244,307),(258,297),(272,287),(284,277),(296,278),(309,282),(322,291),(322,306),(314,316),(295,319),(273,321),(257,322)]),(249,315),lambda u:4*math.sin(u*math.pi*2))
# Hand stays at the cheek at the end; the start is only a local gesture.
build('whale_wipe_tear','whale_wipe_tear_under',polygon([(139,190),(145,174),(152,167),(162,170),(174,185),(173,203),(165,216),(154,222),(143,215),(137,204)]),(151,212),lambda u:8*(1-u)**2)
# Two-shoe watering cel: remove a faint scan line from the generated white
# margin and tighten the sprite around the actual figure before staging it.
build('qwen_water_full','qwen_water_full_under',polygon([(145,201),(160,197),(183,200),(203,204),(210,219),(205,241),(192,254),(168,258),(148,253),(140,236)]),(182,222),lambda u:8*(1-u)**2)
raw=Image.open(OUT/'qwen_water_full_action.png').convert('RGBA');atlas=Image.new('RGBA',(W*16,H))
for f in range(16):
 cell=raw.crop((f*W+70,0,f*W+320,315)).resize((317,400),Image.Resampling.LANCZOS)
 atlas.alpha_composite(cell,(f*W+33,8))
atlas.save(OUT/'qwen_water_full_action.png',optimize=True)

# Dragon's pondering hand, eyes and tail are independent local layers.
name='gpt_think';base,apply=normalized(name)
armclean=apply(cutout(fit_raw('gpt_think_under')));tailclean=apply(cutout(fit_raw('gpt_think_tail_under')));closed=apply(cutout(fit_raw('gpt_think_closed')))
arm=polygon([(141,143),(154,133),(170,139),(180,154),(178,177),(173,199),(162,219),(148,224),(135,212),(137,190)])
tail=polygon([(250,285),(273,277),(304,280),(329,294),(343,311),(344,339),(334,356),(316,368),(284,371),(263,360),(251,343)])
eyes=polygon([(173,105),(230,105),(232,137),(174,137)])
body=base.copy();body.paste(tailclean,(0,0),tail);body.paste(armclean,(0,0),arm)
hand=part_of(base,arm);tailpart=part_of(base,tail);atlas=Image.new('RGBA',(W*16,H))
for f in range(16):
 u=f/15;frame=Image.alpha_composite(body,tailpart.rotate(3*math.sin(u*math.pi*2),Image.Resampling.BICUBIC,center=(257,306)))
 if f in (9,10):frame.paste(closed,(0,0),eyes)
 frame=Image.alpha_composite(frame,hand.rotate(7*(1-u)**2,Image.Resampling.BICUBIC,center=(150,207)))
 atlas.alpha_composite(frame,(W*f,0))
atlas.save(OUT/'gpt_think_action.png',optimize=True)
