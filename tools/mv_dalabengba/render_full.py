#!/usr/bin/env python3
"""Full-length reference-guided RPG cut. Cue points are estimates, not lyric alignment."""
from fractions import Fraction
import math, json
import av
from PIL import Image, ImageDraw, ImageFont
import render_reference_sample as ref
import render_rpg_sample as r

FPS=30; FRAMES=3983; OUT=r.ROOT/'番外MV/达拉崩吧/成片/达拉崩吧_RPG_场景互动版.mp4'
RIDER=[]
for name in ('whale_horse_cutout.png','whale_horse_pose2_cutout.png'):
    source=Image.open(r.ROOT/'assets/ai-girls/dalabengba'/name).convert('RGBA')
    RIDER.append(source.crop(source.getbbox()))

def rider(pic,x,y,height,t):
    source=RIDER[int(t/.24)%2]
    w=round(source.width*height/source.height)
    sprite=source.resize((w,height),Image.Resampling.LANCZOS)
    # The gallop is a two-pose cutout; it is not a full skeletal animation.
    pic.paste(sprite,(int(x-w/2),int(y-height)),sprite)

BG={}
for name in ('palace','cave','worldmap','village'):
    BG[name]=Image.open(r.ROOT/f'assets/ai-girls/dalabengba/{name}_pixel_source.png').convert('RGB').resize((320,180),Image.Resampling.LANCZOS)

FONT=r.FONT; BODY=ImageFont.truetype(str(FONT),29); SMALL=ImageFont.truetype(str(FONT),24)

def im(c):return Image.new('RGB',(320,180),c)
def label(im,heading,body=None):
    r.box(ImageDraw.Draw(im),(5,145,315,176)); im=im.resize((960,540),Image.Resampling.NEAREST);d=ImageDraw.Draw(im)
    def write(x,y,text,font,color):
        d.text((x+2,y+2),text,font=font,fill='#1a3747');d.text((x,y),text,font=font,fill=color)
    write(42,451,heading,SMALL,'#ffe5a2')
    if body:write(210,450,body,BODY,'#f8fffc')
    return im

def worldmap(t):
    pic=BG['worldmap'].copy();d=ImageDraw.Draw(pic)
    # The heroine herself follows a fixed route over the illustrated world map.
    path=[(67,129),(105,122),(146,103),(176,111),(213,126),(245,116),(251,86),(273,73)]
    progress=max(0,min(1,(t-(35 if t<45 else 79))/8));q=progress*(len(path)-1);j=min(len(path)-2,int(q));f=q-j
    x=int(path[j][0]*(1-f)+path[j+1][0]*f);y=int(path[j][1]*(1-f)+path[j+1][1]*f)
    d.ellipse((x-7,y-2,x+7,y+2),fill='#738d75')
    ref.actor(pic,'whale',x,y,22,int(t/.12) if progress<1 else 0)
    return pic

def throne(t):
    pic=BG['palace'].copy()
    # Blocking: the hero steps forward, king responds, aides react; keep top strip clear for cards.
    hx=69+min(22,max(0,int((t-43)*8))) if t<46 else 91
    if 55.5<=t<57 or 60<=t<64.2: hx-=2
    kx=263+(2 if 55.5<=t<57 or 60<=t<64.2 else 0)
    d=ImageDraw.Draw(pic)
    active_king=(43<=t<47 or 55.5<=t<57 or 60<=t<64.2)
    active_x=kx if active_king else hx
    d.ellipse((active_x-15,126,active_x+15,135),outline='#f7db8c',width=2)
    ref.actor(pic,'whale',hx,135,53,int((t-43)/.12) if t<45.7 else 0)
    ref.actor(pic,'claude',kx,128,50,0,True)
    # Aides turn toward the current speaker and take a small reaction step.
    react=1 if int(t*2)%2 else 0
    ref.actor(pic,'qwen',155-react,135,30,0,active_king)
    ref.actor(pic,'kimi',184+react,135,30,0,active_king)
    return pic

def storybook(t):
    pic=im('#735d55');d=ImageDraw.Draw(pic)
    for y in range(5,180,16):d.line((0,y,319,y),fill='#806b5d')
    d.rectangle((57,13,263,139),fill='#783f50',outline='#e2bd7b',width=3)
    d.rectangle((64,20,256,132),outline='#c79c72',width=2)
    d.ellipse((147,27,173,53),fill='#efcf89',outline='#fbebba',width=2)
    for x in (72,247):
        for y in (28,123):d.ellipse((x-3,y-3,x+3,y+3),outline='#e3bf81')
    return pic

def village(t):
    pic=BG['village'].copy();d=ImageDraw.Draw(pic)
    # The chest opens as the rider approaches and a villager gestures beside it.
    d.rectangle((213,119,232,132),fill='#a66d51',outline='#5c4a4a',width=2)
    if t>=104.7:d.polygon((213,118,214,111,231,108,232,118),fill='#d69c63',outline='#5c4a4a')
    else:d.rectangle((213,115,232,120),fill='#d69c63',outline='#5c4a4a')
    d.rectangle((221,118,224,126),fill='#f2d17d')
    return pic

def travel(t):
    pic=im('#a8cfdd');d=ImageDraw.Draw(pic)
    d.ellipse((259,12,289,42),fill='#f7e7a7')
    for x in (20,92,188):d.rectangle((x,24,x+23,28),fill='#eef2db');d.rectangle((x+5,20,x+16,32),fill='#eef2db')
    for i in range(7):
        x=((i*67-int(t*4))%380)-40;d.polygon((x,104,x+30,65,x+65,104),fill='#87a9a6')
    d.rectangle((0,104,319,144),fill='#94ba7b')
    for i in range(9):
        x=((i*48-int(t*15))%380)-30
        d.rectangle((x-2,96,x+2,119),fill='#7e6b52');d.ellipse((x-11,79,x+11,102),fill='#5b956f',outline='#467a67')
        d.ellipse((x-6,82,x,87),fill='#9dbb80')
    d.rectangle((0,123,319,143),fill='#d2ba8b')
    for x in range(-20,340,24):
        xx=(x-int(t*18))%344-12;d.line((xx,133,xx+9,133),fill='#b49976')
    return pic

def cave(t):
    pic=BG['cave'].copy()
    # Start separated, then the hero approaches and the dragon reacts to the exchange.
    hx=39+min(25,max(0,int((t-110)*6)))
    dx=216+(2 if 122<=t<124 or 127<=t<129 else 0)
    ref.actor(pic,'whale',hx,137,49,int((t-110)/.12) if t<114.1 else 0)
    ref.actor(pic,'gpt',dx,136,74,0,True)
    ref.actor(pic,'doubao',276,96,32)
    d=ImageDraw.Draw(pic);d.rectangle((263,62,290,99),outline='#e8c67b',width=2)
    for x in (269,275,281,287):d.line((x,63,x,98),fill='#e8c67b')
    if 115.5<=t<118:
        d.line((hx+21,108,hx+43,81),fill='#f6f2d6',width=3);d.line((hx+18,106,hx+26,112),fill='#e9c77f',width=2)
    return pic

def render(t):
    if t<8:
        pic=storybook(t);return label(pic,'开始','达拉崩吧')
    if t<20:
        pic=ref.castle(True,t);ref.actor(pic,'doubao',159,88,23)
        return label(pic,'王国','很久很久以前')
    if t<34:return ref.frame(t-20)
    if t<43:
        pic=worldmap(t)
        if t<37: msg='我要带上最好的剑'
        elif t<39:msg='翻过最高的山'
        elif t<41:msg='闯进最深的森林'
        else:msg='把公主带回到面前'
        return label(pic,'目标',msg)
    if t<52:
        pic=throne(t)
        if t<46:msg='国王非常高兴'
        elif t<49:msg='忙问他的姓名'
        else:msg='年轻人想了想'
        return label(pic,'王宫',msg)
    if t<71:
        pic=throne(t);d=ImageDraw.Draw(pic)
        if t<56:heading,msg='勇者','达拉崩吧斑得贝迪卜多比鲁翁'
        elif t<59:heading,msg='国王','再说一次'
        elif t<62:heading,msg='勇者','达拉崩吧斑得贝迪卜多比鲁翁'
        elif t<65:heading,msg='国王','是不是'
        elif t<68:heading,msg='国王','达拉崩吧斑得贝迪卜多比鲁翁'
        else:heading,msg='勇者','啊对对'
        return label(pic,heading,msg)
    if t<79:
        pic=storybook(t);return label(pic,'任务','英雄达拉崩吧')
    if t<86:return label(worldmap(t),'地图','带着大家的希望')
    if t<92:
        pic=ref.town();ref.notice(ImageDraw.Draw(pic))
        for n,x in (('qwen',180),('kimi',201),('claude',222)):ref.actor(pic,n,x,120,29)
        rider(pic,72+int((t-86)*9),122-int(2*abs(math.sin(t*6.5))),55,t)
        return label(pic,'出发','从城堡里出发')
    if t<101:
        pic=travel(t);rider(pic,87,122-int(2*abs(math.sin(t*7))),54,t);d=ImageDraw.Draw(pic)
        if t<97:
            # Enemy advances, attacks and recoils after the hero's strike.
            x=235-int((t-92)*21)+(int((t-95.1)*24) if t>95.1 else 0)
            x=max(131,min(244,x)); bob=int(2*math.sin(t*7))
            d.ellipse((x-12,98+bob,x+12,121+bob),fill='#bd807a',outline='#594f5d',width=2)
            d.polygon((x-9,101+bob,x-8,91+bob,x-1,99+bob),fill='#785b6a',outline='#594f5d')
            d.polygon((x+1,99+bob,x+8,91+bob,x+9,101+bob),fill='#785b6a',outline='#594f5d')
            d.rectangle((x-7,106+bob,x-4,109+bob),fill='#fff2d4');d.rectangle((x+4,106+bob,x+7,109+bob),fill='#fff2d4')
            d.line((x-4,116+bob,x+4,116+bob),fill='#594f5d')
            if 93.5<t<95.1:
                u=(t-93.5)/1.6;px=int(x-(x-107)*u);d.ellipse((px-4,104,px+4,112),fill='#f3b36b',outline='#ae655d')
            if 95.1<t<96.5:
                d.line((113,109,140,93),fill='#f6edc9',width=3)
                for j in range(4):
                    a=j*math.pi/2+t; xx=x+int(13*math.cos(a));yy=108+int(13*math.sin(a));d.line((x,108,xx,yy),fill='#ffde8f')
            d.rectangle((9,7,92,23),fill='#284858',outline='#dbe9d2')
            d.rectangle((46,13,86,18),fill='#243c4d');d.rectangle((47,14,47+int(37*min(1,max(0,1-(t-94.4)/2))),17),fill='#e89482')
            return label(pic,'战斗','战胜魔兽来袭')
        for i in range(12):
            x=157+(i%6)*15;y=67+(i//6)*11-int((t*6+i)%5);d.ellipse((x,y,x+7,y+7),fill='#f4cc6c',outline='#a67e5d')
        return label(pic,'奖励','获得十二金币')
    if t<106:
        pic=village(t);rider(pic,70+int((t-101)*32),137-int(2*abs(math.sin(t*7))),49,t);ref.actor(pic,'qwen',247,135,32,0,True)
        return label(pic,'村庄','打开所有宝箱')
    if t<110:
        pic=travel(t);d=ImageDraw.Draw(pic);d.ellipse((230,5,281,56),fill='#f1efcb')
        for i in range(35):
            x=(i*47+int(t*12))%320;y=(i*29+int(t*24))%119;d.point((x,y),fill='#f4f5db')
        rider(pic,85,121-int(2*abs(math.sin(t*7))),52,t)
        return label(pic,'旅途','指引前路的圣月光')
    pic=cave(t)
    # Keep the complete characters above the dialogue window; no crop through bodies.
    if t<114:msg='闯入一座山洞'
    elif t<116:msg='公主和可怕巨龙'
    elif t<118:msg='英雄拔出宝剑'
    elif t<122:msg='昆图库塔卡提考特苏瓦西拉松'
    elif t<124:msg='再来一次'
    elif t<127:msg='昆图库塔卡提考特苏瓦西拉松'
    elif t<129:msg='是不是'
    elif t<131:msg='昆特牌提琴烤蛋挞苏打马拉松'
    else:msg='昆图库塔卡提考特苏瓦西拉松'
    return label(pic,'洞穴',msg)

def dialogue(t):
    # Game dialogue and prompts, not lyric subtitles.
    if t<8:return '系统','新的冒险，即将开始。'
    if t<20:return '王国','城堡里一切安好。'
    if t<22:return '公主','今天的天空真晴朗！'
    if t<22.85:return '警报','天空怎么暗下来了？'
    if t<23.8:return '村民','不好，是龙娘！'
    if t<24.8:return '警报','城镇着火了！'
    if t<25.7:return '豆包','谁来救救我？'
    if t<27.7:return '龙娘','公主跟我走！'
    if t<29.7:return '国王','公主不见了！'
    if t<31.8:return '村民','快找一位勇者！'
    if t<34:return '鲸鱼娘','交给我吧！'
    if t<43:
        return '作战计划',('先拿宝剑！' if t<37 else '翻山越岭！' if t<39 else '穿过森林！' if t<41 else '救出公主！')
    if t<47:return '国王','勇者，请问你叫什么？'
    if t<52:return '鲸鱼娘','让我想一想……'
    if t<55.5:return '鲸鱼娘','达拉崩吧斑得贝迪卜多比鲁翁！'
    if t<57:return '国王','等等，能再说一遍吗？'
    if t<60:return '鲸鱼娘','达拉崩吧斑得贝迪卜多比鲁翁！'
    if t<61:return '国王','是这样吗？'
    if t<64.2:return '国王','达拉崩吧斑得贝迪卜多比鲁翁？'
    if t<65.3:return '鲸鱼娘','对对对！'
    if t<70:return '鲸鱼娘','记住啦，我们出发！'
    if t<79:return '系统','任务已接取！'
    if t<86:return '地图','向龙穴前进！'
    if t<92:return '村民','勇者，一路小心！'
    if t<97:return '战斗','小心魔兽！'
    if t<101:return '奖励','获得金币！等级提升！'
    if t<106:return '村庄','宝箱打开了！'
    if t<110:return '旅途','月光会指引我们。'
    if t<114:return '鲸鱼娘','那边就是山洞！'
    if t<116:return '豆包','我在这里！'
    if t<118:return '鲸鱼娘','放开公主！'
    if t<121:return '龙娘','我是昆图库塔卡提考特苏瓦西拉松！'
    if t<122.5:return '鲸鱼娘','再说一遍？'
    if t<125:return '龙娘','昆图库塔卡提考特苏瓦西拉松！'
    if t<126.5:return '鲸鱼娘','是这个名字吗？'
    if t<129.5:return '鲸鱼娘','昆特牌提琴烤蛋挞苏打马拉松？'
    if t<130.2:return '龙娘','不对！'
    return '龙娘','昆图库塔卡提考特苏瓦西拉松！'

def motion_events(pic,t):
    # This overlay animates recognisable props and events in native game pixels.
    layer=Image.new('RGBA',(320,180));d=ImageDraw.Draw(layer)
    tick=int(t*FPS); beat=int(t)
    if t<8 or 71<=t<79:
        # Floating game items orbit the book; a loading bar fills and resets.
        for i in range(3):
            x=104+i*51+int(5*math.sin(t*2+i));y=67+int(8*math.sin(t*2.4+i*2))
            d.rectangle((x-6,y-6,x+6,y+6),fill='#d09b64',outline='#fff0b5')
            if i==0:d.line((x-3,y+3,x+3,y-4),fill='#fffbe3',width=2)
            elif i==1:d.ellipse((x-3,y-3,x+3,y+3),fill='#f5d783')
            else:d.polygon((x-3,y+3,x,y-4,x+3,y+3),fill='#a6d7c4')
        d.rectangle((104,119,215,125),fill='#4b4754',outline='#f5d788')
        d.rectangle((106,121,106+int((t%4)/4*106),123),fill='#f7e6aa')
    elif t<20:
        # Villagers, fluttering pennants, moving clouds and a turning weather vane.
        for i,x in enumerate((72,239)):
            sx=x+int(3*math.sin(t*1.4+i*3))
            ref.actor(layer,['qwen','kimi'][i],sx,128,17,int(t/.12+i*3))
        for x in (79,239):
            shift=int(2*math.sin(t*8+x));d.polygon((x,5,x+10+shift,8,x,11),fill='#f2c477')
        for i in range(3):
            x=(tick//3+i*94)%345-25;y=15+i*8
            d.rectangle((x,y,x+15,y+3),fill='#edf0d9');d.rectangle((x+4,y-2,x+11,y+5),fill='#edf0d9')
    elif t<34:
        # Event markers track the attack: ember, alert, rescue prompt.
        if 22<=t<28:
            for i in range(7):
                x=(i*47+tick//3)%320;y=130-((tick*2+i*19)%73)
                d.rectangle((x,y,x+2,y+2),fill=('#f7cf7d' if i%2 else '#e99272'))
        elif 29.7<=t<34:
            for i in range(3):
                x=170+i*20;y=76-int(2*math.sin(t*7+i))
                d.rectangle((x,y,x+2,y+8),fill='#f9d47f');d.rectangle((x,y+10,x+2,y+12),fill='#f9d47f')
    elif t<43 or 79<=t<86:
        # A compass needle, moving path marker and active destination.
        d.ellipse((274,15,301,42),fill='#f5e7b9',outline='#9a876f',width=2)
        a=t*2;d.line((287,28,287+int(9*math.cos(a)),28+int(9*math.sin(a))),fill='#b96f68',width=2)
        pulse=3+(tick//5)%4; d.ellipse((273-pulse,73-pulse,273+pulse,73+pulse),outline='#f8d989')
        x=44+(tick*2%214);d.rectangle((x,110,x+3,112),fill='#d49079')
    elif t<71:
        # Turn-taking cues: speech balloon changes sides and pops with the dialog.
        from_king=(43<=t<47 or 55.5<=t<57 or 60<=t<64.2)
        x=262 if from_king else 94
        y=48+int(2*math.sin(t*5))
        d.rounded_rectangle((x-18,y-9,x+18,y+7),radius=4,fill='#fff3d5',outline='#957f75')
        d.polygon((x-3,y+7,x+2,y+7,x,y+12),fill='#fff3d5',outline='#957f75')
        for j in range(1+(tick//8)%3):d.ellipse((x-8+j*7,y-3,x-6+j*7,y-1),fill='#8d7c78')
        if 52<=t<70:
            # Cards live in the safe upper band, never in the actors' playing area.
            for i in range(min(13,1+int((t%5)*3))):
                x2=15+i*22;d.rectangle((x2,9,x2+19,27),fill='#b86670',outline='#f5da9e')
    elif t<110:
        # Road signs, pickups and weather change in response to the current beat.
        if t<92:
            for x in (185,204,223):
                y=74+int(2*math.sin(t*6+x));d.polygon((x-3,y,x+3,y,x,y+5),fill='#f6ce81')
        elif t<101:
            for i in range(3):
                x=110+i*8+int((t*19)%15);y=96+i*3
                d.line((x,y,x+5,y-3),fill='#fff0bc',width=2)
        elif t<106:
            for i in range(4):
                x=223+(i-2)*5;y=111-((tick//3+i*7)%17)
                d.rectangle((x,y,x+2,y+2),fill='#ffe9a0')
        else:
            for i in range(14):
                x=(i*37+tick//2)%320;y=(i*17+tick)%130
                d.rectangle((x,y,x+1,y+2),fill='#f4f9e7')
    else:
        # Crystals twinkle in the cave independently of dialog/shot changes.
        for i in range(7):
            x=(25+i*47+(tick//5)%5)%320;y=102+(i*11%29)
            if (tick//4+i)%3==0:
                d.line((x-2,y,x+2,y),fill='#c5efdf');d.line((x,y-2,x,y+2),fill='#c5efdf')
    if 129<=t<131:
        # Inventory gag in reserved upper strip.
        r.box(d,(100,5,218,29))
        for i in range(4):
            x=111+i*24;d.rectangle((x,10,x+17,23),fill='#e8d5ae',outline='#8f796b')
            d.ellipse((x+5,13,x+11,20),fill=['#f0c36e','#b689ad','#90b7b1','#e49984'][i])
    pic.paste(layer.resize((960,540),Image.Resampling.NEAREST),(0,0),layer.resize((960,540),Image.Resampling.NEAREST))
    d=ImageDraw.Draw(pic)
    if 52<=t<70:
        name='达拉崩吧斑得贝迪卜多比鲁翁'
        visible=min(13,1+int((t%5)*3))
        tilefont=ImageFont.truetype(str(FONT),30)
        for i,ch in enumerate(name[:visible]):
            d.text(((15+i*22)*3+12,9*3+4),ch,font=tilefont,fill='#fff2d3',stroke_width=1,stroke_fill='#a45f66')
    # Replace lyric overlays with compact role-labelled game dialogue.
    who,words=dialogue(t)
    d.rectangle((25,448,933,516),fill=r.BLUE)
    head=ImageFont.truetype(str(FONT),24);body=ImageFont.truetype(str(FONT),30)
    d.text((43,457),who,font=head,fill='#ffe4a5',stroke_width=1,stroke_fill='#17364a')
    bounds=d.textbbox((0,0),words,font=body);width=bounds[2]-bounds[0]
    if width>710:body=ImageFont.truetype(str(FONT),max(20,int(30*710/width)))
    d.text((208,457),words,font=body,fill='#f9fffa',stroke_width=1,stroke_fill='#17364a')
    return pic

def main():
    OUT.parent.mkdir(parents=True,exist_ok=True)
    inp=av.open(str(r.SRC));a=inp.streams.audio[0]
    with av.open(str(OUT),'w') as out:
        v=out.add_stream('libx264',rate=FPS);v.width=960;v.height=540;v.pix_fmt='yuv420p';v.options={'crf':'18','preset':'fast'}
        ao=out.add_stream_from_template(a)
        for i in range(FRAMES):
            f=av.VideoFrame.from_image(motion_events(render(i/FPS),i/FPS));f.pts=i;f.time_base=Fraction(1,FPS)
            for packet in v.encode(f):out.mux(packet)
        for packet in v.encode():out.mux(packet)
        for packet in inp.demux(a):
            if packet.pts is None:continue
            packet.stream=ao;out.mux(packet)
    inp.close();print(OUT)
if __name__=='__main__':main()
