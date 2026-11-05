// make_clarity_compare.mjs — 同一帧「关清晰化 vs 开清晰化」并排对比图
//
// 用途：用户要「用老版鲸鱼娘看看能不能变清晰些」，这张图就是证据：
//   左 = --soft（老做法：直接在 1.5× 画布上画像素骨架，抗锯齿把每格磨成灰边）
//   右 = 默认（整数格离屏层 + alpha 二值化 + 最近邻贴回）
// 两张都是渲染器真实输出，不是手绘对比图。
//
// 用法：node make_clarity_compare.mjs [t=1.17] [out=day4_stills/清晰度对比.png]

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { createCanvas, loadImage, GlobalFonts } = require('/tmp/node_render/node_modules/@napi-rs/canvas');

const t = process.argv[2] || '1.17';
const out = process.argv[3] || path.join(__dirname, 'day4_stills/清晰度对比.png');
const soft = path.join(__dirname, `day4_stills/soft_t${t}_soft.png`);
const sharp = path.join(__dirname, `day4_stills/sharp_t${t}.png`);

if (process.argv.includes('--render') || !fs.existsSync(soft) || !fs.existsSync(sharp)) {
  for (const [flag, file] of [['--soft', soft], ['', sharp]]) {
    const args = ['render_day4.mjs', '--times', t, '--tag', flag ? 'soft' : 'sharp'];
    if (flag) args.push(flag);
    execFileSync('node', args, { cwd: __dirname, stdio: 'inherit' });
  }
}

const [a, b] = await Promise.all([loadImage(fs.readFileSync(soft)), loadImage(fs.readFileSync(sharp))]);
// 角色所在区域（1280×720 逻辑坐标 → 1920×1080 输出坐标，×1.5）
const CROP = { x: 880, y: 420, w: 460, h: 470 };
const ZOOM = 1.25;
const cw = Math.round(CROP.w * ZOOM), ch = Math.round(CROP.h * ZOOM);
const canvas = createCanvas(cw * 2 + 60, ch + 130);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#0B1224';
ctx.fillRect(0, 0, canvas.width, canvas.height);

const font = path.resolve(__dirname, '../../video-fx/assets/fonts/NotoSansSC-Bold.ttf');
if (fs.existsSync(font)) GlobalFonts.registerFromPath(font, 'NotoSansSC');

function panel(img, x, title, sub, color) {
  ctx.fillStyle = '#16203A';
  ctx.fillRect(x - 6, 72, cw + 12, ch + 12);
  // 最近邻放大：像素格子要看得出来
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, CROP.x, CROP.y, CROP.w, CROP.h, x, 78, cw, ch);
  ctx.fillStyle = color;
  ctx.font = '900 30px "NotoSansSC", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, x, 34);
  ctx.font = 'bold 20px "NotoSansSC", sans-serif';
  ctx.fillStyle = '#93C5FD';
  ctx.fillText(sub, x, 60);
}
panel(a, 20, '① 旧做法：直接画在 1.5× 画布', '--soft · 每格被抗锯齿磨成灰边', '#F87171');
panel(b, cw + 40, '② 现在：整数格 + alpha 二值化', '默认 · 方块硬边，不糊', '#4ADE80');

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, canvas.toBuffer('image/png'));
console.log('对比图：', out);
