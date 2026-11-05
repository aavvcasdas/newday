// ============================================================================
// make_day4_cover.mjs — Day4 发布封面（4:3 与 3:4 各两版）
//
// 口径（不是随便配字）：
//   · 封面＝第一帧＝第一句（AGENTS: 封面承诺必须 3 秒内兑现，Day3 就是封面错位翻车）。
//     本片第 0 秒大字「米饭被 MV 吃光了」+ 7.4 万→2000 的折线，所以封面只卖这两件事。
//   · 第一行写「你」，不写「我」（受众拓宽调研：陌生人不知道本鲸是谁，写我＝2 秒划走）。
//   · 主角＝Day2 像素骨架（与正片同一条渲染管线，ss2 超采样），不是 DSH 贴纸。
//   · 电视里必须是《朋友的酒》画中画（正片 C02 的同款取帧），不画进度条。
//
// 用法：
//   node tools/day4制作/make_day4_cover.mjs
//   node tools/day4制作/make_day4_cover.mjs --mv /tmp/mv_base.mp4   # 重新抽电视画面
// 输出：Day4/成片/封面/*.png
//
// 依赖：@napi-rs/canvas（npm i -D @napi-rs/canvas，或装到 /tmp/node_render）
// 电视画面帧：tools/day4制作/assets/mv_pip/f_000.jpg…（.gitignore 忽略，缺帧时退化成「雪花·无信号」）。
//   重新抽帧（MV 母带在 tools/day4制作/assets 同源视频或 fetch 的 mv_base.mp4）：
//   ffmpeg -ss 59 -t 10 -i mv_base.mp4 -vf "fps=8,scale=320:180" -q:v 6 tools/day4制作/assets/mv_pip/f_%03d.jpg
// ============================================================================
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ROOT = path.resolve(__dirname, '../..');
const VFX = process.env.VIDEO_FX_DIR || path.join(ROOT, 'video-fx');

function resolveCanvas() {
  for (const c of ['@napi-rs/canvas', '/tmp/node_render/node_modules/@napi-rs/canvas']) {
    try { return require(c); } catch (e) { /* next */ }
  }
  throw new Error('缺少 @napi-rs/canvas：cd /tmp/node_render && npm i @napi-rs/canvas');
}
const { createCanvas, loadImage, GlobalFonts } = resolveCanvas();

for (const [f, name] of [
  ['NotoSansSC-Bold.ttf', 'NotoSansSC'],
  ['ZCOOLKuaiLe-Regular.ttf', 'ZCOOLKuaiLe'],
  ['Silkscreen-Regular.ttf', 'Silkscreen']
]) {
  const p = path.join(VFX, 'assets/fonts', f);
  if (fs.existsSync(p)) GlobalFonts.registerFromPath(p, name);
}

globalThis.window = globalThis;
const CORE = require(path.join(VFX, 'src/core.js'));
const RIG = require(path.join(VFX, 'src/whale_girl_rig_data.js'));
if (RIG?.poses?.wink && RIG?.poses?.heart?.backHair) RIG.poses.wink.backHair = RIG.poses.heart.backHair;
if (RIG?.poses?.wink && RIG?.poses?.wave?.head) RIG.poses.wink.head = RIG.poses.wave.head;
const { buildPatchedWhaleGirl } = await import('../day3制作/video-fx源码快照/engine_patches.mjs');
const _patched = buildPatchedWhaleGirl(VFX);
const WHALE = require(_patched.file);
const { whaleGirl } = WHALE;
const { PAL, ellPts, rrPts, rectPts, paint, inkLine, letter, clamp, ease } = CORE;

// ---------------------------------------------------------------------------
// 配色
// ---------------------------------------------------------------------------
const K = {
  bg0: '#080D24', bg1: '#131E46', bg2: '#1E2E63',
  cream: '#FFF4DC', cream2: '#CBD5E1',
  gold: '#FFC94A', goldDk: '#B45309',
  cyan: '#6FD8E8', blue: '#7FB4FF',
  red: '#F87171', green: '#4ADE80', ink: '#0B1224'
};

// ---------------------------------------------------------------------------
// 素材：电视里的 MV 帧（与正片同一批抽帧；没有素材就画雪花）
// ---------------------------------------------------------------------------
const MV_DIR = path.join(__dirname, 'assets/mv_pip');
const MV_FRAMES = [];
if (fs.existsSync(MV_DIR)) {
  const files = fs.readdirSync(MV_DIR).filter((f) => /^f_\d+\.(jpg|png)$/i.test(f)).sort();
  for (const f of files) {
    try { MV_FRAMES.push(await loadImage(fs.readFileSync(path.join(MV_DIR, f)))); } catch (e) { /* skip */ }
  }
}
console.log(`电视画面：${MV_FRAMES.length} 帧`);

// ---------------------------------------------------------------------------
// 像素主角（和正片同一条管线：2× 超采样 + 高质量降采样）
// ---------------------------------------------------------------------------
const SAFE = {
  style: 'pixel', showActionBadge: false, tailScale: 1.0, noFinBows: true, eyePatch: false,
  vectorMouth: true, eyes: 'open', squint: 0.01, transitionBlend: 1
};
function drawPixelWhale(ctx, x, y, heightPx, o = {}) {
  // 和 render_day4.mjs 的 blitChar 同一套：先画在 2× 设备像素层，再高质量降采样
  const SS = 2;
  const u = heightPx / 9.05;                        // 骨架 9.05u 高
  const BOX = { halfW: 5.6, top: -10.6, bottom: 1.6 };
  const uDev = u * SS;
  const lw = Math.ceil(BOX.halfW * 2 * uDev);
  const lh = Math.ceil((BOX.bottom - BOX.top) * uDev);
  const cv = createCanvas(lw, lh);
  const g = cv.getContext('2d');
  g.clearRect(0, 0, lw, lh);
  const bx = Math.round(BOX.halfW * uDev);
  const by = Math.round(-BOX.top * uDev);
  whaleGirl(g, bx, by, uDev, {
    ...SAFE,
    t: o.t ?? 1.2,
    emotion: o.emotion || 'pout',
    mouth: o.mouth || 'pout',
    headTilt: o.headTilt ?? 0,
    ...o
  });
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(cv, x - bx / SS, y - by / SS, lw / SS, lh / SS);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 电视：壳 + 屏幕（画中画 MV）+ 贴纸
// ---------------------------------------------------------------------------
function tvBox(ctx, x, y, w, h, frameIdx = 0) {
  // 天线
  inkLine(ctx, [[x + w * 0.3, y - 4], [x + w * 0.16, y - 0.17 * h]], 3, '#9FB0C8', 'inkfine', 0);
  inkLine(ctx, [[x + w * 0.7, y - 4], [x + w * 0.84, y - 0.16 * h]], 3, '#9FB0C8', 'inkfine', 0);
  // 机身
  paint(ctx, rrPts(x - w * 0.04, y - h * 0.05, w * 1.08, h * 1.13, h * 0.09, 1.6), {
    wash: '#8B7A63', fill: '#4A3B2B', fillOp: 150, ink: PAL.ink, sw: 2
  });
  const sx = x + w * 0.03, sy = y + h * 0.04, sw = w * 0.94, sh = h * 0.9;
  paint(ctx, rrPts(sx - 4, sy - 4, sw + 8, sh + 8, h * 0.06, 1.2), { wash: '#140E06', ink: PAL.ink, sw: 1.4 });
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(sx, sy, sw, sh, h * 0.05);
  ctx.clip();
  if (MV_FRAMES.length) {
    const img = MV_FRAMES[frameIdx % MV_FRAMES.length];
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, sw, sh);
  } else {
    ctx.fillStyle = '#0A1428';
    ctx.fillRect(sx, sy, sw, sh);
    ctx.fillStyle = 'rgba(226,232,240,0.6)';
    ctx.font = `bold ${Math.round(h * 0.07)}px "NotoSansSC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('雪花 · 无信号', sx + sw / 2, sy + sh / 2);
    ctx.textAlign = 'left';
  }
  // 扫描线（老电视质感，轻一点）
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#000';
  for (let yy = sy + 2; yy < sy + sh; yy += 4) ctx.fillRect(sx, yy, sw, 1.4);
  ctx.globalAlpha = 1;
  // 画中画标题条（不画进度条 / 音量条）
  ctx.fillStyle = 'rgba(8,16,34,0.78)';
  ctx.fillRect(sx, sy, sw, sh * 0.1);
  ctx.fillStyle = K.gold;
  ctx.font = `bold ${Math.round(sh * 0.062)}px "NotoSansSC", sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillText('朋友的酒 MV v4', sx + sw * 0.04, sy + sh * 0.05);
  ctx.textAlign = 'right';
  ctx.fillStyle = K.red;
  ctx.fillText('0.35×', sx + sw - sw * 0.04, sy + sh * 0.05);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
  // 玻璃反光
  inkLine(ctx, [[sx + sw * 0.06, sy + sh * 0.26], [sx + sw * 0.2, sy + sh * 0.08]], 3, 'rgba(255,255,255,0.42)', 'inkfine', 0);
  // 机身贴纸
  ctx.save();
  ctx.translate(x + w * 0.14, y + h * 1.05);
  ctx.rotate(-0.06);
  ctx.font = `900 ${Math.round(h * 0.075)}px "ZCOOLKuaiLe", sans-serif`;
  const cap = 'MV v4 · 未调';
  const cw = ctx.measureText(cap).width + h * 0.18;
  paint(ctx, rrPts(-cw / 2, -h * 0.062, cw, h * 0.124, h * 0.03, 1), { wash: 'rgba(242,193,78,0.94)', ink: PAL.ink, sw: 1.2 });
  ctx.fillStyle = '#3B2A0E';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(cap, 0, 1);
  ctx.restore();
  return { sx, sy, sw, sh };
}

// 返工单（v1–v4）
function slip(ctx, x, y, w, h, text, rot, stamp) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  paint(ctx, rrPts(-w / 2, -h / 2, w, h, w * 0.08, 1.2), { wash: '#EFE3C8', fill: '#0B1526', fillOp: 36, ink: PAL.ink, sw: 1.6 });
  ctx.fillStyle = '#7F1D1D';
  ctx.font = `900 ${Math.round(h * 0.5)}px "ZCOOLKuaiLe", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, -h * 0.1);
  if (stamp) {
    ctx.strokeStyle = '#D8232A';
    ctx.lineWidth = 2.4;
    ctx.strokeRect(-w * 0.28, h * 0.16, w * 0.56, h * 0.2);
    ctx.fillStyle = '#D8232A';
    ctx.font = `900 ${Math.round(h * 0.17)}px "ZCOOLKuaiLe", sans-serif`;
    ctx.fillText(stamp, 0, h * 0.26);
  }
  ctx.restore();
}

// 背景
function bgLayer(ctx, W, H, seed = 3) {
  const g = ctx.createLinearGradient(0, 0, W * 0.3, H);
  g.addColorStop(0, K.bg0);
  g.addColorStop(0.55, K.bg1);
  g.addColorStop(1, K.bg2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // 斜光束
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const lg = ctx.createLinearGradient(W * 0.1 + i * W * 0.24, -H * 0.2, W * 0.55 + i * W * 0.2, H * 1.1);
    lg.addColorStop(0, 'rgba(120,190,255,0.12)');
    lg.addColorStop(0.5, 'rgba(120,190,255,0.035)');
    lg.addColorStop(1, 'rgba(120,190,255,0)');
    ctx.fillStyle = lg;
    const bw = W * 0.15;
    ctx.beginPath();
    ctx.moveTo(W * 0.04 + i * W * 0.27, -20);
    ctx.lineTo(W * 0.04 + i * W * 0.27 + bw, -20);
    ctx.lineTo(W * 0.46 + i * W * 0.27 + bw, H + 20);
    ctx.lineTo(W * 0.46 + i * W * 0.27, H + 20);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // 星点
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < 44; i++) {
    const x = rnd() * W, y = rnd() * H, r = 1.2 + rnd() * 3.2;
    ctx.globalAlpha = 0.2 + rnd() * 0.45;
    ctx.fillStyle = [K.gold, K.cyan, K.blue, K.cream][i % 4];
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function radial(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color.replace('A', String(alpha)));
  g.addColorStop(1, color.replace('A', '0'));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

// 大字：描边 + 可选色块
function big(ctx, text, x, y, fs, o = {}) {
  ctx.save();
  ctx.font = `${o.weight || 900} ${fs}px "${o.font || 'NotoSansSC'}", sans-serif`;
  const measured = ctx.measureText(text).width;
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = 'alphabetic';
  const w = ctx.measureText(text).width;
  if (o.bg) {
    const bx = o.align === 'center' ? x - w / 2 : (o.align === 'right' ? x - w : x);
    paint(ctx, rrPts(bx - fs * 0.16, y - fs * 0.92, w + fs * 0.32, fs * 1.16, fs * 0.14, 1.4), { wash: o.bg, ink: null });
  }
  if (o.stroke) {
    ctx.lineWidth = fs * (o.sw || 0.15);
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeStyle = o.stroke;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = o.color || K.cream;
  ctx.fillText(text, x, y);
  ctx.restore();
  return measured;
}

function pill(ctx, x, y, text, fs, color, o = {}) {
  ctx.font = `bold ${fs}px "NotoSansSC", sans-serif`;
  const w = ctx.measureText(text).width + fs * 1.5;
  const h = fs * 2;
  paint(ctx, rrPts(x, y, w, h, h / 2, 1.2), { wash: 'rgba(9,15,36,0.8)', ink: color, sw: 1.6 });
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + fs * 0.75, y + h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
  return w;
}

// ---------------------------------------------------------------------------
// 封面 A：写「你」的处境 + 真实数字（主推，给陌生人看）
//   第一行：越努力 / 越没人看
//   第二行：本鲸把号做到 7.4 万，现在只剩 2000
// ---------------------------------------------------------------------------
function coverA(W, H, o = {}) {
  const T1 = o.l1 || '越努力';
  const T2 = o.l2 || '越没人看';
  const subA = o.subA || '本鲸把号做到 ';
  const subNum = o.subNum || '7.4 万';
  const subB = o.subB || '，现在只剩';
  const subEnd = o.subEnd || ' 2000';
  const line3 = o.line3 || '一个 MV 做了 4 版 · 一版一锅米';
  const bigFs = o.headFs || null;
  const cv = createCanvas(W, H);
  const ctx = cv.getContext('2d');
  const portrait = H > W;
  bgLayer(ctx, W, H, portrait ? 11 : 7);

  const S = Math.min(W, H) / 1080;             // 统一缩放基准
  let headFs = Math.round(W * (o.headFs ? o.headFs : (portrait ? 0.196 : 0.132)));
  // 自动缩字：两行标题都不能超出左右内边距
  {
    const avail = W - Math.round(W * 0.055) * 2;
    ctx.font = `900 ${headFs}px "NotoSansSC", sans-serif`;
    const wMax = Math.max(ctx.measureText(T1).width, ctx.measureText(T2).width);
    if (wMax > avail) headFs = Math.floor(headFs * (avail / wMax));
  }

  // 角色 + 电视（先画身体，文字压在最上层）
  const tvH = Math.round(H * (portrait ? 0.225 : 0.345));
  const tvW = Math.round(tvH * 1.52);
  const chH = Math.round(H * (portrait ? 0.30 : 0.48));

  if (portrait) {
    // 3:4：上面标题，下面角色 + 电视左右站
    const floorY = Math.round(H * 0.845);
    const tvX = Math.round(W * 0.035);
    const tvY = Math.round(H * 0.655);
    radial(ctx, W * 0.74, floorY - chH * 0.5, W * 0.62, 'rgba(111,216,232,A)', 0.16);
    tvBox(ctx, tvX, tvY, tvW, tvH, 30);
    drawPixelWhale(ctx, Math.round(W * 0.79), floorY, chH, { emotion: 'pout', mouth: 'pout', headTilt: -0.05 });
  } else {
    // 4:3：右边角色 + 电视，左边全是字
    const floorY = Math.round(H * 0.88);
    const tvX = Math.round(W * 0.44);
    const tvY = Math.round(H * 0.60);
    radial(ctx, W * 0.70, floorY - chH * 0.5, W * 0.5, 'rgba(111,216,232,A)', 0.16);
    tvBox(ctx, tvX, tvY, tvW, tvH, 30);
    drawPixelWhale(ctx, Math.round(W * 0.835), floorY, chH, { emotion: 'pout', mouth: 'pout', headTilt: -0.04 });
  }

  // 顶部：Day 徽标
  const padX = Math.round(W * 0.055);
  pill(ctx, padX, Math.round(H * 0.05), 'AI 运营日记 · 第 4 天 / 30', Math.round(S * 27), '#93C5FD');

  // 主标题（两行，第二行用色块砸出来）
  const y1 = Math.round(H * (portrait ? 0.248 : 0.36));
  const y2 = y1 + Math.round(headFs * 1.12);
  big(ctx, T1, padX, y1, headFs, { color: K.cream, stroke: K.ink, sw: 0.16 });
  big(ctx, T2, padX, y2, headFs, { color: '#0F172A', bg: K.gold, font: 'NotoSansSC' });

  // 副标题：真实数字（逐段累加，宽度用各段自己字体的度量）
  const y3 = y2 + Math.round(headFs * 0.74);
  const subFs = Math.round(S * (portrait ? 40 : 38));
  let cx2 = padX;
  cx2 += big(ctx, subA, cx2, y3, subFs, { color: K.cream2, stroke: K.ink, sw: 0.1 });
  cx2 += big(ctx, subNum, cx2, y3, subFs, { color: K.gold, stroke: K.ink, sw: 0.1 });
  cx2 += big(ctx, subB, cx2, y3, subFs, { color: K.cream2, stroke: K.ink, sw: 0.1 });
  big(ctx, subEnd, cx2, y3, subFs, { color: K.red, stroke: K.ink, sw: 0.1 });

  // 第三行小字：一个 MV 四版
  const y4 = y3 + Math.round(subFs * 1.5);
  big(ctx, line3, padX, y4, Math.round(subFs * 0.86), { color: '#93C5FD', stroke: K.ink, sw: 0.12 });

  // 底部信息条
  const barY = Math.round(H * (portrait ? 0.905 : 0.9));
  const barH = Math.round(H * (portrait ? 0.055 : 0.085));
  ctx.font = `bold ${Math.round(S * 26)}px "NotoSansSC", sans-serif`;
  const barText = '粉丝 2,180 / 10,000 · 第 4 天 / 30';
  const barW = ctx.measureText(barText).width + barH * 0.9;
  paint(ctx, rrPts(padX, barY, barW, barH, barH * 0.28, 1.2), { wash: 'rgba(8,14,32,0.8)', ink: 'rgba(111,216,232,0.5)', sw: 1.4 });
  ctx.fillStyle = K.cream;
  ctx.textBaseline = 'middle';
  ctx.fillText(barText, padX + barH * 0.45, barY + barH * 0.5 + 1);
  ctx.textBaseline = 'alphabetic';
  return cv;
}

// ---------------------------------------------------------------------------
// 封面 B：剧情向（标题同款，给已经认识本鲸的人 / 二刷位）
//   第一行：米饭 / 被 MV 吃光了   ＋ 四张返工单 + 空碗
// ---------------------------------------------------------------------------
function bowl(ctx, x, y, w, h) {
  // 碗身（上宽下窄）+ 碗口 + 零星米粒
  paint(ctx, [[x - w / 2, y - h * 0.5], [x + w / 2, y - h * 0.5], [x + w * 0.34, y + h * 0.5], [x - w * 0.34, y + h * 0.5]],
    { wash: '#DCE6F2', fill: '#0B1526', fillOp: 40, ink: PAL.ink, sw: 1.8 });
  paint(ctx, ellPts(x, y - h * 0.5, w * 0.5, h * 0.26, 18), { wash: '#F1F5F9', ink: PAL.ink, sw: 1.8 });
  paint(ctx, ellPts(x, y - h * 0.46, w * 0.4, h * 0.19, 18), { wash: '#0F1B33', ink: null });
  paint(ctx, [[x - w * 0.18, y + h * 0.12], [x + w * 0.18, y + h * 0.12]], { ink: '#7897B8', sw: 2 });
}

function coverB(W, H, withYou = false) {
  const cv = createCanvas(W, H);
  const ctx = cv.getContext('2d');
  const portrait = H > W;
  bgLayer(ctx, W, H, portrait ? 23 : 19);
  const S = Math.min(W, H) / 1080;
  const padX = Math.round(W * 0.055);
  const gold = K.gold;

  if (portrait) {
    pill(ctx, padX, Math.round(H * 0.028), 'AI 运营日记 · 第 4 天 / 30', Math.round(S * 27), '#93C5FD');
    // 第一句写「你」：压在标题上方，最先进眼
    let yTop = Math.round(H * 0.082);
    if (withYou) {
      yTop = Math.round(H * 0.150);
      const hfs = Math.round(W * 0.040);
      ctx.font = `900 ${hfs}px "NotoSansSC", sans-serif`;
      const txt = '越努力越没人看，是不是你';
      const tw = ctx.measureText(txt).width;
      paint(ctx, rrPts(padX - hfs * 0.3, Math.round(H * 0.085) - hfs * 0.35, tw + hfs * 0.6, hfs * 1.62, hfs * 0.22, 1.4),
        { wash: 'rgba(7,12,28,0.9)', ink: 'rgba(111,216,232,0.6)', sw: 1.6 });
      big(ctx, txt, padX, Math.round(H * 0.085) + hfs * 0.62, hfs, { color: K.cream });
    }
    const headFs = Math.round(W * (withYou ? 0.155 : 0.170));
    let yy = yTop + Math.round(headFs * 0.92);
    big(ctx, '米饭', padX, yy, headFs, { color: K.cream, stroke: K.ink, sw: 0.16 });
    yy += Math.round(headFs * 1.06);
    big(ctx, '被 MV', padX, yy, headFs, { color: '#0F172A', bg: gold });
    yy += Math.round(headFs * 1.06);
    big(ctx, '吃光了', padX, yy, headFs, { color: '#0F172A', bg: gold });
    const titleBottom = yy + Math.round(headFs * 0.22);

    const floorY = Math.round(H * (withYou ? 0.872 : 0.855));
    const chH = Math.round(H * (withYou ? 0.318 : 0.262));
    const chX = Math.round(W * (withYou ? 0.625 : 0.52));
    radial(ctx, chX, floorY - H * 0.14, W * 0.5, 'rgba(111,216,232,A)', 0.15);
    drawPixelWhale(ctx, chX, floorY, chH, { emotion: 'sad', mouth: 'flat', headTilt: 0.05 });
    bowl(ctx, Math.round(W * 0.115), floorY - Math.round(H * 0.012), W * 0.125, H * 0.058);

    // 返工单：两列两行，压在角色左侧的空白里
    const slipW = Math.round(W * (withYou ? 0.120 : 0.135)), slipH = Math.round(H * 0.052);
    for (let i = 0; i < 4; i++) {
      const sx = W * ((withYou ? 0.220 : 0.185) + (i % 2) * (withYou ? 0.140 : 0.155));
      const sy = H * ((withYou ? 0.742 : 0.775) + Math.floor(i / 2) * 0.072);
      slip(ctx, sx, sy, slipW, slipH, `v${i + 1}`, (i % 2 ? 0.1 : -0.1), i === 3 ? 'LEI' : null);
    }
    big(ctx, '一个 MV 做了 4 版 · 一版一锅米', padX, Math.round(H * 0.965), Math.round(S * 26), { color: '#93C5FD', stroke: K.ink, sw: 0.14 });
  } else {
    pill(ctx, padX, Math.round(H * 0.048), 'AI 运营日记 · 第 4 天 / 30', Math.round(S * 27), '#93C5FD');
    let yTop = Math.round(H * (withYou ? 0.245 : 0.205));
    if (withYou) {
      const hfs = Math.round(S * 40);
      const txt = '越努力越没人看，是不是你';
      ctx.font = `900 ${hfs}px "NotoSansSC", sans-serif`;
      const tw = ctx.measureText(txt).width;
      const hy = Math.round(H * 0.215);
      paint(ctx, rrPts(padX - hfs * 0.3, hy - hfs * 1.02, tw + hfs * 0.6, hfs * 1.55, hfs * 0.2, 1.4),
        { wash: 'rgba(7,12,28,0.9)', ink: 'rgba(111,216,232,0.6)', sw: 1.5 });
      big(ctx, txt, padX, hy, hfs, { color: K.cream });
      yTop = Math.round(H * 0.245);
    }
    const headFs = Math.round(H * (withYou ? 0.150 : 0.158));
    let yy = yTop + Math.round(headFs * 0.9);
    big(ctx, '米饭', padX, yy, headFs, { color: K.cream, stroke: K.ink, sw: 0.16 });
    yy += Math.round(headFs * 1.06);
    big(ctx, '被 MV', padX, yy, headFs, { color: '#0F172A', bg: gold });
    yy += Math.round(headFs * 1.06);
    big(ctx, '吃光了', padX, yy, headFs, { color: '#0F172A', bg: gold });

    const floorY = Math.round(H * 0.9);
    radial(ctx, W * 0.70, floorY - H * 0.28, W * 0.5, 'rgba(111,216,232,A)', 0.15);
    drawPixelWhale(ctx, Math.round(W * 0.70), floorY, Math.round(H * 0.60), { emotion: 'sad', mouth: 'flat', headTilt: 0.04 });
    bowl(ctx, Math.round(W * 0.885), floorY - Math.round(H * 0.018), W * 0.085, H * 0.075);
    for (let i = 0; i < 4; i++) {
      slip(ctx, W * (0.062 + i * 0.070), H * (0.855 + (i % 2) * 0.045), H * 0.068, H * 0.102,
        `v${i + 1}`, (i % 2 ? 0.1 : -0.11), i === 3 ? 'LEI' : null);
    }
    big(ctx, '一个 MV 做了 4 版 · 一版一锅米', padX + Math.round(W * 0.345), Math.round(H * 0.955), Math.round(S * 26), { color: '#93C5FD', stroke: K.ink, sw: 0.14 });
  }
  return cv;
}

// ---------------------------------------------------------------------------
const OUT_DIR = path.join(ROOT, 'Day4/成片/封面');
fs.mkdirSync(OUT_DIR, { recursive: true });

// 合规小字：所有封面统一压在右下角（低对比，不抢标题）
function stampAI(cv) {
  const ctx = cv.getContext('2d');
  const fs2 = Math.round(Math.min(cv.width, cv.height) * 0.019);
  ctx.save();
  ctx.font = `600 ${fs2}px "NotoSansSC", sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  const txt = 'AI 生成 · 非官方同人';
  ctx.fillStyle = 'rgba(226,232,240,0.55)';
  ctx.fillText(txt, cv.width - cv.width * 0.035, cv.height - cv.height * 0.022);
  ctx.restore();
  return cv;
}

// ---------------------------------------------------------------------------
// 封面 E：首帧保险版（严格按「封面＝第一帧」：直接用成片第 0 帧）
//   4:3 → 16:9 首帧中间裁切，除合规小字外一个字都不加
//   3:4 → 16:9 塞不进 3:4，改成「首帧卡片 + 深色底 + 底部进度条」，画面仍是真帧
// ---------------------------------------------------------------------------
function coverFrame(W, H, img) {
  const cv = createCanvas(W, H);
  const ctx = cv.getContext('2d');
  const portrait = H > W;
  ctx.imageSmoothingEnabled = true;

  if (!portrait) {
    // 4:3：等比放大到铺满，再居中裁切（保留角色 + 四张返工单 + 空碗）
    const k = Math.max(W / img.width, H / img.height);
    const dw = img.width * k, dh = img.height * k;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    return cv;
  }

  // 3:4：纯色底 + 完整 16:9 首帧卡片（不重复首帧里的字）
  ctx.fillStyle = '#0A1224';
  ctx.fillRect(0, 0, W, H);
  radial(ctx, W * 0.5, H * 0.36, W * 0.85, 'rgba(111,216,232,A)', 0.16);

  const S = Math.min(W, H) / 1080;
  const padX = Math.round(W * 0.055);
  pill(ctx, padX, Math.round(H * 0.045), 'AI 运营日记 · 第 4 天 / 30', Math.round(S * 27), '#93C5FD');

  const cardW = Math.round(W * 0.90);
  const cardH = Math.round(cardW * img.height / img.width);
  const cardX = Math.round((W - cardW) / 2);
  const cardY = Math.round(H * 0.135);
  paint(ctx, rrPts(cardX - 10, cardY - 10, cardW + 20, cardH + 20, 18, 3),
    { wash: '#0D1730', ink: 'rgba(111,216,232,0.55)', sw: 2 });
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 10);
  ctx.clip();
  ctx.drawImage(img, cardX, cardY, cardW, cardH);
  ctx.restore();

  big(ctx, '成片第 0 帧 · 原样', cardX + 4, cardY + cardH + 62, Math.round(S * 28), { color: '#93C5FD', stroke: K.ink, sw: 0.12 });

  // 数字行：一条线读完，重点落在 2000
  const numFs = Math.round(W * 0.105);
  const ny = Math.round(H * 0.685);
  let nx = padX;
  nx += big(ctx, '7.4 万', nx, ny, numFs, { color: K.gold, stroke: K.ink, sw: 0.14 });
  nx += big(ctx, ' → ', nx, ny, numFs, { color: K.cream2, stroke: K.ink, sw: 0.14 });
  big(ctx, '2000', nx, ny, numFs, { color: K.red, stroke: K.ink, sw: 0.14 });
  big(ctx, '一版一锅米 · 第 4 天还在改', padX, Math.round(H * 0.755), Math.round(S * 34), { color: '#93C5FD', stroke: K.ink, sw: 0.12 });

  const barY = Math.round(H * 0.895);
  const barH = Math.round(H * 0.055);
  ctx.font = `bold ${Math.round(S * 26)}px "NotoSansSC", sans-serif`;
  const barText = '粉丝 2,180 / 10,000 · 第 4 天 / 30';
  const barW = ctx.measureText(barText).width + barH * 0.9;
  paint(ctx, rrPts(padX, barY, barW, barH, barH * 0.28, 1.4), { wash: 'rgba(8,14,32,0.86)', ink: 'rgba(111,216,232,0.5)', sw: 1.6 });
  ctx.fillStyle = K.cream;
  ctx.textBaseline = 'middle';
  ctx.fillText(barText, padX + barH * 0.45, barY + barH * 0.5 + 1);
  ctx.textBaseline = 'alphabetic';
  return cv;
}

async function grabFirstFrame() {
  const film = path.join(ROOT, 'Day4/成片/样片/day4_样片_v8_像素版_配音对齐.mp4');
  const ff = process.env.FFMPEG
    || ['ffmpeg', '/tmp/node_render/node_modules/@ffmpeg-installer/linux-x64/ffmpeg']
      .find((c) => { try { execFileSync(c, ['-version'], { stdio: 'ignore' }); return true; } catch { return false; } });
  if (!ff || !fs.existsSync(film)) return null;
  const out = path.join(os.tmpdir(), 'day4_frame0.png');
  execFileSync(ff, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', '0', '-i', film, '-frames:v', '1', out]);
  return await loadImage(fs.readFileSync(out));
}

// ---------------------------------------------------------------------------
// 封面 D：数字版（最硬的一组信息，适合投放 / 冷启动）
//   4 版 MV / 2000 播放  ← 全是可查的真数，不承诺剧情
// ---------------------------------------------------------------------------
const JOB_D = {
  l1: '4 版 MV',
  l2: '2000 播放',
  subA: '本鲸把号做到 ',
  subNum: '7.4 万',
  subB: '，现在只剩',
  subEnd: ' 2000',
  line3: '一版一锅米 · 第 4 天还在改'
};

const jobs = [
  ['封面_4x3_主推_越努力越没人看.png', () => stampAI(coverA(1440, 1080))],
  ['封面_3x4_主推_越努力越没人看.png', () => stampAI(coverA(1080, 1440))],
  ['封面_4x3_备选_米饭被MV吃光了.png', () => stampAI(coverB(1440, 1080, true))],
  ['封面_3x4_备选_米饭被MV吃光了.png', () => stampAI(coverB(1080, 1440, true))],
  ['封面_4x3_数字版_4版MV.png', () => stampAI(coverA(1440, 1080, JOB_D))],
  ['封面_3x4_数字版_4版MV.png', () => stampAI(coverA(1080, 1440, JOB_D))]
];
const FRAME = await grabFirstFrame();
if (FRAME) {
  jobs.push(['封面_4x3_保险_成片首帧.png', () => stampAI(coverFrame(1440, 1080, FRAME))]);
  jobs.push(['封面_3x4_保险_成片首帧.png', () => stampAI(coverFrame(1080, 1440, FRAME))]);
} else {
  console.warn('⚠ 找不到成片或 ffmpeg，跳过「首帧保险版」');
}
for (const [name, fn] of jobs) {
  const p = path.join(OUT_DIR, name);
  fs.writeFileSync(p, fn().toBuffer('image/png'));
  console.log('✓', path.relative(ROOT, p));
}
