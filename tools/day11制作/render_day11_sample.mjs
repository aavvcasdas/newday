// Day11 无声结构样片：规划轴（measured=false）驱动通用引擎，只验画面结构，不冒充有声成片。
// 输出 Day11/成片/Day11_无声结构样片.mp4（无音轨）+ 抽帧 + 样片报告。
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createCanvas, resolveFfmpeg, W, H } from '../engine/room_base.mjs';
import { createEpisodeRenderer } from '../engine/render_episode.mjs';
import spec from './episode.spec.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const alignment = JSON.parse(fs.readFileSync(path.join(HERE, '无声样片_规划轴.json'), 'utf8'));
const subdata = JSON.parse(fs.readFileSync(path.join(HERE, '无声样片_规划字幕.json'), 'utf8'));
if (alignment.measured !== false) throw new Error('样片入口只接受 measured=false 规划轴');
const r = await createEpisodeRenderer({ spec, alignment, subdata });
const S = 1.5;
const canvas = createCanvas(W * S, H * S);
const g = canvas.getContext('2d');

if (process.argv.includes('--stills-only')) {
  const dir = path.join(HERE, '无声样片抽帧');
  fs.mkdirSync(dir, { recursive: true });
  const times = [0, 0.8, 1.6, ...r.shots.map((s) => (s.start + s.end) / 2), r.duration - 0.5];
  for (const t of times) {
    g.setTransform(S, 0, 0, S, 0, 0);
    g.clearRect(0, 0, W, H);
    r.renderFrame(g, Math.min(t, r.duration - 0.04));
    fs.writeFileSync(path.join(dir, `t_${t.toFixed(2)}.jpg`), canvas.toBuffer('image/jpeg'));
  }
  console.log('STILLS', times.length);
} else {
  const out = path.join(ROOT, 'Day11/成片/Day11_无声结构样片.mp4');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const ff = spawn(resolveFfmpeg(), ['-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W * S}x${H * S}`, '-r', '30', '-i', '-', '-c:v', 'libx264', '-crf', '21', '-preset', 'veryfast', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  ff.stderr.on('data', (d) => { err += d; });
  ff.stdin.on('error', () => {});
  const done = new Promise((res, rej) => { ff.on('error', rej); ff.on('close', (c) => (c === 0 ? res() : rej(new Error(err.slice(-1500))))); });
  for (let f = 0; f < r.frames; f++) {
    g.setTransform(S, 0, 0, S, 0, 0);
    g.clearRect(0, 0, W, H);
    r.renderFrame(g, f / 30);
    const b = canvas.data();
    if (!ff.stdin.write(Buffer.from(b.buffer, b.byteOffset, b.byteLength))) await Promise.race([new Promise((res) => ff.stdin.once('drain', res)), done]);
    if (f % 300 === 0) console.log(`${f}/${r.frames}`);
  }
  ff.stdin.end();
  await done;
  const report = { kind: 'silent_structural_sample', measured: false, video: 'Day11/成片/Day11_无声结构样片.mp4', frames: r.frames, duration: r.duration, audio: 'none', note: '规划轴估时排布；配音到位后换实测轴重渲有声版，本样片不作正式成片' };
  fs.writeFileSync(path.join(HERE, '无声样片_报告.json'), JSON.stringify(report, null, 2) + '\n');
  console.log('DONE', out, r.frames, 'frames');
}
