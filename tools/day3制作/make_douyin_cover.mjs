// ============================================================================
// make_douyin_cover.mjs — 生成抖音发布用的横屏 / 竖屏封面（Day3 配音版）
//
// 用法（需要 @napi-rs/canvas；本目录或 /tmp/node_render 里有一份即可）：
//   VIDEO_FX_DIR=/home/user/ai-yunying/video-fx node make_douyin_cover.mjs
//
// 输出：
//   Day3/成片/发布物料/抖音封面_横屏_1920x1080.png
//   Day3/成片/发布物料/抖音封面_竖屏_1080x1920.png
//
// 素材：鲸鱼娘 whale_girl_src/whale_*.png + Claude 大小姐 chibi（CC BY-NC-SA 4.0）。
// 封面只做排版、光效与白描边，不改角色设计。
// ============================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
function resolveCanvas() {
  for (const c of ['@napi-rs/canvas', '/tmp/node_render/node_modules/@napi-rs/canvas']) {
    try { return require(c); } catch (e) { /* 试下一个 */ }
  }
  throw new Error('缺少 @napi-rs/canvas：请在任意目录 npm i @napi-rs/canvas');
}
const { createCanvas, loadImage, GlobalFonts } = resolveCanvas();

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const FONT_DIR = path.join(process.env.VIDEO_FX_DIR || path.join(ROOT, 'video-fx'), 'assets/fonts');
for (const [f, name] of [
  ['NotoSansSC-Bold.ttf', 'NotoSansSC'],
  ['ZCOOLKuaiLe-Regular.ttf', 'ZCOOLKuaiLe'],
  ['Silkscreen-Regular.ttf', 'Silkscreen']
]) {
  const p = path.join(FONT_DIR, f);
  if (fs.existsSync(p)) GlobalFonts.registerFromPath(p, name);
}

const OUT_DIR = path.join(ROOT, 'Day3/成片/发布物料');
const C = {
  bg0: '#080D24', bg1: '#141F49', bg2: '#20306B',
  cream: '#FFF4DC', cream2: '#E8DCC2',
  gold: '#FFC94A', gold2: '#F0A331',
  cyan: '#6FD8E8', blue: '#7FB4FF',
  orange: '#FF9A45', orangeDk: '#C8582A',
  ink: '#1A1330'
};

// ---------- 小工具 ----------
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function bg(ctx, W, H, ghostDay) {
  const g = ctx.createLinearGradient(0, 0, W * 0.35, H);
  g.addColorStop(0, C.bg0);
  g.addColorStop(0.55, C.bg1);
  g.addColorStop(1, C.bg2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 斜光束
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const lg = ctx.createLinearGradient(W * 0.1 + i * W * 0.22, -H * 0.2, W * 0.5 + i * W * 0.2, H * 1.1);
    lg.addColorStop(0, 'rgba(120,190,255,0.10)');
    lg.addColorStop(0.5, 'rgba(120,190,255,0.03)');
    lg.addColorStop(1, 'rgba(120,190,255,0)');
    ctx.fillStyle = lg;
    const bw = W * 0.16;
    ctx.beginPath();
    ctx.moveTo(W * 0.05 + i * W * 0.26, -20);
    ctx.lineTo(W * 0.05 + i * W * 0.26 + bw, -20);
    ctx.lineTo(W * 0.45 + i * W * 0.26 + bw, H + 20);
    ctx.lineTo(W * 0.45 + i * W * 0.26, H + 20);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 星光点
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < 46; i++) {
    const x = rnd() * W, y = rnd() * H, r = 1.2 + rnd() * 3.4;
    const col = [C.gold, C.cyan, C.blue, C.cream][i % 4];
    ctx.globalAlpha = 0.25 + rnd() * 0.5;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    if (r > 3) {
      ctx.globalAlpha *= 0.35;
      ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // 「DAY」幽灵数字
  if (ghostDay) {
    ctx.save();
    ctx.globalAlpha = 0.055;
    ctx.fillStyle = C.cream;
    ctx.font = `${Math.round(H * 0.62)}px "Silkscreen", "NotoSansSC", sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(String(ghostDay), W - H * 0.02, H * 0.99);
    ctx.restore();
  }

  // 底部压暗
  const vg = ctx.createLinearGradient(0, H * 0.62, 0, H);
  vg.addColorStop(0, 'rgba(6,9,22,0)');
  vg.addColorStop(1, 'rgba(6,9,22,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, H * 0.62, W, H * 0.38);
}

// 白描边贴纸：先做白色剪影，再按半径外扩，最后盖上原图
function sticker(img, height, pad) {
  const w = Math.round(height * img.width / img.height);
  const cv = createCanvas(w + pad * 2, Math.round(height) + pad * 2);
  const g = cv.getContext('2d');
  // 剪影
  const sil = createCanvas(w, Math.round(height));
  const sg = sil.getContext('2d');
  sg.drawImage(img, 0, 0, w, height);
  sg.globalCompositeOperation = 'source-in';
  sg.fillStyle = '#FFFDF6';
  sg.fillRect(0, 0, w, height);
  // 外扩
  const steps = 20;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    g.drawImage(sil, pad + Math.cos(a) * pad * 0.7, pad + Math.sin(a) * pad * 0.7, w, height);
  }
  // 原图
  g.imageSmoothingEnabled = true;
  g.drawImage(img, pad, pad, w, height);
  return cv;
}

function dropShadow(ctx, x, y, rx, ry, alpha = 0.4) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(4,7,20,${alpha})`);
  g.addColorStop(1, 'rgba(4,7,20,0)');
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function glow(ctx, x, y, r, color, alpha = 0.35) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color.replace('ALPHA', alpha));
  g.addColorStop(1, color.replace('ALPHA', '0'));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

function eyebrow(ctx, x, y, text, fs = 30) {
  ctx.font = `bold ${fs}px "NotoSansSC", sans-serif`;
  const padX = fs * 0.72, h = fs * 1.95;
  const w = ctx.measureText(text).width + padX * 2;
  ctx.save();
  rr(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(12,18,42,0.72)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(111,216,232,0.85)';
  ctx.stroke();
  ctx.fillStyle = C.cyan;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padX, y + h / 2 + 1);
  ctx.restore();
  return w;
}

// 一行里多段不同颜色
function runs(ctx, x, y, list, fs) {
  ctx.font = `900 ${fs}px "NotoSansSC", sans-serif`;
  ctx.textBaseline = 'alphabetic';
  let cx = x;
  for (const r of list) {
    ctx.font = `${r.weight || 900} ${fs}px "NotoSansSC", sans-serif`;
    const w = ctx.measureText(r.text).width;
    if (r.bg) {
      ctx.save();
      rr(ctx, cx - fs * 0.08, y - fs * 0.82, w + fs * 0.16, fs * 1.04, fs * 0.16);
      ctx.fillStyle = r.bg;
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    if (r.stroke) {
      ctx.lineWidth = fs * 0.16;
      ctx.strokeStyle = r.stroke;
      ctx.lineJoin = 'round';
      ctx.strokeText(r.text, cx, y);
    }
    ctx.fillStyle = r.color || C.cream;
    ctx.fillText(r.text, cx, y);
    ctx.restore();
    cx += w + (r.gap || 0);
  }
  return cx;
}

function arrow(ctx, x, y, len, th, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = th;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - len / 2, y);
  ctx.lineTo(x + len / 2 - th * 1.6, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + len / 2 + th * 0.4, y);
  ctx.lineTo(x + len / 2 - th * 2.4, y - th * 2.1);
  ctx.lineTo(x + len / 2 - th * 2.4, y + th * 2.1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function badge(ctx, x, y, text, fs, color, align = 'left') {
  ctx.font = `bold ${fs}px "NotoSansSC", sans-serif`;
  const padX = fs * 0.6, h = fs * 1.8;
  const w = ctx.measureText(text).width + padX * 2;
  const bx = align === 'right' ? x - w : x;
  ctx.save();
  rr(ctx, bx, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(10,15,36,0.68)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + padX, y + h / 2 + 1);
  ctx.restore();
  return w;
}

// ---------- 素材 ----------
const whale = await loadImage(path.join(HERE, 'whale_girl_src/whale_cheer.png'));
const claude = await loadImage(path.join(HERE, 'claude_src/chibi/pose_cheer.png'));

// ---------- 横屏 1920×1080 ----------
function horizontal() {
  const W = 1920, H = 1080;
  const cv = createCanvas(W, H);
  const ctx = cv.getContext('2d');
  bg(ctx, W, H, 0);

  // 角色区
  const hCh = 432, pad = Math.round(hCh * 0.045);
  const wS = sticker(whale, hCh, pad);
  const cS = sticker(claude, hCh, pad);
  const floorY = 892;
  const wX = 1180, cX = 1662;
  glow(ctx, 1600, floorY - hCh * 0.45, 400, 'rgba(255,154,69,ALPHA)', 0.22);
  dropShadow(ctx, wX, floorY + 14, 250, 44, 0.45);
  dropShadow(ctx, cX, floorY + 14, 250, 44, 0.45);
  ctx.drawImage(wS, wX - wS.width / 2, floorY - wS.height + pad * 0.2);
  ctx.drawImage(cS, cX - cS.width / 2, floorY - cS.height + pad * 0.2);
  arrow(ctx, (wX + cX) / 2, floorY - hCh * 0.56, 60, 11, C.gold);

  // 文字
  let y = 150;
  y += eyebrow(ctx, 120, y - 26, 'DAY 3 · AI 运营日记', 30) && 0;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  runs(ctx, 120, 400, [{ text: '请不来 ', color: C.cream }, { text: 'Claude', color: C.orange }], 104);
  runs(ctx, 120, 530, [{ text: '就把本鲸染成了', color: C.cream }], 104);
  runs(ctx, 120, 660, [{ text: '大小姐', color: C.ink, bg: C.gold }], 104);

  ctx.font = 'bold 42px "NotoSansSC", sans-serif';
  ctx.fillStyle = C.cyan;
  ctx.fillText('染色剂不防水，入水当场褪色', 124, 762);

  ctx.font = 'bold 30px "NotoSansSC", sans-serif';
  ctx.fillStyle = C.cream2;
  ctx.globalAlpha = 0.9;
  ctx.fillText('鲸鱼不是鱼 · 本鲸是本鲸 · 19 个分镜 / 132s', 124, 828);
  ctx.globalAlpha = 1;

  badge(ctx, 120, 900, '非官方同人 · AI 生成', 24, 'rgba(255,244,220,0.85)');
  badge(ctx, 120 + 330, 900, 'Claude 大小姐素材 CC BY-NC-SA 4.0', 24, 'rgba(255,244,220,0.6)');

  return cv;
}

// ---------- 竖屏 1080×1920（抖音）----------
function vertical() {
  const W = 1080, H = 1920;
  const cv = createCanvas(W, H);
  const ctx = cv.getContext('2d');
  bg(ctx, W, H, 0);

  // 顶部（约 240px 会被抖音 UI 压住，不放关键信息）
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  eyebrow(ctx, 90, 300, 'AI 运营日记 · Day 3', 34);

  runs(ctx, 90, 530, [{ text: '请不来 ', color: C.cream }, { text: 'Claude', color: C.orange }], 116);
  runs(ctx, 90, 672, [{ text: '就把本鲸', color: C.cream }], 116);
  runs(ctx, 90, 814, [{ text: '染成了大小姐', color: C.ink, bg: C.gold }], 116);

  // 角色
  const hCh = 480, pad = Math.round(hCh * 0.045);
  const wS = sticker(whale, hCh, pad);
  const cS = sticker(claude, hCh, pad);
  const floorY = 1560;
  const wX = 250, cX = 800;
  glow(ctx, 820, floorY - hCh * 0.42, 380, 'rgba(255,154,69,ALPHA)', 0.22);
  dropShadow(ctx, wX, floorY + 16, 224, 40, 0.45);
  dropShadow(ctx, cX, floorY + 16, 224, 40, 0.45);
  ctx.drawImage(wS, wX - wS.width / 2, floorY - wS.height + pad * 0.2);
  ctx.drawImage(cS, cX - cS.width / 2, floorY - cS.height + pad * 0.2);
  arrow(ctx, (wX + cX) / 2, floorY - hCh * 0.55, 56, 10, C.gold);

  // 底部一行钩子
  const py = 1660;
  ctx.save();
  rr(ctx, 90, py, 900, 104, 26);
  ctx.fillStyle = 'rgba(9,14,34,0.72)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(111,216,232,0.75)';
  ctx.stroke();
  ctx.font = 'bold 44px "NotoSansSC", sans-serif';
  ctx.fillStyle = C.cream;
  ctx.fillText('染色剂不防水', 132, py + 66);
  const wA = ctx.measureText('染色剂不防水').width;
  ctx.fillStyle = C.gold;
  ctx.fillText('入水当场褪色', 132 + wA + 22, py + 66);
  ctx.restore();

  badge(ctx, 90, 1798, '非官方同人 · AI 生成 · 素材 CC BY-NC-SA 4.0', 24, 'rgba(255,244,220,0.7)');
  return cv;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const p1 = path.join(OUT_DIR, '抖音封面_横屏_1920x1080.png');
const p2 = path.join(OUT_DIR, '抖音封面_竖屏_1080x1920.png');
fs.writeFileSync(p1, horizontal().toBuffer('image/png'));
fs.writeFileSync(p2, vertical().toBuffer('image/png'));
console.log('✓', p1);
console.log('✓', p2);
