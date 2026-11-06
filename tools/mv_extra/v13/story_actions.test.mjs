import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {ROOT,loadImage,createCanvas} from './actors.mjs';
import {drawGuest,drawLead} from './story_actors.mjs';
const dir=path.join(ROOT,'assets/ai-girls/lyric-action-v13');
for(const name of ['kimi_underwater_final','claude_place','zai_reach','whale_gather_retry','gpt_push_final','doubao_step','qwen_reach','gemini_swim','doubao_lantern','kimi_lantern','claude_firework','gemini_firework','whale_rain_reach','whale_walk_retry','kimi_walk_story','doubao_comfort']){
 test(`${name} action contains distinct fixed-size frames`,async()=>{
  const im=await loadImage(path.join(dir,`${name}_action.png`));assert.equal(im.width,384*16);assert.equal(im.height,416);
  const cv=createCanvas(384,416),g=cv.getContext('2d');g.drawImage(im,0,0,384,416,0,0,384,416);const a=Buffer.from(g.getImageData(0,0,384,416).data);
  const n=['kimi_underwater_final','doubao_step','gemini_swim','kimi_lantern','claude_firework','gemini_firework','whale_walk_retry','kimi_walk_story'].includes(name)?4:15;g.clearRect(0,0,384,416);g.drawImage(im,n*384,0,384,416,0,0,384,416);const b=Buffer.from(g.getImageData(0,0,384,416).data);
  assert.notDeepEqual(a,b);
 });
}
test('story timing advances characters within a shot',()=>{
 const cv=createCanvas(1280,720),c=cv.getContext('2d'),shot={index:18,start:10,end:12};
 assert.notEqual(drawGuest(c,'zai',10,shot,{x:640,y:600,h:250}).column,drawGuest(c,'zai',11,shot,{x:640,y:600,h:250}).column);
 const leadShot={index:1,start:0,end:1};assert.notEqual(drawLead(c,1,0,leadShot,{x:640,y:600,h:250}).column,drawLead(c,1,.8,leadShot,{x:640,y:600,h:250}).column);
});
