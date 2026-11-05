import test,{before} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {CLIPS,sampleClip,travel,drawAction,loadMotionAssets} from './motion_v2.mjs';
const require=createRequire(import.meta.url);
let canvasAPI;
for(const prefix of ['', '/tmp/node_render/node_modules/','/home/user/node_modules/']){
 try{canvasAPI=require(prefix+'@napi-rs/canvas');break;}catch{}
}
if(!canvasAPI)throw Error('Install @napi-rs/canvas to run the rendering regression tests');
before(()=>loadMotionAssets(canvasAPI));
const hash=b=>createHash('sha256').update(b).digest('hex');
function render(action,time,extra={}){
 const c=canvasAPI.createCanvas(512,512),g=c.getContext('2d');
 drawAction(g,{action,x:256,y:470,u:30,time,start:0,duration:6,...extra});
 return {c,g,hash:hash(c.data())};
}
for(const action of Object.keys(CLIPS))test(action+' has finite preparation / execution / recovery',()=>{
 const a=sampleClip(action,0,6),b=sampleClip(action,3,6),c=sampleClip(action,6,6);
 assert.equal(a.stage,CLIPS[action].stages[0]);assert.equal(b.stage,CLIPS[action].stages[1]);assert.equal(c.stage,CLIPS[action].stages[2]);
 assert.equal(a.envelope,0);assert.equal(c.envelope,0);assert.equal(c.done,true);
 assert.deepEqual(b,sampleClip(action,3,6));
});
test('path eases into / out of walking and never drifts after arrival',()=>{
 assert.equal(travel(100,400,0,0,2).speed,0);assert.equal(travel(100,400,2,0,2).speed,0);
 assert.equal(travel(100,400,200,0,2).x,400);assert.equal(travel(100,400,1,0,2).x,250);
 assert.equal(travel(400,100,1,0,2).distance,-150);
});
test('repeated evaluation does not restart an action',()=>{
 assert.equal(render('type',1.2).hash,render('type',1.2).hash);
 assert.notEqual(render('type',1).hash,render('type',1.2).hash);
});
test('typing moves hands but preserves the original rigid face pixels',()=>{
 const a=render('type',1),b=render('type',1.2);
 const face=g=>g.getImageData(235,263,35,35).data;
 assert.ok(face(a.g).some(v=>v!==0));assert.equal(hash(face(a.g)),hash(face(b.g)));
 const hands=g=>g.getImageData(195,342,110,57).data;
 assert.notEqual(hash(hands(a.g)),hash(hands(b.g)));
});
test('all walk poses use the same opaque foot baseline',()=>{
 const bottoms=[];
 for(const time of [.2,.5,.8,1.1,1.4,1.7]){
  const route=travel(0,290,time,0,2.4),{g}=render('look',time,{travel:route});
  const pixels=g.getImageData(0,0,512,512).data;let bottom=-1;
  for(let y=511;y>=0&&bottom<0;y--)for(let x=0;x<512;x++)if(pixels[(y*512+x)*4+3]>220){bottom=y;break;}
  bottoms.push(bottom);
 }
 assert.ok(Math.max(...bottoms)-Math.min(...bottoms)<=1,JSON.stringify(bottoms));
 assert.ok(bottoms.every(y=>Math.abs(y-470)<=2));
});
test('invalid clip is rejected, not silently changed into idle',()=>assert.throws(()=>sampleClip('not-registered',1),/Unknown action/));

test('motion gate ignores subtitle/background/head-only changes but sees hands',async()=>{
 const {createMotionGate}=await import('./motion_gate.mjs');
 const c=canvasAPI.createCanvas(1280,720),g=c.getContext('2d');
 const gate=createMotionGate(canvasAPI.createCanvas,(ctx,{y})=>{ctx.fillStyle='red';ctx.fillRect(50,y,20,20);},true);
 gate.begin();gate.draw(g,{y:100});const a=gate.hash();
 g.fillStyle='cyan';g.fillRect(0,0,1280,720); // background/subtitle entirely changes
 gate.begin();gate.draw(g,{y:120});assert.equal(gate.hash(),a); // head-only change not counted
 gate.begin();gate.draw(g,{y:480});assert.notEqual(gate.hash(),a);
});
