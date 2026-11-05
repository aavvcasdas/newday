// Four measured-audio shot-construction trials. Original v2 renderer / background remain untouched.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createCanvas,loadImage,bg,boss,panel6,text6,
 day3RiceBowl,stool,wallet,coin,reseedBoil,resolveFfmpeg} from '../day8制作/render_day8.mjs';
import {loadMotionAssets,drawAction as rawDrawAction,travel,cacheStats} from './motion_v2.mjs';
import {createDay2Subtitle} from '../字幕/day2_style_sub.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const HERE=path.dirname(fileURLToPath(import.meta.url));
const argv=process.argv.slice(2),arg=(s)=>argv.includes(s)?argv[argv.indexOf(s)+1]:null;
import {createMotionGate} from './motion_gate.mjs';
const motionGate=createMotionGate(createCanvas,rawDrawAction,argv.includes('--test'));
const drawAction=(g,opts)=>motionGate.draw(g,opts);
const voice=arg('--voice'),alignment=arg('--alignment'),subtitleFile=arg('--subtitle-file');
const measured=alignment?JSON.parse(fs.readFileSync(alignment,'utf8')):null;
if(voice){
 if(measured?.measured!==true||!subtitleFile)throw Error('有声版必须提供实测cue与字幕');
 if(createHash('sha256').update(fs.readFileSync(voice)).digest('hex')!==measured.source_sha256)throw Error('音源SHA256与实测时间轴不一致');
}
const lines=fs.readFileSync(path.join(ROOT,'Day9/Day9配音台词.txt'),'utf8').trim().split(/\n+/);
if(measured&&measured.cues.length!==lines.length)throw Error('cue数量与定稿不一致');
let clock=0;
const cues=measured?measured.cues.map((c,i)=>{if(c.text!==lines[i])throw Error('时间轴文本不匹配');return {...c,line:i+1};}):lines.map((text,i)=>{const duration=Math.max(.8,[...text.replace(/[^\p{L}\p{N}]/gu,'')].length/4.3);const c={line:i+1,text,start:+clock.toFixed(3),end:+(clock+duration).toFixed(3)};clock+=duration+.18;return c;});
const duration=cues.at(-1).end+.2,FPS=30,S=1.5,W=1280,H=720;
const clamp=(x)=>Math.min(1,Math.max(0,x)),mix=(a,b,p)=>a+(b-a)*p,smooth=(x)=>{x=clamp(x);return x*x*(3-2*x);};
const spans=[
 [1,3,'修程序与米饭钱','专用键盘姿势交替按键，钱包打开，硬币留在电脑旁'],
 [4,8,'喊停与白饭','本鲸退开键盘作制止状；两只实体饭碗，老大剪影在后面指责'],
 [9,11,'本鲸也挨骂','本鲸走近笨鱼的碗再转回老大，震惊转鼓脸'],
 [12,15,'旁边监工','老大在两台电脑间移动，本鲸与笨鱼交替检查报错'],
 [16,18,'查岗接不上','本鲸走到笨鱼旁探头；笨鱼继续敲，短气泡无人接话'],
 [19,22,'老大上班','淡淡蒸汽升起，老大带工作包走向门口；本鲸追到门边'],
 [23,26,'鱼还在','校验未通过标签落下，笨鱼从电脑旁走向观影区，不画死亡'],
 [27,29,'换任务','本鲸示意停码，键盘退到一旁，笨鱼走到实体电视前'],
 [30,32,'交总结','笨鱼拿纸走回来，本鲸接过翻看；电视开始摘要示意'],
 [33,35,'南极打工','电视内完整科考站：雪山窗、食物架、热饭、工位；本鲸端碗对照'],
 [36,36,'卫星锅饭盆','电视内站外雪地、机房、卫星天线；角色从小饭碗走到大锅边探头'],
 [37,37,'冰心草莓酱','电视内科考桌、冰心与酱瓶；草莓酱想象气泡出现，本鲸制止'],
 [38,39,'怎么像食堂','本鲸捧总结对照饭碗，走近电视质问；电视回到热饭场景'],
 [40,41,'记住别刷屏','电视把自动回复要饭与屏蔽动作做成示意，本鲸回翻该页并点头'],
 [42,45,'看同类打工','电视继续科考站打工，笨鱼走到观影凳前，本鲸持纸验收'],
 [46,49,'监工没挪窝','监工凳位置固定，本鲸走近电视被剧情吸引；末句叉腰嘴硬']
].map(([from,to,title,action],i)=>({id:`C${String(i+1).padStart(2,'0')}`,from,to,title,action,start:cues[from-1].start,end:cues[to-1].end}));
const subs=measured?JSON.parse(fs.readFileSync(subtitleFile,'utf8')).screens:cues.flatMap(c=>{const parts=c.text.match(/[^，。！？；：]+[，。！？；：]?/g)||[c.text];let n=0,total=parts.join('').length;return parts.map(text=>{const st=c.start+(c.end-c.start)*n/total;n+=text.length;return {line:c.line,text,start:st,end:c.start+(c.end-c.start)*n/total};});});
if(!voice||!measured)throw Error('Trial requires the original voice, measured alignment and subtitle file');
const sub=createDay2Subtitle({fontOf:(s,w)=>`${w} ${s}px NotoSansSC`,measureCtx:createCanvas(1,1).getContext('2d')});
function box(g,x,y,w,h,fill='#17364D',stroke='#7AA9BA',r=10){panel6(g,x,y,w,h,fill,stroke,r);}
function txt(g,s,x,y,size=23,color='#E8F4F2'){text6(g,s,x,y,size,color);}
function oval(g,x,y,rx,ry,fill,stroke=null){g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=2;g.stroke();}}
function line(g,x,y,xx,yy,color='#A8C3D2',width=3){g.beginPath();g.moveTo(x,y);g.lineTo(xx,yy);g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';g.stroke();}
function tag(g,s,x,y,w=160){box(g,x-w/2,y-26,w,40,'#E9F2E7','#7DA9AC',12);txt(g,s,x,y+2,20,'#294A56');}
function steam(g,x,y,t){for(let i=0;i<3;i++){g.save();g.globalAlpha=.24;g.beginPath();for(let k=0;k<15;k++){const yy=y-k*4-((t*20+i*17)%22);const xx=x+i*12-12+Math.sin(t*1.3+k*.5+i)*5;k?g.lineTo(xx,yy):g.moveTo(xx,yy);}g.strokeStyle='#D0E5E8';g.lineWidth=4;g.stroke();g.restore();}}
function keyboard(g,x,y,t,typing=true){box(g,x-68,y-14,136,34,'#34495E','#9CB4BF',6);for(let j=0;j<3;j++)for(let k=0;k<10;k++)box(g,x-58+k*12,y-8+j*8,8,5,typing&&(k+j+Math.floor(t*9))%11===0?'#9BE5D6':'#102737','#486272',1);}
function satDish(g,x,y,s,t){g.save();g.translate(x,y);g.scale(s,s);line(g,0,15,-18,76,'#7E9EA9',9);line(g,-45,78,35,78,'#91B3BB',9);g.save();g.rotate(-.23);g.beginPath();g.ellipse(0,0,80,34,0,0,Math.PI);g.closePath();g.fillStyle='#AACDD7';g.fill();g.strokeStyle='#426A81';g.lineWidth=4;g.stroke();oval(g,0,0,80,16,'#CBE4E8','#6D96AB');line(g,0,-8,25,-67,'#5A889D',5);oval(g,25,-67,7,7,'#F2D28C');g.restore();g.restore();}
function station(g,t,outside=false){
 const gr=g.createLinearGradient(0,0,0,360);gr.addColorStop(0,'#457C9D');gr.addColorStop(1,'#B9DAE0');g.fillStyle=gr;g.fillRect(0,0,640,360);
 for(let i=0;i<4;i++){g.beginPath();g.moveTo(i*200-60,220);g.lineTo(i*200+70,55+i%2*34);g.lineTo(i*200+220,230);g.closePath();g.fillStyle=i%2?'#B6D4DB':'#E4F1ED';g.fill();}
 g.fillStyle='#DDECEB';g.fillRect(0,224,640,136);
 if(outside){box(g,400,102,210,136,'#698B9A','#D6E8E7',5);box(g,421,132,58,56,'#29495E','#ACCED5',3);box(g,509,128,55,110,'#3D657A','#C4DBD8',3);txt(g,'科考站',505,92,23);for(let i=0;i<11;i++){let xx=(i*71+t*16)%660,yy=48+(i*29)%230;oval(g,xx,yy,2,2,'#F5FFFC');}return;}
 // Warm station interior with full window, benches, food shelf, floor, coat hooks and table.
 box(g,0,0,640,267,'#405B66','#76979A',0);
 box(g,25,42,234,141,'#142C3F','#BBCCC4',9);g.save();g.beginPath();g.rect(34,50,216,124);g.clip();g.fillStyle=gr;g.fillRect(34,50,216,124);g.beginPath();g.moveTo(20,170);g.lineTo(90,70);g.lineTo(140,140);g.lineTo(199,84);g.lineTo(270,170);g.fillStyle='#D9E9E7';g.fill();g.restore();line(g,144,50,144,174,'#ADC6C7',4);
 box(g,466,61,151,157,'#536864','#ADAC8E',5);for(let j=0;j<2;j++){line(g,475,119+j*62,607,119+j*62,'#BAAB8C',5);for(let i=0;i<3;i++){box(g,484+i*37,82+j*62,24,32,['#D6C99F','#A2C3B4','#B6A0A5'][i],'#E1D8BD',3);}}
 g.fillStyle='#797B72';g.fillRect(0,267,640,93);for(let i=0;i<7;i++)line(g,i*110,267,i*120-50,360,'#535F5A',1);
 box(g,283,56,111,44,'#D9DCCB','#8CABA4',5);txt(g,'南极科考站',338,85,17,'#36505A');
 line(g,350,0,350,30,'#A7B9AB',3);oval(g,350,43,39,16,'#EDD49B');
 box(g,37,270,195,20,'#655B4E','#B1A18A',3);line(g,52,292,46,343,'#706553',8);line(g,218,292,223,343,'#706553',8);
}
function stageTable(g){box(g,280,274,310,18,'#A1815C','#CEB58D',5);line(g,301,292,291,350,'#847252',9);line(g,563,292,572,350,'#847252',9);}
function act(g,action,x,y,u,t,start,len,extra={}){
 return drawAction(g,{action,x,y,u,time:t,start,duration:Math.max(.3,len),...extra});
}
function walker(g,{from,to,y,u,t,start,len=2.2,action='look',label=null}){
 const route=travel(from,to,t,start,len);
 return drawAction(g,{action,x:route.x,y,u,time:t,start:start+len,duration:3,travel:route,
  flip:route.moving&&to<from,label});
}
function inside(g,t,mode,progress){
 station(g,t,mode==='dish');const q=clamp(progress),elapsed=q*3.2;
 if(mode==='dish'){
  satDish(g,347,201,1.3,t);day3RiceBowl(g,128,306,1.15,.2,t);
  const r=travel(118,219,elapsed,0,1.65);
  drawAction(g,{action:'look',x:r.x,y:334,u:18,time:elapsed,start:1.65,duration:1.55,travel:r,lean:r.moving?0:.045*smooth((elapsed-1.65)/.4)});
  txt(g,'卫星锅 ≠ 饭盆',458,321,23,'#264D62');
 }else if(mode==='ice'){
  act(g,q>.65?'stop':'look',157,334,21,elapsed,q>.65?2.08:0,q>.65?1.12:2.08);
  stageTable(g);
  g.beginPath();g.moveTo(331,258);g.lineTo(321,192);g.lineTo(359,155);g.lineTo(399,190);g.lineTo(389,258);g.closePath();g.fillStyle='#9CE1E4';g.fill();g.strokeStyle='#E2FFFA';g.lineWidth=3;g.stroke();line(g,359,163,345,247,'#E4FFFC',2);box(g,315,257,95,15,'#657C7E','#B9D0C4',3);
  box(g,489,213,31,54,'#AB5368','#E5B5AD',5);box(g,492,202,25,12,'#DBD0B0','#CAB79C',2);txt(g,'草莓',504,245,11,'#FFF0DE');
  // A clearly framed thought, not an unheld physical bottle flying across the room.
  if(q>.18&&q<.75){box(g,280,105,252,51,'#F0E9D7','#ADC9C8',22);txt(g,'浇点草莓酱？',406,140,23,'#4D6071');oval(g,260,164,7,6,'#F0E9D7');oval(g,244,178,4,3,'#F0E9D7');}
  if(q>=.65)tag(g,'这是科考标本！',416,109,210);
  txt(g,'科考标本',365,312,18,'#D9EBE4');
 }else if(mode==='spam'){
  act(g,q>.6?'stop':'eat',133,333,21,elapsed,q>.6?1.92:0,q>.6?1.28:1.92);
  box(g,288,61,305,224,'#183B51','#91C2CB',10);txt(g,'自动回复',440,94,24);
  for(let i=0;i<3;i++){if(q<i*.12)continue;const yy=126+i*43;box(g,309,yy,252,32,'#D7E8DF','#7FA7AB',8);txt(g,'有饭吗？',435,yy+23,18,'#385865');}
  if(q>.55){box(g,345,145,198,69,'#A65B69','#FFD7BB',10);txt(g,'屏蔽',444,190,33,'#FFF0DD');}
  txt(g,'别在评论区刷屏',435,321,23);
 }else{
  const working=mode==='work';
  if(working){
   // Use the existing hands-on-keyboard drawing; its desk is pinned by the rig.
   act(g,'type',245,337,23,t,0,200);
   box(g,387,158,207,116,'#536C6F','#C4CBAB',5);txt(g,'今日派活',490,187,23,'#F3E7BD');
   txt(g,'收拾口粮',490,220,20);txt(g,'接着干活',490,253,20);
   day3RiceBowl(g,477,312,1.25,.25,t);txt(g,'吃了口粮，打工抵债',383,112,23,'#F7E5BA');
  }else{
   act(g,'eat',161,337,23,elapsed,0,3.2);stageTable(g);day3RiceBowl(g,393,261,1.6,.9,t);steam(g,393,238,t);
   box(g,495,221,68,48,'#B79B76','#D4C5A5',5);txt(g,'口粮',530,252,20,'#3D544F');txt(g,'终于吃上热饭了',405,112,24,'#F5DFAD');
  }
 }
}
function tv(g,t,mode='work',progress=.5){
 const x=552,y=108,w=658,h=370;
 g.save();g.shadowColor='#07121FCC';g.shadowBlur=14;box(g,x-14,y-14,w+28,h+40,'#1D2934','#91ABB3',15);g.restore();
 g.save();g.beginPath();g.roundRect(x,y,w,h,9);g.clip();g.translate(x,y);g.scale(w/640,h/360);inside(g,t,mode,progress);g.restore();
 box(g,x,y,w,30,'#123347','#426779',0);txt(g,'冬冰作品观影摘要 · 场景示意（非原片）',x+w/2,y+22,17,'#E1ECE6');
 line(g,x+w*.44,y+h+17,x+w*.56,y+h+17,'#627F88',4);
 box(g,x-8,y+h+43,w+16,68,'#605A52','#A5997D',8);for(let i=0;i<2;i++){box(g,x+16+i*321,y+h+52,304,48,'#494F4F','#8B9C95',5);line(g,x+144+i*321,y+h+76,x+187+i*321,y+h+76,'#BEBBA2',4);}
}
function roomV2(g,work=false){
 bg(g,0);
 // Functional set dressing: a repair board and desk lighting, not random accessories.
 if(work){box(g,31,160,185,145,'#304856','#778E94',8);txt(g,'待修',124,192,23,'#E4DAC1');
  box(g,48,210,150,34,'#E6D8B5','#ADA789',2);txt(g,'接话没接上',123,234,17,'#425869');
  box(g,48,254,150,32,'#C3D7CE','#91A9A4',2);txt(g,'先别乱改',123,277,17,'#425869');}
}
function monitor(g,x,y,t,failed=false){
 box(g,x-72,y-106,144,106,'#283F52','#93ACB6',9);box(g,x-62,y-95,124,81,'#0C2031',failed?'#DB8992':'#72A7AD',5);
 txt(g,failed?'接不上':'写码中',x,y-62,20,failed?'#EDB4B0':'#B0DECB');
 if(failed)txt(g,'×',x,y-24,29,'#EA969E');
 line(g,x,y,x,y+24,'#718C97',8);line(g,x-39,y+25,x+39,y+25,'#718C97',6);
}
function human(g,x,y,t,opts={}){motionGate.extra(ctx=>humanRaw(ctx,x,y,t,opts));return humanRaw(g,x,y,t,opts);}
function humanRaw(g,x,y,t,{walking=false,bag=false}={}){
 const step=walking?Math.sin(t*7.4):0;
 line(g,x-17,y-12,x-28-step*10,y+73,'#080E1C',18);line(g,x+17,y-12,x+28+step*10,y+73,'#080E1C',18);
 boss(g,x,y-52,75,0);
 if(bag){const bx=x+62+step*5,by=y+8;box(g,bx-25,by,50,42,'#52636C','#9CABA6',5);line(g,bx-13,by,bx-13,by-12,'#9CABA6',3);line(g,bx+13,by,bx+13,by-12,'#9CABA6',3);line(g,bx-13,by-12,bx+13,by-12,'#9CABA6',3);}
}
function sheetAt(g,x,y,w=45,h=62,angle=0){g.save();g.translate(x,y);g.rotate(angle);box(g,-w/2,-h/2,w,h,'#EFE8D6','#B0B9A9',3);txt(g,'总结',0,-h*.12,Math.max(10,w*.22),'#4B6164');for(let i=0;i<3;i++)line(g,-w*.28,h*.05+i*8,w*.28,h*.05+i*8,'#849D99',1.4);g.restore();}
function tableLamp(g,x,y){line(g,x,y,x-12,y-55,'#B4AF96',5);line(g,x-12,y-55,x+12,y-82,'#B4AF96',5);g.beginPath();g.moveTo(x-10,y-79);g.lineTo(x+31,y-84);g.lineTo(x+39,y-61);g.lineTo(x-15,y-56);g.closePath();g.fillStyle='#D7C797';g.fill();oval(g,x,y+3,29,6,'#A7AA91');}
// Source timing comes from measured cue/subtitle events, not estimated reading speed.
const event=(line,text='')=>subs.find(s=>s.line===line&&s.text.includes(text))?.start??cues[line-1].start;
const shots=spans.filter(s=>['C01','C05','C09','C16'].includes(s.id));
const edits=shots.map(sh=>({id:sh.id,from:sh.from,to:sh.to,
 sourceStart:Math.floor(sh.start*FPS)/FPS,sourceEnd:Math.round((sh.end+.2)*FPS)/FPS}));
let outputFrame=0;for(const e of edits){e.outputStartFrame=outputFrame;e.frames=Math.round((e.sourceEnd-e.sourceStart)*FPS);outputFrame+=e.frames;e.outputEndFrame=outputFrame;}
const totalFrames=outputFrame;
function editAt(frame){const edit=edits.find(e=>frame>=e.outputStartFrame&&frame<e.outputEndFrame);if(!edit)throw Error('Frame outside edit');return {edit,time:edit.sourceStart+(frame-edit.outputStartFrame)/FPS};}
function camera(g,z,cx,cy){g.translate(W/2,H/2);g.scale(z,z);g.translate(-cx,-cy);}
function frame(g,t,shotId){
 motionGate.begin();
 reseedBoil(0);g.setTransform(S,0,0,S,0,0);g.clearRect(0,0,W,H);
 const sh=shots.find(s=>s.id===shotId);if(!sh)throw Error('Unknown trial shot '+shotId);
 let ci=sh.from-1;for(let i=sh.from-1;i<sh.to;i++)if(t>=cues[i].start)ci=i;
 const c=cues[ci],n=ci+1,lt=t-sh.start,len=sh.end-sh.start;
 g.save();
 // Scene-only reframing. Captions and compliance mark are drawn after restore.
 if(shotId==='C01'){
  if(t<event(2))camera(g,1.22,530,380);
  else if(t<event(3))camera(g,1.35,500,400);
  else camera(g,1.5,580,400);
 }else if(shotId==='C05'&&t>=event(16,'它也'))camera(g,1.2,740,400);
 roomV2(g,shotId==='C01'||shotId==='C05');
 if(shotId==='C01'){
  human(g,658,450,0);monitor(g,543,467,t,true);monitor(g,1097,472,t,false);
  // Secondary typist holds while the primary hands and failure are being read.
  act(g,'type',898,581,30,.7,0,8);
  if(t<event(3,'倒'))act(g,'type',335,581,34,t,sh.start,len,{phaseOffset:.55});
  else act(g,'shock',335,581,34,t,event(3,'倒'),sh.end-event(3,'倒'));
  tableLamp(g,539,560);
  if(n===1)tag(g,'又接不上了',350,184,185);
  // Cut to the already-open wallet, resting on the established desk. No flying coins.
  if(n===3){wallet(g,565,470,1.08,1);coin(g,623,487,8,0);}
 }else if(shotId==='C05'){
  monitor(g,1098,465,t,false);
  const arrived=event(16,'它也'),route=travel(335,625,t,sh.start,arrived-sh.start);
  drawAction(g,{action:t>=event(18)?'protest':'look',x:route.x,y:582,u:34,time:t,
   start:t>=event(18)?event(18):arrived,duration:t>=event(18)?sh.end-event(18):event(18)-arrived,travel:route});
  // The lack of a reply is a visible hold, not simultaneous gesture spam.
  act(g,t>=event(17,'饭')&&t<event(18)?'eat':'type',900,580,30,t,sh.start,len,{label:'笨鱼'});
  day3RiceBowl(g,736,553,1.8,.3,t);
  if(t<arrived)tag(g,'听见了吗？',651,203,177);
  else if(t>=event(18))tag(g,'……',911,196,105);
 }else if(shotId==='C09'){
  // Keep the physical television completely fixed. Its inner action waits for the read.
  tv(g,t<event(32)?64:t,'work',.5);
  const received=subs.filter(s=>s.line===31).at(-1).end;
  if(t<received){
   act(g,'point',240,582,32,t,sh.start,received-sh.start);
   act(g,'read',445,581,25,t,sh.start,received-sh.start,{paper:true,label:'笨鱼'});
  }else{
   // Editorial ellipsis: paper changes owner on the cut, never flies between hands.
   act(g,'read',240,582,32,t,received,sh.end-received,{paper:true});
   act(g,'idle',445,581,25,t,received,sh.end-received,{label:'笨鱼'});
  }
 }else{
  const turn=event(48),question=event(48,'下一集'),deny=event(49);
  tv(g,t<question?64:t,t<question?'work':'meal',.55);
  act(g,'idle',128,582,17,0,0,10,{label:'笨鱼'});
  if(t<turn)act(g,'read',305,582,33,t,sh.start,turn-sh.start,{paper:true});
  else{
   // The put-down is elided by the shot cut; the note remains on the original desk.
   sheetAt(g,455,484,46,15,-.03);
   const route=travel(305,395,t,turn,1.1);
   drawAction(g,{action:t>=deny?'proud':'idle',x:route.x,y:582,u:33,time:t,
    start:t>=deny?deny:turn+1.1,duration:t>=deny?sh.end-deny:deny-turn-1.1,travel:route});
  }
  if(t>=deny)tag(g,'本鲸在监工！',364,192,190);
 }
 g.restore();
 txt(g,'非官方同人 · AI生成 · 剧情演绎',1058,34,15,'#B6CFD2');
 const hit=subs.find(s=>t>=s.start&&t<s.end);if(hit)sub.draw(g,{lines:sub.wrap(hit.text),speaker:'本鲸',vis:1,W,H});
}

await loadMotionAssets({createCanvas,loadImage});
const out=path.resolve(arg('--out')||path.join(ROOT,'Day9/成片/Day9_四镜分镜试剪.mp4'));
const canvas=createCanvas(W*S,H*S),g=canvas.getContext('2d');
const reportFile=path.join(HERE,'分镜试剪_时间轴.json');
const manifest={kind:'four_shot_measured_audio_trial_not_full_episode',source_sha256:measured.source_sha256,
 fps:FPS,frames:totalFrames,duration:totalFrames/FPS,voice_speed:1,edits,
 edit_notes:{C01:'工作中景→报错关系景→钱包及反应；场景剪裁，字幕不缩放',
 C05:'走近→实测不搭理分句处到达→等待→饭照吃→抗议',
 C09:'原生持纸姿势；交接切镜，非真实手部接纸动画；电视等读纸后开始',
 C16:'验收→放纸切镜→迈步靠近→原地嘴硬；无站姿坐凳和漂浮纸'}};
fs.writeFileSync(reportFile,JSON.stringify(manifest,null,2)+'\n');
if(argv.includes('--test')){
 let checks=0,tvBorder=null;
 const digest=b=>createHash('sha256').update(b).digest('hex');
 for(const sh of shots){const hashes=[];for(const p of [.1,.4,.7,.95]){
  frame(g,mix(sh.start,sh.end,p),sh.id);hashes.push(motionGate.hash());
  if(['C09','C16'].includes(sh.id)){
   const h=digest(g.getImageData(Math.round(1222*S),Math.round(125*S),2,Math.round(325*S)).data);
   if(tvBorder&&h!==tvBorder)throw Error('Television border moved');tvBorder=h;
  }checks++;
 }if(new Set(hashes).size<3)throw Error('Trial has no changing action '+sh.id);}
 if(subs.map(s=>s.text).join('')!==lines.join(''))throw Error('Source captions changed');
 for(let f=0;f<totalFrames;f++){const {edit,time}=editAt(f);if(time<edit.sourceStart||time>=edit.sourceEnd+1e-6)throw Error('Bad edit mapping');}
 const result={sampled_frames:checks,shots:shots.length,source_subtitle_exact:true,tv_border_fixed:true,motion_check:'isolated_actor_lower_body_pixels_not_semantic_proof',frames:totalFrames,duration:totalFrames/FPS};
 fs.writeFileSync(path.join(HERE,'分镜试剪_回归检查.json'),JSON.stringify(result,null,2)+'\n');console.log(result);
}else if(argv.includes('--stills')){
 const dir=path.join(HERE,'分镜试剪抽帧');fs.mkdirSync(dir,{recursive:true});
 for(const sh of shots)for(const [i,p]of[.05,.3,.55,.8,.97].entries()){
  frame(g,mix(sh.start,sh.end,p),sh.id);fs.writeFileSync(path.join(dir,`${sh.id}_${i}.jpg`),canvas.toBuffer('image/jpeg'));
 }console.log('stills',20);
}else{
 fs.mkdirSync(path.dirname(out),{recursive:true});
 const split=edits.map((e,i)=>`[a${i}]`).join('');
 const filter=`[1:a]apad,asplit=${edits.length}${split};`+
  edits.map((e,i)=>`[a${i}]atrim=start=${e.sourceStart}:end=${e.sourceEnd},asetpts=PTS-STARTPTS[b${i}]`).join(';')+
  ';'+edits.map((e,i)=>`[b${i}]`).join('')+`concat=n=${edits.length}:v=0:a=1[audio]`;
 const ff=spawn(resolveFfmpeg(),['-y','-f','rawvideo','-pix_fmt','rgba','-s',`${W*S}x${H*S}`,'-r',String(FPS),'-i','-',
  '-i',path.resolve(voice),'-filter_complex',filter,'-map','0:v:0','-map','[audio]',
  '-c:a','aac','-b:a','192k','-t',String(totalFrames/FPS),'-c:v','libx264','-preset','veryfast','-tune','animation','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',out],{stdio:['pipe','ignore','pipe']});
 let err='';ff.stderr.on('data',d=>err+=d);ff.stdin.on('error',()=>{});
 const done=new Promise((resolve,reject)=>{ff.on('error',reject);ff.on('close',c=>c===0?resolve():reject(Error(err.slice(-2000))));});
 for(let f=0;f<totalFrames;f++){
  const {edit,time}=editAt(f);frame(g,time,edit.id);const raw=canvas.data();
  if(!ff.stdin.write(Buffer.from(raw.buffer,raw.byteOffset,raw.byteLength)))await Promise.race([new Promise(r=>ff.stdin.once('drain',r)),done]);
  if(f%180===0)console.log(`${f}/${totalFrames}`);
 }
 ff.stdin.end();await done;console.log('DONE',out,fs.statSync(out).size,cacheStats());
}
