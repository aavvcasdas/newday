// Preview-only cast renderer: v8 sets, v13 lead poses and pre-existing v12 guest actions.
// No whole-image interpolation between generated drawings.
import path from 'node:path';
import {ROOT, loadImage} from './actors.mjs';
const lead={};
for(const n of ['whale_swim','whale_point','whale_bird']) lead[n]=await loadImage(path.join(ROOT,'assets/ai-girls/lyric-action-v13',`${n}.png`));
const bird=await loadImage(path.join(ROOT,'assets/ai-girls/lyric-action-v13/bird_cutout.png'));
const story={};
for(const n of ['kimi_underwater_final','gemini_swim','whale_sit_final_retry','whale_selfkind_retry']) story[n]=await loadImage(path.join(ROOT,'assets/ai-girls/lyric-action-v13',`${n}_cel.png`));
const actions={};
for(const n of ['kimi_underwater_final','claude_place','zai_reach','whale_gather_retry','gpt_push_final','doubao_step','qwen_reach','gemini_swim','doubao_lantern','kimi_lantern','claude_firework','gemini_firework','whale_rain_reach','whale_walk_retry','kimi_walk_story','doubao_comfort','doubao_memory','gpt_star','gemini_flower','zai_memento','whale_meet','whale_selfkind_retry','gpt_sweep','gemini_star_toss','claude_collect','whale_read','whale_rainwalk','whale_sit_blink','gemini_kite','kimi_stargaze_seated','zai_clock','whale_camera','qwen_swim_full_retry','gemini_swim_full','whale_wipe_tear','qwen_water_full','gpt_think','kimi_swim_padded_fixed','doubao_umbrella_padded_fixed','whale_ribbon_hold','doubao_shared_umbrella','whale_side_rainwalk','whale_side_crouch','whale_rain_reach_blink','kimi_swim_pull','kimi_stargaze_seated_blink','claude_collect_blink','kimi_swim_padded_fixed_stroke35']) actions[n]=await loadImage(path.join(ROOT,'assets/ai-girls/lyric-action-v13',`${n}_action.png`));
const lantern=await loadImage(path.join(ROOT,'assets/ai-girls/lyric-action-v13/doubao_lantern_prop.png'));
const clamp=x=>Math.max(0,Math.min(1,x));
function drawStoryAction(c,name,t,shot,{x,y,h,alpha=1,flipX=false,noShadow=false}){
 const duration=Math.max(.2,shot.end-shot.start),u=clamp((t-shot.start)/duration);
 const cycle=['doubao_step','claude_firework','gemini_firework','kimi_lantern','whale_walk_retry','kimi_walk_story','gpt_sweep','whale_rainwalk','gemini_kite','whale_side_rainwalk'].includes(name) || (name==='doubao_lantern' && shot.index>=22);
 const heldFinal=(shot.index===32 && ['doubao_memory','gpt_star','gemini_flower','zai_memento','claude_place','qwen_reach'].includes(name)) ||
  (shot.index===31 && ['doubao_memory','gpt_star','gemini_flower'].includes(name)) || (shot.index===7 && name==='doubao_comfort') || (shot.index===14 && ['doubao_umbrella_padded_fixed','doubao_shared_umbrella'].includes(name));
 const f=heldFinal?15:cycle?Math.min(15,Math.floor(((t-shot.start)/1.25%1)*16)):Math.min(15,Math.floor(u*20));
 if(name==='doubao_step')x-=55*u;
 if(!noShadow){c.save();c.globalAlpha*=alpha;c.fillStyle='rgba(18,28,40,.18)';c.beginPath();c.ellipse(x,y+2,h*.23,h*.035,0,0,Math.PI*2);c.fill();c.restore();}
 c.save();c.globalAlpha*=alpha;c.translate(x,y);if(flipX)c.scale(-1,1);
 const w=h*0.9230769230769231, groundAdjust=['whale_walk_retry','kimi_walk_story'].includes(name)?h*0.019230769230769232+2:0;
 c.drawImage(actions[name],f*384,0,384,416,-w/2,-h+groundAdjust,w,h);
 if(name==='qwen_water_full'){
  // A short stream starts at the can spout and ends at the planted sprout.
  // It is illustrative overlay; final frame-by-frame contact is still unreviewed.
  const k=h/416, flow=clamp((u-.22)/.18)*(1-clamp((u-.80)/.15));
  if(flow>0){c.save();c.globalAlpha*=flow;c.strokeStyle='rgba(160,226,248,.9)';c.lineWidth=2.4*k;
   c.beginPath();c.moveTo((134-192)*k,-h+326*k);c.quadraticCurveTo((132-192)*k,-h+343*k,(145-192)*k,-h+359*k);c.stroke();c.restore();}
 }

 if(name==='doubao_lantern' && shot.index<=21){
  // Hold in S20, release once in S21. Keep raised empty hands in S22/23.
  const flight=shot.index===20?0:clamp((u-.4)/.55),k=h/416;
  c.save();c.globalAlpha*=1-clamp((flight-.8)/.2)*.75;
  c.drawImage(lantern,(146-192)*k,-h-95*flight*k,100*k,98*k);c.restore();
 }
 c.restore();return {row:0,column:f};
}
const mapping={claude:'claude_letter',gemini:'gemini_shell',doubao:'doubao_cup',gpt:'gpt_letter',kimi:'kimi_photo',qwen:'qwen_lantern',zai:'zai_read'};
const guest={};
for(const [name,pose] of Object.entries(mapping))guest[name]=await loadImage(path.join(ROOT,'assets/ai-girls/actions-v12',`${pose}.png`));
const lyricLegacy={};
for(const name of ['whale_letter','gpt_heart'])lyricLegacy[name]=await loadImage(path.join(ROOT,'assets/ai-girls/actions-v12',`${name}.png`));
function drawLegacyAction(c,name,t,shot,{x,y,h,alpha=1,flipX=false,noShadow=false}){
 const u=clamp((t-shot.start)/Math.max(.2,shot.end-shot.start)),f=Math.min(10,Math.floor(u*11));
 if(!noShadow){c.save();c.globalAlpha*=alpha;c.fillStyle='rgba(18,28,40,.18)';c.beginPath();c.ellipse(x,y+2,h*.23,h*.035,0,0,Math.PI*2);c.fill();c.restore();}
 c.save();c.globalAlpha*=alpha;c.translate(x,y);if(flipX)c.scale(-1,1);const w=h*384/416;c.drawImage(lyricLegacy[name],f*384,0,384,416,-w/2,-h,w,h);c.restore();
 return {row:0,column:f};
}
export function drawLead(c,index,t,shot,{x,y,h,alpha=1,flipX=false,noShadow=false,variant=null}){
 if(variant)return drawStoryAction(c,variant,t,shot,{x,y,h,alpha,flipX,noShadow});
 if([2,3,6,27].includes(index))return drawStoryAction(c,'whale_walk_retry',t,shot,{x,y,h,alpha,flipX,noShadow});
 if(index===7)return drawStoryAction(c,'whale_meet',t,shot,{x,y,h,alpha,flipX,noShadow});
 if(index===28)return drawStoryAction(c,'whale_ribbon_hold',t,shot,{x,y,h,alpha,flipX,noShadow});
 if(index===24)return drawStoryAction(c,'whale_camera',t,shot,{x,y,h,alpha,flipX,noShadow});
 if(index===20)return drawLegacyAction(c,'whale_letter',t,shot,{x,y,h,alpha,flipX,noShadow});
 if([1,17,31].includes(index))return drawStoryAction(c,'whale_gather_retry',t,shot,{x,y,h,alpha,flipX,noShadow});
 if(index===32)return drawStoryAction(c,'whale_selfkind_retry',t,shot,{x,y,h,alpha,flipX,noShadow});
 if(index===14)return drawStoryAction(c,'whale_rain_reach_blink',t,shot,{x,y,h,alpha,flipX,noShadow});
 if(index===12)return drawStoryAction(c,'whale_wipe_tear',t,shot,{x,y,h,alpha,flipX,noShadow});
 if(index===13){
  const crouching=t>=20.24;
  return drawStoryAction(c,crouching?'whale_side_crouch':'whale_side_rainwalk',t,crouching?{...shot,start:20.24,end:20.6666667}:shot,{x,y,h,alpha,flipX,noShadow});
 }
 const n=index===25||index===26?'whale_swim':index===9?'whale_point':index===29?'whale_bird':null;
 if(!n)return false;
 const lt=Math.max(0,t-shot.start),dur=Math.max(0.2,shot.end-shot.start);
 let p=n==='whale_swim'?(lt/1.35)%1:Math.min(1,lt/Math.max(.8,dur*.8));
 const f=Math.min(15,Math.floor(p*16));
 // For swimming the body is horizontal. The scene's motion follows the reach
 // direction; it is not a standing sprite translated without limb animation.
 const swimming=n==='whale_swim';
 if(swimming)x-=Math.min(1,lt/dur)*65;
 if(!noShadow&&!swimming){c.save();c.globalAlpha*=alpha;c.fillStyle='rgba(18,28,40,.22)';c.beginPath();c.ellipse(x,y+2,h*.23,h*.035,0,0,Math.PI*2);c.fill();c.restore();}
 c.save();c.globalAlpha*=alpha;c.translate(x,y);if(flipX)c.scale(-1,1);
 if(swimming){const sh=270,w=h*384/sh;c.drawImage(lead[n],f*384,146,384,sh,-w/2,-h,w,h);}
 else {const w=h*384/416;c.drawImage(lead[n],f*384,0,384,416,-w/2,-h,w,h);}
 c.restore();
 if(n==='whale_bird'){
  const fly=Math.max(0,Math.min(1,(lt-.15)/Math.max(.7,dur-.3))),k=h/416;
  const x0=x-95*k,y0=y-208*k;
  c.save();c.globalAlpha*=alpha*(1-Math.max(0,(fly-.8)/.2));c.translate(x0-150*fly,y0-95*fly);c.rotate(-.18*fly);
  c.drawImage(bird,-bird.width*k/2,-bird.height*k/2,bird.width*k,bird.height*k);c.restore();
 }
 return {row:0,column:f};
}
export function drawGuest(c,name,t,shot,{x,y,h,alpha=1,flipX=false,noShadow=false}){
 const finale={doubao:'doubao_memory',gpt:'gpt_star',gemini:'gemini_flower',zai:'zai_memento'};
 if([30,31,32].includes(shot.index) && finale[name])return drawStoryAction(c,finale[name],t,shot,{x,y,h,alpha,flipX,noShadow});
 if(name==='qwen'&&shot.index===11)return drawStoryAction(c,'qwen_water_full',t,shot,{x,y,h,alpha,flipX,noShadow});
 if(name==='gpt'&&shot.index===17)return drawStoryAction(c,'gpt_think',t,shot,{x,y,h,alpha,flipX,noShadow});
 if(name==='kimi'&&shot.index===11)return drawStoryAction(c,'kimi_stargaze_seated_blink',t,shot,{x,y,h,alpha,flipX,noShadow});
 if(name==='claude'&&shot.index===11)return drawStoryAction(c,'claude_collect_blink',t,shot,{x,y,h,alpha,flipX,noShadow});
 if(name==='claude'&&[1,18,31,32].includes(shot.index))return drawStoryAction(c,'claude_place',t,shot,{x,y,h,alpha,flipX,noShadow});
 if(name==='zai'&&shot.index===27)return drawStoryAction(c,'zai_clock',t,shot,{x,y,h,alpha,flipX,noShadow});
 if(name==='zai'&&[18,31].includes(shot.index))return drawStoryAction(c,'zai_reach',t,shot,{x,y,h,alpha,flipX,noShadow});
 if(name==='gpt'&&[15,16].includes(shot.index))return drawStoryAction(c,'gpt_push_final',t,shot,{x,y,h,alpha,flipX,noShadow});
 if(name==='gpt'&&[30,31,32].includes(shot.index))return drawLegacyAction(c,'gpt_heart',t,shot,{x,y,h,alpha,flipX,noShadow});
 if(name==='doubao'&&[13,14].includes(shot.index))return drawStoryAction(c,'doubao_shared_umbrella',t,shot,{x,y,h,alpha,flipX:false,noShadow});
 if(name==='doubao'&&[6,7].includes(shot.index))return drawStoryAction(c,'doubao_comfort',t,shot,{x,y,h,alpha,flipX:false,noShadow});
 if(name==='gemini'&&shot.index===11){
  const u=clamp((t-shot.start)/(shot.end-shot.start));
  return drawStoryAction(c,'gemini_kite',t,shot,{x:x-18*u,y,h,alpha,flipX,noShadow});
 }
 if(name==='gemini'&&shot.index===5)return drawStoryAction(c,'gemini_star_toss',t,shot,{x,y,h,alpha,flipX,noShadow});
 if(name==='gpt'&&shot.index===19)return drawStoryAction(c,'gpt_sweep',t,shot,{x:x+12*clamp((t-shot.start)/(shot.end-shot.start)),y,h,alpha,flipX,noShadow});
 if(name==='kimi'&&[2,3].includes(shot.index))return drawStoryAction(c,'kimi_walk_story',t,shot,{x:x+25*clamp((t-shot.start)/(shot.end-shot.start)),y,h,alpha,flipX,noShadow});
 if(name==='qwen'&&[11,31,32].includes(shot.index))return drawStoryAction(c,'qwen_reach',t,shot,{x,y,h,alpha,flipX,noShadow});
 if(name==='doubao'&&[20,21,22,23].includes(shot.index))return drawStoryAction(c,'doubao_lantern',t,shot,{x,y,h,alpha,flipX,noShadow});
 if(name==='kimi'&&shot.index===21)return drawStoryAction(c,'kimi_lantern',t,shot,{x,y,h,alpha,flipX,noShadow});
 if(name==='claude'&&[22,23].includes(shot.index))return drawStoryAction(c,'claude_firework',t,shot,{x,y,h,alpha,flipX,noShadow});
 if(name==='gemini'&&[22,23].includes(shot.index))return drawStoryAction(c,'gemini_firework',t,shot,{x,y,h,alpha,flipX,noShadow});
 if(shot.index===25||shot.index===26){
  // Horizontal cels plus limited leg movement; full-body swim and object contact are unverified.
  const n=name==='kimi'?(shot.index===26?'kimi_swim_pull':'kimi_swim_padded_fixed_stroke35'):name==='gemini'?'gemini_swim_full':name==='qwen'?'qwen_swim_full_retry':null;
  if(!n)return {row:0,column:0};
  const p=Math.max(0,Math.min(1,(t-shot.start)/(shot.end-shot.start)));
  const isKimi=n==='kimi_swim_padded_fixed_stroke35'||n==='kimi_swim_pull';
  const crop=isKimi?[0,120,384,288]:n==='qwen_swim_full_retry'?[0,150,384,266]:[0,185,384,231];
  // Missing-cast wing positions were designed for upright figures; keep the
  // wider swimming silhouettes in frame and orient them toward the centre.
  const fullSea=clamp((t-38.8333333333)/(42.7-38.8333333333));
  const w=h*crop[2]/crop[3], swimX=isKimi?210+50*fullSea:(n==='qwen_swim_full_retry'?1080:1030)-45*p;
  c.save();c.globalAlpha*=alpha;c.translate(swimX,y+Math.sin(t*3)*7);if(isKimi)c.scale(-1,1);
  const cycleTime=isKimi?Math.max(0,t-38.8333333333):Math.max(0,t-shot.start);
  const frame=Math.min(15,Math.floor((cycleTime/1.25%1)*16));
  c.drawImage(actions[n],frame*384+crop[0],crop[1],crop[2],crop[3],-w/2,-h,w,h);
  c.restore();return {row:0,column:frame};
 }
 const im=guest[name]; if(!im)return false;
 const d=[350,220,180,180,180,400,350,180,180,180,1000],lt=Math.max(0,(t-shot.start)*1000-['doubao','claude','gemini','qwen','gpt','kimi','zai'].indexOf(name)*80);let ms=lt, f=0;
 while(f<10&&ms>=d[f]){ms-=d[f++];}
 if(!noShadow){c.save();c.globalAlpha*=alpha;c.fillStyle='rgba(18,28,40,.22)';c.beginPath();c.ellipse(x,y+2,h*.23,h*.035,0,0,Math.PI*2);c.fill();c.restore();}
 c.save();c.globalAlpha*=alpha;c.translate(x,y);if(flipX)c.scale(-1,1);const w=h*384/416;
 c.drawImage(im,f*384,0,384,416,-w/2,-h,w,h);c.restore();return {row:0,column:f};
}
