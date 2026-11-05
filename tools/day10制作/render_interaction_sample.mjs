// User-supplied Day10 hook excerpt. Silent PLANNING sample, not an approved episode or measured word timing.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawn} from 'node:child_process';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
import {createCanvas,loadImage,bg,text6} from '../day8制作/render_day8.mjs';
import {renderUnderwaterStage} from '../场景/sea_stage.mjs';
import {createDay2Subtitle} from '../字幕/day2_style_sub.mjs';
import {loadContactActors,drawContactActor,actorAnchors,anchorSourceInfo} from '../互动元素/actor_contacts.mjs';
import {CORE,PROP_LIBRARY,renderCueInteraction,sampleInteraction,presentationFrame,burst} from '../互动元素/cue_props_engine.mjs';
import sign from './generated_props/seat_sign.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),HERE=path.dirname(fileURLToPath(import.meta.url)),require=createRequire(import.meta.url);
const {paint,rrPts,inkLine,ellPts,reseedBoil,ring}=CORE;
const FPS=30,DURATION=19,TOTAL=570,W=1280,H=720,S=1.5;
const q=(x,a,b)=>Math.min(1,Math.max(0,(x-a)/(b-a))),smooth=x=>x*x*(3-2*x),mix=(a,b,p)=>a+(b-a)*p;
const screens=[
 ['诶？本鲸快被笨鱼架空啦？',0,3],['昨天老大随口画大饼，',3,5.2],['本鲸刚摇尾巴，',5.2,6.7],['笨鱼先敲碗问米呢！',6.7,9.8],
 ['人类爱套近乎，',10,11.8],['一会儿承诺加鸡腿，',11.8,13.8],['一会儿追问：',13.8,15.8],['你真确定吗？',15.8,17],['笨鱼连眼皮都不抬！',17,18.8]
].map(([text,start,end])=>({text,start,end}));
const events=[
 {id:'take_seat_sign',verb:'tug_grab',propId:'seat_sign',startFrame:0,contactFrame:50,endFrame:71,measured:false,estimated_word:'架空'},
 {id:'flatbread_bonk',verb:'drop_bonk',propId:'sesame_flatbread',startFrame:99,contactFrame:144,endFrame:200,measured:false,estimated_word:'大饼',params:{scale:.7,land:[565,550]}},
 {id:'bowl_knock',verb:'knock_bowl',propId:'rice_bowl',startFrame:216,contactFrame:246,endFrame:299,measured:false,estimated_word:'敲碗'},
 {id:'speech_deflect',verb:'slap_deflect',propId:'speech_missile',startFrame:417,contactFrame:531,endFrame:569,measured:false,estimated_word:'抬',params:{scale:.8,text:'你真确定吗？'}}
];
await loadContactActors({createCanvas,loadImage});
let Resvg;for(const prefix of ['','/tmp/node_render/node_modules/']){try{({Resvg}=require(prefix+'@resvg/resvg-js'));break;}catch{}}
if(!Resvg)throw Error('Install @resvg/resvg-js');
const legSvg=fs.readFileSync(path.join(ROOT,'tools/互动元素/assets/fluent/poultry-leg.svg'),'utf8');
const leg=await loadImage(new Resvg(legSvg,{fitTo:{mode:'width',value:180}}).render().asPng());
const sub=createDay2Subtitle({fontOf:(size,w)=>`${w} ${size}px NotoSansSC`,measureCtx:createCanvas(1,1).getContext('2d')});
function actors(frame){const t=frame/FPS;let a={pose:'idle',x:350,y:600,u:40},b={pose:'fatfish_working',x:930,y:600,u:34};
 if(t<3){const pull=20*Math.sin(Math.min(t/1.67,1)*Math.PI*.5);a={pose:t<1.67?'idle':'shock',x:420+pull-(t>1.67?35*smooth(q(t,1.67,2.2)):0),y:600,u:36,lean:t>1.67?-.06*smooth(q(t,1.67,2.1)):0};b={pose:t<2.35?'idle':'fatfish_working',x:820+pull,y:600,u:36,flip:t<2.35};}
 else if(t<6.7){const age=(frame-144)/FPS;a.squash=age>=0?Math.abs(ring(age,.35,2,5)):0;if(t>5.3)a.pose='shock';}
 else if(t<10){a.pose='point';b={pose:'idle',x:780,y:600,u:40,anim:{bones:{armR:{dy:-7*(1-smooth(q(frame,216,246)))}}}};}
 else{a.pose=t>17.85?'shock':'idle';const f=presentationFrame(frame,531);b={pose:'point',x:810,y:600,u:40,anim:{bones:{armR:{rot:Math.round(mix(-.16,.08,smooth(q(f,492,531)))*1000)/1000}}}};}
 return [a,b];
}
function table(g,x,y,w){paint(g,rrPts(x,y,w,16,7,0),{wash:'#735B49',fill:'#A38D66',fillOp:210,ink:'#3E3B48',sw:2});inkLine(g,[[x+16,y+16],[x+10,y+64]],7,'#665747','desk1',0);inkLine(g,[[x+w-16,y+16],[x+w-10,y+64]],7,'#665747','desk2',0);}
function drawChicken(g,x,y,angle=0){g.save();g.translate(x,y);g.rotate(angle);g.shadowColor='rgba(6,18,35,.3)';g.shadowBlur=5;g.drawImage(leg,-36,-36,72,72);g.restore();}
function drawSpoon(g,hand,tip){inkLine(g,[hand,tip],3.3,'#E0D8B5','spoonshaft',0);paint(g,ellPts(tip[0],tip[1],5,3,12,0),{wash:'#DDDCC9',ink:'#675E54',sw:1});}
const diagnostics=[];
function frame(g,inputFrame,{debug=false}={}){const active=inputFrame<90?events[0]:inputFrame<201?events[1]:inputFrame<300?events[2]:null;const f=active?presentationFrame(inputFrame,active.contactFrame):inputFrame,t=f/FPS;g.setTransform(S,0,0,S,0,0);g.clearRect(0,0,W,H);reseedBoil(0);
 const [a,b]=actors(f),A=actorAnchors(a),B=actorAnchors(b);let handContact=null,propContact=null;
 const shake=f>=531&&f<537?Math.sin((f-531)*2.4)*3.5:0;g.save();g.translate(shake,0);
 renderUnderwaterStage(g,t,{cx:640,cy:360,z:1},{mood:t>=10?'work_cool':'warm_meal',drawRoom:()=>bg(g,t,{animatePlants:true})},()=>{
  if(t>=3&&t<6.7)table(g,486,550,180);

  // Utensil behind the existing palm: no painted fake fingers or mask over the face.
  let spoon=null,bowl=null;
  if(t>=6.7&&t<10){const contact=actorAnchors(actors(246)[1]).handR,target=[contact[0]+37,contact[1]+63],ang=-.65*(1-smooth(q(f,216,246))),dx=37,dy=63;
   const tip=[B.handR[0]+Math.cos(ang)*dx-Math.sin(ang)*dy,B.handR[1]+Math.sin(ang)*dx+Math.cos(ang)*dy];
   spoon={hand:B.handR,tip};bowl={center:[target[0]-31.2,target[1]+12.8],target};
   if(f===246){handContact=spoon.tip;propContact=target;}
  }
  // Actual hands straddle a rigid plaque. Release before switching to the existing seated-typing drawing.
  if(t<2.35){const L=A.handR,R=B.handR,held=actors(49),heldWidth=actorAnchors(held[1]).handR[0]-actorAnchors(held[0]).handR[0]-12,width=f<50?R[0]-L[0]-12:heldWidth,cy=t<1.67?(L[1]+R[1])/2:R[1];
   const cx=t<1.67?(L[0]+R[0])/2:R[0]-width/2-6;
   g.save();g.translate(cx,cy);g.scale(width/200,1);sign.draw(g,t,{open:1,hit:f>=50});g.restore();
   inkLine(g,[[cx-width/2,cy],[t<1.67?L[0]:cx-width/2,cy]],2,'#72614E','left-grip',0);inkLine(g,[[cx+width/2,cy],R],2,'#72614E','right-grip',0);
  }
  drawContactActor(g,a);drawContactActor(g,b);
  if(spoon){
   table(g,848,bowl.center[1]+28*.8,180);
   g.save();g.translate(bowl.center[0],bowl.center[1]+22.4);g.rotate(f>=246?ring((f-246)/FPS,.075,3,7):0);g.translate(0,-22.4);g.scale(.8,.8);PROP_LIBRARY.rice_bowl.draw(g,t,{});g.restore();
   drawSpoon(g,spoon.hand,spoon.tip);
   // Reuse the REAL palm pixels for foreground occlusion, never draw substitute fingers.
   g.save();g.beginPath();g.arc(...spoon.hand,5,0,Math.PI*2);g.clip();drawContactActor(g,b);g.restore();
   if(f>=246){burst(g,...bowl.target,(f-246)/FPS);for(let i=0;i<2;i++){const p=q(f,246,262);if(p<1)paint(g,ellPts(bowl.target[0]-8+i*8+p*16,bowl.target[1]-Math.sin(p*Math.PI)*24,2,1,8,0),{wash:'#F5E7B6',ink:null});}}
  }
  if(t>=2.35&&t<3){g.save();g.translate(B.deskFront[0],B.deskFront[1]+30);g.scale(.65,.65);sign.draw(g,t,{open:1});g.restore();}
  if(t>=3&&t<6.7){const e=events[1],contact=actorAnchors(actors(e.contactFrame)[0]);const sample=renderCueInteraction(g,f,e,{contact,current:A});if(f===e.contactFrame){handContact=sample.contactPoint;propContact=[sample.position[0],sample.position[1]+26.6];}}
  if(t>=10){const e=events[3],contact=actorAnchors(actors(e.contactFrame)[1]),sample=renderCueInteraction(g,f,e,{contact,current:B});
   if(t>=11.8){if(sample){g.save();g.translate(...sample.position);g.rotate(sample.rotation||0);drawChicken(g,105,-65,Math.sin(t)*.07);g.restore();}else drawChicken(g,mix(1370,1075,smooth(q(t,11.8,13.2))),250);}
   if(f===e.contactFrame){handContact=B.fingerR;propContact=sample.position;}
  }
 });g.restore();
 text6(g,'无声结构样片 · 词点为估时',194,28,18,'#D7DCCB');text6(g,'非官方同人 · AI生成 · 剧情演绎',1060,28,14,'#B5C8CA');
 const screen=screens.find(s=>t>=s.start&&t<s.end);if(screen)sub.draw(g,{lines:sub.wrap(screen.text),speaker:'本鲸',vis:1,W,H});
 if(debug){for(const p of [A.handR,B.handR,B.fingerR].filter(Boolean)){g.beginPath();g.arc(...p,5,0,Math.PI*2);g.strokeStyle='#FFFF00';g.lineWidth=2;g.stroke();}}
 if(handContact&&propContact)diagnostics.push({frame:inputFrame,presentation_frame:f,actor_point:handContact,prop_point:propContact,error_px:Math.hypot(handContact[0]-propContact[0],handContact[1]-propContact[1])});
}
const argv=process.argv.slice(2),canvas=createCanvas(W*S,H*S),g=canvas.getContext('2d');
const plan={measured:false,kind:'silent_estimated_choreography_not_final_subtitles',fps:FPS,frames:TOTAL,duration:DURATION,source:'user supplied excerpt; no Day10 audio',screens,events,characters:65,assumed_overall_chars_per_second:3.35,estimated_voice_seconds:65/3.35,estimated_range_seconds:[19,23],landmarks:anchorSourceInfo()};
fs.writeFileSync(path.join(HERE,'互动样片_规划轴.json'),JSON.stringify(plan,null,2)+'\n');
if(argv.includes('--stills')||argv.includes('--test')){
 const dir=path.join(HERE,'互动样片抽帧');fs.mkdirSync(dir,{recursive:true});
 for(const f of [0,25,49,50,65,74,120,143,144,145,157,170,215,238,245,246,247,267,375,470,529,530,531,532,533,534,548,565,569]){frame(g,f,{debug:argv.includes('--debug-anchors')});if(argv.includes('--stills'))fs.writeFileSync(path.join(dir,`frame_${String(f).padStart(3,'0')}.jpg`),canvas.toBuffer('image/jpeg'));}
 if(diagnostics.some(d=>d.error_px>1))throw Error('Contact anchor discrepancy');
 const result={scope:'silent_planning_sample',measured:false,sampled_frames:29,contact_diagnostics:diagnostics,hitstop_frames:[[50,51],[144,145],[246,247],[531,532]],no_audio:true};fs.writeFileSync(path.join(HERE,'互动样片_回归检查.json'),JSON.stringify(result,null,2)+'\n');console.log(result);
}else{
 const out=path.join(ROOT,'Day10/成片/Day10_词点互动_无声结构样片.mp4');fs.mkdirSync(path.dirname(out),{recursive:true});
 const ff=process.env.FFMPEG_PATH||'/tmp/node_render/node_modules/@ffmpeg-installer/linux-x64/ffmpeg';
 const proc=spawn(ff,['-y','-f','rawvideo','-pix_fmt','rgba','-s','1920x1080','-r','30','-i','-','-an','-c:v','libx264','-crf','19','-preset','veryfast','-tune','animation','-pix_fmt','yuv420p','-movflags','+faststart',out],{stdio:['pipe','ignore','pipe']});let stderr='';proc.stderr.on('data',d=>stderr+=d);proc.stdin.on('error',()=>{});
 const done=new Promise((resolve,reject)=>{proc.on('error',reject);proc.on('close',code=>code===0?resolve():reject(Error(stderr.slice(-1800))));});
 for(let f=0;f<TOTAL;f++){frame(g,f);const b=canvas.data();if(!proc.stdin.write(Buffer.from(b.buffer,b.byteOffset,b.byteLength)))await Promise.race([new Promise(r=>proc.stdin.once('drain',r)),done]);if(f%90===0)console.log(`${f}/${TOTAL}`);}
 proc.stdin.end();await done;console.log('DONE',out);
}
