#!/usr/bin/env python3
"""Full-length reference-guided RPG cut. Cue points are estimates, not lyric alignment."""
from fractions import Fraction
import math, json
import av
from PIL import Image, ImageDraw, ImageFont
import render_reference_sample as ref
import render_rpg_sample as r

FPS=30; FRAMES=3983; OUT=r.ROOT/'番外MV/达拉崩吧/成片/达拉崩吧_RPG_剧情动作版.mp4'
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
    pic=im('#e7d9ab');d=ImageDraw.Draw(pic)
    d.rectangle((9,7,310,141),fill='#eee2b8',outline='#907f70',width=2)
    for x in range(14,305,11):
        for y in range(11,139,11):
            if (x*3+y*7)%17<3:d.point((x,y),fill='#d9ca9e')
    d.line((37,107,95,106,140,56,193,102,263,59),fill='#bb6d62',width=2)
    for x,y in [(37,107),(95,106),(140,56),(193,102),(263,59)]:d.ellipse((x-3,y-3,x+3,y+3),fill='#fff1cc',outline='#a76862')
    # Small landmark icons: castle, mountain, forest, cave.
    d.rectangle((21,82,48,106),fill='#d2d3b9',outline='#5b6c74');d.polygon((18,82,28,70,38,82),fill='#b96561');d.polygon((34,82,44,70,53,82),fill='#b96561')
    d.polygon((112,66,143,25,173,66),fill='#7796a5',outline='#4d6c77');d.polygon((135,36,143,25,151,38,145,35,141,39),fill='#faf1d9')
    for x in (175,184,193,202,211):
        d.polygon((x-6,103,x,83,x+6,103),fill='#4f876b',outline='#3d705f');d.line((x,101,x,108),fill='#765c4e')
    d.polygon((239,82,258,41,281,82),fill='#706985',outline='#494963');d.ellipse((253,64,270,83),fill='#303b52')
    for x,y in ((60,91),(79,82),(221,71)):
        d.rectangle((x,y,x+5,y+4),fill='#92b58d');d.point((x+2,y-2),fill='#769f7f')
    progress=max(0,min(1,(t-(35 if t<45 else 79))/8)); path=[(37,107),(95,106),(140,56),(193,102),(263,59)];q=progress*4;j=min(3,int(q));f=q-j
    x=int(path[j][0]*(1-f)+path[j+1][0]*f);y=int(path[j][1]*(1-f)+path[j+1][1]*f)
    d.ellipse((x-7,y-2,x+7,y+2),fill='#b0a482')
    ref.actor(pic,'whale',x,y,23,int(t/.12) if progress<1 else 0)
    return pic

def throne(t):
    pic=im('#ded9c7');d=ImageDraw.Draw(pic)
    for y in range(4,127,12):
        d.line((0,y,319,y),fill='#c1c4ba')
        for x in range((y//12%2)*14,320,28):d.line((x,y,x,y+11),fill='#c1c4ba')
    for x in (27,84,143,202,267):
        d.rectangle((x,18,x+18,89),fill='#a6cbd0',outline='#8e9e9a',width=2);d.line((x+9,19,x+9,88),fill='#e3e7d4')
        d.polygon((x-2,16,x+9,4,x+20,16),fill='#cb9c81')
    for x in (13,248):
        d.rectangle((x,8,x+11,72),fill='#bc6670',outline='#8b5960');d.polygon((x,72,x+5,78,x+11,72),fill='#bc6670')
    d.rectangle((0,112,319,144),fill='#aea798')
    for y in range(112,145,8):
        for x in range((y//8%2)*9,320,18):d.rectangle((x,y,x+8,y+7),fill='#d7d0bd')
    d.polygon((57,144,115,113,192,113,243,144),fill='#be6971')
    for x in range(90,210,12):d.point((x,133),fill='#f6cc84')
    d.rectangle((251,54,294,114),fill='#ba6570',outline='#8e6b64',width=3)
    d.rectangle((256,60,289,105),fill='#854d61',outline='#e9bd80',width=2)
    ref.actor(pic,'claude',273,109,49)
    d=ImageDraw.Draw(pic);d.polygon((262,64,264,54,269,60,273,52,277,60,282,54,284,64),fill='#f2cf7e',outline='#8e6b64')
    ref.actor(pic,'whale',90,131,48)
    ref.actor(pic,'qwen',154,126,27,0,True);ref.actor(pic,'kimi',177,126,27)
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
    pic=ref.town();d=ImageDraw.Draw(pic)
    # Windmill and collectable chest are actual events, not stationary decoration.
    d.rectangle((119,56,145,113),fill='#e9dcb7',outline='#5c6765',width=2)
    d.polygon((115,56,132,39,149,56),fill='#b46e68',outline='#5c6765')
    cx,cy=132,64; angle=t*1.4
    for i in range(4):
        a=angle+i*math.pi/2;ex=cx+int(math.cos(a)*26);ey=cy+int(math.sin(a)*26)
        d.line((cx,cy,ex,ey),fill='#795f5b',width=2);d.rectangle((ex-4,ey-3,ex+4,ey+3),fill='#eee8d0',outline='#795f5b')
    d.ellipse((129,61,135,67),fill='#e3b66d')
    # treasure opens late in the shot
    d.rectangle((245,108,262,119),fill='#ad7254',outline='#574e53',width=2)
    if t%7>3.0:d.polygon((245,107,246,101,262,99,262,107),fill='#d99c63',outline='#574e53')
    else:d.rectangle((245,103,262,108),fill='#d99c63',outline='#574e53')
    d.rectangle((252,106,255,114),fill='#f3d37e')
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
    pic=im('#35395b');d=ImageDraw.Draw(pic)
    d.polygon((0,0,33,0,53,26,78,7,107,20,138,0,186,15,224,0,264,22,290,0,319,0,319,144,0,144),fill='#47466b')
    for x in range(8,320,35):
        d.polygon((x,0,x+7,22+(x%17),x+13,0),fill='#2b314f')
    d.polygon((0,120,46,111,97,119,144,110,190,117,245,109,319,118,319,145,0,145),fill='#5b5572')
    for x in (18,51,98,183,224,282):
        d.polygon((x,131,x+4,116,x+8,131),fill='#8fc3c6');d.polygon((x+7,131,x+11,121,x+14,131),fill='#669ba7')
    for i in range(20):
        x=(i*37)%320;y=110+(i*19)%29;d.point((x,y),fill='#d7bd83')
    d.polygon((219,130,248,114,296,130),fill='#e0bd75')
    ref.actor(pic,'whale',48,126,44)
    ref.actor(pic,'gpt',218,125,72,0,True)
    ref.actor(pic,'doubao',279,89,29)
    d=ImageDraw.Draw(pic);d.rectangle((267,59,291,92),outline='#e8c67b',width=2)
    for x in (272,278,284):d.line((x,60,x,90),fill='#e8c67b')
    if 115.5 <= t < 118:
        # sword prop, intentionally separate from the original sprite
        d.line((70,99,92,75),fill='#f6f2d6',width=3);d.line((66,96,74,103),fill='#e9c77f',width=2)
    if 118 <= t < 122 or 124 <= t < 127:
        # Name tiles reveal in sequence, echoing the reference's long-name gag.
        phase=(t-118 if t<122 else t-124)
        count=min(13,int(phase*5)+1)
        for i in range(count):
            x=47+i*17
            d.rectangle((x,20,x+14,35),fill='#b76770',outline='#f4d28d')
            d.line((x+4,25,x+10,25),fill='#f9ead0');d.line((x+4,30,x+10,30),fill='#f9ead0')
    if 122 <= t < 124 or 127 <= t < 129:
        d.ellipse((58,38,102,58),fill='#f5edcf',outline='#6f6c77',width=2)
        d.polygon((68,57,64,67,78,58),fill='#f5edcf',outline='#6f6c77')
        d.ellipse((77,44,83,50),outline='#6f6c77');d.point((80,53),fill='#6f6c77')
    if 129 <= t < 131:
        # Mistaken name becomes a little inventory gag rather than a static hold.
        r.box(d,(103,30,205,72))
        for i in range(4):
            x=113+i*21;d.rectangle((x,40,x+16,59),fill='#e8d5ae',outline='#8f796b')
            d.ellipse((x+5,45,x+10,51),fill=['#f0c36e','#b689ad','#90b7b1','#e49984'][i])
    if t>=131:
        for i in range(8):
            x=104+(i*23)%140;y=30+((i*17+int(t*7))%27)
            d.line((x-2,y,x+2,y),fill='#f8dd91');d.line((x,y-2,x,y+2),fill='#f8dd91')
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
        # Word cards give the repeated long name the source's game-like visual punch.
        n=min(12,max(1,int((t-52)*2)))
        for i in range(n):
            x=30+(i%12)*21;y=81
            d.rectangle((x,y,x+18,y+20),fill='#b7666e',outline='#f3d48f',width=1)
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
        ref.actor(pic,'whale',72+int((t-86)*9),122,40,int((t-86)/.12))
        return label(pic,'出发','从城堡里出发')
    if t<101:
        pic=travel(t);ref.actor(pic,'whale',92,122,38,int(t/.12));d=ImageDraw.Draw(pic)
        if t<97:
            x=235-int((t-92)*17);d.ellipse((x-10,99,x+10,120),fill='#bd807a',outline='#594f5d',width=2);d.point((x-3,107),fill='#fff2d4');d.point((x+3,107),fill='#fff2d4')
            if t>95:d.line((105,109,130,96),fill='#f6edc9',width=3)
            return label(pic,'战斗','战胜魔兽来袭')
        for i in range(12):
            x=157+(i%6)*15;y=67+(i//6)*11-int((t*6+i)%5);d.ellipse((x,y,x+7,y+7),fill='#f4cc6c',outline='#a67e5d')
        return label(pic,'奖励','获得十二金币')
    if t<106:
        pic=village(t);ref.actor(pic,'whale',90+int((t-101)*9),121,38,int(t/.12));ref.actor(pic,'qwen',202,118,28)
        return label(pic,'村庄','打开所有宝箱')
    if t<110:
        pic=travel(t);d=ImageDraw.Draw(pic);d.ellipse((230,5,281,56),fill='#f1efcb')
        for i in range(35):
            x=(i*47+int(t*12))%320;y=(i*29+int(t*24))%119;d.point((x,y),fill='#f4f5db')
        ref.actor(pic,'whale',85,121,38,int(t/.12))
        return label(pic,'旅途','指引前路的圣月光')
    pic=cave(t)
    # Cut between hero, dragon and wide shots in the long exchange.
    if 115.5 <= t < 118 or 122 <= t < 124 or 127 <= t < 129:
        pic=pic.crop((0,0,250,140)).resize((320,180),Image.Resampling.NEAREST)
    elif 118 <= t < 122 or 124 <= t < 127:
        pic=pic.crop((70,0,320,140)).resize((320,180),Image.Resampling.NEAREST)
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
        pulse=3+(tick//5)%4; d.ellipse((263-pulse,59-pulse,263+pulse,59+pulse),outline='#b86f69')
        x=44+(tick*2%214);d.rectangle((x,110,x+3,112),fill='#d49079')
    elif t<71:
        # Turn-taking cues: speech balloon changes sides and pops with the dialog.
        from_king=(43<=t<47 or 55.5<=t<57 or 60<=t<64.2)
        x=262 if from_king else 94
        y=31+int(2*math.sin(t*5))
        d.rounded_rectangle((x-18,y-9,x+18,y+7),radius=4,fill='#fff3d5',outline='#957f75')
        d.polygon((x-3,y+7,x+2,y+7,x,y+12),fill='#fff3d5',outline='#957f75')
        for j in range(1+(tick//8)%3):d.ellipse((x-8+j*7,y-3,x-6+j*7,y-1),fill='#8d7c78')
        if t>=52:
            # Sequential letter cards are the actual syllables, drawn below at HD.
            for i in range(min(12,1+int((t%4)*3))):
                x2=25+i*23;d.rectangle((x2,82,x2+18,102),fill='#b86670',outline='#f5da9e')
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
                x=250+(i-2)*5;y=102-((tick//3+i*7)%17)
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
    pic.paste(layer.resize((960,540),Image.Resampling.NEAREST),(0,0),layer.resize((960,540),Image.Resampling.NEAREST))
    d=ImageDraw.Draw(pic)
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
