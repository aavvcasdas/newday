import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createCanvas,drawWhale,meta } from './player.mjs';

const output=path.resolve('番外MV/把回忆拼好给你/样片/主角动作复刻_七状态.mp4');
fs.mkdirSync(path.dirname(output),{recursive:true});
const clips=[['idle',3.2],['waving',3.0],['jumping',3.5],['failed',3.5],['waiting',3.0],['working',5.0],['review',3.0]];
const ends=[];let duration=0;for(const [,seconds] of clips){duration+=seconds;ends.push(duration);}
const fps=30, frames=Math.round(duration*fps), c=createCanvas(960,720),ctx=c.getContext('2d');
const p=spawn(process.env.FFMPEG||'ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate',String(fps),'-vcodec','png','-i','-','-an','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p',output],{stdio:['pipe','inherit','inherit']});
for(let frame=0;frame<frames;frame++) {
  const t=frame/fps;let index=ends.findIndex(end=>t<end);if(index<0) index=clips.length-1;
  const [state]=clips[index], start=index?ends[index-1]:0, local=t-start;
  ctx.fillStyle='#f6ecdd';ctx.fillRect(0,0,960,720);
  ctx.fillStyle='#dfedf2';ctx.beginPath();ctx.roundRect(28,28,904,664,28);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.50)';ctx.beginPath();ctx.arc(480,345,265,0,Math.PI*2);ctx.fill();
  ctx.textAlign='center';ctx.fillStyle='#344e65';ctx.font='bold 31px StudyCJK';ctx.fillText('Day12 鲸娘 · 主角动作样片',480,77);
  ctx.font='bold 23px StudyCJK';ctx.fillStyle='#54748a';ctx.fillText(`${String(index+1).padStart(2,'0')} / 07    ${meta.states[state].label}`,480,119);
  ctx.fillStyle='rgba(54,76,91,0.17)';ctx.beginPath();ctx.ellipse(480,624,128,16,0,0,Math.PI*2);ctx.fill();
  drawWhale(ctx,state,local,{x:480,y:624,h:500});
  ctx.fillStyle='#bdcfda';ctx.beginPath();ctx.roundRect(100,665,760,7,4);ctx.fill();
  ctx.fillStyle='#438ba7';ctx.beginPath();ctx.roundRect(100,665,760*(t/duration),7,4);ctx.fill();
  if(!p.stdin.write(c.toBuffer('image/png'))) await new Promise(resolve=>p.stdin.once('drain',resolve));
}
p.stdin.end();const code=await new Promise(resolve=>p.on('close',resolve));if(code) throw new Error(`ffmpeg exited ${code}`);
console.log(`Saved ${output} (${duration}s)`);
