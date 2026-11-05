// Day10 production renderer: supplied WAV only, measured alignment only, original-speed audio.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';import {spawn} from 'node:child_process';import {createRequire} from 'node:module';
import {createCanvas,loadImage,bg,text6} from '../day8制作/render_day8.mjs';
import {renderUnderwaterStage} from '../场景/sea_stage.mjs';import {createDay2Subtitle} from '../字幕/day2_style_sub.mjs';
import {loadContactActors,actorAnchors,drawContactActor} from '../互动元素/actor_contacts.mjs';
import {CORE,PROP_LIBRARY,renderCueInteraction,presentationFrame,burst} from '../互动元素/cue_props_engine.mjs';
import {DAY10_PROPS} from '../互动元素/day10_cue_props.mjs';import {SHOT_RANGES} from './day10_shot_plan.mjs';import sign from './generated_props/seat_sign.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),HERE=path.dirname(fileURLToPath(import.meta.url)),argv=process.argv.slice(2),arg=k=>argv.includes(k)?argv[argv.indexOf(k)+1]:null,require=createRequire(import.meta.url);
const voice=arg('--voice')||path.join(ROOT,'鲸鱼架空_克隆配音_最终版.wav'),alignment=JSON.parse(fs.readFileSync(arg('--alignment')||path.join(HERE,'voice_alignment.json'))),subdata=JSON.parse(fs.readFileSync(arg('--subtitle-file')||path.join(HERE,'subtitle_timing.json')));
const script=fs.readFileSync(path.join(ROOT,'Day10/Day10配音台词.txt'),'utf8').trim().split('\n');
if(alignment.measured!==true||subdata.measured!==true||createHash('sha256').update(fs.readFileSync(voice)).digest('hex')!==alignment.source_sha256)throw Error('Measured supplied voice and matching hash required');
if(JSON.stringify(alignment.cues.map(c=>c.text))!==JSON.stringify(script))throw Error('Voice alignment text mismatch');
const cues=alignment.cues,FPS=30,W=1280,H=720,S=1.5,duration=cues.at(-1).end+.24,frames=Math.ceil(duration*FPS);
export const SHOTS=SHOT_RANGES.map(([from,to,id,mood,title])=>({id,from,to,mood,title,start:cues[from-1].start,end:cues[to-1].end}));
const {paint,rrPts,ellPts,inkLine,reseedBoil,ring}=CORE,q=(x,a,b)=>Math.min(1,Math.max(0,(x-a)/(b-a))),mix=(a,b,p)=>a+(b-a)*p,smooth=p=>p*p*(3-2*p);
await loadContactActors({createCanvas,loadImage});const {Resvg}=require('/tmp/node_render/node_modules/@resvg/resvg-js');
const leg=await loadImage(new Resvg(fs.readFileSync(path.join(ROOT,'tools/互动元素/assets/fluent/poultry-leg.svg'),'utf8'),{fitTo:{mode:'width',value:180}}).render().asPng());
const sub=createDay2Subtitle({fontOf:(n,w)=>`${w} ${n}px NotoSansSC`,measureCtx:createCanvas(1,1).getContext('2d')});
const word=(line,ch)=>cues[line-1].chars_timed.find(c=>c.ch===ch)?.start??cues[line-1].start;
const bonkFrame=Math.round(word(4,'饼')*FPS),knockFrame=Math.round(word(6,'敲')*FPS),slapFrame=Math.round(word(11,'抬')*FPS),takeFrame=Math.round(word(1,'架')*FPS);
const common={measured:true,audio_sha256:alignment.source_sha256};
const bonk={...common,id:'bonk',verb:'drop_bonk',word_id:'L04:饼',propId:'sesame_flatbread',startFrame:Math.round(cues[3].start*FPS),contactFrame:bonkFrame,endFrame:Math.round(cues[5].start*FPS)-1,params:{scale:.7,land:[565,550]}};
const slap={...common,id:'slap',verb:'slap_deflect',word_id:'L11:抬',propId:'speech_missile',startFrame:Math.round(word(9,'你')*FPS),contactFrame:slapFrame,endFrame:Math.round(cues[11].start*FPS)-1,params:{scale:.8,text:'你真确定吗？'}};
const contacts=[];
function whichShot(t){return SHOTS.find((s,i)=>t>=s.start&&t<(SHOTS[i+1]?.start??duration+.01))||SHOTS[0];}
function whichLine(t){return [...cues].reverse().find(c=>t>=c.start)?.index??1;}
function gait(t,start,end){if(t<start||t>end)return {};const phase=Math.floor((t-start)*10)%8,a=Math.sin(phase*Math.PI/4);return {bones:{legL:{rot:a*.055,dy:-Math.max(0,a)*10},legR:{rot:-a*.055,dy:-Math.max(0,-a)*10}}};}
function actorState(t,shot){const n=whichLine(t);let a={pose:'idle',x:355,y:600,u:40},b={pose:'point',x:850,y:600,u:38};
 if(shot.id==='C01'){const pull=18*smooth(q(t,0,takeFrame/FPS));a={...a,pose:t>2.1?'shock':'idle',x:420+pull-(t>2.1?40*smooth(q(t,2.1,3)):0),u:36,lean:t>2.1?-.04:0};b={...b,pose:t<3.3?'idle':t<cues[2].start?'think':'confident_hips',x:820+pull,u:36,flip:t<3.3};}
 if(shot.id==='C02'){b={...b,pose:n<6?'fatfish_working':'idle',x:n<6?930:780,u:n<6?34:40};const age=t-bonkFrame/FPS;a.pose=n===5?'shock':n>=6?'point':'idle';if(n===5)a.anim={bones:{tail:{rot:Math.round(Math.sin((Math.floor(t*12)%12)*Math.PI/6)*.1*1000)/1000}}};a.squash=age>=0&&age<.5?Math.abs(ring(age,.35,2,5)):0;if(n>=6)b.anim={bones:{armR:{dy:-7*(1-smooth(q(t,cues[5].start,knockFrame/FPS)))}}};}
 if(shot.id==='C03'){a.pose=n>=8?'confident_hips':'idle';b.pose='point';}
 if(shot.id==='C04'){a.pose=n>=11?'shock':'idle';b.pose=n>=12?'think':'point';if(n===11)b.anim={bones:{armR:{rot:Math.round(mix(-.16,.08,smooth(q(t,cues[10].start,slapFrame/FPS)))*1000)/1000}}};}
 if(shot.id==='C05'){a.pose=n>=15?'shock':'point';b={...b,pose:'point',x:mix(875,750,smooth(q(t,cues[13].start,cues[13].start+.95))),anim:gait(t,cues[13].start,cues[13].start+.95)};}
 if(shot.id==='C06'){a={...a,pose:n===19?'playful_fists':'think',x:430,lean:n===18?.025:0};if(n===19){const v=Math.sin(Math.floor((t-cues[18].start)*12)%8*Math.PI/4);a.anim={bones:{armR:{dy:v*10},legR:{dy:-Math.max(0,v)*9}}};}b={...b,pose:'eat',x:900,u:38};}
 if(shot.id==='C07'){a={...a,pose:'point',x:mix(355,485,smooth(q(t,shot.start,shot.start+1.1))),anim:gait(t,shot.start,shot.start+1.1)};b={...b,pose:'think',x:930,u:34};}
 if(shot.id==='C08'){a={...a,pose:'confident_hips',x:470};b={...b,pose:'point',x:mix(850,795,smooth(q(t,shot.start,shot.start+.8))),flip:true,anim:gait(t,shot.start,shot.start+.8)};}
 return [a,b];
}
function table(g,x,y,w){paint(g,rrPts(x,y,w,15,6,0),{wash:'#785C49',fill:'#AF956D',fillOp:230,ink:'#383C4A',sw:2});for(const xx of [x+14,x+w-14])inkLine(g,[[xx,y+15],[xx-4,y+58]],7,'#6D5B4B','table'+xx,0);}
function prop(g,id,x,y,scale=1,st={}){g.save();g.translate(x,y);g.scale(scale,scale);DAY10_PROPS[id].draw(g,0,st);g.restore();}
function label(g,text,x,y,w=155){paint(g,rrPts(x-w/2,y-18,w,36,8,0),{wash:'#C6D5CC',fill:'#F2EAD5',fillOp:220,ink:'#52748A',sw:1.7});text6(g,text,x,y+6,18,'#344557');}
function floorPlaque(g,text,x){label(g,text,x,576,160);for(const xx of [x-60,x+60])inkLine(g,[[xx,594],[xx,600]],3,'#7A674B','plaque-foot'+xx,0);}
function chicken(g,x,y,rot=0){g.save();g.translate(x,y);g.rotate(rot);g.drawImage(leg,-38,-38,76,76);g.restore();}
function notebook(g,x,y,open=1,title='旧事提醒'){g.save();g.translate(x,y);const w=58+110*open;paint(g,rrPts(-w/2,-42,w,84,5,0),{wash:'#B99E74',fill:'#EFE2C0',fillOp:240,ink:'#424653',sw:2});for(let i=1;i<4;i++)inkLine(g,[[-w/2+i*w/4,-32],[-w/2+i*w/4,32]],1,'#B5A580','fold'+i,0);text6(g,title,0,-13,30,'#47546A');text6(g,'先看碗里',0,19,27,'#805F51');g.restore();}
function standee(g,x,y){paint(g,rrPts(x-136,y-50,272,100,8,0),{wash:'#8C674B',fill:'#B58D62',fillOp:220,ink:'#343E4F',sw:2.5});paint(g,rrPts(x-124,y-40,248,80,5,0),{wash:'#1D3C4D',fill:'#2F5362',fillOp:240,ink:'#C8C1A0',sw:1});text6(g,'防忽悠账本',x,y-6,24,'#F2E9C9');text6(g,'评论区快招供',x,y+25,20,'#C9DCD5');for(const xx of [x-100,x+100])inkLine(g,[[xx,y+49],[xx-4,y+78]],7,'#8A6D50','stand'+xx,0);}
function penAndNotes(g,a,t){const A=actorAnchors(a),p=A.pageCenter,h=A.handR;const writing=t>=cues[17].start,ph=Math.floor(t*10)%8,tip=[p[0]+(writing?Math.sin(ph*Math.PI/4)*6:0),p[1]+(writing?Math.floor(q(t,cues[17].start,cues[17].end)*3)*4:0)];
 const inkCount=writing?Math.ceil(q(t,cues[17].start,cues[17].end)*3):0;for(let i=0;i<inkCount;i++)inkLine(g,[[p[0]-8,p[1]+i*4],[p[0]+6,p[1]+i*4]],1.2,'#4C5C70','note'+i,0);
 if(writing){inkLine(g,[h,tip],2.2,'#5B5961','pen',0);paint(g,ellPts(tip[0],tip[1],1.5,1.2,8,0),{wash:'#334C63',ink:null});g.save();g.beginPath();g.arc(...h,4,0,Math.PI*2);g.clip();drawContactActor(g,a);g.restore();}
}
function camera(shot,t){if(shot.id==='C05')return {z:1.01,cx:640,cy:362};if(shot.id==='C06'&&whichLine(t)===18)return {z:1.5,cx:540,cy:455};if(shot.id==='C02'&&whichLine(t)>=6)return {z:1.13,cx:685,cy:400};return {z:shot.id==='C08'?1.08:1.06,cx:640,cy:375};}
function render(g,rawTime,{noSub=false}={}){const shot=whichShot(rawTime),rawFrame=Math.round(rawTime*FPS);let hold=shot.id==='C01'?takeFrame:shot.id==='C02'?(rawTime<cues[5].start?bonkFrame:knockFrame):shot.id==='C04'&&rawTime<cues[11].start?slapFrame:null;
 const f=hold===null?rawFrame:presentationFrame(rawFrame,hold),t=f/FPS,n=whichLine(t),[a,b]=actorState(t,shot),A=actorAnchors(a),B=actorAnchors(b),cam=camera(shot,t);
 g.setTransform(S,0,0,S,0,0);g.clearRect(0,0,W,H);reseedBoil(0);
 // Full stage and actor share the camera. Subtitles/AI corner are screen-space, never cropped.
 const shake=rawFrame>=slapFrame&&rawFrame<slapFrame+6?Math.sin((rawFrame-slapFrame)*2.4)*2:0;
 g.save();g.translate(shake,0);g.translate(W/2,H/2);g.scale(cam.z,cam.z);g.translate(-cam.cx,-cam.cy);
 renderUnderwaterStage(g,t,{z:1,cx:640,cy:360},{mood:shot.mood,drawRoom:()=>bg(g,t,{animatePlants:true})},()=>{
  let bowl=null,spoon=null,jar=null;
  if(shot.id==='C01'&&t<3.3){const held=actorState(takeFrame/FPS,shot),L=actorAnchors(held[0]).handR,R=actorAnchors(held[1]).handR,w=R[0]-L[0]-12,cx=t<2.1?(A.handR[0]+B.handR[0])/2:B.handR[0]-w/2-6,cy=B.handR[1];g.save();g.translate(cx,cy);g.scale(w/200,1);sign.draw(g,t,{open:1,hit:t>2.1,label:'代管监工位'});g.restore();inkLine(g,[[cx+w/2,cy],B.handR],2,'#80684B','grip',0);}
  if(shot.id==='C02'&&n<6)table(g,486,550,180);
  if(shot.id==='C02'&&n>=6){const ct=actorAnchors(actorState(knockFrame/FPS,shot)[1]).handR,target=[ct[0]+37,ct[1]+63],ang=-.65*(1-smooth(q(t,cues[5].start,knockFrame/FPS))),tip=[B.handR[0]+Math.cos(ang)*37-Math.sin(ang)*63,B.handR[1]+Math.sin(ang)*37+Math.cos(ang)*63];bowl={center:[target[0]-31.2,target[1]+12.8],target};spoon={hand:B.handR,tip};}
  if(shot.id==='C05'&&n>=14){const final={pose:'point',x:750,y:600,u:38},p=actorAnchors(final).handL;jar=[p[0]-25,p[1]+28];table(g,jar[0]-62,jar[1]+42,124);}
  if(shot.id==='C08'){jar=[640,520];table(g,578,562,124);}
  drawContactActor(g,a);drawContactActor(g,b);
  if(shot.id==='C01'&&t>=3.3){if(b.pose==='think'){const p=B.pageCenter;text6(g,'总结',p[0],p[1]+5,13,'#5D5D57');}floorPlaque(g,'代管监工位',b.x);}
  if(shot.id==='C02'&&n<6){const ct=actorAnchors(actorState(bonkFrame/FPS,shot)[0]);renderCueInteraction(g,f,bonk,{contact:ct,current:A});if(rawFrame===bonkFrame)contacts.push({kind:'bread_bottom_head',frame:rawFrame,point:ct.headTop});}
  if(spoon){table(g,848,bowl.center[1]+22.4,180);g.save();g.translate(bowl.center[0],bowl.center[1]+22.4);g.rotate(f>=knockFrame?ring((f-knockFrame)/FPS,.075,3,7):0);g.translate(0,-22.4);g.scale(.8,.8);PROP_LIBRARY.rice_bowl.draw(g,t,{});g.restore();inkLine(g,[spoon.hand,spoon.tip],3.3,'#E5DBBC','spoon',0);paint(g,ellPts(...spoon.tip,5,3,12,0),{wash:'#DEDCCA',ink:'#655B50',sw:1});g.save();g.beginPath();g.arc(...spoon.hand,5,0,Math.PI*2);g.clip();drawContactActor(g,b);g.restore();burst(g,...bowl.target,(f-knockFrame)/FPS);if(rawFrame===knockFrame)contacts.push({kind:'spoon_bowl_rim',frame:rawFrame,error:Math.hypot(spoon.tip[0]-bowl.target[0],spoon.tip[1]-bowl.target[1])});}
  if(shot.id==='C03'||shot.id==='C04'&&n<12){
   if(n>=8){const tc=actorAnchors(actorState(slapFrame/FPS,SHOTS[3])[1]),sample=renderCueInteraction(g,rawFrame,slap,{contact:tc,current:B});if(sample){g.save();g.translate(...sample.position);g.rotate(sample.rotation||0);chicken(g,105,-65);g.restore();}else chicken(g,mix(1370,1070,smooth(q(t,cues[7].start,cues[7].start+1))),245);if(rawFrame===slapFrame)contacts.push({kind:'bubble_edge_finger',frame:rawFrame,point:tc.fingerR});}
  }
  if(shot.id==='C04'&&n>=12){const p=B.pageCenter;g.save();g.translate(p[0],p[1]+12);g.scale(.32,.32);notebook(g,0,0,smooth(q(t,cues[11].start,cues[11].start+.65)),'旧事提醒');g.restore();for(const hand of [B.handL,B.handR]){g.save();g.beginPath();g.arc(...hand,6,0,Math.PI*2);g.clip();drawContactActor(g,b);g.restore();}}
  if(shot.id==='C05'){if(n===13)label(g,'……',B.handR[0]+50,250,90);if(jar){prop(g,'rice_jar_guard',...jar);if(t>=cues[13].start+.95){g.save();g.beginPath();g.arc(...B.handL,6,0,Math.PI*2);g.clip();drawContactActor(g,b);g.restore();}}if(n>=15)prop(g,'brain_copy_board',552,124,1,{hit:n===16});}
  if(shot.id==='C06'){if(n<19)penAndNotes(g,a,t);floorPlaque(g,'正牌监工位',480);}
  if(shot.id==='C07'){table(g,548,555,240);standee(g,668,477);const p=B.pageCenter;text6(g,'旧事提醒',p[0],p[1]+5,10,'#585D5C');}
  if(shot.id==='C08'){prop(g,'rice_jar_guard',...jar,1.2);table(g,952,535,204);g.save();g.translate(1055,480);g.scale(.7,.7);standee(g,0,0);g.restore();}
 });g.restore();
 text6(g,'非官方同人 · AI生成 · 剧情演绎',1060,28,14,'#B9CECB');
 const s=subdata.screens.find(s=>rawTime>=s.start&&rawTime<s.end);if(s&&!noSub)sub.draw(g,{lines:sub.wrap(s.text),speaker:'本鲸',vis:1,W,H});
 return {shot:shot.id,line:n,camera:cam};
}
const canvas=createCanvas(W*S,H*S),g=canvas.getContext('2d');
const stillTimes=[0,...SHOTS.map(s=>(s.start+s.end)/2),bonkFrame/FPS,knockFrame/FPS,slapFrame/FPS,35.8,38.5,31.2,33.4,43.4,45.1,48.5,53.4,58.5];
if(argv.includes('--test')||argv.includes('--stills')){
 const dir=path.join(HERE,'有声成片抽帧');fs.mkdirSync(dir,{recursive:true});let samples=[];
 for(const t of stillTimes){samples.push({time:t,...render(g,t)});if(argv.includes('--stills'))fs.writeFileSync(path.join(dir,`t_${t.toFixed(3)}.jpg`),canvas.toBuffer('image/jpeg'));}
 fs.writeFileSync(path.join(HERE,'有声_渲染自检.json'),JSON.stringify({measured:true,frames,duration,source_sha256:alignment.source_sha256,events:[bonk,slap],samples,contacts,notes:'Contact timings are ASR/RMS-derived; fold/page and sitting changes use editorial cuts, not full 3D transitions'},null,2)+'\n');console.log('PASS',samples.length,'samples',frames,'frames');
}else{
 const out=arg('--out')||path.join(ROOT,'Day10/成片/Day10_鲸鱼架空_配音对齐版.mp4');fs.mkdirSync(path.dirname(out),{recursive:true});
 const ff='/tmp/node_render/node_modules/@ffmpeg-installer/linux-x64/ffmpeg',p=spawn(ff,['-y','-f','rawvideo','-pix_fmt','rgba','-s','1920x1080','-r','30','-i','-','-i',voice,'-map','0:v:0','-map','1:a:0','-c:v','libx264','-crf','19','-preset','veryfast','-tune','animation','-pix_fmt','yuv420p','-c:a','aac','-ar','44100','-b:a','160k','-af','apad','-t',String(frames/FPS),'-movflags','+faststart',out],{stdio:['pipe','ignore','pipe']});let err='';p.stderr.on('data',d=>err+=d);p.stdin.on('error',()=>{});const done=new Promise((r,j)=>{p.on('error',j);p.on('close',c=>c===0?r():j(Error(err.slice(-2000))));});
 for(let f=0;f<frames;f++){render(g,f/FPS);const b=canvas.data();if(!p.stdin.write(Buffer.from(b.buffer,b.byteOffset,b.byteLength)))await Promise.race([new Promise(r=>p.stdin.once('drain',r)),done]);if(f%150===0)console.log(f+'/'+frames);}p.stdin.end();await done;console.log('DONE',out);
}
