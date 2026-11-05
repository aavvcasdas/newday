// make_char_compare.mjs — 三种形象并排对比（同一帧、同一裁切、同一镜头）
//
//   A  dsh   ：Day2「加更」电视里那版 DSH 39 张贴纸（**现用**，2026-10-27 起）
//   B  ss2   ：Day2 清理口径的像素骨架 + 2× 超采样（上一轮的方案）
//   C  crisp ：整数格 + alpha 二值化（Day4 v1 最糊那版）
//
// 用法：node make_char_compare.mjs [t=7.9] [out=...] [--face] [--crop x,y,w,h]

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { createCanvas, loadImage, GlobalFonts } = require('/tmp/node_render/node_modules/@napi-rs/canvas');

const FACE = process.argv.includes('--face');
const cropArg = (() => {
  const i = process.argv.indexOf('--crop');
  if (i < 0) return null;
  const v = process.argv[i + 1].split(',').map(Number);
  return v.length === 4 && v.every((n) => Number.isFinite(n)) ? { x: v[0], y: v[1], w: v[2], h: v[3] } : null;
})();
const pos = process.argv.slice(2).filter((a, i, arr) => !a.startsWith('--') && !(i > 0 && arr[i - 1] === '--crop'));
const t = (Number(pos[0] || 7.9)).toFixed(2);
const out = pos[1] || path.join(__dirname, FACE ? 'day4_stills/画质对比_脸部.png' : 'day4_stills/画质对比.png');

const MODES = [
  { key: 'dsh', title: 'A · DSH 贴纸（现用）', sub: '--char dsh · Day2 加更电视里那版', color: '#FDE68A' },
  { key: 'ss2', title: 'B · 旧像素骨架 + 2× 超采样', sub: '--char ss2 · 上一轮方案', color: '#93C5FD' },
  { key: 'crisp', title: 'C · 整数格 + alpha 二值化', sub: '--char crisp · v1 方块硬边', color: '#F87171' }
];
const files = MODES.map((m) => path.join(__dirname, `day4_stills/qa_${m.key}_t${t}_${m.key}.png`));

if (process.argv.includes('--render') || files.some((f) => !fs.existsSync(f))) {
  MODES.forEach((m, i) => {
    execFileSync('node', ['render_day4.mjs', '--times', t, '--tag', `qa_${m.key}`, '--char', m.key], {
      cwd: __dirname, stdio: 'inherit'
    });
  });
}

const imgs = await Promise.all(files.map((f) => loadImage(fs.readFileSync(f))));
const CROP = cropArg || (FACE
  ? { x: 826, y: 176, w: 420, h: 330 }     // 脸部特写（默认 t=7.9 · C03 站位）
  : { x: 880, y: 170, w: 420, h: 520 });   // 半身
const ZOOM = FACE ? 1.25 : 1.0;
const cw = Math.round(CROP.w * ZOOM), ch = Math.round(CROP.h * ZOOM);
const canvas = createCanvas(cw * 3 + 80, ch + 150);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#0B1224';
ctx.fillRect(0, 0, canvas.width, canvas.height);
const font = path.resolve(__dirname, '../../video-fx/assets/fonts/NotoSansSC-Bold.ttf');
if (fs.existsSync(font)) GlobalFonts.registerFromPath(font, 'NotoSansSC');

MODES.forEach((m, i) => {
  const x = 20 + i * (cw + 20);
  ctx.fillStyle = '#16203A';
  ctx.fillRect(x - 5, 76, cw + 10, ch + 10);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(imgs[i], CROP.x, CROP.y, CROP.w, CROP.h, x, 82, cw, ch);
  ctx.fillStyle = m.color;
  ctx.font = '900 24px "NotoSansSC", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(m.title, x, 32);
  ctx.font = 'bold 17px "NotoSansSC", sans-serif';
  ctx.fillStyle = '#93C5FD';
  ctx.fillText(m.sub, x, 60);
});

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, canvas.toBuffer('image/png'));
console.log('对比图：', out);
