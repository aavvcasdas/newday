// Fixed-PNG performance only: whole-body transforms, no mouth/eyelid/face manipulation.
import fs from 'node:fs';import{createHash}from'node:crypto';
import{loadImage,drawText,smooth}from'./room_base.mjs';
const images=new Map();
export const IMAGE_ACTORS=Object.freeze({doubao:{path:'assets/ai-girls/doubao/doubao-cutout.png',manifest:'assets/ai-girls/doubao/source.json'}});
export async function loadImageActors(plans){for(const a of plans){if(!a.assetId||images.has(a.assetId))continue;const source=IMAGE_ACTORS[a.assetId];if(!source)throw Error('Unregistered image actor');const m=JSON.parse(fs.readFileSync(source.manifest));if(createHash('sha256').update(fs.readFileSync(source.path)).digest('hex')!==m.derived.sha256)throw Error('Image actor hash mismatch');images.set(a.assetId,await loadImage(source.path));}}
export function bodyPerformance(plan,t){
 const amount=plan.idleMotion??.4,phase=t*2*Math.PI/3.8;
 let dy=Math.sin(phase)*.9*amount,dx=0,lean=0,scale=1,pose;
 if(plan.poseTransition){let previous=plan.pose;for(const p of plan.poses||[]){const age=t-p.at;if(age<0)break;if(age<plan.poseTransition){const q=smooth(age/plan.poseTransition);pose=q<.5?previous:p.pose;dy+=Math.sin(Math.PI*q)*3;lean+=Math.sin(Math.PI*q)*.014;break;}previous=p.pose;}}
 for(const e of plan.bodyEvents||[]){const q=(t-e.at)/e.duration;if(q<0||q>=1)continue;const pulse=Math.sin(Math.PI*smooth(q))**2;dy+=pulse*(e.dy??1.5);dx+=pulse*(e.dx??0);lean+=pulse*(e.lean??0);}
 scale+=Math.sin(phase)*.0012*amount;
 let opacity=1;
 if(plan.enterAt!=null){const q=Math.max(0,Math.min(1,(t-plan.enterAt)/(plan.enterDuration||.45)));opacity=q;dx+=(1-smooth(q))*(plan.enterDx||0);}
 dy=Math.max(-4,Math.min(4,dy));
 return{dy,dx,lean,scale,pose,opacity};
}
export function drawImageActor(g,a){if(a.opacity<=0)return;const im=images.get(a.assetId);if(!im)throw Error('Image actor not loaded');const h=a.height||340,w=h*im.width/im.height;g.save();g.globalAlpha=a.opacity??1;g.translate(a.x,a.y);g.rotate(a.lean||0);g.scale(a.imageScale||1,a.imageScale||1);g.drawImage(im,-w/2,-h,w,h);g.restore();}
export function drawAmbient(g,t,tracks=[]){for(const a of tracks){if(t<(a.from??0)||t>=(a.to??Infinity))continue;g.save();if(a.type==='dust'){for(let i=0;i<5;i++){const x=(a.x??630)+(i-2)*115+Math.sin(t*.23+i)*4,y=(a.y??290)+Math.sin(t*.31+i*1.8)*20;g.globalAlpha=.12;g.fillStyle='#B6D6D9';g.beginPath();g.arc(x,y,1.3,0,Math.PI*2);g.fill();}}else if(a.type==='cursor'){g.globalAlpha=.25+.65*(.5+.5*Math.cos(t*Math.PI*2/1.1));g.fillStyle='#507C87';g.fillRect(a.x,a.y,2,15);}g.restore();}}
export function validatePerformanceShot(s){
 const intent=s.cameraIntent;if(!intent||!['static','push','pull','pan','follow'].includes(intent.type)||!intent.reason?.trim())throw Error(`${s.id} requires motivated cameraIntent`);
 for(const key of ['ambient','bodyEvents','propTracks','insertEmphasis'])if(!Array.isArray(s[key]))throw Error(`${s.id} missing ${key}`);
 if(!s.transitions||!['fade','slide','none'].includes(s.transitions.type))throw Error(`${s.id} missing transition`);
 if(!(s.bodyEvents.length||s.propTracks.length))throw Error(`${s.id} missing executable body/prop event`);
 for(const a of s.actors){if(!a.idleMotion&&!s.idleException)throw Error(`${s.id} idleMotion=0 requires exception`);for(const p of a.bodyEvents||[])if(!Number.isFinite(p.at)||p.duration<=0||Math.abs(p.dy??0)>4||Math.abs(p.lean??0)>.04)throw Error('Invalid body-only pulse');}
 if(s.semanticTracks!==s.propTracks&&JSON.stringify(s.semanticTracks)!==JSON.stringify(s.propTracks))throw Error('propTracks must be executed, not descriptive-only');
}
