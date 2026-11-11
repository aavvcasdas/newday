"""Compile fixed-cell lyric-performance atlases from Day12 and generated poses.

Generated edits of each person share one canvas; existing historical Day12
poses have different source canvases and are proportionally fitted once to the
same bottom-anchored cell. Some frames hold the same drawing by design.
"""
from pathlib import Path
import json
from PIL import Image
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'assets/ai-girls/lyric-v8'
SOURCE=OUT/'source'
DAY=ROOT/'tools/mv_extra/cache/day12_actors'
W,H,COLS=384,416,8


def load(p): return Image.open(p).convert('RGBA')
def fit(im):
    k=min((W-16)/im.width,(H-16)/im.height)
    im=im.resize((round(im.width*k),round(im.height*k)),Image.Resampling.LANCZOS)
    result=Image.new('RGBA',(W,H))
    result.alpha_composite(im,((W-im.width)//2,H-8-im.height))
    return result

def blink(pose, closed, box):
    if pose.size != closed.size: raise ValueError('Blink edit must share the source canvas')
    w,h=pose.size;x0,y0,x1,y1=box
    rect=(round(x0*w),round(y0*h),round(x1*w),round(y1*h))
    result=pose.copy();result.paste(closed.crop(rect),rect);return result

def addtail(pose, tail):
    if pose.size != tail.size: return pose
    w,h=pose.size;rect=(round(w*.79),round(h*.62),w,h)
    result=pose.copy();result.paste(tail.crop(rect),rect);return result

def build(name, states):
    atlas=Image.new('RGBA',(COLS*W,H*len(states)))
    meta={'cell_width':W,'cell_height':H,'columns':COLS,'rows':len(states),'states':{}}
    for row,(state,frames,durations,loop) in enumerate(states):
        assert len(frames)==len(durations)<=COLS
        meta['states'][state]={'row':row,'frames':len(frames),'durations_ms':durations,'loop':loop}
        for col,im in enumerate(frames): atlas.alpha_composite(fit(im),(col*W,row*H))
    atlas.save(OUT/f'{name}.png',optimize=True)
    (OUT/f'{name}.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
    print(name, 'rows',len(states),'cells',sum(len(s[1]) for s in states))

def main():
    neutral=load(SOURCE/'whale_neutral.png'); closed=load(SOURCE/'whale_blink.png')
    wave=load(SOURCE/'whale_wave.png');piece=load(SOURCE/'whale_piece.png');sad=load(SOURCE/'whale_comfort.png')
    tail=load(ROOT/'assets/ai-girls/pet-v7/source/whale_tail_left.png')
    def b(im): return blink(im,closed,(.29,.34,.63,.45))
    walkA=load(DAY/'whale/whale_walk_a.png');walkB=load(DAY/'whale/whale_walk_b.png');stand=load(DAY/'whale/whale_walk_stand.png')
    sparkler=load(DAY/'whale/whale_sparkler_firework.png');camera=load(DAY/'whale/whale_camera_shutter.png')
    build('whale',[
        ('idle',[neutral,neutral,b(neutral),b(neutral),addtail(neutral,tail),neutral],[350,140,100,140,260,300],True),
        ('wave',[neutral,wave,wave,b(wave),wave,neutral],[200,180,160,120,220,280],True),
        ('offer',[neutral,neutral,piece,piece,b(piece),piece],[180,160,220,200,120,440],False),
        ('comfort',[sad,sad,b(sad),sad,addtail(sad,tail),sad],[300,250,120,250,250,320],True),
        ('walk',[walkA,stand,walkB,stand,walkA,stand],[180,120,180,120,180,220],True),
        ('sparkler',[sparkler,sparkler,sparkler,sparkler],[300,260,260,300],True),
        ('camera',[camera,camera,camera],[300,300,500],False),
    ])
    for n in ['doubao','gemini','gpt','kimi','qwen']:
        wave=load(SOURCE/f'{n}_wave.png'); piece=load(SOURCE/(f'{n}_'+('heart' if n=='gpt' else 'piece')+'.png'))
        idle=load(ROOT/f'assets/ai-girls/chibi-v5/{n}.png')
        if n=='gpt':
            blinksrc=load(ROOT/'assets/ai-girls/pet-v7/source/dragon_blink.png')
            wink=blink(wave,blinksrc,(.30,.235,.63,.325))
        else: wink=wave
        build(n,[
          ('wave',[idle,wave,wink,wave,wave,idle],[210,180,120,180,240,300],True),
          ('offer',[wave,wave,piece,piece,piece,piece],[210,160,200,200,200,460],False),
          ('dance',[idle,wave,wave,idle,wave,wave],[190,170,170,190,170,250],True),
          ('comfort',[idle,idle,wave,wave,idle,idle],[350,240,200,240,240,350],True),
        ])
    src=DAY/'claude_chibi'
    def C(n): return load(src/f'pose_{n}.png')
    build('claude',[
        ('wave',[C('wave_hi'),C('wave_hi'),C('cheer'),C('wave_hi')],[280,220,200,320],True),
        ('offer',[C('pointing_viewer'),C('pointing_viewer'),C('ok_hand'),C('ok_hand')],[280,220,260,400],False),
        ('dance',[C('dance'),C('dance'),C('cheer'),C('cheer')],[240,200,240,300],True),
        ('comfort',[C('reading_book'),C('reading_book'),C('question'),C('question')],[380,260,260,380],True),
    ])

if __name__=='__main__': main()
