import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {MOODS,renderUnderwaterStage,drawAbyssOutside,layerOffset,doorOpenAt,fishPhase,impactAt} from './sea_stage.mjs';
import {createMotionGate} from '../day9制作/motion_gate.mjs';
import {bg} from '../day8制作/render_day8.mjs';
const require=createRequire(import.meta.url);let api;
for(const prefix of ['','/tmp/node_render/node_modules/']){try{api=require(prefix+'@napi-rs/canvas');break;}catch{}}
if(!api)throw Error('Install @napi-rs/canvas');
const digest=b=>createHash('sha256').update(b).digest('hex');
function render(t,mood='work_cool',cam={cx:640,cy:360,z:1}){
 const c=api.createCanvas(1280,720),g=c.getContext('2d');
 renderUnderwaterStage(g,t,cam,{mood,drawRoom:()=>bg(g,t)},()=>{});return {c,g};
}
for(const mood of Object.keys(MOODS))test('mood '+mood+' deterministic at absolute time',()=>{
 assert.equal(digest(render(1,mood).c.data()),digest(render(1,mood).c.data()));
 assert.notEqual(digest(render(1,mood).c.data()),digest(render(2,mood).c.data()));
});
test('architectural wall and porthole rim do not boil',()=>{
 const a=render(1).g,b=render(2).g;
 for(const rect of [[500,100,60,60],[235,210,5,40]])assert.equal(digest(a.getImageData(...rect).data),digest(b.getImageData(...rect).data));
});
test('sea is clipped to stationary aperture before parallax',()=>{
 for(const cx of [430,830]){
  const c=api.createCanvas(1280,720),g=c.getContext('2d');drawAbyssOutside(g,2,{cx,cy:420,z:1.2},MOODS.work_cool);
  const rgba=g.getImageData(0,0,1280,720).data;
  for(let y=0;y<720;y++)for(let x=0;x<1280;x++)if(rgba[(y*1280+x)*4+3]>0)assert.ok(Math.hypot(x-148,y-236)<=79);
 }
});
test('parallax factors order and actor plane stays put',()=>{
 assert.equal(layerOffset({cx:430,cy:420},1).x,0);
 assert.ok(Math.abs(layerOffset({cx:430},.45).x)>Math.abs(layerOffset({cx:430},.78).x));
 assert.ok(layerOffset({cx:430},1.28).x>0);
 assert.ok(Math.abs(layerOffset({cx:430},.78).x+layerOffset({cx:430},.67).x-layerOffset({cx:430},.45).x)<1e-9);
});
test('door opens and closes; fish impulse has no time multiplication jump',()=>{
 assert.equal(doorOpenAt(0,0,10),0);assert.equal(doorOpenAt(10,0,10),0);assert.equal(doorOpenAt(4,0,10),1);
 assert.ok(Math.abs(fishPhase(2+1e-7,2)-fishPhase(2-1e-7,2))<1e-5);
 assert.equal(impactAt(1,2),0);assert.equal(impactAt(3,2),0);
});
test('stage does not leak a canvas transform',()=>{
 const c=api.createCanvas(1280,720),g=c.getContext('2d');g.translate(10,20);g.scale(1.2,1.2);const before=g.getTransform();
 renderUnderwaterStage(g,2,{cx:430,cy:420,z:1.22},{mood:'cinema_glow',drawRoom:()=>bg(g,2)},()=>{});
 const after=g.getTransform();for(const k of ['a','b','c','d','e','f'])assert.ok(Math.abs(before[k]-after[k])<1e-6);
});
test('animated atmosphere cannot change the isolated actor hash',()=>{
 const c=api.createCanvas(1280,720),g=c.getContext('2d');const gate=createMotionGate(api.createCanvas,(ctx)=>{ctx.fillStyle='red';ctx.fillRect(600,500,30,20);},true);
 const hashes=[];for(const t of [1,2]){gate.begin();renderUnderwaterStage(g,t,{cx:640,cy:360,z:1},{mood:'cinema_glow',drawRoom:()=>bg(g,t)},()=>gate.draw(g,{}));hashes.push(gate.hash());}
 assert.equal(hashes[0],hashes[1]);
});

test('fixtures occlude sea rather than a window punching through a repair board',()=>{
 const c=api.createCanvas(1280,720),g=c.getContext('2d');
 renderUnderwaterStage(g,2,{cx:640,cy:360,z:1},{mood:'work_cool',drawRoom:()=>bg(g,2),drawFixtures:()=>{g.fillStyle='#00ff00';g.fillRect(115,200,60,60);}},()=>{});
 const p=g.getImageData(140,220,1,1).data;assert.ok(p[1]>230&&p[0]<20);
});
test('optional plant movement replaces the original five leaves, default room stays still',()=>{
 const plant=(t,animate)=>{const c=api.createCanvas(1280,720),g=c.getContext('2d');bg(g,t,{animatePlants:animate});return g;};
 const a=plant(1,false),b=plant(2,false),c=plant(1,true),d=plant(2,true);
 const leaves=g=>digest(g.getImageData(1140,380,100,100).data);
 assert.equal(leaves(a),leaves(b));assert.notEqual(leaves(c),leaves(d));
 const pot=g=>digest(g.getImageData(1180,500,42,22).data);assert.equal(pot(c),pot(d));
});
