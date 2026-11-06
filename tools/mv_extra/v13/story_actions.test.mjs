import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {ROOT,loadImage,createCanvas} from './actors.mjs';
import {drawGuest,drawLead} from './story_actors.mjs';
const dir=path.join(ROOT,'assets/ai-girls/lyric-action-v13');
for(const name of ['kimi_underwater_final','claude_place','zai_reach','whale_gather_retry','gpt_push_final','doubao_step','qwen_reach','gemini_swim','doubao_lantern','kimi_lantern','claude_firework','gemini_firework','whale_rain_reach','whale_walk_retry','kimi_walk_story','doubao_comfort','doubao_memory','gpt_star','gemini_flower','zai_memento','whale_meet','whale_selfkind_retry','gpt_sweep','gemini_star_toss']){
 test(`${name} action contains distinct fixed-size frames`,async()=>{
  const im=await loadImage(path.join(dir,`${name}_action.png`));assert.equal(im.width,384*16);assert.equal(im.height,416);
  const cv=createCanvas(384,416),g=cv.getContext('2d');g.drawImage(im,0,0,384,416,0,0,384,416);const a=Buffer.from(g.getImageData(0,0,384,416).data);
  const n=['kimi_underwater_final','doubao_step','gemini_swim','kimi_lantern','claude_firework','gemini_firework','whale_walk_retry','kimi_walk_story','gpt_sweep'].includes(name)?4:15;g.clearRect(0,0,384,416);g.drawImage(im,n*384,0,384,416,0,0,384,416);const b=Buffer.from(g.getImageData(0,0,384,416).data);
  assert.notDeepEqual(a,b);
 });
}
test('story timing advances characters within a shot',()=>{
 const cv=createCanvas(1280,720),c=cv.getContext('2d'),shot={index:18,start:10,end:12};
 assert.notEqual(drawGuest(c,'zai',10,shot,{x:640,y:600,h:250}).column,drawGuest(c,'zai',11,shot,{x:640,y:600,h:250}).column);
 const leadShot={index:1,start:0,end:1};assert.notEqual(drawLead(c,1,0,leadShot,{x:640,y:600,h:250}).column,drawLead(c,1,.8,leadShot,{x:640,y:600,h:250}).column);
});
test('finale gifts finish once and stay raised across the postcard cut',()=>{
 const cv=createCanvas(400,450),c=cv.getContext('2d'),opt={x:200,y:425,h:320};
 for(const name of ['doubao','gpt','gemini']){
  const s30={index:30,start:48.67,end:51};
  const s31={index:31,start:51,end:54.17};
  const s32={index:32,start:54.17,end:56.03};
  assert.equal(drawGuest(c,name,50.8,s30,opt).column,15);
  assert.equal(drawGuest(c,name,51,s31,opt).column,15);
  assert.equal(drawGuest(c,name,54.17,s32,opt).column,15);
 }
 const s31={index:31,start:51,end:54.17},s32={index:32,start:54.17,end:56.03};
 assert.notEqual(drawGuest(c,'zai',51,s31,opt).column,drawGuest(c,'zai',53,s31,opt).column);
 assert.equal(drawGuest(c,'zai',54.17,s32,opt).column,15);
});
test('self embrace includes an actual closed-eye frame',async()=>{
 const im=await loadImage(path.join(dir,'whale_selfkind_retry_action.png'));
 const cv=createCanvas(384,416),c=cv.getContext('2d');
 c.drawImage(im,0,0,384,416,0,0,384,416);const open=Buffer.from(c.getImageData(120,150,110,45).data);
 c.clearRect(0,0,384,416);c.drawImage(im,11*384,0,384,416,0,0,384,416);const closed=Buffer.from(c.getImageData(120,150,110,45).data);
 assert.notDeepEqual(open,closed);
});
