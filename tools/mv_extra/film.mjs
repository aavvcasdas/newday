// Independent 56s lyric MV. Rebuilt from the pinned reference's structure, NOT from its image frames.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const HERE=path.join(ROOT,'tools/mv_extra');
const {createCanvas,loadImage,GlobalFonts}=require('../engine/node_modules/@napi-rs/canvas');
if(!GlobalFonts.registerFromPath(path.join(HERE,'cache/font.ttf'),'MvCJK'))throw Error('先执行 setup.py 恢复固定字体');
globalThis.window=globalThis;
const CORE=require('../../video-fx/src/core.js');
require('../../video-fx/src/whale_girl_rig_data.js');
const WHALE=require('../../video-fx/src/whale_girl.js');
const imgs={};
for(const name of ['gemini','kimi','gpt','qwen','claude'])imgs[name]=await loadImage(path.join(ROOT,`assets/ai-girls/extra-guests/${name}.png`));
imgs.doubao=await loadImage(path.join(ROOT,'assets/ai-girls/doubao/doubao-cutout.png'));
export const FPS=30,FRAMES=1681,DURATION=FRAMES/FPS;
export const OUT=path.join(ROOT,'番外MV/把回忆拼好给你');
export const STARTS=[1.133333,4.6,8.366667,11.7,15.4,19.033333,22.433333,25.2,28.833333,31.4,35.866667,38.833333,42.7,44.6,48.666667,51];
const texts=fs.readFileSync(path.join(HERE,'lyrics.txt'),'utf8').trim().split('\n');
export const CUES=texts.map((text,i)=>({line:i+1,text,start:Math.round(STARTS[i]*FPS)/FPS,end:i===15?54.1666666667:Math.round(STARTS[i+1]*FPS)/FPS}));
const cuts=[
 [0,'intro','拼片接近'],[1.133333,'small','拼图世界'],[3.3,'exist','真实存在'],[4.6,'planet','小小星球'],[6.8,'hope','望向另一端'],
 [8.366667,'meet','与你相遇'],[10.933333,'light','光明打开'],[11.7,'eyes','眼里的海'],[13.7,'sea','视线延伸'],[14.966667,'sea_wide','广袤大海'],
 [15.4,'memories','四个共同日子'],[17.25,'memory_night','夜里的陪伴'],[19.033333,'rain','雨棚长椅'],[20.6,'rain_close','等待雨停'],
 [22.433333,'cloud','阴霾之下'],[24.166667,'clear','拨云见海'],[25.2,'joy','留下快乐'],[26.5,'collect','快乐落入拼图'],[27.6,'discard','淘汰灰色碎片'],
 [28.833333,'night','夜城情话'],[30.4,'words','写下的情话'],[31.4,'rocket','烟花升空'],[33.966667,'firework','烟花展开'],[35.866667,'bloom','绽放的一刻'],[38.2,'ember','余烬熄灭'],
 [38.833333,'deep','坠入回忆'],[40.5,'adrift','漂流的拼片'],[42.7,'clocks','同一画面的日夜'],[44.166667,'gap','错开的钟'],
 [44.6,'ribbon','尚未放下'],[47.366667,'release','纸带离开'],[48.666667,'heat','炙热的你'],[51,'self','回到自己'],[53.133333,'self_close','把自己拼回来'],[54.166667,'quiet','余音中的完整拼图']
];
export const SHOTS=cuts.map(([t,kind,title],i)=>({id:i+1,kind,title,start:Math.round(t*FPS)/FPS,end:i+1<cuts.length?Math.round(cuts[i+1][0]*FPS)/FPS:DURATION}));
const P={cream:'#e7e1c9',ink:'#384b50',sky:'#b4d2cf',sea:'#609b9d',night:'#29344e',gold:'#d8bc75',pink:'#d59387',grey:'#8d999e'};
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);},lerp=(a,b,t)=>a+(b-a)*t;
function rect(c,x,y,w,h,col,r=0){c.fillStyle=col;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function line(c,x,y,x2,y2,col=P.cream,w=2){c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();}
function circle(c,x,y,r,col){c.fillStyle=col;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
function text(c,s,x,y,n=28,col=P.ink){c.font=`600 ${n}px MvCJK`;c.fillStyle=col;c.textAlign='center';c.textBaseline='middle';c.fillText(s,x,y);}
function cloud(c,x,y,w,col=P.cream){c.fillStyle=col;c.beginPath();c.moveTo(x-w/2,y+14);c.bezierCurveTo(x-w*.64,y-5,x-w*.35,y-25,x-w*.16,y-12);c.bezierCurveTo(x-w*.08,y-46,x+w*.15,y-45,x+w*.25,y-17);c.bezierCurveTo(x+w*.55,y-30,x+w*.59,y+4,x+w/2,y+14);c.closePath();c.fill();}
function puzzle(c,x,y,w,h,col,angle=0){c.save();c.translate(x,y);c.rotate(angle);c.fillStyle=col;c.strokeStyle=P.cream;c.lineWidth=1.7;c.beginPath();c.moveTo(-w/2,-h/2);c.lineTo(-w*.12,-h/2);c.bezierCurveTo(-w*.25,-h*.82,w*.25,-h*.82,w*.12,-h/2);c.lineTo(w/2,-h/2);c.lineTo(w/2,-h*.12);c.bezierCurveTo(w*.82,-h*.25,w*.82,h*.25,w/2,h*.12);c.lineTo(w/2,h/2);c.lineTo(w*.12,h/2);c.bezierCurveTo(w*.25,h*.18,-w*.25,h*.18,-w*.12,h/2);c.lineTo(-w/2,h/2);c.closePath();c.fill();c.stroke();c.restore();}
function sky(c,t,{night=false,warm=false}={}){let g=c.createLinearGradient(0,0,0,680);g.addColorStop(0,night?P.night:warm?P.pink:P.sky);g.addColorStop(1,night?'#3f5a70':warm?'#f2d2aa':'#e1e6d3');rect(c,0,0,1280,720,g);if(night){for(let i=0;i<28;i++)circle(c,30+(i*191)%1200,35+(i*113)%400,1+(i%2)*.5,P.cream);circle(c,1090,104,39,P.cream);circle(c,1107,88,39,P.night);}else{circle(c,1015,132,warm?88:49,P.gold);cloud(c,210,125,255);cloud(c,794,225,160);} }
function sea(c,t,night=false,horizon=446){sky(c,t,{night});rect(c,0,horizon,1280,274,night?'#3a566b':P.sea);for(let i=0;i<4;i++){c.beginPath();for(let x=0;x<=1280;x+=20){let y=horizon+20+i*54+Math.sin(x/110+t*.42+i)*6;x?c.lineTo(x,y):c.moveTo(x,y);}c.strokeStyle='#e4e0cb80';c.lineWidth=2;c.stroke();}}
function whale(c,x,foot,u=32,view='front',tilt=0){c.save();c.fillStyle='#2d56684d';c.beginPath();c.ellipse(x,foot+7,u*2.6,u*.39,0,0,Math.PI*2);c.fill();WHALE.whaleGirl(c,x,foot,u,{t:.7,style:'pixel',view,poseMode:'wave',eyes:'open',mouth:'smile',squint:.01,tailScale:1,transitionBlend:1,walk:0,dy:0,headTilt:tilt,emotion:'idle',aL:0,aR:0});c.restore();}
function guest(c,name,x,foot,h){const im=imgs[name];c.save();c.imageSmoothingEnabled=true;c.drawImage(im,x-h*im.width/im.height/2,foot-h,h*im.width/im.height,h);c.restore();}
function portrait(c,name,x,y,h){const im=imgs[name],w=h*im.width/im.height;rect(c,x-9,y-9,w+18,h+18,P.cream,4);c.drawImage(im,x,y,w,h);}
function duo(c,t,p=1,{night=false,foot=596}={}){sea(c,t,night);whale(c,lerp(220,442,ease(p)),foot,32,'q');guest(c,'doubao',830,foot,333);}
function puzzleWall(c,t,warm=false){sky(c,t,{warm});for(let j=0;j<3;j++)for(let i=0;i<6;i++)puzzle(c,80+i*235,100+j*213,210,175,['#d4d2bb70','#a4bbb580','#ddbf8e55'][(i+j)%3]);rect(c,0,609,1280,111,'#849c97');}
function bench(c,x=375,y=487,w=530){for(let k=0;k<3;k++)rect(c,x,y+k*28,w,19,'#c0a178',4);rect(c,x-12,y+112,w+24,20,'#c0a178',4);rect(c,x+34,y+128,16,66,P.ink);rect(c,x+w-50,y+128,16,66,P.ink);}
function rain(c,t,close=false){sky(c,t,{night:true});rect(c,0,458,1280,262,'#647e89');for(let i=0;i<12;i++)rect(c,i*117,260+(i%3)*35,85,237,'#9eafb760');for(let i=0;i<65;i++){const x=(i*191)%1280,y=(i*83+t*205)%620;line(c,x,y,x-6,y+18,'#e5e4d38a',1);}
 const x=close?210:135,y=close?447:457,w=close?860:905;bench(c,x,y,w);if(!close)guest(c,'claude',257,601,232);whale(c,close?470:508,close?616:601,close?38:29,'q');guest(c,'doubao',close?811:762,close?617:602,close?355:293);
 line(c,640,229,640,529,P.ink,5);c.fillStyle='#72a4a3';c.beginPath();c.ellipse(640,245,close?415:500,155,0,Math.PI,Math.PI*2);c.closePath();c.fill();line(c,close?225:140,245,close?1055:1140,245,P.cream,2);
}
function city(c,t){sky(c,t,{night:true});for(let i=0;i<13;i++){const h=140+(i*53)%128;rect(c,i*110-26,585-h,105,h+80,'#4c5b7188');line(c,i*110-26,585-h,i*110+79,585-h,P.cream,1);for(let j=0;j<2;j++)for(let k=0;k<4;k++)rect(c,i*110+j*36+4,604-h+k*39,10,15,k===3&&i%2?'#667588':P.gold);}rect(c,0,625,1280,95,'#334758');}
function fireworks(c,t,boost=1){for(const [x,y,start,n]of [[640,195,33.966667,0],[345,251,35.45,1],[918,226,36.2,2],[688,190,37.133333,3]]){const age=t-start;if(age<0||age>3.3)continue;const e=ease(age/.65),r=(115+n*12)*e;const a=Math.min(1,age*5)*clamp((3.3-age)/1.8)*boost;c.save();c.globalAlpha=a;for(let i=0;i<44;i++){const th=i*Math.PI*2/44;for(let j=0;j<3;j++){const r0=r*(.3+j*.24),r1=r0+16;line(c,x+Math.cos(th)*r0,y+Math.sin(th)*r0+age*9,x+Math.cos(th)*r1,y+Math.sin(th)*r1+age*9,n%2?P.pink:P.gold,1.6);circle(c,x+Math.cos(th)*r1,y+Math.sin(th)*r1+age*9,1.5,P.cream);}}c.restore();}}
function clock(c,x,y,t,offset=0){circle(c,x,y,83,P.cream);for(let i=0;i<12;i++){const a=i*Math.PI/6;line(c,x+Math.sin(a)*70,y-Math.cos(a)*70,x+Math.sin(a)*76,y-Math.cos(a)*76,P.ink,2);}let a=t*.08+offset;line(c,x,y,x+Math.sin(a)*57,y-Math.cos(a)*57,P.ink,4);line(c,x,y,x+Math.sin(a*.4+.2)*39,y-Math.cos(a*.4+.2)*39,P.ink,5);circle(c,x,y,4,P.ink);}
function finalWorld(c,t,self=true,close=false){sky(c,t,{warm:true});rect(c,0,456,1280,264,'#8baba1');for(let i=0;i<3;i++)line(c,0,515+i*56,1280,485+i*56,'#e9dfc1aa',2);const p=ease((t-51)/2.1);for(let i=0;i<3;i++)puzzle(c,lerp(240+i*400,400+i*240,p),420,216,238,['#aebba2','#7da8a3','#d7ba7c'][i]);if(self)whale(c,640,close?602:611,close?42:35);else guest(c,'doubao',640,612,377);}
function paint(c,t,s){const p=clamp((t-s.start)/(s.end-s.start));switch(s.kind){
case'intro':case'small':case'exist':{puzzleWall(c,t);const z=s.kind==='exist'?1.55:1; c.save();c.translate(640,s.kind==='exist'?700:628);c.scale(z,z);const join=s.kind==='intro'?ease(t/1):1;puzzle(c,lerp(-880,-280,join),-106,226,217,'#a7b8ab');puzzle(c,lerp(880,280,join),-106,226,217,'#ccbe97');puzzle(c,0,-106,333,217,P.gold);whale(c,0,-216,21,'q');c.restore();break;}
case'planet':case'hope':{sky(c,t,{night:true});circle(c,640,413,177,'#c6c8b6');for(let i=0;i<7;i++){c.save();c.beginPath();c.arc(640,413,175,0,Math.PI*2);c.clip();puzzle(c,495+(i%3)*143,327+Math.floor(i/3)*119,143,119,i%2?'#b1b9ac':'#d5d3bc');c.restore();}whale(c,640,239,s.kind==='hope'?24:19,'q');cloud(c,390,95,270,'#8a9da9');for(let i=0;i<15;i++){let y=125+(i*29+t*65)%95;line(c,320+i*11,y,317+i*11,y+11,'#c6d5d0',1);}circle(c,900,210,12,P.gold);break;}
case'meet':case'light':{puzzleWall(c,t,s.kind==='light');whale(c,lerp(178,449,ease((t-8.366667)/1.5)),609,32,'q');guest(c,'doubao',827,609,343);if(s.kind==='light')rect(c,570,200,140,10,'#fff1be',4);break;}
case'eyes':{sea(c,t);whale(c,640,878,75,'q');break;}
case'sea':case'sea_wide':{sea(c,t,false,s.kind==='sea_wide'?338:408);if(s.kind==='sea'){whale(c,259,621,26,'back');guest(c,'doubao',395,621,260);}break;}
case'memories':{sky(c,t);for(let i=0;i<4;i++){c.save();c.beginPath();c.rect((i%2)*640,Math.floor(i/2)*320,640,320);c.clip();c.translate((i%2)*640,Math.floor(i/2)*320);c.scale(.5,.5);sea(c,t,i===2);whale(c,350,592,28,'q');if(i===0)guest(c,'doubao',835,592,310);else if(i===1)portrait(c,'gemini',780,135,440);else if(i===2)portrait(c,'kimi',780,135,440);else guest(c,'doubao',835,592,310);c.restore();}line(c,640,0,640,640,P.cream,4);line(c,0,320,1280,320,P.cream,4);break;}
case'memory_night':{sea(c,t,true);whale(c,385,607,34,'q');portrait(c,'kimi',801,153,428);break;}
case'rain':case'rain_close':rain(c,t,s.kind==='rain_close');break;
case'cloud':case'clear':{sea(c,t);const open=s.kind==='clear'?ease((t-24.166667)/.48):0;cloud(c,330-open*550,236,810,'#87979d');cloud(c,950+open*550,294,860,'#7f9297');whale(c,410,610,31,'q');portrait(c,'qwen',840,248,337);if(s.kind==='clear')circle(c,640,146,45,P.gold);break;}
case'joy':case'collect':case'discard':{sea(c,t);whale(c,400,610,33,'q');guest(c,'doubao',850,610,332);rect(c,530,475,220,103,'#c5aa7b',9);rect(c,516,456,248,24,P.cream,5);const collected=clamp((t-26.5)/.55);puzzle(c,lerp(640,640,collected),lerp(215,430,ease(collected)),59,61,P.gold);if(s.kind==='joy'){portrait(c,'gpt',1010,256,266);}if(s.kind==='discard'){let q=ease((t-28.15)/.3);puzzle(c,lerp(690,1200,q),lerp(415,716,q),57,61,P.grey,q*2);}break;}
case'night':case'words':case'rocket':case'firework':case'bloom':case'ember':{city(c,t);if(s.kind!=='bloom'&&s.kind!=='ember'){whale(c,486,625,29,s.kind==='night'?'q':'back');guest(c,'doubao',779,625,309);}if(s.kind==='night'||s.kind==='words'){for(let i=0;i<3;i++){const q=ease((t-28.9-i*.35)/.45);c.save();c.globalAlpha=q;puzzle(c,519+i*107,220,73,78,P.cream);text(c,['情','与','话'][i],519+i*107,223,27);c.restore();}}if(s.kind==='rocket'){const q=ease((t-31.4)/2.5);line(c,640,530,640,lerp(530,190,q),P.gold,2);circle(c,640,lerp(530,190,q),5,P.cream);}fireworks(c,t);break;}
case'deep':case'adrift':{sea(c,t,true,30);rect(c,0,0,1280,720,'#173a5344');for(let i=0;i<9;i++){const x=90+(i*179)%1120,y=100+(i*127+t*7)%490;puzzle(c,x,y,57,62,['#8ba4a3','#b4bca0','#c9b07c'][i%3],i*.61);}whale(c,s.kind==='deep'?805:640,610,32,'q',-.1);rect(c,210,270,265,160,P.cream,3);rect(c,221,281,243,138,P.night);c.save();c.beginPath();c.rect(221,281,243,138);c.clip();c.translate(221,281);c.scale(243/1280,138/720);city(c,36.6);fireworks(c,36.6);c.restore();break;}
case'clocks':case'gap':{sky(c,t);rect(c,640,0,640,720,P.night);rect(c,0,541,640,179,'#91b0a6');rect(c,640,541,640,179,'#3a566b');clock(c,329,290,t,0);clock(c,945,290,t,2.6);whale(c,329,618,31,'q');guest(c,'doubao',945,618,310);puzzle(c,640,354,35,68,P.cream);break;}
case'ribbon':case'release':{sky(c,t,{warm:true});rect(c,0,537,1280,183,'#8faaa2');whale(c,640,614,37,'q');const q=ease((t-47.366667)/.7),x=640+q*490,y=489+q*105; c.strokeStyle=P.pink;c.lineWidth=18;c.beginPath();c.moveTo(x-124,y);c.bezierCurveTo(x-20,y-90,x+70,y+56,x+160,y-36);c.stroke();break;}
case'heat':finalWorld(c,t,false);break;case'self':finalWorld(c,t,true);break;case'self_close':case'quiet':finalWorld(c,t,true,true);break;
default:throw Error(s.kind);
}}
export function render(c,t){const s=SHOTS.find(x=>t>=x.start&&t<x.end)||SHOTS.at(-1);c.save();c.setTransform(1.5,0,0,1.5,0,0);rect(c,0,0,1280,720,P.cream);CORE.setBoil?.(0);paint(c,t,s);const cue=CUES.find(x=>t>=x.start&&t<x.end);if(cue){c.font='600 31px MvCJK';const w=c.measureText(cue.text).width+42;rect(c,640-w/2,651,w,52,'#eee8d6f0',4);text(c,cue.text,640,678,31);}rect(c,1061,10,207,30,'#e9e4d4eb',3);text(c,'非官方同人 / AI 生成',1164,25,14,'#53666a');c.restore();return s;}
export function frame(t){const c=createCanvas(1920,1080);render(c.getContext('2d'),t);return c;}
function sha(p){return createHash('sha256').update(fs.readFileSync(p)).digest('hex');}
export function inputHashes(){const ps=['tools/mv_extra/film.mjs','tools/mv_extra/lyrics.txt','tools/mv_extra/timing.json','tools/mv_extra/cache/font.ttf','tools/mv_extra/cache/source48.wav','assets/mv-extra/user_reference_audio.m4a','assets/ai-girls/doubao/doubao-cutout.png',...['core.js','whale_girl.js','whale_girl_actions.js','whale_girl_rig_data.js'].map(n=>'video-fx/src/'+n),...Object.keys(imgs).filter(x=>x!=='doubao').map(n=>`assets/ai-girls/extra-guests/${n}.png`)];return Object.fromEntries(ps.map(p=>[p,sha(path.join(ROOT,p))]));}
async function encode(mode){const ff=process.env.FFMPEG;if(!ff)throw Error('设置 FFMPEG 为现代FFmpeg路径（imageio-ffmpeg 0.8.1）');const sample=mode==='sample',start=sample?31.4:0,frames=sample?396:FRAMES;const out=path.join(OUT,sample?'样片/烟花与时差_有声试剪.mp4':'成片/把回忆拼好给你_歌词卡点版.mp4');fs.mkdirSync(path.dirname(out),{recursive:true});const silent=path.join(HERE,`cache/${mode}_silent.mp4`);const canvas=createCanvas(1920,1080),c=canvas.getContext('2d');const child=spawn(ff,['-v','error','-f','rawvideo','-pixel_format','rgba','-video_size','1920x1080','-framerate','30','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-threads','2','-y',silent],{stdio:['pipe','inherit','inherit']});const done=once(child,'exit');const frozen=inputHashes();for(let f=0;f<frames;f++){render(c,start+f/FPS);if(!child.stdin.write(canvas.data()))await once(child.stdin,'drain');if(f%300===0)console.log(`${mode}: ${f}/${frames}`);}child.stdin.end();const [code]=await done;if(code!==0)throw Error('encode exit '+code);const args=['-v','error','-i',silent,...(sample?['-ss',String(start)]:[]),'-i',path.join(ROOT,sample?'tools/mv_extra/cache/source48.wav':'assets/mv-extra/user_reference_audio.m4a'),'-map','0:v:0','-map','1:a:0','-c:v','copy',...(sample?['-t','13.2','-c:a','aac','-b:a','192k']:['-c:a','copy']),'-movflags','+faststart','-y',out];execFileSync(ff,args,{stdio:'inherit'});if(JSON.stringify(frozen)!==JSON.stringify(inputHashes()))throw Error('Inputs changed during encoding');fs.writeFileSync(path.join(HERE,`${mode}_inputs.json`),JSON.stringify({inputHashes:frozen,outputSha256:sha(out),outputPath:path.relative(ROOT,out),frames,start,fps:FPS},null,2)+'\n');console.log(out);}
function stills(){fs.mkdirSync(path.join(OUT,'分镜'),{recursive:true});const sheet=createCanvas(1600,7*200);const g=sheet.getContext('2d');for(const [i,s]of SHOTS.entries()){const t=(s.start+s.end)/2;const im=frame(t);fs.writeFileSync(path.join(HERE,`cache/${s.kind}.jpg`),im.toBuffer('image/jpeg'));const x=(i%5)*320,y=Math.floor(i/5)*200;g.drawImage(im,0,0,1920,1080,x,y,320,180);rect(g,x,y+180,320,20,'#eee8d6');text(g,`${s.id} · ${s.start.toFixed(2)}s · ${s.title}`,x+160,y+190,12);}fs.writeFileSync(path.join(OUT,'分镜/35段分镜总览.jpg'),sheet.toBuffer('image/jpeg'));}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const mode=process.argv[2]||'stills';if(mode==='stills')stills();else if(['render','sample'].includes(mode))await encode(mode);else throw Error('stills | sample | render');}
