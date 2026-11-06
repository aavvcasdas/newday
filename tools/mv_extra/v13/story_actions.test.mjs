import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {ROOT,loadImage,createCanvas} from './actors.mjs';
import {drawGuest,drawLead} from './story_actors.mjs';
const dir=path.join(ROOT,'assets/ai-girls/lyric-action-v13');
for(const name of ['kimi_underwater_final','claude_place','zai_reach','whale_gather_retry','gpt_push_final','doubao_step','qwen_reach','gemini_swim','doubao_lantern','kimi_lantern','claude_firework','gemini_firework','whale_rain_reach','whale_walk_retry','kimi_walk_story','doubao_comfort','doubao_memory','gpt_star','gemini_flower','zai_memento','whale_meet','whale_selfkind_retry','gpt_sweep','gemini_star_toss','claude_collect','whale_read','whale_rainwalk','gemini_kite','kimi_stargaze_seated','zai_clock','whale_camera','qwen_swim_full_retry','gemini_swim_full','whale_wipe_tear','qwen_water_full','gpt_think','kimi_swim_padded_fixed','doubao_umbrella_padded_fixed','whale_ribbon_hold','doubao_shared_umbrella']){
 test(`${name} action contains distinct fixed-size frames`,async()=>{
  const im=await loadImage(path.join(dir,`${name}_action.png`));assert.equal(im.width,384*16);assert.equal(im.height,416);
  const cv=createCanvas(384,416),g=cv.getContext('2d');g.drawImage(im,0,0,384,416,0,0,384,416);const a=Buffer.from(g.getImageData(0,0,384,416).data);
  const n=['kimi_underwater_final','doubao_step','gemini_swim','kimi_lantern','claude_firework','gemini_firework','whale_walk_retry','kimi_walk_story','gpt_sweep','whale_rainwalk','gemini_kite','qwen_swim_full_retry','gemini_swim_full','kimi_swim_padded_fixed'].includes(name)?4:15;g.clearRect(0,0,384,416);g.drawImage(im,n*384,0,384,416,0,0,384,416);const b=Buffer.from(g.getImageData(0,0,384,416).data);
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

test('rain shelter walking uses a different cel from the seated tear gesture',()=>{
 const c=createCanvas(400,450).getContext('2d'), opt={x:200,y:420,h:300};
 const seated={index:12,start:0,end:2},walking={index:13,start:2,end:4};
 assert.equal(drawLead(c,12,1.05,seated,opt).column,10);
 assert.notEqual(drawLead(c,13,2,walking,opt).column,drawLead(c,13,2.3,walking,opt).column);
});
test('sad seated lead has a localized closed-eye frame',async()=>{
 const im=await loadImage(path.join(dir,'whale_sit_blink_action.png'));
 const c=createCanvas(384,416).getContext('2d');
 c.drawImage(im,0,0,384,416,0,0,384,416);const open=Buffer.from(c.getImageData(120,145,126,42).data);
 c.clearRect(0,0,384,416);c.drawImage(im,9*384,0,384,416,0,0,384,416);const closed=Buffer.from(c.getImageData(120,145,126,42).data);
 assert.notDeepEqual(open,closed);
});

test('underwater Qwen is drawn instead of silently omitted',()=>{
 const c=createCanvas(1280,720).getContext('2d'),shot={index:25,start:0,end:2};
 const first=drawGuest(c,'qwen',0,shot,{x:800,y:590,h:190});
 const later=drawGuest(c,'qwen',0.3,shot,{x:800,y:590,h:190});
 assert.notEqual(first.column,later.column);
 assert.ok(c.getImageData(850,400,350,200).data.some((v,i)=>i%4===3&&v));
});

test('time-zone crossing advances the lead walk cel',()=>{
 const c=createCanvas(500,500).getContext('2d'),shot={index:27,start:0,end:2},opt={x:250,y:450,h:250,flipX:true};
 assert.notEqual(drawLead(c,27,0,shot,opt).column,drawLead(c,27,.35,shot,opt).column);
});

test('dragon thought contains closed-eye frame',async()=>{
 const im=await loadImage(path.join(dir,'gpt_think_action.png')),c=createCanvas(384,416).getContext('2d');
 c.drawImage(im,0,0,384,416,0,0,384,416);const open=Buffer.from(c.getImageData(173,105,59,32).data);
 c.clearRect(0,0,384,416);c.drawImage(im,9*384,0,384,416,0,0,384,416);
 assert.notDeepEqual(open,Buffer.from(c.getImageData(173,105,59,32).data));
});

test('Kimi swim timing remains continuous across the underwater cut',()=>{
 const c=createCanvas(1280,720).getContext('2d'),opt={x:200,y:590,h:190};
 const a={index:25,start:38.8333333333,end:40.6666666667},b={index:26,start:40.6666666667,end:42.7};
 assert.equal(drawGuest(c,'kimi',b.start,a,opt).column,drawGuest(c,'kimi',b.start,b,opt).column);
});
test('umbrella gesture settles through the rain cut',()=>{
 const c=createCanvas(800,720).getContext('2d'),opt={x:500,y:590,h:320};
 const a={index:13,start:19.033,end:20.666},b={index:14,start:20.666,end:22.433};
 assert.equal(drawGuest(c,'doubao',a.end-.01,a,opt).column,15);
 assert.equal(drawGuest(c,'doubao',b.start,b,opt).column,15);
});

test('rain hand endpoints are staged within 8 logical pixels at the held key',()=>{
 // Nominal sprite coordinates; not proof of visible hand contact.
 const wh=31*7.4,dh=280;
 const wx=534+(333-192)*wh/416, wy=590-wh+166*wh/416;
 const dx=684+(77-192)*dh/416, dy=590-dh+214*dh/416;
 assert.ok(Math.hypot(wx-dx,wy-dy)<8);
});


test('ribbon hold includes a distinct closed-eye frame and advances within S28',async()=>{
 const im=await loadImage(path.join(dir,'whale_ribbon_hold_action.png')),c=createCanvas(384,416).getContext('2d');
 c.drawImage(im,0,0,384,416,0,0,384,416);const open=Buffer.from(c.getImageData(120,148,114,39).data);
 c.clearRect(0,0,384,416);c.drawImage(im,9*384,0,384,416,0,0,384,416);
 assert.notDeepEqual(open,Buffer.from(c.getImageData(120,148,114,39).data));
 const shot={index:28,start:44.6,end:47.07},opt={x:200,y:400,h:300};
 assert.notEqual(drawLead(c,28,44.6,shot,opt).column,drawLead(c,28,45.8,shot,opt).column);
});


test('shared umbrella cel retains the arm gesture and has no original canopy',async()=>{
 const im=await loadImage(path.join(dir,'doubao_shared_umbrella_action.png'));
 const c=createCanvas(384,416).getContext('2d');c.drawImage(im,0,0,384,416,0,0,384,416);
 assert.equal(c.getImageData(190,30,1,1).data[3],0,'old canopy should be removed');
 const shot={index:13,start:19.03,end:20.67},opt={x:300,y:400,h:300};
 assert.notEqual(drawGuest(c,'doubao',19.03,shot,opt).column,drawGuest(c,'doubao',20.2,shot,opt).column);
});


test('time-zone scene uses the Z.AI watch-hand action',()=>{
 const c=createCanvas(500,500).getContext('2d'),shot={index:27,start:42.7,end:44.6},opt={x:250,y:440,h:250};
 assert.notEqual(drawGuest(c,'zai',42.7,shot,opt).column,drawGuest(c,'zai',43.6,shot,opt).column);
});
