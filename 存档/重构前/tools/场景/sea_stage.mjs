// 海底基地的光影/有机层装饰器；不替换原房间，不添加人物、家具或音乐。
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const CORE=require(path.join(process.env.VIDEO_FX_DIR||path.join(ROOT,'video-fx'),'src/core.js'));
const {W,H,TAU,clamp,ring,reseedBoil,paint,ellPts,inkLine,glow}=CORE;
export const MOODS=Object.freeze({
 work_cool:Object.freeze({dim:0.025,beam:'#6BCDE4'}),
 panic_alert:Object.freeze({dim:.05,beam:'#9CCBE8'}),
 cinema_glow:Object.freeze({dim:.20,beam:'#7CCFE5'}),
 warm_meal:Object.freeze({dim:.025,beam:'#ABDDE0'})
});
// Outer camera is already applied. A factor of 1 remains attached to the actor plane.
export function layerOffset(cam={},factor=1){if(factor===1)return {x:0,y:0};return {x:((cam.cx??W/2)-W/2)*(1-factor),y:((cam.cy??H/2)-H/2)*(1-factor)};}
export function withParallax(ctx,cam,factor,fn){const p=layerOffset(cam,factor);ctx.save();ctx.translate(p.x,p.y);fn();ctx.restore();}
export function impactAt(t,at){return at==null?0:ring(t-at,.55,3.2,5);}
export function doorOpenAt(t,start,end){const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};return smooth((t-start)/1.2)*(1-smooth((t-(end-.85))/.65));}
// Fish displacement is continuous after an impulse (not t * instantaneous velocity).
export function fishPhase(t,at){const age=at==null?-1:t-at;return t+(age>0?.35*(1-Math.exp(-age*3)):0);}
export function drawAbyssOutside(ctx,t,cam,mood,{impactTime=null}={}){
 const px=148,py=236,r=77; // ORIGINAL porthole center/radius, clipped before moving the sea layer.
 ctx.save();ctx.beginPath();ctx.arc(px,py,r,0,TAU);ctx.clip();
 const grad=ctx.createLinearGradient(0,py-r,0,py+r);grad.addColorStop(0,'#081C37');grad.addColorStop(1,'#123B59');ctx.fillStyle=grad;ctx.fillRect(px-r,py-r,r*2,r*2);
 withParallax(ctx,cam,.67,()=>{ // .33 extra offset + .22 architecture offset = .55, effective .45 sea layer
  for(let i=0;i<3;i++){const x=px-r+28+i*42+Math.sin(t*.55+i)*6;paint(ctx,[[x-14,py-r-10],[x+1,py-r-10],[x+49,py+r+12],[x+20,py+r+12]],{wash:mood.beam,washOp:19,ink:null});}
  reseedBoil(t);
  // Small distant jelly, contained in the existing porthole, not a new scene character.
  const jx=156+Math.sin(t*.65)*13,jy=244+Math.sin(t*.38)*27,pulse=1+.09*Math.sin(t*2.5);
  glow(ctx,jx,jy,16,'#77D6DD',.10);
  paint(ctx,ellPts(jx,jy,7*pulse,4.5/pulse,12,.2),{wash:'#86DCE6',washOp:105,ink:null});
  for(let k=-1;k<=1;k++)inkLine(ctx,[[jx+k*3,jy+3],[jx+k*4+Math.sin(t*1.8+k)*2,jy+12]],.7,'rgba(133,225,230,.35)','sea-jelly'+k,.3);
  const swim=fishPhase(t,impactTime);
  for(let i=0;i<2;i++){const x=148+Math.sin(swim*.6+i*2)*39,y=213+i*42+Math.sin(swim*.8+i)*6,dir=i?-1:1;
   paint(ctx,ellPts(x,y,10,4.5,12,.2),{wash:'#65B9CE',washOp:110,ink:null});paint(ctx,[[x-dir*8,y],[x-dir*15,y-5],[x-dir*15,y+5]],{wash:'#65B9CE',washOp:100,ink:null});}
 });
 ctx.restore();reseedBoil(0);
}
export function drawDoorPortal(ctx,amount){
 if(amount<=.001)return;ctx.save();ctx.beginPath();ctx.rect(998,148,145,394);ctx.clip();
 const grad=ctx.createLinearGradient(998,148,1143,540);grad.addColorStop(0,'#847759');grad.addColorStop(1,'#C5AE7D');ctx.globalAlpha=amount*.85;ctx.fillStyle=grad;ctx.fillRect(998,148,145,394);
 ctx.strokeStyle='rgba(81,76,65,.45)';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(1096,148);ctx.lineTo(1096,542);ctx.moveTo(998,450);ctx.lineTo(1143,450);ctx.stroke();ctx.restore();
}
export function drawMonitorBounce(ctx,t,x,y,failed=false){
 const col=failed?'#C66A8A':'#72BCC8',alpha=failed?.07+.015*Math.sin(t*2):.06;
 // Slow modulation only; no alarm strobes or animated code bars/indicators.
 glow(ctx,x,y-44,112,col,alpha);ctx.save();ctx.globalAlpha=.06;ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(x,y+69,93,16,0,0,TAU);ctx.fill();ctx.restore();
}
export function drawLampCone(ctx,x,y){
 paint(ctx,[[x-8,y-61],[x+31,y-65],[x+95,y+6],[x-81,y+6]],{wash:'#F6D997',washOp:22,ink:null});glow(ctx,x+2,y-18,68,'#F6D997',.06);
}
export function drawDoorLeak(ctx,amount){
 if(amount<=.001)return;ctx.save();ctx.globalAlpha=amount;
 const grad=ctx.createLinearGradient(1080,552,986,640);grad.addColorStop(0,'rgba(255,215,140,.35)');grad.addColorStop(1,'rgba(255,215,140,0)');ctx.fillStyle=grad;
 ctx.beginPath();ctx.moveTo(1003,553);ctx.lineTo(1154,553);ctx.lineTo(1150,634);ctx.lineTo(812,632);ctx.closePath();ctx.fill();ctx.restore();
}
export function drawTvAmbientBounce(ctx,t,x,y,mode='work'){
 const col=mode==='meal'?'#EACD98':mode==='spam'?'#AB8AA4':'#82BCCA';
 const alpha=.065+.006*Math.sin(t*1.4);
 ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(x-210,y+105);ctx.lineTo(x+210,y+105);ctx.lineTo(x+285,628);ctx.lineTo(x-310,628);ctx.closePath();ctx.fill();ctx.restore();
 glow(ctx,x,594,220,col,.035);
}
function foreground(ctx,t,cam){
 // Return to screen space: foreground stays at extreme edges even during a close-up.
 const z=cam.z??1;ctx.save();ctx.translate(cam.cx??W/2,cam.cy??H/2);ctx.scale(1/z,1/z);ctx.translate(-W/2,-H/2);
 ctx.beginPath();ctx.rect(0,0,70,H);ctx.rect(W-70,0,70,H);ctx.clip();
 withParallax(ctx,cam,1.28,()=>{
  reseedBoil(t);for(let i=0;i<2;i++)inkLine(ctx,[[12+i*22,730],[18+i*20+Math.sin(t*.8+i)*4,650],[25+i*17+Math.sin(t*.9+i)*6,593]],7-i*2,'rgba(19,54,64,.3)','sea-edge'+i,.5);
 });
 // Only edge bubbles: never over eyes or the central subtitle strip.
 for(let i=0;i<3;i++){const x=i%2?W-30:25,y=600-((t*12+i*97)%430);ctx.beginPath();ctx.arc(x,y,2+i%2,0,TAU);ctx.strokeStyle='rgba(120,193,204,.18)';ctx.lineWidth=1;ctx.stroke();}
 ctx.restore();reseedBoil(0);
}
export function renderUnderwaterStage(ctx,t,cam,state,drawActorsFn){
 if(typeof state.drawRoom!=='function')throw Error('sea_stage requires the original room callback');
 const mood=MOODS[state.mood||'work_cool'];if(!mood)throw Error('Unknown sea mood');
 reseedBoil(0);
 // Architecture at .78; actors/television at 1.0; sea .45; screen-edge foreground 1.28.
 withParallax(ctx,cam,.78,()=>{
  state.drawRoom(t);drawAbyssOutside(ctx,t,cam,mood,state);
  state.drawFixtures?.(t); // boards occlude the window; never punch a sea hole through furniture
  ctx.save();ctx.fillStyle=`rgba(4,9,26,${mood.dim})`;ctx.fillRect(-160,-100,W+320,H+200);ctx.restore();
 });
 // No undocumented bowl jump. Only explicit, genuine contact events may set impactTime.
 drawDoorLeak(ctx,state.doorOpen||0);
 reseedBoil(0);drawActorsFn?.(impactAt(t,state.impactTime));
 foreground(ctx,t,cam);reseedBoil(0);
}
