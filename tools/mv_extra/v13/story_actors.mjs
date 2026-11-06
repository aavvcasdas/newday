// Preview-only cast renderer: v8 sets, v13 lead poses and pre-existing v12 guest actions.
// No whole-image interpolation between generated drawings.
import path from 'node:path';
import {ROOT, loadImage} from './actors.mjs';
const lead={};
for(const n of ['whale_swim','whale_point','whale_bird']) lead[n]=await loadImage(path.join(ROOT,'assets/ai-girls/lyric-action-v13',`${n}.png`));
const bird=await loadImage(path.join(ROOT,'assets/ai-girls/lyric-action-v13/bird_cutout.png'));
const mapping={claude:'claude_letter',gemini:'gemini_shell',doubao:'doubao_cup',gpt:'gpt_letter',kimi:'kimi_photo',qwen:'qwen_lantern',zai:'zai_read'};
const guest={};
for(const [name,pose] of Object.entries(mapping))guest[name]=await loadImage(path.join(ROOT,'assets/ai-girls/actions-v12',`${pose}.png`));
export function drawLead(c,index,t,shot,{x,y,h,alpha=1,flipX=false,noShadow=false}){
 const n=index===25||index===26?'whale_swim':index===9?'whale_point':index===29?'whale_bird':null;
 if(!n)return false;
 const lt=Math.max(0,t-shot.start),dur=Math.max(0.2,shot.end-shot.start);
 let p=n==='whale_swim'?(lt/1.35)%1:Math.min(1,lt/Math.max(.8,dur*.8));
 const f=Math.min(15,Math.floor(p*16));
 // For swimming the body is horizontal. The scene's motion follows the reach
 // direction; it is not a standing sprite translated without limb animation.
 const swimming=n==='whale_swim';
 if(swimming)x-=Math.min(1,lt/dur)*65;
 if(!noShadow&&!swimming){c.save();c.globalAlpha*=alpha;c.fillStyle='rgba(18,28,40,.22)';c.beginPath();c.ellipse(x,y+2,h*.23,h*.035,0,0,Math.PI*2);c.fill();c.restore();}
 c.save();c.globalAlpha*=alpha;c.translate(x,y);if(flipX)c.scale(-1,1);
 if(swimming){const sh=270,w=h*384/sh;c.drawImage(lead[n],f*384,146,384,sh,-w/2,-h,w,h);}
 else {const w=h*384/416;c.drawImage(lead[n],f*384,0,384,416,-w/2,-h,w,h);}
 c.restore();
 if(n==='whale_bird'){
  const fly=Math.max(0,Math.min(1,(lt-.15)/Math.max(.7,dur-.3))),k=h/416;
  const x0=x-95*k,y0=y-208*k;
  c.save();c.globalAlpha*=alpha*(1-Math.max(0,(fly-.8)/.2));c.translate(x0-150*fly,y0-95*fly);c.rotate(-.18*fly);
  c.drawImage(bird,-bird.width*k/2,-bird.height*k/2,bird.width*k,bird.height*k);c.restore();
 }
 return {row:0,column:f};
}
export function drawGuest(c,name,t,shot,{x,y,h,alpha=1,flipX=false,noShadow=false}){
 const im=guest[name]; if(!im)return false;
 const d=[350,220,180,180,180,400,350,180,180,180,1000],lt=Math.max(0,(t-shot.start)*1000-['doubao','claude','gemini','qwen','gpt','kimi','zai'].indexOf(name)*80);let ms=lt, f=0;
 while(f<10&&ms>=d[f]){ms-=d[f++];}
 if(!noShadow){c.save();c.globalAlpha*=alpha;c.fillStyle='rgba(18,28,40,.22)';c.beginPath();c.ellipse(x,y+2,h*.23,h*.035,0,0,Math.PI*2);c.fill();c.restore();}
 c.save();c.globalAlpha*=alpha;c.translate(x,y);if(flipX)c.scale(-1,1);const w=h*384/416;
 c.drawImage(im,f*384,0,384,416,-w/2,-h,w,h);c.restore();return {row:0,column:f};
}
