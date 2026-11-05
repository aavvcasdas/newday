// Deterministic finite action clips, using ONLY the project's Day3 drawings and rig.
// Inspired by staged-action/state separation, not copied from the external desktop pet.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildRig,drawRigged,BONE_ORDER} from '../day3制作/whale_girl_src/whale_rig.mjs';
const DIR=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../day3制作/whale_girl_src');
export const clamp=x=>Math.max(0,Math.min(1,x));
export const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
export const mix=(a,b,p)=>a+(b-a)*p;
export const CLIPS=Object.freeze({
 type:{pose:'fatfish_working',stages:['prepare','press','release']},
 read:{pose:'think',stages:['raise','read','lower']},
 eat:{pose:'eat',stages:['lift','taste','put-down']},
 look:{pose:'peek_curious',stages:['approach','inspect','recover']},
 protest:{pose:'playful_fists',stages:['prepare','protest','release']},
 point:{pose:'point',stages:['prepare','point','release']},
 stop:{pose:'playful_fists',stages:['prepare','stop','release']},
 shock:{pose:'shock',stages:['notice','react','recover']},
 proud:{pose:'confident_hips',stages:['turn','pose','settle']},
 idle:{pose:'idle',stages:['settle','hold','hold']}
});
export function sampleClip(action,elapsed,duration=2.4){
 const c=CLIPS[action];if(!c)throw Error('Unknown action: '+action);
 const q=clamp(elapsed/Math.max(.01,duration));
 const stage=q<.16?0:q<.82?1:2;
 const envelope=ease(q/.16)*(1-ease((q-.82)/.18));
 return {action,pose:c.pose,stage:c.stages[stage],q,envelope,done:elapsed>=duration,
  // Reconstructible from absolute action time; re-evaluation never resets the clip.
  cycle:Math.max(0,elapsed)*Math.PI*(action==='type'?5.5:action==='eat'?1.4:1.0)};
}
export function travel(from,to,time,start,duration=2.0){
 const q=clamp((time-start)/duration),p=ease(q),distance=(to-from)*p;
 return {x:from+distance,q,p,distance,speed:(q<=0||q>=1)?0:(to-from)*6*q*(1-q)/duration,moving:q>0&&q<1};
}
let createCanvas,loadImage;
const rigs=new Map(),cache=new Map();
export async function loadMotionAssets(api){
 ({createCanvas,loadImage}=api);
 const names=[...new Set(Object.values(CLIPS).map(c=>c.pose).concat(['walk_a','walk_b','walk_stand','shy_fidget']))];
 for(const name of names){
  const image=await loadImage(path.join(DIR,`whale_${name}.png`));
  const rig=buildRig(image,{ctxFactory:createCanvas,nx:24,ny:38});
  // Preserve the complete face as a rigid image. No eye patches or skin-colour wipes.
  // Pin built-in desk / keyboard in the typing drawing; do not bend the furniture.
  for(let i=0;i<rig.verts.length;i++){
   const [x,y]=rig.verts[i];
   if(name==='eat'&&y>rig.h*.54&&y<rig.h*.76&&x>rig.w*.27&&x<rig.w*.65){
    const w=ease((y/rig.h-.54)/.035)*(1-ease((y/rig.h-.725)/.035))*ease((x/rig.w-.27)/.04)*(1-ease((x/rig.w-.61)/.04));
    rig.weights[i]=[[BONE_ORDER.indexOf('armL'),w],[BONE_ORDER.indexOf('root'),1-w]];
   }
   if(y<rig.h*.54||(name==='fatfish_working'&&y>rig.h*.75))rig.weights[i]=[[BONE_ORDER.indexOf('root'),1]];
  }
  rigs.set(name,rig);
 }
 console.log(`Day9 v2: ${rigs.size} existing Day3 pose rigs; finite action stages; rigid faces`);
}
function imageFor(pose,action,cycle,envelope){
 const step=Math.round(((cycle%(Math.PI*2)+Math.PI*2)%(Math.PI*2))/(Math.PI*2)*16)%16;
 const amp=Math.round(clamp(envelope)*4)/4;
 const animated=['type','read','eat','protest','stop','point','look','walk'].includes(action);
 const key=`${pose}/${action}/${animated&&amp?step:0}/${amp}`;
 if(cache.has(key))return cache.get(key);
 const rig=rigs.get(pose);if(!rig)throw Error('Missing existing pose '+pose);
 const phase=step*Math.PI*2/16,w=Math.sin(phase)*amp;
 let bones={};
 if(action==='type')bones={armL:{dy:12*w},armR:{dy:-12*w}};
 else if(action==='read')bones={armL:{rot:.022*w},armR:{rot:.022*w}};
 else if(action==='eat')bones={armL:{dy:-16*amp+3*w},armR:{dy:-16*amp+3*w}};
 else if(action==='protest'||action==='stop')bones={armL:{rot:-.065*amp-.025*w},armR:{rot:.065*amp+.025*w}};
 else if(action==='point')bones={armR:{rot:-.05*amp-.015*w}};
 else if(action==='look')bones={spine:{rot:.016*amp},armR:{rot:.014*w}};
 else if(action==='walk')bones={legL:{rot:.06*w},legR:{rot:-.06*w}};
 const c=createCanvas(560,600),g=c.getContext('2d'),height=520,sc=height/rig.h;
 drawRigged(g,rig,280-(rig.bbox.x+rig.bbox.w/2)*sc,565,1,{spriteH:height,shadow:false,anim:{root:{},bones}});
 // Lock foot baseline after deformation (never accumulate per-frame transforms).
 const pixels=g.getImageData(0,0,c.width,c.height).data;let baseline=565;
 for(let y=c.height-1;y>=0;y--){let count=0;for(let x=0;x<c.width;x++)if(pixels[(y*c.width+x)*4+3]>12)count++;if(count>2){baseline=y+1;break;}}
 const value={canvas:c,baseline,height:520};cache.set(key,value);return value;
}
export function drawAction(g,{action='idle',x,y,u=30,time=0,start=0,duration=2.4,
 travel:route=null,flip=false,lean=0,paper=false,label=null,phaseOffset=0}){
 let state=sampleClip(action,time-start+phaseOffset,duration),pose=state.pose;
 if(route?.moving){
  state={...state,cycle:Math.abs(route.distance)*Math.PI/38,envelope:1};
  pose=Math.floor(Math.abs(route.distance)/38)%2?'walk_b':'walk_a';
 }
 const walking=!!route?.moving;
 const im=imageFor(pose,walking?'walk':action,state.cycle,state.envelope);
 const height=10.4*u,s=height/im.height;
 g.save();g.fillStyle='#09142488';g.beginPath();g.ellipse(x,y+2,u*1.8,u*.24,0,0,Math.PI*2);g.fill();
 g.translate(x,y);g.scale(flip?-1:1,1);
 // Lean is an intentional inspection/return arc, not constant whole-body boiling.
 if(lean)g.rotate(lean);
 g.drawImage(im.canvas,-280*s,-im.baseline*s,im.canvas.width*s,im.canvas.height*s);
 // Add text only inside the native held notepad; hands and face are not overpainted.
 if(paper&&pose==='think'){
  const rig=rigs.get(pose),sc=height/rig.h,cx=rig.bbox.x+rig.bbox.w/2;
  g.save();g.translate((400-cx)*sc,(578-(rig.bbox.y+rig.bbox.h))*sc);g.fillStyle='#5B533F';g.font=`800 ${Math.max(9,height*.027)}px NotoSansSC`;g.textAlign='center';g.fillText('总结',0,0);g.restore();
 }
 g.restore();
 if(label){g.save();g.font='800 17px NotoSansSC';g.textAlign='center';g.fillStyle='#C8DBE1';g.fillText(label,x,y-height-13);g.restore();}
 return {...state,pose,x,y,walking};
}
export function cacheStats(){return {rigs:rigs.size,frames:cache.size};}
