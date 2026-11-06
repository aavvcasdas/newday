// V8 original fixed-cell character atlases. Frame times are per state; one-shot
// presentation actions end in a held pose rather than endlessly dropping props.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const require=createRequire(import.meta.url);
const {loadImage,createCanvas}=require('../../engine/node_modules/@napi-rs/canvas');
const dir=path.join(ROOT,'assets/ai-girls/lyric-v8');
export const CAST={};
for(const name of ['whale','doubao','claude','gemini','gpt','kimi','qwen']){
  const metadata=JSON.parse(fs.readFileSync(path.join(dir,`${name}.json`),'utf8'));
  const image=await loadImage(path.join(dir,`${name}.png`));
  if(image.width!==metadata.columns*metadata.cell_width||image.height!==metadata.rows*metadata.cell_height) throw new Error(`Bad atlas size for ${name}`);
  CAST[name]={metadata,image};
}
export function frameAt(name,state,t){
  const s=CAST[name]?.metadata.states[state];if(!s)throw new Error(`Unknown atlas state ${name}/${state}`);
  const duration=s.durations_ms.reduce((a,b)=>a+b,0);
  let ms=Math.max(0,t*1000);
  if(s.loop) ms%=duration; else ms=Math.min(ms,duration-0.001);
  for(let i=0;i<s.frames;i++){if(ms<s.durations_ms[i])return {row:s.row,column:i};ms-=s.durations_ms[i];}
  throw new Error('Invalid frame timing');
}
export function drawCharacter(c,name,state,t,{x,y,h,alpha=1,flipX=false,noShadow=false}){
  const {metadata:m,image}=CAST[name], f=frameAt(name,state,t),w=h*m.cell_width/m.cell_height;
  if(!noShadow){c.save();c.globalAlpha*=alpha;c.fillStyle='rgba(18,28,40,0.22)';c.beginPath();c.ellipse(x,y+2,h*.23,h*.035,0,0,Math.PI*2);c.fill();c.restore();}
  c.save();c.globalAlpha*=alpha;c.translate(x,y);if(flipX)c.scale(-1,1);
  c.drawImage(image,f.column*m.cell_width,f.row*m.cell_height,m.cell_width,m.cell_height,-w/2,-h,w,h);c.restore();return f;
}
export function characterSheet(){
  const c=createCanvas(1800,1000),g=c.getContext('2d');g.fillStyle='#f3ebdd';g.fillRect(0,0,1800,1000);
  g.textAlign='center';g.fillStyle='#2e465b';g.font='bold 36px MvBold';g.fillText('v8 · 角色动作帧与歌词动作',900,50);
  const names=['whale','claude','doubao','gemini','gpt','kimi','qwen'];
  names.forEach((name,row)=>{
    const y=75+row*125;g.textAlign='left';g.font='bold 23px MvBold';g.fillStyle='#315168';g.fillText(name,35,y+72);
    for(let i=0;i<6;i++)drawCharacter(g,name,'offer',[0,.2,.4,.65,.85,1.3][i],{x:285+i*250,y:y+112,h:112,noShadow:true});
  });return c;
}
