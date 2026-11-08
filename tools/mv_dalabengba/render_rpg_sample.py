#!/usr/bin/env python3
"""320x180 pixel-RPG animatic. Timing is provisional, NOT aligned lyrics."""
from pathlib import Path
from fractions import Fraction
import math, random
import av
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT/'达拉崩吧.mp4'
OUT = ROOT/'番外MV/达拉崩吧/样片/RPG_王国危机_清晰细节版.mp4'
W,H,FPS,START,DUR=320,180,24,20,14
FONT=ROOT/'tools/mv_dalabengba/fonts/rpg-ui.ttf'
font=ImageFont.truetype(str(FONT),30)
small=ImageFont.truetype(str(FONT),25)
N=Image.Resampling.NEAREST
INK='#244453'; CREAM='#f6fffa'; GOLD='#ffe7a3'; BLUE='#316881'; LIGHT='#c2e8df'

def load(name):
    ret=[]
    for i in range(1,9):
        a=Image.open(ROOT/f'assets/ai-girls/walk-v14/frames/{name}/f{i}.png').convert('RGBA')
        ret.append(a.crop(a.getbbox()))
    return ret
SPR={c:load(c) for c in ('whale','gpt','doubao','qwen')}
def actor(im,name,x,y,h,frame=0,flip=False):
    src=SPR[name][frame%8]; w=round(src.width*h/src.height)
    img=src.resize((w,h),Image.Resampling.LANCZOS)
    if flip: img=img.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    im.paste(img,(int(x-w/2),int(y-h)),img)

def box(d,xy):
    x,y,x2,y2=map(int,xy)
    d.rectangle((x+2,y+3,x2+2,y2+3),fill=INK)
    d.rectangle((x,y,x2,y2),fill='#d6e6e0',outline=INK,width=1)
    d.rectangle((x+2,y+2,x2-2,y2-2),fill='#9ccbc7')
    d.rectangle((x+4,y+4,x2-4,y2-4),fill=BLUE,outline='#316881')
    d.line((x+5,y+5,x2-5,y+5),fill='#a8d5ce')
    for cx in (x+5,x2-5):
        for cy in (y+5,y2-5):d.point((cx,cy),fill='#fff4ca')

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
    # Tile roof, masonry, decorative windows, banners and courtyard paving.
    for x in (63,222):
        for yy in range(34,45,4):
            half=(yy-19)*17//26
            for xx in range(x+17-half,x+18+half,5):d.line((xx,yy,xx+2,yy),fill='#c78177')
        for yy in range(49,111,8):
            d.line((x+2,yy,x+31,yy),fill='#a4b4ac')
            for xx in range(x+4+(yy//8%2)*5,x+31,10):d.point((xx,yy+3),fill='#a4b4ac')
    for x in (103,208):
        d.rectangle((x,55,x+8,76),fill='#b96271',outline='#735669')
        d.polygon((x,76,x+4,80,x+8,76),fill='#b96271')
        d.point((x+4,61),fill=GOLD)
    d.rectangle((148,88,170,113),fill='#755a62',outline='#574c58')
    for xx in (153,159,165):d.line((xx,88,xx,113),fill='#a78176')
    for yy in (95,105):d.line((148,yy,170,yy),fill='#524b54')
    for y in range(116,130,5):
        left=116-(y-113)*42//66;right=213+(y-113)*46//66
        d.line((left,y,right,y),fill='#b6a691')
        for x in range(left+(y//5%2)*5,right,10):d.line((x,y,x,y+3),fill='#c5b49a')
    for i in range(18):
        x=(i*67+17)%320;y=83+(i*29%43)
        if x<59 or x>264:
            d.rectangle((x,y,x+3,y+3),fill='#6b9175');d.point((x+1,y-1),fill='#f5cf89')
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
    # Roof shingles, window details, flowerbeds, fence and pixel shrubs.
    for x in (23,247):
        for yy in range(50,60,3):
            half=(yy-38)*23//22
            for xx in range(x+22-half,x+23+half,5):d.line((xx,yy,xx+2,yy),fill='#d98d79')
        d.line((x+13,71,x+13,81),fill='#e7dbba');d.line((x+8,76,x+19,76),fill='#e7dbba')
        d.rectangle((x+6,85,x+22,89),fill='#95695d')
        for xx,col in ((x+8,'#f2d894'),(x+13,'#e58d91'),(x+18,'#f2d894')):d.rectangle((xx,83,xx+2,85),fill=col)
        d.point((x+35,101),fill=GOLD)
    for x in (5,12,19,73,80,87,225,232,239,300,307,314):
        d.line((x,104,x,116),fill='#e7d7b6',width=2)
    d.line((0,108,91,108),fill='#e7d7b6',width=2);d.line((220,108,319,108),fill='#e7d7b6',width=2)
    for x in (78,109,188,222):
        d.ellipse((x-8,105,x+8,115),fill='#60956e',outline='#507c68')
        for dx in (-4,0,4):d.point((x+dx,107+abs(dx)//2),fill='#d9e6a3')
    for x in range(2,320,13):
        y=116+(x*7%3)
        d.point((x,y),fill='#fff2bf');d.point((x+2,y+1),fill='#efacaa')
    for x in range(6,320,25):
        d.line((x,123,x+7,123),fill='#e8d0a6');d.line((x+10,137,x+17,137),fill='#b49a79')
    # Market crate and signpost give the route a readable game-world setting.
    d.rectangle((177,106,191,118),fill='#a97c5b',outline=INK)
    d.line((178,107,190,117),fill='#dfbd82');d.line((190,107,178,117),fill='#dfbd82')
    d.rectangle((136,101,138,118),fill='#735b51')
    d.polygon((127,97,145,97,149,102,145,106,127,106),fill='#f2d19e',outline='#735b51')
    d.line((131,100,141,100),fill='#a4775f');d.line((131,103,138,103),fill='#a4775f')
    for x,y in ((115,93),(157,90),(212,95)):
        d.point((x,y+(int(t*4)%2)),fill='#fff6bf');d.point((x+2,y-1+(int(t*4)%2)),fill='#f6b2a5')
    return im

def ui(im,t):
    d=ImageDraw.Draw(im)
    box(d,(5,5,109,34))
    d.rectangle((74,21,101,26),fill='#213e54');d.rectangle((75,22,97 if t>8 else 84,25),fill='#f19a86')
    if t<7.2:
        box(d,(7,130,313,173))
        d.rectangle((15,137,48,166),fill='#264c62',outline='#c0e5df')
        actor(im,'gpt',31,165,27,0,True)
    elif t<8:
        box(d,(91,66,230,108))
    else:
        box(d,(7,130,206,173));box(d,(215,130,313,173))

def overlay_text(im,t):
    # UI typography is drawn after scaling so Chinese remains legible.
    d=ImageDraw.Draw(im)
    def label(x,y,s,face=small,color=CREAM):
        x*=3;y*=3
        d.text((x+1,y+1),s,font=face,fill='#17364a')
        d.text((x,y),s,font=face,fill=color)
    label(12,8,'王国危机',small,GOLD)
    label(12,19,'LV 01');label(59,19,'HP')
    if t<7.2:
        label(55,135,'龙娘',small,GOLD)
        label(55,148,'公主被龙带走' if t>3 else '王国危机',font)
        if int(t*2)%2==0:label(295,154,'v',small)
    elif t<8:
        label(102,70,'任务',font,GOLD);label(102,87,'拯救公主',font)
    else:
        label(15,135,'勇者  鲸鱼娘',small,GOLD);label(15,148,'冒险开始',font)
        label(223,135,'目标',small,GOLD);label(223,148,'寻找公主',font)
    return im

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
        actor(im,'qwen',229,117,26,0,True)  # villager, placed behind the UI
        p=min(1,(t-8)/5); x=34+int(130*p)
        actor(im,'whale',x,124,34,int((t-8)/.12) if t<13 else 0)
    ui(im,t)
    return overlay_text(im.resize((960,540),N),t)

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
