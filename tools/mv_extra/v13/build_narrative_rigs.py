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
