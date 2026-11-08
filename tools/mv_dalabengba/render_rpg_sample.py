#!/usr/bin/env python3
"""320x180 pixel-RPG animatic. Timing is provisional, NOT aligned lyrics."""
from pathlib import Path
from fractions import Fraction
import math, random
import av
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT/'达拉崩吧.mp4'
OUT = ROOT/'番外MV/达拉崩吧/样片/RPG_王国危机_试剪.mp4'
W,H,FPS,START,DUR=320,180,24,20,14
FONT=ROOT/'tools/mv_dalabengba/fonts/rpg-ui.ttf'
font=ImageFont.truetype(str(FONT),10)
small=ImageFont.truetype(str(FONT),8)
N=Image.Resampling.NEAREST
INK='#171d37'; CREAM='#f7e9bd'; GOLD='#f6c86d'; BLUE='#263a70'; LIGHT='#a8cae0'

def load(name):
    ret=[]
    for i in range(1,9):
        a=Image.open(ROOT/f'assets/ai-girls/walk-v14/frames/{name}/f{i}.png').convert('RGBA')
        ret.append(a.crop(a.getbbox()))
    return ret
SPR={c:load(c) for c in ('whale','gpt','doubao')}
def actor(im,name,x,y,h,frame=0,flip=False):
    src=SPR[name][frame%8]; w=round(src.width*h/src.height)
    img=src.resize((w,h),Image.Resampling.LANCZOS)
    if flip: img=img.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    im.paste(img,(int(x-w/2),int(y-h)),img)

def box(d,xy):
    x,y,x2,y2=map(int,xy)
    d.rectangle((x+2,y+3,x2+2,y2+3),fill=INK)
    d.rectangle((x,y,x2,y2),fill='#d6e6e0',outline=INK,width=1)
    d.rectangle((x+2,y+2,x2-2,y2-2),fill='#778da7')
    d.rectangle((x+4,y+4,x2-4,y2-4),fill=BLUE,outline='#182848')
    d.line((x+5,y+5,x2-5,y+5),fill='#677dac')

def text(d,xy,s,f=font,color=CREAM):
    x,y=xy;d.text((x+1,y+1),s,font=f,fill=INK,stroke_width=0);d.text((x,y),s,font=f,fill=color)

def castle(im,t):
    d=ImageDraw.Draw(im);d.rectangle((0,0,319,179),fill='#687cab')
    for y in range(0,75,4):
        for x in range((y//4%2)*4,320,8):d.point((x,y),fill='#8196b9')
    d.ellipse((254,9,286,41), fill='#e8cf92');d.rectangle((0,80,319,115),fill='#566d81')
    for x in range(-20,340,60):d.polygon((x,80,x+30,48,x+68,80),fill='#475b75')
    d.rectangle((0,111,319,179),fill='#657b5f')
    # Tile paving and wall seams.
    d.polygon((74,179,116,113,213,113,259,179),fill='#ac9d83')
    for y in range(122,180,8):
        d.line((0,y,319,y),fill='#73856a');
        for x in range(-8+(y//8%2)*8,320,16):d.line((x,y,x+3,y+3),fill='#829075')
    d.rectangle((83,51,236,114),fill='#c4c6b4',outline=INK,width=2)
    for x in range(85,235,15):
        d.rectangle((x,45,x+8,52),fill='#c4c6b4',outline=INK)
    for row,y in enumerate(range(57,111,8)):
        d.line((85,y,234,y),fill='#9ba8a1')
        for x in range(84+(row%2)*8,235,16):d.line((x,y,x,y+7),fill='#9ba8a1')
    for x in (63,222):
        d.rectangle((x,45,x+34,114),fill='#d0cebb',outline=INK,width=2)
        d.polygon((x-4,45,x+17,19,x+38,45),fill='#9c5865',outline=INK)
        d.line((x+17,18,x+17,4),fill=INK);d.polygon((x+18,5,x+30,8,x+18,12),fill='#f0b45c')
        for y in (56,75):
            d.rectangle((x+12,y,x+21,y+13),fill='#5d7194',outline=INK)
            d.line((x+16,y+1,x+16,y+12),fill='#d4d4bb')
    d.rectangle((144,84,174,114),fill='#5c5060',outline=INK,width=2)
    d.arc((144,75,174,101),180,360,fill=INK,width=2)
    for x in (119,190):d.rectangle((x,67,x+10,82),fill='#e2ba79',outline=INK)
    # torch animation
    for x in (135,181):
        d.line((x,91,x,102),fill=INK,width=2); d.polygon((x-3,90,x,83-(int(t*6)%2)*2,x+3,90),fill=GOLD)
    return im

def town(im,t):
    d=ImageDraw.Draw(im);d.rectangle((0,0,319,179),fill='#8bb6cc')
    for x,y in ((25,18),(137,8),(260,25)):
        d.rectangle((x,y+4,x+24,y+9),fill='#e5e1cb');d.rectangle((x+5,y,x+18,y+12),fill='#e5e1cb')
    d.polygon((0,96,55,51,110,96,166,48,220,96,276,55,319,91,319,115,0,115),fill='#7899a0')
    d.rectangle((0,92,319,179),fill='#8cae70')
    # repeated 16px tile patterns make a real game field
    for y in range(98,180,12):
        for x in range((y//12%2)*8,320,16):
            d.line((x,y,x+2,y-3),fill='#638b65');d.point((x+7,y+4),fill='#bacb82')
    d.rectangle((0,118,319,145),fill='#c6ad80');d.line((0,118,319,118),fill='#e4c99a');d.line((0,145,319,145),fill='#a38769')
    for x in range(4,320,22):d.line((x,130,x+8,130),fill='#aa906d')
    for x in (23,247):
        d.rectangle((x,59,x+45,112),fill='#e5d5af',outline=INK,width=2)
        d.polygon((x-5,60,x+22,38,x+50,60),fill='#a65a5a',outline=INK)
        d.rectangle((x+8,70,x+19,82),fill='#779cb1',outline=INK);d.rectangle((x+27,88,x+37,112),fill='#725b5c',outline=INK)
    for x in (95,205):
        d.rectangle((x-3,83,x+3,115),fill='#715e51');d.ellipse((x-17,53,x+17,88),fill='#527c63',outline=INK,width=2)
        d.ellipse((x-10,57,x+1,66),fill='#8bab73')
    return im

def ui(im,t):
    d=ImageDraw.Draw(im)
    box(d,(5,5,109,34));text(d,(12,9),'王国危机',small,GOLD)
    text(d,(12,20),'LV 01',small);text(d,(59,20),'HP',small)
    d.rectangle((74,21,101,26),fill='#182741');d.rectangle((75,22,97 if t>8 else 84,25),fill='#df716a')
    if t<7.2:
        box(d,(7,130,313,173))
        # portrait inside the dialog panel
        d.rectangle((15,137,48,166),fill='#0f1b38',outline='#9baed0')
        actor(im,'gpt',31,165,27,0,True)
        d=ImageDraw.Draw(im)
        text(d,(55,137),'龙娘',small,GOLD)
        line='公主被龙带走' if t>3 else '王国危机'
        text(d,(55,150),line,font)
        if int(t*2)%2==0: text(d,(296,157),'v',small)
    elif t<8:
        box(d,(91,66,230,108));text(d,(102,72),'任务',font,GOLD);text(d,(102,89),'拯救公主',font)
    else:
        box(d,(7,130,206,173));text(d,(15,137),'勇者  鲸鱼娘',small,GOLD);text(d,(15,150),'冒险开始',font)
        box(d,(215,130,313,173));text(d,(223,137),'目标',small,GOLD);text(d,(223,150),'寻找公主',font)

def render(t):
    im=Image.new('RGB',(W,H))
    if t<8:
        castle(im,t)
        if t<6.8:
            p=max(0,min(1,(t-.2)/6)); x=245-int(p*160)
            # stationary sprites travel together; no claim of hand contact.
            actor(im,'gpt',x,96,40,0,True)
            actor(im,'doubao',x+29,111,32,0,True)
            d=ImageDraw.Draw(im);d.line((x+10,85,x+24,95),fill=GOLD,width=1)
    else:
        town(im,t)
        p=min(1,(t-8)/5); x=34+int(130*p)
        actor(im,'whale',x,124,34,int((t-8)/.12) if t<13 else 0)
    ui(im,t)
    return im.resize((960,540),N)

def main():
    inp=av.open(str(SRC)); a=inp.streams.audio[0]
    with av.open(str(OUT),'w') as out:
        v=out.add_stream('libx264',rate=FPS);v.width=960;v.height=540;v.pix_fmt='yuv420p';v.options={'crf':'17','preset':'medium'}
        ao=out.add_stream_from_template(a)
        for i in range(DUR*FPS):
            f=av.VideoFrame.from_image(render(i/FPS));f.pts=i;f.time_base=Fraction(1,FPS)
            for p in v.encode(f):out.mux(p)
        for p in v.encode():out.mux(p)
        first=None
        for p in inp.demux(a):
            if p.pts is None:continue
            t=float(p.pts*a.time_base)
            if t<START:continue
            if t>=START+DUR:break
            if first is None:first=p.pts
            p.pts-=first
            if p.dts is not None:p.dts-=first
            p.stream=ao;out.mux(p)
    inp.close();print(OUT)
if __name__=='__main__':main()
