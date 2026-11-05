// Day9: silent sample or measured voiced output; never mix estimated timing with audio.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createCanvas,loadSpritePoses,WGF,bg,boss,panel6,text6,laptop6,sheet6,
 day3RiceBowl,stool,wallet,coin,reseedBoil,drawPoseSprite,resolveFfmpeg} from '../day8制作/render_day8.mjs';
import {createDay2Subtitle} from '../字幕/day2_style_sub.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const HERE=path.dirname(fileURLToPath(import.meta.url));
const argv=process.argv.slice(2),arg=(s)=>argv.includes(s)?argv[argv.indexOf(s)+1]:null;
const voice=arg('--voice'),alignment=arg('--alignment'),subtitleFile=arg('--subtitle-file');
const measured=alignment?JSON.parse(fs.readFileSync(alignment,'utf8')):null;
if(voice){
 if(measured?.measured!==true||!subtitleFile)throw Error('有声版必须提供实测cue与字幕');
 if(createHash('sha256').update(fs.readFileSync(voice)).digest('hex')!==measured.source_sha256)throw Error('音源SHA256与实测时间轴不一致');
}
const lines=fs.readFileSync(path.join(ROOT,'Day9/Day9配音台词.txt'),'utf8').trim().split(/\n+/);
let clock=0;
const cues=measured?measured.cues.map((c,i)=>{if(c.text!==lines[i])throw Error('时间轴文本不匹配');return {...c,line:i+1};}):lines.map((text,i)=>{const duration=Math.max(.8,[...text.replace(/[^\p{L}\p{N}]/gu,'')].length/4.3);const c={line:i+1,text,start:+clock.toFixed(3),end:+(clock+duration).toFixed(3)};clock+=duration+.18;return c;});
const duration=cues.at(-1).end+.2,FPS=30,S=1.5,W=1280,H=720;
const clamp=(x)=>Math.min(1,Math.max(0,x)),mix=(a,b,p)=>a+(b-a)*p,smooth=(x)=>{x=clamp(x);return x*x*(3-2*x);};
const spans=[
 [1,3,'修程序与米饭钱','键盘前俯身查错，侧身打开钱包，散落硬币被移到电脑旁'],
 [4,8,'喊停与白饭','本鲸退开键盘作制止状；两只实体饭碗，老大剪影在后面指责'],
 [9,11,'本鲸也挨骂','本鲸走近笨鱼的碗再转回老大，震惊转鼓脸'],
 [12,15,'旁边监工','老大在两台电脑间移动，本鲸与笨鱼交替检查报错'],
 [16,18,'查岗接不上','本鲸走到笨鱼旁探头；笨鱼继续敲，短气泡无人接话'],
 [19,22,'老大上班','淡淡蒸汽升起，老大带工作包走向门口；本鲸追到门边'],
 [23,26,'鱼还在','校验未通过标签落下，笨鱼从电脑旁走向观影区，不画死亡'],
 [27,29,'换任务','本鲸把键盘推远，派活纸递向笨鱼，打开实体电视'],
 [30,32,'交总结','笨鱼拿纸走回来，本鲸接过翻看；电视开始摘要示意'],
 [33,35,'南极打工','电视内完整科考站：雪山窗、食物架、热饭、打工擦桌；本鲸端碗对照'],
 [36,36,'卫星锅饭盆','电视内站外雪地、机房、卫星天线；角色从小饭碗走到大锅边探头'],
 [37,37,'冰心草莓酱','电视内科考桌、冰心、标本灯；酱瓶倾斜将要浇下又被制止'],
 [38,39,'怎么像食堂','本鲸捧总结对照饭碗，走近电视质问；电视回到热饭场景'],
 [40,41,'记住别刷屏','电视把自动回复要饭与屏蔽动作做成示意，本鲸回翻该页并点头'],
 [42,45,'看同类打工','电视继续科考站打工，笨鱼搬凳坐好，本鲸持纸来回验收'],
 [46,49,'监工没挪窝','本鲸推监工凳靠近电视，被剧情吸引；末句转身叉腰嘴硬']
].map(([from,to,title,action],i)=>({id:`C${String(i+1).padStart(2,'0')}`,from,to,title,action,start:cues[from-1].start,end:cues[to-1].end}));
const subs=measured?JSON.parse(fs.readFileSync(subtitleFile,'utf8')).screens:cues.flatMap(c=>{const parts=c.text.match(/[^，。！？；：]+[，。！？；：]?/g)||[c.text];let n=0,total=parts.join('').length;return parts.map(text=>{const st=c.start+(c.end-c.start)*n/total;n+=text.length;return {line:c.line,text,start:st,end:c.start+(c.end-c.start)*n/total};});});
if(!measured)fs.writeFileSync(path.join(HERE,'sample_timing.json'),JSON.stringify({measured:false,purpose:'silent_storyboard_only',source:'Day9/Day9配音台词.txt',rate_estimate:4.3,duration,cues,subtitles:subs,shots:spans},null,2));
const sub=createDay2Subtitle({fontOf:(s,w)=>`${w} ${s}px NotoSansSC`,measureCtx:createCanvas(1,1).getContext('2d')});
function box(g,x,y,w,h,fill='#17364D',stroke='#7AA9BA',r=10){panel6(g,x,y,w,h,fill,stroke,r);}
function txt(g,s,x,y,size=23,color='#E8F4F2'){text6(g,s,x,y,size,color);}
function oval(g,x,y,rx,ry,fill,stroke=null){g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=2;g.stroke();}}
function line(g,x,y,xx,yy,color='#A8C3D2',width=3){g.beginPath();g.moveTo(x,y);g.lineTo(xx,yy);g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';g.stroke();}
function tag(g,s,x,y,w=160){box(g,x-w/2,y-26,w,40,'#E9F2E7','#7DA9AC',12);txt(g,s,x,y+2,20,'#294A56');}
function actor(g,x,y,u,t,pose='point',o={}){WGF(g,x,y,u,{t,pose,...o});}
function buddy(g,x,y,u,t,pose='point',o={}){actor(g,x,y,u,t,pose,o);tag(g,'笨鱼',x,y-u*10.7,88);}
function desk(g,x=210,y=510,w=850){box(g,x,y,w,28,'#796047','#B6A07C',6);box(g,x+25,y+28,20,83,'#51483D','#88765E',2);box(g,x+w-45,y+28,20,83,'#51483D','#88765E',2);}
function steam(g,x,y,t){for(let i=0;i<3;i++){g.save();g.globalAlpha=.24;g.beginPath();for(let k=0;k<15;k++){const yy=y-k*4-((t*20+i*17)%22);const xx=x+i*12-12+Math.sin(t*1.3+k*.5+i)*5;k?g.lineTo(xx,yy):g.moveTo(xx,yy);}g.strokeStyle='#D0E5E8';g.lineWidth=4;g.stroke();g.restore();}}
function keyboard(g,x,y,t,typing=true){box(g,x-68,y-14,136,34,'#34495E','#9CB4BF',6);for(let j=0;j<3;j++)for(let k=0;k<10;k++)box(g,x-58+k*12,y-8+j*8,8,5,typing&&(k+j+Math.floor(t*9))%11===0?'#9BE5D6':'#102737','#486272',1);}
function work(g,x,y,u,t,failed=false){actor(g,x,y,u,t,failed?'think':'point',{rot:Math.sin(t*6)*.012});laptop6(g,x,y-18,.6,t,failed);keyboard(g,x,y-8,t);}
function document(g,x,y,t,p=0){g.save();g.translate(x,Math.max(y,527));g.scale(.75,.75);g.rotate(-.09+.14*p);box(g,-68,-77,136,154,'#EFE8D6','#A5B7B7',5);txt(g,'观影总结',0,-43,21,'#355565');for(let i=0;i<4;i++)line(g,-45,-19+i*24,38-(i%2)*12,-19+i*24,'#79969A',3);g.restore();}
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
function inside(g,t,mode,progress){
 station(g,t,mode==='dish');
 if(mode==='dish'){
  satDish(g,325,197,1.3,t);const a=smooth(progress);actor(g,mix(130,217,a),332,18,t,a<.8?'walk_stand':'peek_curious');day3RiceBowl(g,151,303,1.2,.2,t);txt(g,'卫星锅 ≠ 饭盆',440,320,22,'#264D62');
 }else if(mode==='ice'){
  actor(g,158,330,21,t,progress>.55?'shock':'peek_curious');stageTable(g);
  g.beginPath();g.moveTo(331,258);g.lineTo(321,192);g.lineTo(359,155);g.lineTo(399,190);g.lineTo(389,258);g.closePath();g.fillStyle='#9CE1E4';g.fill();g.strokeStyle='#E2FFFA';g.lineWidth=3;g.stroke();line(g,359,163,345,247,'#E4FFFC',2);box(g,315,257,95,15,'#657C7E','#B9D0C4',3);
  const z=Math.sin(clamp(progress)*Math.PI);g.save();g.translate(464-z*42,220-z*40);g.rotate(-z*.7);box(g,-16,-42,32,64,'#AB5368','#E5B5AD',5);box(g,-13,-54,26,13,'#DBD0B0','#CAB79C',2);txt(g,'草莓',0,-9,11,'#FFF0DE');g.restore();
  tag(g,progress>.55?'这个不能吃！':'冰心，不是刨冰',432,112,184);txt(g,'科考标本',365,310,18,'#D9EBE4');
 }else if(mode==='spam'){
  // Narrative illustration of the source's anti-spam plot, not real platform results.
  actor(g,130,330,21,t,'eat');day3RiceBowl(g,215,300,1.5,.5,t);
  box(g,288,61,305,224,'#183B51','#91C2CB',10);txt(g,'自动回复',440,94,24);
  for(let i=0;i<3;i++){const yy=126+i*43;box(g,309,yy,252,32,'#D7E8DF','#7FA7AB',8);txt(g,'有饭吗？',435,yy+23,18,'#385865');}
  const z=smooth(progress);g.save();g.globalAlpha=z;box(g,345,145,198,69,'#A65B69','#FFD7BB',10);txt(g,'屏蔽',444,190,33,'#FFF0DD');g.restore();
  txt(g,'别在评论区刷屏',435,321,23);
 }else{
  const cleaning=mode==='work';const a=cleaning?(Math.sin(t*.8)+1)/2:smooth(progress);
  actor(g,cleaning?mix(220,330,a):150,334,21,t,cleaning?'point':'eat',{rot:cleaning?-.05:0});stageTable(g);
  day3RiceBowl(g,391,263,1.5,cleaning?.15:.9,t);steam(g,391,238,t);
  if(cleaning){const xx=mix(220,330,a)+70;box(g,xx,265,47,7,'#D8CFA5','#ACA481',3);txt(g,'吃了口粮，打工抵债',409,110,23,'#F7E5BA');}
  else{box(g,495,221,68,48,'#B79B76','#D4C5A5',5);txt(g,'口粮',530,252,20,'#3D544F');txt(g,'终于吃上热饭了',405,112,24,'#F5DFAD');}
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
function frame(g,t){
 reseedBoil(0);g.setTransform(S,0,0,S,0,0);g.clearRect(0,0,W,H);bg(g,0);
 let ci=0;for(let i=0;i<cues.length;i++){if(t>=cues[i].start)ci=i;else break;}
 const c=cues[ci],n=ci+1,sh=spans.find(s=>n>=s.from&&n<=s.to),lt=t-sh.start,p=clamp((t-sh.start)/(sh.end-sh.start)),q=clamp((t-c.start)/(c.end-c.start)),walk=smooth(lt/1.6);
 if(n<=3){
  boss(g,650,370,65,0);work(g,355,535,30,t,true);work(g,920,535,26,t);desk(g,215,551,850);
  if(n===1)tag(g,'又接不上了',360,177,176);
  if(n>=2){wallet(g,615,478,1.25,1);for(let i=0;i<(n===2?3:1);i++)coin(g,590+i*34+q*28,527,10,t);}
 }else if(n<=8){
  boss(g,660,375,72,0);actor(g,mix(350,280,walk),559,31,t,n===4?'playful_fists':'point');buddy(g,948,551,25,t,n>=7?'shy_fidget':'point');desk(g,410,515,650);
  laptop6(g,mix(540,640,smooth(lt/2)),500,.45,t,true);day3RiceBowl(g,790,494,2,.7,t);day3RiceBowl(g,970,494,1.5,.8,t);
  if(n===4)tag(g,'先停一下！',330,201,180);if(n>=7)tag(g,'吃白饭的',657,185,170);
 }else if(n<=11){
  boss(g,930,410,75,0);const x=mix(310,490,walk);actor(g,x,571,33,t,n===9?'shock':n===10?'point':'playful_fists');buddy(g,740,552,24,t,'eat');desk(g,625,515,230);day3RiceBowl(g,739,490,2,.8,t);
 }else if(n<=15){
  boss(g,mix(680,590,walk),350,65,0);work(g,355,544,30,t,n>=15);work(g,930,540,27,t,true);desk(g,210,557,870);if(n===15)tag(g,'再修修？',610,189,165);
 }else if(n<=18){
  buddy(g,925,548,27,t,'point');laptop6(g,920,522,.58,t,false);desk(g,718,546,360);actor(g,mix(360,638,walk),565,31,t,walk<.95?'walk_stand':'peek_curious');
  day3RiceBowl(g,1090,519,1.8,.65,t);if(n<=17)tag(g,'听见了吗？',656,221,177);else{tag(g,'……',940,189,110);day3RiceBowl(g,550,550,1.5,.15,t);}
 }else if(n<=22){
  const z=n===19?0:smooth((t-cues[19].start)/(cues[21].end-cues[19].start));box(g,985,145,180,390,'#17273A','#657E89',6);box(g,1002,165,146,348,'#344C5A','#526D78',3);oval(g,1122,355,7,7,'#B9A57E');
  boss(g,mix(655,1078,z),460,78,0);steam(g,mix(655,1078,z),285,t);box(g,mix(715,1138,z),451,55,40,'#52636C','#9CABA6',5);line(g,mix(728,1151,z),451,mix(728,1151,z),436,'#9CABA6',3);line(g,mix(753,1176,z),451,mix(753,1176,z),436,'#9CABA6',3);
  actor(g,mix(360,570,walk),568,30,t,walk<.95?'walk_stand':'shock');laptop6(g,365,515,.5,t,true);if(n>=20)tag(g,'上班去了',1007,113,175);
 }else if(n<=26){
  actor(g,300,567,31,t,'point');const z=smooth((t-sh.start)/(sh.end-sh.start));buddy(g,mix(610,907,z),560,25,t,n<=24?'walk_stand':'peek_curious');
  box(g,570,150,380,134,'#E3E9E7','#88ABB7',12);txt(g,'人机校验',760,195,27,'#355269');txt(g,'未通过',760,251,29,'#AD5264');
  laptop6(g,550,530,.5,t,true);if(n===26){box(g,930,330,175,110,'#183C52','#92B6C3',8);txt(g,'看视频',1017,393,26);}
 }else if(n<=29){
  tv(g,t,'meal',0);actor(g,mix(290,382,walk),573,30,t,n===28?'point':'walk_stand');buddy(g,480,574,20,t,'peek_curious');
  keyboard(g,mix(340,180,smooth(lt/2)),580,t,false);document(g,mix(341,476,smooth(lt/3)),422,t,.2);if(n===28)tag(g,'先别碰代码',355,202,196);
 }else if(n<=32){
  tv(g,t,'work',p);const a=smooth(lt/2.4);buddy(g,mix(505,431,a),579,20,t,a<.95?'walk_stand':'point');actor(g,270,576,30,t,n===32?'peek_curious':'point');document(g,mix(448,340,a),433,t,a);
 }else if(n<=35){
  tv(g,t,n===34?'work':'meal',q);actor(g,mix(270,350,walk),577,31,t,n===35?'shock':n===34?'point':'eat');day3RiceBowl(g,450,550,2.2,.45,t);document(g,161,506,t,.15);if(n===35)tag(g,'这段熟悉呀',321,211,184);
 }else if(n<=37){
  tv(g,t,n===36?'dish':'ice',q);actor(g,mix(276,356,walk),575,30,t,n===36?'peek_curious':q>.55?'shock':'point');document(g,184,499,t,.45);if(n===37&&q>.55)tag(g,'别浇呀！',350,212,170);
 }else if(n<=39){
  tv(g,t,'meal',p);actor(g,mix(270,400,walk),577,31,t,walk<.95?'walk_stand':'playful_fists');document(g,234,494,t,.6);day3RiceBowl(g,485,557,1.6,.35,t);
 }else if(n<=41){
  tv(g,t,'spam',p);actor(g,mix(361,299,walk),576,30,t,n===40?'peek_curious':'think');document(g,421,474,t,Math.sin(q*Math.PI));if(n===40)tag(g,'这个得记住',314,211,189);
 }else if(n<=45){
  tv(g,t,'work',p);stool(g,492,578,.9);buddy(g,mix(522,479,walk),572,18,t,'peek_curious');actor(g,mix(230,310,walk),577,29,t,n>=44?'think':'point');document(g,359,471,t,.3);if(n===44)tag(g,'本鲸还得验收',285,212,197);
 }else{
  tv(g,t,n>=48?'meal':'work',p);const z=smooth(lt/3);stool(g,mix(350,390,z),578,1.05);buddy(g,130,569,17,t,'peek_curious');
  const x=n>=48?mix(390,453,smooth((t-cues[47].start)/1.8)):mix(350,390,z);
  actor(g,x,577,30,t,n===49?'confident_hips':n>=48?'peek_curious':z<.95?'walk_stand':'think',{rot:n===48?.07:0});document(g,245,513,t,.7);
  if(n===49)tag(g,'本鲸在监工！',370,211,190);
 }
 // Small persistent disclosure, not an opening or ending card.
 txt(g,'非官方同人 · AI生成 · 剧情演绎',1058,34,15,'#B6CFD2');
 const hit=subs.find(s=>t>=s.start&&t<s.end);
 if(hit)sub.draw(g,{lines:sub.wrap(hit.text),speaker:'本鲸',vis:1,W,H});
}
await loadSpritePoses();
const out=path.resolve(arg('--out')||path.join(ROOT,'Day9/成片',voice?'Day9_笨鱼看同类_配音对齐版.mp4':'Day9_笨鱼看同类_无配音样片.mp4'));
const canvas=createCanvas(W*S,H*S),g=canvas.getContext('2d');
if(argv.includes('--test')){
 const digest=data=>createHash('sha256').update(data).digest('hex');
 if(subs.map(s=>s.text).join('')!==lines.join(''))throw Error('字幕与原文不一致');
 for(let i=0;i<subs.length-1;i++)if(subs[i].end>subs[i+1].start+1e-5)throw Error('字幕重叠');
 let animated=0,border=null,tvChecks=0;
 for(const shot of spans){let hashes=[];for(const p of [.15,.5,.85]){
  frame(g,mix(shot.start,shot.end,p));hashes.push(digest(canvas.data()));
  if(shot.from>=27){const h=digest(g.getImageData(Math.round(1222*S),Math.round(125*S),2,Math.round(325*S)).data);if(border&&border!==h)throw Error('电视右边框发生抖动');border=h;tvChecks++;}
 }if(new Set(hashes).size!==3)throw Error('镜头无变化 '+shot.id);animated++;}
 const report={measured:!!measured,lines:lines.length,subtitle_screens:subs.length,subtitle_exact:true,no_overlap:true,animated_shots: animated,tv_border_samples:tvChecks,tv_border_fixed:true,duration,frame_count:Math.round(duration*FPS)};
 fs.writeFileSync(path.join(HERE,measured?'有声回归检查.json':'样片回归检查.json'),JSON.stringify(report,null,2));console.log(report);
}else if(argv.includes('--stills')){
 const dir=path.join(HERE,measured?'有声抽帧':'抽帧');fs.mkdirSync(dir,{recursive:true});
 const marks=argv.includes('--all-lines')?cues.map(c=>({...c,id:`L${String(c.line).padStart(2,'0')}`})):spans;
 for(const sh of marks){const time=(sh.start+sh.end)/2;frame(g,time);fs.writeFileSync(path.join(dir,`${sh.id}.jpg`),canvas.toBuffer('image/jpeg'));}console.log('stills',marks.length);
}else{
 fs.mkdirSync(path.dirname(out),{recursive:true});
 const ff=spawn(resolveFfmpeg(),['-y','-f','rawvideo','-pix_fmt','rgba','-s',`${W*S}x${H*S}`,'-r',String(FPS),'-i','-',...(voice?['-i',path.resolve(voice),'-map','0:v:0','-map','1:a:0','-c:a','aac','-b:a','192k','-af','apad','-t',String(duration)]:['-an']),'-c:v','libx264','-preset','veryfast','-tune','animation','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',out],{stdio:['pipe','ignore','pipe']});
 let err='';ff.stderr.on('data',d=>err+=d);ff.on('error',e=>{throw e;});const done=new Promise((resolve,reject)=>ff.on('close',c=>c===0?resolve():reject(Error(err.slice(-2000)))));
 const total=Math.round(duration*FPS);console.log(`Day9 ${voice?'voiced':'silent'}, measured=${!!measured}, ${total} frames, ${duration}s`);
 for(let f=0;f<total;f++){frame(g,f/FPS);const raw=canvas.data();if(!ff.stdin.write(Buffer.from(raw.buffer,raw.byteOffset,raw.byteLength)))await new Promise(r=>ff.stdin.once('drain',r));if(f%180===0)console.log(`${f}/${total}`);}
 ff.stdin.end();await done;console.log('DONE',out,fs.statSync(out).size);
}
