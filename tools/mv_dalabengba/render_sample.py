#!/usr/bin/env python3
"""Standalone rough animatic; PyAV and Pillow. Original audio is packet copied."""
from pathlib import Path
import math
from fractions import Fraction
import av
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / '达拉崩吧.mp4'
OUT = ROOT / '番外MV/达拉崩吧/样片/王国危机_动作试剪.mp4'
W,H,FPS=960,540,30
START, DURATION = 20, 14
R=Image.Resampling.LANCZOS

def sprite(name, frame=1):
    im=Image.open(ROOT / f'assets/ai-girls/walk-v14/frames/{name}/f{frame}.png').convert('RGBA')
    return im.crop(im.getbbox())

chars={c:[sprite(c,i) for i in range(1,9)] for c in ('gpt','gemini','whale')}
def character(canvas, name, x, y, h, frame=1, flip=False):
    src=chars[name][(frame-1)%8]
    img=src.resize((round(src.width*h/src.height),h),R)
    if flip: img=img.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    canvas.alpha_composite(img,(int(x-img.width/2),int(y-h)))

def background(night):
    image=Image.new('RGBA',(W,H), '#c8dcf1' if not night else '#413b68'); d=ImageDraw.Draw(image)
    d.ellipse((680,-125,1050,245),fill='#ffebba' if not night else '#716288')
    d.polygon([(0,324),(150,245),(300,331),(480,205),(630,327),(780,220),(960,315),(960,540),(0,540)], fill='#9ab0b4' if not night else '#555276')
    d.rectangle((0,355,W,H),fill='#a8c28d' if not night else '#696d73')
    # Paper-like castle, discrete layers and visible windows.
    for x,w,h in [(214,102,188),(314,340,225),(650,102,188)]:
        d.rectangle((x,355-h,x+w,355),fill='#eee6d3',outline='#6c6061',width=4)
        if w==102:
            d.polygon([(x-12,355-h),(x+w/2,355-h-83),(x+w+12,355-h)],fill='#a55f5e',outline='#6c6061',width=4)
        else:
            for xx in range(x,x+w,42):d.rectangle((xx,355-h-18,xx+24,355-h+4),fill='#eee6d3',outline='#6c6061',width=2)
    for x in (245,345,405,555,615,680):
        d.rounded_rectangle((x,237,x+26,281),radius=13,fill='#8fb4c4' if not night else '#dfb68d',outline='#6c6061',width=3)
    d.rounded_rectangle((455,280,514,356),radius=28,fill='#765d62',outline='#51434b',width=4)
    d.polygon([(0,540),(410,356),(558,356),(960,540)],fill='#dcc7a7')
    return image

DAY=background(False); NIGHT=background(True)
def frame(t):
    # visual anchors are approximate, not lyric alignment
    night = t < 8.0
    canvas=(NIGHT if night else DAY).copy();d=ImageDraw.Draw(canvas,'RGBA')
    if t<8:
        # Dragon girl crosses the sky; the captive princess follows as a separate card.
        p=max(0,min(1,(t-0.4)/5.8)); x=840-630*p; y=220-65*math.sin(math.pi*p)
        if t<6.5:
            d.line((x+10,y+5,x+53,y+78),fill=(238,217,178,255),width=3)
            character(canvas,'gemini',x+60,y+148,104,1,True)
            character(canvas,'gpt',x,y+65,175,1,True)
        # Nightfall / danger is environmental, not camera shake.
        for i in range(9):
            sx=(i*131+35)%W;sy=(i*67+35)%180
            d.ellipse((sx,sy,sx+3,sy+3),fill=(245,229,192,220))
    else:
        # The hero enters the castle road using the actual eight-frame walk cycle.
        p=min(1,(t-8)/4.2); x=125+285*p
        walking=t<12.2
        f=int((t-8)/0.12)%8+1 if walking else 1
        character(canvas,'whale',x,493,205,f)
        # A sword is a separate prop, not a modification to the face or body.
        if t>=12.2:
            d.line((x+76,410,x+112,340),fill=(249,244,223,255),width=8)
            d.line((x+62,405,x+91,420),fill=(110,78,61,255),width=7)
    return canvas.convert('RGB')

def main():
    OUT.parent.mkdir(parents=True,exist_ok=True)
    inp=av.open(str(SOURCE)); audio=inp.streams.audio[0]
    with av.open(str(OUT),'w') as out:
        video=out.add_stream('libx264',rate=FPS);video.width=W;video.height=H;video.pix_fmt='yuv420p';video.options={'crf':'21','preset':'medium'}
        aout=out.add_stream_from_template(audio)
        for i in range(FPS*DURATION):
            vf=av.VideoFrame.from_image(frame(i/FPS));vf.pts=i;vf.time_base=Fraction(1,FPS)
            for packet in video.encode(vf):out.mux(packet)
        for packet in video.encode():out.mux(packet)
        # Copy whole AAC packets; first eligible packet defines the audio zero.
        first=None
        for packet in inp.demux(audio):
            if packet.pts is None: continue
            ts=float(packet.pts*audio.time_base)
            if ts<START:continue
            if ts>=START+DURATION:break
            if first is None:first=packet.pts
            packet.pts-=first
            if packet.dts is not None:packet.dts-=first
            packet.stream=aout
            out.mux(packet)
    inp.close();print(OUT)
if __name__=='__main__': main()
