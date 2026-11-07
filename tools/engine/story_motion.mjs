// Shared deterministic, backend-independent story motion. No face deformation and
// no invented landmarks: callers supply anchors calibrated for their actual art.
const clamp01=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp01(x);return x*x*(3-2*x)};
export function validateMotionPath(keys){
 if(!Array.isArray(keys)||keys.length<2)throw Error('motionPath requires at least two keys');
 for(let i=0;i<keys.length;i++){
  const k=keys[i];if(![k.at,k.x,k.y].every(Number.isFinite))throw Error('motionPath keys require finite at/x/y');
  if(i&&k.at<=keys[i-1].at)throw Error('motionPath key times must increase');
 }
 return true;
}
export function sampleMotionPath(keys,t){
 validateMotionPath(keys); if(!Number.isFinite(t))throw Error('time must be finite');
 if(t<=keys[0].at)return {x:keys[0].x,y:keys[0].y,moving:false};
 const last=keys[keys.length-1];if(t>=last.at)return{x:last.x,y:last.y,moving:false};
 let i=1;while(t>keys[i].at)i++;const a=keys[i-1],b=keys[i],p=smooth((t-a.at)/(b.at-a.at));
 return{x:a.x+(b.x-a.x)*p,y:a.y+(b.y-a.y)*p,moving:a.x!==b.x||a.y!==b.y};
}
export function validateAttachment(a){
 if(!a||!Number.isInteger(a.actor)||a.actor<0||typeof a.anchor!=='string'||!a.anchor||![a.from,a.to].every(Number.isFinite)||a.to<=a.from)throw Error('invalid attachment actor/anchor/time');
 if(a.offset!=null&&(!Array.isArray(a.offset)||a.offset.length!==2||!a.offset.every(Number.isFinite)))throw Error('invalid attachment offset');
 if(a.release&&(!Number.isFinite(a.release.duration)||a.release.duration<=0||!Array.isArray(a.release.to)||a.release.to.length!==2||!a.release.to.every(Number.isFinite)))throw Error('invalid attachment release');
 return true;
}
export function attachedPosition(a,t,anchorAt){
 validateAttachment(a);if(t<a.from)return null;
 if(typeof anchorAt!=='function')throw Error('attachment requires anchorAt');
 const sample=Math.min(t,a.to),point=anchorAt(a.actor,a.anchor,sample);
 if(!point||point.length!==2||!point.every(Number.isFinite))throw Error(`missing calibrated anchor ${a.actor}:${a.anchor}`);
 const offset=a.offset||[0,0],origin=[point[0]+offset[0],point[1]+offset[1]];
 if(t<=a.to||!a.release)return {x:origin[0],y:origin[1],held:t<=a.to};
 const q=smooth((t-a.to)/a.release.duration);
 return{x:origin[0]+(a.release.to[0]-origin[0])*q,y:origin[1]+(a.release.to[1]-origin[1])*q,held:false};
}
