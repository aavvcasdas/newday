"""Build a registered whale animation atlas from original/generated pose edits.

Seven states are implemented. Some poses are intentionally held over more
than one frame.
No image pixels from the reference repository are used.
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'assets/ai-girls/whale-pet-study'
BASE = ROOT / 'assets/ai-girls/pet-v7/source'
W, H, COLS = 384, 416, 8


def fixed(path):
    im = Image.open(path).convert('RGBA')
    if im.size != (976, 1079):
        raise ValueError(f'Unexpected source canvas: {path}: {im.size}')
    scale = min((W-14)/im.width, (H-36)/im.height)
    size = (round(im.width*scale), round(im.height*scale))
    dst = Image.new('RGBA', (W, H))
    dst.alpha_composite(im.resize(size, Image.Resampling.LANCZOS), ((W-size[0])//2, H-10-size[1]))
    return dst



def raised(im, dy):
    out = Image.new('RGBA', (W,H))
    out.alpha_composite(im, (0,dy))
    return out


def with_tail(im, alt):
    # The same image-generation edit changed the tail only. Preserve the
    # face, bowl and arms of each action while swapping the right tail region.
    out = im.copy()
    box=(round(W*0.79), round(H*0.63), W, H)
    out.paste(alt.crop(box), box)
    return out


def main():
    pose = {}
    for n in ['rice','blink','scoop','eat','empty','tail_left']:
        pose[n]=fixed(BASE/f'whale_{n}.png')
    for n in ['halfblink','wave_left','wave_right','crouch','jump','sadmid','wait','review']:
        pose[n]=fixed(OUT/'source'/f'{n}.png')
    p=pose
    idle_tail=with_tail(p['rice'],p['tail_left'])
    blink_tail=with_tail(p['blink'],p['tail_left'])
    # The generated crouch added a hairpin; restore the unchanged top of the
    # registered base head to avoid the pin appearing only in this state.
    p['crouch'].paste(p['rice'].crop((0,0,W,155)), (0,0))
    states = [
        ('idle','待机 · 眨眼与摆尾', [p['rice'],p['halfblink'],blink_tail,with_tail(p['halfblink'],p['tail_left']),idle_tail,p['rice']], [280,110,110,140,140,320]),
        ('waving','打招呼 · 挥手', [p['wave_left'],p['wave_right'],p['wave_left'],p['wave_right']], [140,140,140,280]),
        ('jumping','跳跃 · 蓄力、腾空、落地', [p['crouch'],raised(p['jump'],-6),raised(p['jump'],-16),raised(p['jump'],-6),p['crouch']], [140,140,140,140,280]),
        ('failed','受挫 · 空盆失落', [p['sadmid'],p['sadmid'],p['empty'],with_tail(p['empty'],p['tail_left']),p['empty'],p['sadmid'],p['sadmid'],p['empty']], [140,140,140,140,140,140,140,240]),
        ('waiting','等待 · 轻眨眼', [p['wait'],p['halfblink'],p['blink'],p['halfblink'],p['wait'],idle_tail], [150,150,150,150,150,260]),
        ('working','忙碌 · 舀饭、送入口中', [p['rice'],p['scoop'],p['scoop'],p['eat'],p['eat'],p['scoop']], [120,120,120,120,120,220]),
        ('review','检查 · 低头看饭盆', [p['review'],p['review'],p['halfblink'],p['blink'],p['halfblink'],p['review']], [150,150,150,150,150,280]),
    ]
    atlas=Image.new('RGBA',(COLS*W,len(states)*H))
    meta={'version':1,'cell_width':W,'cell_height':H,'columns':COLS,'rows':len(states),'states':{}}
    for row,(state,label,frames,durations) in enumerate(states):
        meta['states'][state]={'row':row,'label':label,'frames':len(frames),'durations_ms':durations}
        for i,im in enumerate(frames): atlas.alpha_composite(im,(i*W,row*H))
    atlas.save(OUT/'whale.png',optimize=True)
    (OUT/'whale.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
    print(f'Built {atlas.size}: {sum(len(s[2]) for s in states)} cells across {len(states)} states')

if __name__=='__main__': main()
