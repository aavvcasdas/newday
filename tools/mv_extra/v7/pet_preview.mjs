// Standalone preview of the ACTUAL atlas playback, not a still-image montage.
import { spawn } from 'node:child_process';
import { createCanvas } from './actors.mjs';
import { drawPet } from './pet.mjs';
import path from 'node:path';
import fs from 'node:fs';

const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const output = path.resolve('番外MV/把回忆拼好给你/样片/v7_角色动态演示.mp4');
fs.mkdirSync(path.dirname(output), {recursive:true});
const p = spawn(ffmpeg, ['-y','-loglevel','error','-f','image2pipe','-framerate','12','-vcodec','png','-i','-','-an','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p',output], {stdio:['pipe','inherit','inherit']});
const canvas = createCanvas(960,540), c = canvas.getContext('2d');
for (let frame = 0; frame < 156; frame++) {
  const t = frame / 12;
  const state = t < 3 ? 'idle' : t < 8 ? 'eating' : t < 11 ? 'empty' : 'idle';
  const stateTime = t < 3 ? t : t < 8 ? t-3 : t < 11 ? t-8 : t-11;
  c.fillStyle = '#f6eddf'; c.fillRect(0,0,960,540);
  c.fillStyle='#d5eaf0'; c.beginPath(); c.roundRect(28,28,904,484,28); c.fill();
  c.fillStyle='#ffffff'; c.globalAlpha=.45; c.beginPath(); c.arc(225,230,145,0,Math.PI*2);c.fill();c.beginPath();c.arc(705,230,145,0,Math.PI*2);c.fill();c.globalAlpha=1;
  c.fillStyle='#395269';c.textAlign='center';c.font='bold 24px MvBold';c.fillText('白发龙娘 · 思考、眨眼、摆尾',242,65);
  c.fillText('蓝发鲸娘 · 抱饭、干饭、空盆',718,65);
  drawPet(c,'dragon','thinking',t,{x:242,y:433,h:340});
  drawPet(c,'whale',state,stateTime,{x:718,y:433,h:340});
  c.font='bold 26px MvBold';c.fillStyle='#406578';c.fillText(state === 'idle' ? '抱着白米饭' : state === 'eating' ? '舀饭 → 送入口中' : '空盆了……',718,480);
  if (!p.stdin.write(canvas.toBuffer('image/png'))) await new Promise(resolve=>p.stdin.once('drain',resolve));
}
p.stdin.end();
const code=await new Promise(resolve=>p.on('close',resolve));
if(code) throw new Error(`ffmpeg exited ${code}`);
console.log(output);
