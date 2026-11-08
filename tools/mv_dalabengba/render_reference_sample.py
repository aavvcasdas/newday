#!/usr/bin/env python3
"""RPG re-staging of the reference MV at 20–34 s. Visual cues are approximate."""
from pathlib import Path
from fractions import Fraction
import math
import av
from PIL import Image, ImageDraw, ImageFont
import render_rpg_sample as r

ROOT=r.ROOT; OUT=ROOT/'番外MV/达拉崩吧/样片/RPG_逐镜事件版.mp4'
for name in ('claude','gemini','kimi'):
    r.SPR[name]=r.load(name)
W,H,FPS=320,180,24
FONT=r.FONT
font=ImageFont.truetype(str(FONT),29); small=ImageFont.truetype(str(FONT),24)

def rect(im,xy,fill,outline=None,width=1):ImageDraw.Draw(im).rectangle(xy,fill=fill,outline=outline,width=width)
def actor(im,n,x,y,h,frame=0,flip=False):r.actor(im,n,x,y,h,frame,flip)
def caption(im,title,detail=None):
    d=ImageDraw.Draw(im)
    r.box(d,(6,147,314,176))
    # text is drawn at output resolution in finish()
    return (title,detail)

def finish(im,title,detail=None):
    r.box(ImageDraw.Draw(im),(6,147,314,176))
    im=im.resize((960,540),Image.Resampling.NEAREST)
    d=ImageDraw.Draw(im)
    def draw(x,y,s,f,color):
        d.text((x+2,y+2),s,font=f,fill='#183849');d.text((x,y),s,font=f,fill=color)
    draw(44,454,title,small,'#ffe6a1')
    if detail:draw(232,452,detail,font,'#f7fffa')
    d.rectangle((32,517,46,523),fill='#aee2d8')
    return im

def castle(day=True,t=0):
    im=Image.new('RGB',(W,H));r.castle(im,t)
    if day:
        # replace select background palette entries, leave castle pixels unchanged
        swaps={(104,124,171):(151,200,215),(129,150,185):(192,225,222),(71,91,117):(117,159,159),(86,109,129):(130,169,158),(101,123,95):(140,176,121),(115,133,106):(158,191,135),(130,144,117):(181,205,145)}
        im.putdata([swaps.get(p,p) for p in im.getdata()])
    return im

def fire(d,x,y,phase):
    h=10+(phase%3)*2
    d.rectangle((x-4,y-3,x+5,y),fill='#76575c')
    d.polygon([(x-6,y-2),(x-4,y-h//2),(x-2,y-h),(x+1,y-h//2-3),(x+4,y-h+3),(x+7,y-2)],fill='#c45f4f')
    d.polygon([(x-3,y-2),(x,y-h//2-2),(x+4,y-2)],fill='#f6c56c')
    d.line((x,y-3,x+1,y-7),fill='#fff1a5')

def smoke(d,x,y,t):
    for i in range(4):
        k=(t*9+i*8)%31;xx=x+int(k/5);yy=y-int(k)
        d.rectangle((xx-2-i//2,yy-2,xx+2+i//2,yy+2),fill=('#6c6875' if i%2 else '#89828b'))

def palace_close():
    im=Image.new('RGB',(W,H),'#babfb2');d=ImageDraw.Draw(im)
    for y in range(0,148,12):
        d.line((0,y,319,y),fill='#92a69f')
        for x in range((y//12%2)*16,320,32):d.line((x,y,x,y+11),fill='#92a69f')
    d.rectangle((97,28,223,130),fill='#e3d8c1',outline='#536476',width=3)
    d.pieslice((121,-35,199,45),180,360,fill='#506d81',outline='#344958',width=3)
    d.rectangle((121,5,199,101),fill='#506d81',outline='#344958',width=3)
    d.line((160,5,160,100),fill='#b6d1c6',width=2);d.line((122,48,198,48),fill='#b6d1c6',width=2)
    d.rectangle((87,108,233,134),fill='#c9c6af',outline='#536476',width=3)
    for x in range(90,232,18):d.rectangle((x,99,x+5,123),fill='#e6ddc8',outline='#536476')
    for x in (80,232):
        d.rectangle((x,32,x+10,107),fill='#a05e68');d.polygon((x,107,x+5,115,x+10,107),fill='#a05e68');d.point((x+5,42),fill='#f0cb77')
    return im

def town():
    im=Image.new('RGB',(W,H));r.town(im,0);return im

def notice(d):
    # Physical recruitment board from the reference, adapted as an in-world quest sign.
    d.rectangle((227,53,286,105),fill='#c79a6e',outline='#43525c',width=2)
    d.rectangle((231,57,282,98),fill='#f3e8c9',outline='#a1715e')
    d.rectangle((235,62,278,70),fill='#c87371')
    d.line((237,76,270,76),fill='#647f88');d.line((237,82,274,82),fill='#647f88')
    d.ellipse((242,85,250,93),fill='#edc36e',outline='#a87552')
    d.line((236,105,236,118),fill='#765d55',width=2);d.line((279,105,279,118),fill='#765d55',width=2)

def frame(t):
    if t<2.0: # 20–22 castle before the attack
        im=castle(True,t);actor(im,'doubao',159,88,23)
        d=ImageDraw.Draw(im);d.ellipse((274,14,286,26),fill='#f5e1a0')
        for x in (22,43,287,305):
            d.ellipse((x,109,x+9,117),fill='#74a783',outline='#507b6c')
        title,detail='王国','平静的城堡'
    elif t<2.85: # the sky changes before the attack
        im=castle(False,t);d=ImageDraw.Draw(im)
        for x in range(5,320,32):d.polygon((x,8,x+12,3,x+23,9,x+24,14,x-2,14),fill='#575e78')
        d.polygon((16,41,27,33,39,40,51,33,63,41,51,39,39,45,27,39),fill='#2d3a4f')
        title,detail='警报','危险接近'
    elif t<3.8: # dragon dominates frame, like the source fly-by
        im=castle(False,t);x=290-int((t-2.85)*205)
        actor(im,'gpt',x,137,122,0,True)
        d=ImageDraw.Draw(im)
        for i in range(3):
            xx=min(319,x+35+i*25);yy=35+i*18
            d.line((xx,yy,min(319,xx+25),yy),fill='#ccd8cb',width=1)
        title,detail='遭遇','龙娘出现'
    elif t<4.8: # burning village and panicked crowd
        im=castle(False,t);d=ImageDraw.Draw(im)
        for x in (37,58,256,278):
            d.rectangle((x-12,103,x+12,127),fill='#bdbaa7',outline='#465764')
            d.polygon((x-15,103,x,89,x+15,103),fill='#955c64',outline='#465764')
            fire(d,x,106,int(t*8)+x);smoke(d,x,94,t)
        actor(im,'qwen',90,138,25,int(t*8),True)
        actor(im,'kimi',212,138,25,int(t*8))
        title,detail='王国','灾难降临'
    elif t<5.7: # balcony close up
        im=palace_close();actor(im,'doubao',160,108,47)
        d=ImageDraw.Draw(im);d.rectangle((116,109,204,115),fill='#e6ddc8',outline='#536476')
        d.polygon((197,37,201,29,205,37,205,49,197,49),fill='#f2c669',outline='#73575f')
        d.ellipse((200,54,203,57),fill='#f2c669')
        title,detail='公主','豆包遇险'
    elif t<7.7: # dragon leaves, princess is in a moving cage
        im=castle(False,t);d=ImageDraw.Draw(im)
        for x in (45,68,249,274):fire(d,x,128,int(t*8)+x);smoke(d,x,115,t)
        p=(t-5.7)/2; x=int(147+p*145); y=int(85-p*38)
        # Cage moves with both occupants; no fake hand contact.
        d.line((x+13,y+5,x+27,y+17),fill='#e9d397',width=1)
        actor(im,'gpt',x,y,50,0)
        actor(im,'doubao',x+29,y+37,25)
        d=ImageDraw.Draw(im);d.rectangle((x+18,y+8,x+41,y+39),outline='#eed397',width=2)
        for xx in range(x+23,x+40,6):d.line((xx,y+9,xx,y+38),fill='#eed397')
        title,detail='事件','公主被带走'
    elif t<9.7: # empty balcony; exclamation and searching guards
        im=palace_close();actor(im,'claude',151,109,36)
        d=ImageDraw.Draw(im);d.rectangle((116,109,204,115),fill='#e6ddc8',outline='#536476')
        if int(t*3)%2==0:
            d.rectangle((163,54,169,70),fill='#eebc70',outline='#715d60');d.rectangle((163,73,169,78),fill='#eebc70')
        title,detail='王国','公主不见了'
    elif t<11.8: # crowd at quest board
        im=town();d=ImageDraw.Draw(im);notice(d)
        for i,(n,x) in enumerate((('qwen',164),('kimi',187),('claude',209))):
            actor(im,n,x,121,31,0,False)
        d=ImageDraw.Draw(im)
        for x in (164,187,209):
            d.rectangle((x-1,79,x+1,87),fill='#efd37e');d.point((x,90),fill='#efd37e')
        title,detail='任务','寻找勇者'
    else: # hero arrives in a beam; no endless walking
        im=town();d=ImageDraw.Draw(im);notice(d)
        for n,x in (('qwen',181),('kimi',199),('claude',217)):actor(im,n,x,121,29)
        d=ImageDraw.Draw(im)
        # pixelated beams and sparkles, no camera shake
        d.polygon((78,0,112,0,134,119,63,119),fill='#e6e6be')
        for i in range(13):
            x=67+(i*23)%61;y=12+(i*37)%103
            if (i+int(t*6))%3: d.point((x,y),fill='#fff9cf')
        p=min(1,max(0,(t-11.8)/1.0));x=44+int(40*p)
        actor(im,'whale',x,122,44,int((t-11.8)/.12) if p<1 else 0)
        # Sign and NPC reactions shift the focus to the arrival.
        d=ImageDraw.Draw(im);d.rectangle((104,61,109,75),fill='#f0bd74');d.rectangle((104,79,109,83),fill='#f0bd74')
        title,detail='勇者','鲸鱼娘赶来'
    return finish(im,title,detail)

def main():
    inp=av.open(str(r.SRC));a=inp.streams.audio[0]
    with av.open(str(OUT),'w') as out:
        v=out.add_stream('libx264',rate=FPS);v.width=960;v.height=540;v.pix_fmt='yuv420p';v.options={'crf':'17','preset':'medium'}
        ao=out.add_stream_from_template(a)
        for i in range(14*FPS):
            f=av.VideoFrame.from_image(frame(i/FPS));f.pts=i;f.time_base=Fraction(1,FPS)
            for p in v.encode(f):out.mux(p)
        for p in v.encode():out.mux(p)
        first=None
        for p in inp.demux(a):
            if p.pts is None:continue
            t=float(p.pts*a.time_base)
            if t<20:continue
            if t>=34:break
            if first is None:first=p.pts
            p.pts-=first
            if p.dts is not None:p.dts-=first
            p.stream=ao;out.mux(p)
    inp.close();print(OUT)
if __name__=='__main__':main()
