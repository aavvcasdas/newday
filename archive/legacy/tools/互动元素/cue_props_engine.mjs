// Deterministic, frame-based contact choreography. Cartoon kinematics, NOT a rigid-body simulator.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const CORE=require(path.join(ROOT,'video-fx/src/core.js'));
const {clamp,paint,ellPts,inkLine,rrPts,hash,ring,reseedBoil,arcPt}=CORE;
export {actorAnchors as getActorAnchors} from './actor_contacts.mjs';
export const FPS=30;
export function validateEvent(e){
 if(!['drop_bonk','slap_deflect','tug_grab','knock_bowl','unroll_scroll'].includes(e.verb))throw Error('Unimplemented verb '+e.verb);
 if(![e.startFrame,e.contactFrame,e.endFrame].every(Number.isInteger)||e.startFrame>=e.contactFrame||e.contactFrame>=e.endFrame)throw Error('Invalid event frames');
 if(e.measured===true&&(!e.audio_sha256||!e.word_id))throw Error('Measured contact needs audio hash and measured word id');
 if(e.measured!==true&&e.measured!==false)throw Error('Explicit measured flag required');
 return e;
}
// Freeze actor AND prop presentation time for exactly frames N,N+1; normal time resumes continuously.
export function presentationFrame(frame,contactFrame,hold=2){if(frame<contactFrame)return frame;return frame<contactFrame+hold?contactFrame:frame-hold+1;}
export function burst(ctx,x,y,age){if(age<0||age>.32)return;const p=age/.32;ctx.save();ctx.globalAlpha=1-p;
 for(let i=0;i<7;i++){const a=i*Math.PI*2/7,dist=9+p*42;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*dist,y+Math.sin(a)*dist);ctx.lineTo(x+Math.cos(a)*(dist+8*(1-p)),y+Math.sin(a)*(dist+8*(1-p)));ctx.strokeStyle=i%2?'#F0D08A':'#D5898F';ctx.lineWidth=2.5;ctx.stroke();}ctx.restore();}
export const PROP_LIBRARY={
 sesame_flatbread:{id:'sesame_flatbread',extent:{bottom:38},draw(ctx,t,st={}){
  ctx.save();ctx.scale(1+(st.squash||0)*.18,1-(st.squash||0)*.18);reseedBoil(0);
  paint(ctx,ellPts(0,0,58,38,28,.3),{wash:'#CF853F',fill:'#E8BA78',fillOp:235,ink:'#433548',sw:2.4});
  paint(ctx,ellPts(-2,-4,48,29,24,.2),{wash:'#F5D59A',washOp:185,ink:'#AF713D',sw:1});
  for(let i=0;i<15;i++)paint(ctx,ellPts((hash(i*3)-.5)*75,(hash(i*7+1)-.5)*40,2.5,1.2,7,.1,i*.4),{wash:i%3?'#FFF3CE':'#735235',ink:null});
  inkLine(ctx,[[-36,11],[-10,18],[22,13]],1,'rgba(130,79,33,.4)','bread',.5);ctx.restore();
 }},
 speech_missile:{id:'speech_missile',extent:{left:-108},draw(ctx,t,st={}){
  if(/[\d%]/.test(st.text||''))throw Error('Numeric prop text forbidden');reseedBoil(0);
  paint(ctx,rrPts(-108,-36,216,72,16,0),{wash:st.hit?'#E9CCD2':'#F0EDDE',fill:'#D2E0DC',fillOp:115,ink:'#30364E',sw:2.5});
  inkLine(ctx,[[-80,24],[-60,28],[-35,25]],1,'#B5B9AA','papertexture',.3);
  ctx.font='800 21px NotoSansSC';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#33425A';ctx.fillText(st.text||'你真确定吗？',0,0);
  if(st.hit){inkLine(ctx,[[-83,-25],[-18,22]],3.5,'#B85E70','reject1',0);inkLine(ctx,[[-18,-25],[-83,22]],3.5,'#B85E70','reject2',0);}
 }},
 rice_bowl:{id:'rice_bowl',draw(ctx,t,st={}){
  reseedBoil(0);paint(ctx,[[ -45,-10],[45,-10],[32,28],[-29,28]],{wash:'#86B5CF',fill:'#C2DCE1',fillOp:220,ink:'#32445D',sw:2.5});
  paint(ctx,ellPts(0,-10,45,12,24,.1),{wash:'#5B809A',fill:'#A9C5D0',fillOp:125,ink:'#32445D',sw:2});
  inkLine(ctx,[[-29,11],[0,17],[31,11]],1.1,'#F2F0DF','bowlglaze',.2);paint(ctx,ellPts(1,13,10,5,14,.1),{wash:'#437891',ink:null});
  if(st.hit)burst(ctx,0,-13,st.age||0);
 }},
 old_notebook:{id:'old_notebook',draw(ctx,t,st={}){const w=70+Math.max(0,Math.min(1,st.open??1))*80;
  paint(ctx,rrPts(-w/2,-38,w,76,6,0),{wash:'#E9DEC6',fill:'#F9EAC9',ink:'#3F4B61',sw:2});
  for(let i=0;i<3;i++)inkLine(ctx,[[-w/2+25+i*28,-22],[-w/2+22+i*28,21]],1,'#B5A98D','fold'+i,0);
 }}
};
export function sampleInteraction(frame,e,A){
 validateEvent(e);if(frame<e.startFrame||frame>e.endFrame)return null;
 const contact=A.contact,params=e.params||{},p=(x,a,b)=>clamp((x-a)/(b-a));
 let position,rotation=0,hit=false;
 if(e.verb==='drop_bonk'){
  const radius=(params.radius??38)*(params.scale??.7),head=contact.headTop,land=params.land;
  if(!land)throw Error('Drop requires an actual landing surface');
  if(frame<=e.contactFrame){const q=p(frame,e.startFrame,e.contactFrame);position=[head[0],-75+(head[1]-radius+75)*q*q];}
  else{const q=p(frame,e.contactFrame,e.contactFrame+22);position=arcPt([head[0],head[1]-radius],[land[0],land[1]-radius],84,1-(1-q)**2);rotation=q*.32;}
  return {position,rotation,hit:frame>=e.contactFrame,contactPoint:[head[0],head[1]],squash:Math.abs(ring((frame-e.contactFrame)/FPS,.35,2,5))};
 }
 if(e.verb==='slap_deflect'){
  const f=presentationFrame(frame,e.contactFrame),target=contact.fingerR||contact.handR,s=params.scale??.8;
  const end=[target[0]+520,target[1]-210];let edge;
  if(f<=e.contactFrame){const q=p(f,e.startFrame,e.contactFrame);edge=[1350+(target[0]-1350)*(1-(1-q)**3),target[1]];}
  else{const q=p(f,e.contactFrame,e.endFrame-2);edge=[target[0]+(end[0]-target[0])*q*q,target[1]+(end[1]-target[1])*q*q];rotation=q*1.2;}
  // Rotate around the impact edge, never use a center offset as if it were contact.
  return {position:edge,rotation,originOffset:[108*s,0],hit:f>=e.contactFrame,contactPoint:target,presentationFrame:f};
 }
 if(e.verb==='unroll_scroll')return {position:A.current.handR,open:p(frame,e.startFrame,e.contactFrame)};
 return {contactPoint:contact.handR}; // tug/knock are constrained by both actual hands and utensil geometry in the caller.
}
export function renderCueInteraction(ctx,frame,e,A,registry={}){
 const sample=sampleInteraction(frame,e,A);if(!sample)return null;
 const prop=registry[e.propId]||PROP_LIBRARY[e.propId];if(!prop)throw Error('Unknown prop '+e.propId);
 if(!sample.position)return sample;
 const scale=e.params?.scale??1;ctx.save();ctx.translate(...sample.position);ctx.rotate(sample.rotation||0);if(sample.originOffset)ctx.translate(...sample.originOffset);ctx.scale(scale,scale);prop.draw(ctx,frame/FPS,{...e.params,hit:sample.hit,squash:sample.squash,open:sample.open});ctx.restore();
 if(sample.hit)burst(ctx,...sample.contactPoint,((sample.presentationFrame??frame)-e.contactFrame)/FPS);
 return sample;
}
