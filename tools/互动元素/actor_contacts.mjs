// Source-image calibrated landmarks projected through EXACTLY the same mesh triangles as the actor.
// These are reviewed palm/finger positions, not the auto-rig's proportional "hand" guesses.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import { POSES } from '../day3制作/whale_girl_src/whale_poses.mjs';
import {buildRig,drawRigged,skinMatrices,BONE_ORDER} from '../day3制作/whale_girl_src/whale_rig.mjs';
const DIR=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../day3制作/whale_girl_src');
export const CALIBRATION={
 idle:{headTop:[425,12],mouth:[438,477],handR:[697,686],handL:[218,685]},
 point:{headTop:[425,12],mouth:[438,477],handR:[710,387],fingerR:[727,337],handL:[311,678]},
 shock:{headTop:[454,6],mouth:[440,487],handR:[710,688],handL:[225,680]},
 confident_hips:{headTop:[425,12],mouth:[438,477],handR:[535,690],handL:[309,677]},
 think:{headTop:[425,12],mouth:[438,477],handR:[450,628],handL:[345,628],pageCenter:[400,600]},
 eat:{headTop:[425,12],mouth:[421,484],handR:[463,610],handL:[335,610]},
 playful_fists:{headTop:[425,12],mouth:[435,477],handR:[530,590],handL:[300,590]},
 fatfish_working:{headTop:[425,12],mouth:[438,477],handR:[482,686],handL:[331,681],deskFront:[468,748]}
};
export const VISUAL_POSES = Object.freeze(Object.keys(POSES));
const rigs=new Map(),cache=new Map();let makeCanvas;
export async function loadContactActors({createCanvas,loadImage,poses=Object.keys(CALIBRATION)}){
 makeCanvas=createCanvas;
 for(const name of new Set(poses)){
  if(!POSES[name])throw Error('Unknown visual pose '+name);
  if(rigs.has(name))continue;
  const file=path.join(DIR,POSES[name].file);
  let image;
  try{image=await loadImage(file);}catch(cause){throw new Error(`缺少既有角色素材 ${file}；禁止生图换脸或静默回退`,{cause});}
  const rig=buildRig(image,{ctxFactory:createCanvas,nx:40,ny:56});
  // 未校准姿态只可作视觉表演，不能凭自动骨架比例推测手掌接触。
  if(!CALIBRATION[name]){rigs.set(name,rig);continue;}
  // Explicit per-pose arm region; freeze all face pixels and the typing furniture.
  const armIndex=BONE_ORDER.indexOf('armR');
  for(let i=0;i<rig.verts.length;i++){
   const [x,y]=rig.verts[i];let w=0;
   if(name==='point'&&x>570&&y>285&&y<600)w=Math.min(1,(x-570)/80)*Math.min(1,(600-y)/50);
   if(name==='idle'&&x>580&&y>580&&y<760)w=Math.max(0,1-((x-684)/125)**4)*Math.min(1,(y-580)/45)*Math.min(1,(760-y)/35);
   if(name==='playful_fists'&&x>460&&x<650&&y>520&&y<700)w=Math.min(1,(700-y)/50);
   w=Math.max(0,Math.min(1,w));rig.weights[i]=w?[[armIndex,w],[0,1-w]]:[[0,1]];
   if(name==='shock'&&x>700&&y>680){const tw=Math.min(1,(x-700)/100)*Math.min(1,(y-680)/100);rig.weights[i]=[[BONE_ORDER.indexOf('tail'),tw],[0,1-tw]];}
   if(name!=='fatfish_working'&&y>890&&x>230&&x<620){const lw=Math.min(1,(y-890)/50),leg=BONE_ORDER.indexOf(x<430?'legL':'legR');rig.weights[i]=[[leg,lw],[0,1-lw]];}
  }
  rigs.set(name,rig);
 }
}
function warped(rig,point,anim){
 const [x,y]=point,B=rig.bbox,nx=rig.nx,ny=rig.ny;
 const fx=Math.max(0,Math.min(nx-1e-8,(x-B.x)/B.w*nx)),fy=Math.max(0,Math.min(ny-1e-8,(y-B.y)/B.h*ny));
 const ix=Math.floor(fx),iy=Math.floor(fy),dx=fx-ix,dy=fy-iy;
 const a=iy*(nx+1)+ix,b=a+1,d=a+nx+1,c=d+1;
 // Same a,b,c and a,c,d triangulation as drawRigged, not a separate approximate skin formula.
 const indices=dx>=dy?[a,b,c]:[a,c,d];const weights=dx>=dy?[1-dx,dx-dy,dy]:[1-dy,dx,dy-dx];
 const mats=skinMatrices(rig,anim);let px=0,py=0;
 indices.forEach((idx,j)=>{const [rx,ry]=rig.verts[idx];for(const [bi,w] of rig.weights[idx]){const m=mats[BONE_ORDER[bi]],q=weights[j]*w;px+=q*(m[0]*rx+m[2]*ry+m[4]);py+=q*(m[1]*rx+m[3]*ry+m[5]);}});
 return [px,py];
}
export function actorAnchors(actor){
 const rig=rigs.get(actor.pose);if(!rig||!CALIBRATION[actor.pose])throw Error('Uncalibrated contact pose '+actor.pose);
 const h=10.4*(actor.u??38),s=h/rig.h,cx=rig.bbox.x+rig.bbox.w/2,foot=rig.bbox.y+rig.bbox.h,lean=actor.lean??0;
 const squash=actor.squash??0,sx=1+squash*.035,sy=1-squash*.035,dir=actor.flip?-1:1;
 const out={foot:[actor.x,actor.y]};
 for(const [key,value] of Object.entries(CALIBRATION[actor.pose])){
  const [px,py]=warped(rig,value,actor.anim||{});const x=(px-cx)*s,y=(py-foot)*s;
  out[key]=[actor.x+dir*sx*(Math.cos(lean)*x-Math.sin(lean)*y),actor.y+sy*(Math.sin(lean)*x+Math.cos(lean)*y)];
 }
 if(actor.deskFront)out.deskFront=actor.deskFront;
 return out;
}
export function drawContactActor(ctx,actor){
 const rig=rigs.get(actor.pose);if(!rig)throw Error('Unknown pose');const h=10.4*(actor.u??38),s=h/rig.h,cx=rig.bbox.x+rig.bbox.w/2;
 ctx.save();ctx.translate(actor.x,actor.y);ctx.scale((actor.flip?-1:1)*(1+(actor.squash??0)*.035),1-(actor.squash??0)*.035);ctx.rotate(actor.lean??0);
 const key=actor.pose+'/'+JSON.stringify(actor.anim||{});let image=cache.get(key);
 if(!image){image=makeCanvas(768,768);drawRigged(image.getContext('2d'),rig,384-cx*600/rig.h,720,1,{spriteH:600,shadow:false,anim:actor.anim||{}});cache.set(key,image);if(cache.size>64)cache.delete(cache.keys().next().value);}
 ctx.drawImage(image,-384*h/600,-720*h/600,768*h/600,768*h/600);ctx.restore();return CALIBRATION[actor.pose]?actorAnchors(actor):null;
}
export function anchorSourceInfo(){return Object.fromEntries([...rigs].map(([name,r])=>[name,{size:[r.w,r.h],bbox:r.bbox,landmarks:CALIBRATION[name]}]));}
