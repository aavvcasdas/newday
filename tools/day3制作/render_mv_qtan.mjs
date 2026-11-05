// ============================================================================
// render_mv_qtan.mjs —— 《朋友的酒》Q 弹 MV（抖音竖屏 1080×1920）
//
// 需求（2026-10-27）：账号 2 秒跳出率 40%+，要优化开头；并「用《朋友的酒》做 MV、Q 弹那种」。
//
// 参考的做法（网上搜到的 Q 弹梗）：
//   · 抖音 #朋友的酒 dj / Q 弹 舞蹈挑战：所有人！保持 Q 弹！—— 角色按拍子「压扁—弹回」；
//   · GitHub `SSSimpleC/chibi-squash-spin`：一圈 24 帧真实方向（80ms/帧 ≈ 1.92s 一圈），
//     Q 弹每圈 2 次，高 100%→66.7%、宽 100%→150%、**底线固定**，色板与轮廓不换。
//   本渲染器按同样口径实现：高 1→0.67、宽 1→1.5、脚底不动；平面图转圈用 |cos| 横向压缩
//   （和 Day3 的 L13 一个做法），不做整图旋转（转 180° 会倒过来）。
//
// 素材与规则：
//   · 角色：`tools/day3制作/whale_girl_src/pose_*.png`（1024×1024 高清立绘，项目默认素材，
//     不用像素骨架）。这批图是**白底 RGB 无 alpha**，所以这里做一次「从四边泛洪的白底抠图」
//     （只抠和画面边缘连通的白，围裙/裙子内部的白色保留），抠完缓存在 /tmp/whale_alpha/；
//   · 字幕：`tools/字幕/day2_style_sub.mjs`（项目默认字幕：短分句 + 说话人标签）；
//   · 音频：`--audio <朋友的酒.mp3>`，默认只取 18.0s 起 42s 的副歌段落（可用 --from/--dur 改）。
//     ⚠️ 这首歌是有版权的，**不要把这个 mp3 提交进仓库**；发布时建议在抖音曲库里选同名的
//        「朋友的酒（DJ版）」替换音轨，或者直接用本条成片但保留平台内音乐版权校验。
//
// 用法：
//   VIDEO_FX_DIR=.../video-fx node tools/day3制作/render_mv_qtan.mjs \
//       --audio /tmp/vfx/朋友的酒.mp3 --from 18 --dur 42 --out /tmp/mv.mp4
//   node ... --hook "所有人！保持Q弹！" --hook-out /tmp/hook_a.mp4 --hook-dur 4   # 只出前 4 秒做 A/B
//   node ... --times 0.5,3,10                                                     # 抽帧自查
// ============================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

import { createDay2Subtitle } from '../字幕/day2_style_sub.mjs';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');

function resolveCanvas() {
  for (const c of ['@napi-rs/canvas', '/tmp/node_render/node_modules/@napi-rs/canvas',
    path.join(process.env.VIDEO_FX_DIR || path.join(REPO, 'video-fx'), 'node_modules/@napi-rs/canvas')]) {
    try { return require(c); } catch (e) { /* 下一个 */ }
  }
  throw new Error('缺少 @napi-rs/canvas：npm i @napi-rs/canvas');
}
const { createCanvas, loadImage, GlobalFonts } = resolveCanvas();

const FONT_DIR = path.join(process.env.VIDEO_FX_DIR || path.join(REPO, 'video-fx'), 'assets/fonts');
for (const [f, name] of [['NotoSansSC-Bold.ttf', 'NotoSansSC'], ['ZCOOLKuaiLe-Regular.ttf', 'ZCOOLKuaiLe'],
  ['Silkscreen-Regular.ttf', 'Silkscreen']]) {
  const p = path.join(FONT_DIR, f);
  if (fs.existsSync(p)) GlobalFonts.registerFromPath(p, name);
}

function resolveFfmpeg() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) return process.env.FFMPEG_PATH;
  const venv = '/tmp/venv/lib/python3.11/site-packages/imageio_ffmpeg/binaries';
  if (fs.existsSync(venv)) {
    const b = fs.readdirSync(venv).find((x) => x.startsWith('ffmpeg'));
    if (b) return path.join(venv, b);
  }
  return 'ffmpeg';
}

// ---------------------------------------------------------------- 参数
const ARGV = process.argv.slice(2);
const argOf = (flag, dflt = null) => {
  const i = ARGV.indexOf(flag);
  return i >= 0 && i + 1 < ARGV.length ? ARGV[i + 1] : dflt;
};

const W = 1080, H = 1920, FPS = 30;
const AUDIO = argOf('--audio', path.join(REPO, 'video-fx/assets/pengyou_de_jiu.mp3'));
const FROM = Number(argOf('--from', '18'));
const DUR = Number(argOf('--dur', '42'));
const BPM = Number(argOf('--bpm', '130.4'));
const BEAT = 60 / BPM;
const HOOK_TEXT = argOf('--hook', '所有人！\n保持Q弹！');
const HOOK_DUR = Number(argOf('--hook-dur', '4'));
const LIMIT = ARGV.includes('--hook-out') ? Math.min(DUR, HOOK_DUR) : DUR;
const OUT = argOf('--hook-out', argOf('--out', path.join(REPO, 'Day3/成片/MV/朋友的酒_Q弹MV_v1.mp4')));

const C = {
  bg0: '#050B1E', bg1: '#0E1B3F', bg2: '#173A63',
  cyan: '#6FD8E8', blue: '#7FB4FF', gold: '#FFC94A', cream: '#FFF4DC', ink: '#0B1224',
  pink: '#FF8FB1'
};

// 歌词时间轴：沿用 video-fx 里已有的《朋友的酒》LRC/Vosk 时间轴
// （`video-fx/src/mv_pengyou_de_jiu.js` 的 SUBTITLES），这里只取用到的那几句、并减去 --from。
const LYRICS = [
  { t0: 18.31, t1: 25.95, text: '昨日一去不复回 哦也' },
  { t0: 26.00, t1: 34.05, text: '开心比什么都贵' },
  { t0: 34.10, t1: 41.95, text: '覆水不能再收回 哦也' },
  { t0: 41.99, t1: 50.05, text: '桃花谢了有玫瑰' },
  { t0: 50.10, t1: 53.90, text: '人生几十年总会有风雨来陪' },
  { t0: 53.95, t1: 57.95, text: '潇潇洒洒赴会今不醉不归' },
  { t0: 58.00, t1: 61.45, text: '往事后不后悔慢慢去体会' }
];

// ---------------------------------------------------------------- 字幕（项目默认）
const subFontOf = (size, weight) => `${weight} ${size}px "NotoSansSC", "Noto Sans SC", sans-serif`;
const subMeasure = createCanvas(8, 8).getContext('2d');
// 竖屏适配：字幕组件是按 1920×1080 横屏设计的（字号 28 / 条宽上限 1120）。
// 这里不复制一份实现，而是**在缩放后的虚拟坐标里画**：k=1.8 时 28px→50px 实际字号，
// 1120 的条宽上限→2016 虚宽（受 maxTextWidth 470 约束，实际条宽 ≤1004px，竖屏放得下）。
const SUB_K = 1.8;
const SUB = createDay2Subtitle({
  fontOf: subFontOf,
  measureCtx: subMeasure,
  cfg: { maxTextWidth: 470 }
});

// ---------------------------------------------------------------- 小工具
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (v) => 1 - Math.pow(1 - clamp(v), 3);
const easeOut = (v) => 1 - Math.pow(1 - clamp(v), 2);
const TAU = Math.PI * 2;
function hash(n) { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }

function textLine(ctx, str, x, y, size, color, o = {}) {
  ctx.save();
  ctx.font = `${o.weight || 800} ${size}px ${o.font || '"NotoSansSC", sans-serif'}`;
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = 'middle';
  if (o.stroke !== false) {
    ctx.lineWidth = o.sw || Math.max(3, size * 0.14);
    ctx.strokeStyle = o.strokeColor || 'rgba(4,10,26,0.9)';
    ctx.lineJoin = 'round';
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.restore();
}

// ---------------------------------------------------------------- 场景
let IMGS = {};

function bg(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, W * 0.4, H);
  g.addColorStop(0, C.bg0);
  g.addColorStop(0.55, C.bg1);
  g.addColorStop(1, C.bg2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const beat = t / BEAT;
  const pulse = Math.exp(-(beat % 1) * 4.2);          // 每拍一次衰减

  // 旋转光束（Q 弹舞台）
  ctx.save();
  ctx.translate(W / 2, H * 0.52);
  ctx.rotate(t * 0.22);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    const lg = ctx.createLinearGradient(0, 0, Math.cos(a) * H, Math.sin(a) * H);
    lg.addColorStop(0, `rgba(111,216,232,${0.10 + 0.06 * pulse})`);
    lg.addColorStop(1, 'rgba(111,216,232,0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, H * 0.9, a - 0.06, a + 0.06);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 节拍声波环
  for (let k = 0; k < 3; k++) {
    const ph = ((beat + k / 3) % 1);
    const r = 260 + ph * 900;
    ctx.strokeStyle = `rgba(255,201,74,${(1 - ph) * 0.22})`;
    ctx.lineWidth = 6 * (1 - ph) + 1.5;
    ctx.beginPath();
    ctx.arc(W / 2, H * 0.52, r, 0, TAU);
    ctx.stroke();
  }

  // 星光/气泡
  for (let i = 0; i < 46; i++) {
    const sp = 24 + hash(i) * 60;
    const x = hash(i + 7) * W;
    const y = H - ((hash(i + 13) * H + t * sp) % H);
    const r = 2 + hash(i + 21) * 5;
    ctx.globalAlpha = 0.25 + 0.3 * hash(i + 3);
    ctx.fillStyle = [C.cyan, C.blue, C.gold, C.cream][i % 4];
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 舞台地板光
  const fg = ctx.createRadialGradient(W / 2, H * 0.9, 40, W / 2, H * 0.9, 620);
  fg.addColorStop(0, `rgba(111,216,232,${0.20 + 0.12 * pulse})`);
  fg.addColorStop(1, 'rgba(111,216,232,0)');
  ctx.fillStyle = fg;
  ctx.fillRect(0, H * 0.55, W, H * 0.45);

  return pulse;
}

// Q 弹：每拍压扁一次，高 1→0.67、宽 1→1.5，脚底不动
function qtan(t, phase = 0) {
  const beat = t / BEAT + phase;
  const k = beat % 1;
  // 0→1 的「砸下去」很快（前 22%），然后回弹带一点过冲
  let amt;
  if (k < 0.22) amt = ease(k / 0.22);
  else amt = 1 - ease((k - 0.22) / 0.78);
  const sq = 0.33 * amt;                 // 0.67 高
  return { sy: 1 - sq, sx: 1 + sq * 1.5, amt };  // 宽最多 1.5
}

function drawWhale(ctx, pose, t, baseY) {
  const bob = Math.sin(t * 2.4) * 6;
  const { sy, sx } = qtan(t);
  // 转圈：每 8 拍来一次 0.5s 的「快速转身」。
  // 平面图转圈只能用 |cos| 横向压缩（和 Day3 的 L13 同做法），但压到 0 会变成一条线，
  // 所以下限卡在 0.55，读起来是「转过身又转回来」而不是被压扁。
  const SPIN_LEN = 0.52;
  const SPIN_PERIOD = BEAT * 8;
  const spinT = t % SPIN_PERIOD;
  const spinK = spinT > SPIN_PERIOD - SPIN_LEN ? (spinT - (SPIN_PERIOD - SPIN_LEN)) / SPIN_LEN : 0;
  const flipX = 0.55 + 0.45 * Math.abs(Math.cos(spinK * Math.PI));

  // 先按「高度」定尺寸，再按「宽度」收一次：这批姿势有的很宽（拿麦克风、举手），
  // 只按高度会把两侧头发/手切到画外。静止时宽度不超过画面 88%。
  const aspect = pose.w / pose.h;
  let targetH = Number(argOf('--size', '1240'));
  if (targetH * aspect > W * 0.88) targetH = (W * 0.88) / aspect;
  let h = targetH * sy;
  let w = targetH * aspect * sx * flipX;
  if (w > W * 1.04) { const k = (W * 1.04) / w; w *= k; h *= k; }   // Q 弹压宽时最多贴边
  const x = W / 2;
  const yFoot = baseY + bob;

  // 影子：压扁时变大变淡
  ctx.save();
  const sw = 420 * sx;
  const sg = ctx.createRadialGradient(x, yFoot + 6, 0, x, yFoot + 6, sw * 0.6);
  sg.addColorStop(0, `rgba(3,8,20,${0.42 - 0.12 * (sy < 1 ? 1 : 0)})`);
  sg.addColorStop(1, 'rgba(3,8,20,0)');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.ellipse(x, yFoot + 6, sw * 0.55, 52 * sx, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(pose.img, pose.x, pose.y, pose.w, pose.h, x - w / 2, yFoot - h, w, h);
  ctx.restore();
  return { x, yFoot, h, w };
}

// 拍点爆字
function beatStamps(ctx, t, pulse) {
  const beat = Math.floor(t / BEAT);
  for (let k = 0; k < 3; k++) {
    const b = beat - k;
    if (b < 0) continue;
    const age = t - b * BEAT;
    if (age > 0.62) continue;
    const a = (1 - age / 0.62) * 0.9;
    const side = b % 2 ? 1 : -1;
    const x = W / 2 + side * (330 + age * 120);
    const y = H * 0.50 - age * 70 + (b % 3) * 22;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(x, y);
    ctx.rotate(side * 0.18);
    ctx.scale(1 + age * 0.35, 1 + age * 0.35);
    textLine(ctx, b % 4 === 0 ? 'Q弹!' : '弹!', 0, 0, b % 4 === 0 ? 46 : 34,
      b % 4 === 0 ? C.gold : C.cyan, { sw: 7 });
    ctx.restore();
  }
}

function hud(ctx, t) {
  if (t < 2.6) return;          // 开场大字期间不挂标题条
  ctx.save();
  ctx.fillStyle = 'rgba(5,11,30,0.55)';
  ctx.fillRect(0, 0, W, 150);
  textLine(ctx, '朋友的酒 · 本鲸 Q 弹中', W / 2, 66, 40, C.cream, { sw: 8 });
  const beat = t / BEAT;
  const on = Math.floor(beat) % 4;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(W / 2 - 54 + i * 36, 116, 9, 0, TAU);
    ctx.fillStyle = i === on ? C.gold : 'rgba(255,244,220,0.28)';
    ctx.fill();
  }
  ctx.restore();
}

function lyricAt(t) {
  const abs = t + FROM;
  return LYRICS.find((l) => abs >= l.t0 && abs < l.t1) || null;
}

function drawHook(ctx, t) {
  if (!HOOK_TEXT || HOOK_TEXT === '-') return;
  // 前 2.6 秒的大字开场：直接给「Q 弹」这个动作，不放 logo、不做淡入
  const D = 2.6;
  if (t >= D) return;
  const k = clamp(t / 0.28);
  const out = clamp((D - t) / 0.35);
  ctx.save();
  ctx.globalAlpha = Math.min(k, out);
  const s = 1 + (1 - easeOut(k)) * 0.35;
  ctx.translate(W / 2, H * 0.155);
  ctx.scale(s, s);
  ctx.rotate(-0.02);
  HOOK_TEXT.split(/\n|\|/).forEach((ln, i, arr) => {
    textLine(ctx, ln, 0, i * 118 - ((arr.length - 1) * 118) / 2, 92, i ? C.cyan : C.gold, { sw: 18 });
  });
  ctx.restore();
  if (t < 0.5) {
    ctx.save();
    ctx.globalAlpha = (1 - t / 0.5) * 0.55;
    ctx.fillStyle = C.cream;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

function renderFrame(ctx, t) {
  const pulse = bg(ctx, t);
  const DANCE = ['cheer', 'idol_mic_sing', 'tail_wag_dance', 'toast_cheers', 'playful_fists',
    'ciallo_wink', 'confident_hips', 'jump_joy'].filter((k) => IMGS[k]);
  const poseKey = DANCE[Math.floor(t / (BEAT * 8)) % DANCE.length];
  const { yFoot } = drawWhale(ctx, IMGS[poseKey], t, H * 0.815);
  beatStamps(ctx, t, pulse);
  drawHook(ctx, t);
  hud(ctx, t);

  // 画面闪白（强拍）
  if ((t / BEAT) % 4 < 0.10) {
    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = C.cream;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // 字幕：项目默认（Day2 加更版），说话人标「鲸鱼娘」
  const ly = lyricAt(t);
  if (ly) {
    const vis = clamp((t + FROM - ly.t0) / 0.18) * clamp((ly.t1 - (t + FROM)) / 0.18);
    if (vis > 0.02) {
      const lines = SUB.wrap(ly.text, 470, 28, 800);
      ctx.save();
      ctx.scale(SUB_K, SUB_K);
      SUB.draw(ctx, { lines, speaker: '鲸鱼娘', vis, W: W / SUB_K, H: (H - 120) / SUB_K });
      ctx.restore();
    }
  }
  // 底部水印
  textLine(ctx, '非官方同人 · AI 生成 · 音乐版权见发布说明', W / 2, H - 70, 24, 'rgba(255,244,220,0.55)',
    { weight: 700, sw: 4 });
}

// ---------------------------------------------------------------- 输出
// 白底抠图：只把「和画面四边连通的白」变透明，角色内部的白色（围裙、裙子）不动。
const ALPHA_CACHE = '/tmp/whale_alpha';
async function loadPoseAlpha(name) {
  fs.mkdirSync(ALPHA_CACHE, { recursive: true });
  const src = path.join(HERE, 'whale_girl_src', `pose_${name}.png`);
  if (!fs.existsSync(src)) return null;
  const out = path.join(ALPHA_CACHE, `${name}.png`);
  if (!fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(src).mtimeMs) {
    const img = await loadImage(src);
    const cv = createCanvas(img.width, img.height);
    const cx = cv.getContext('2d');
    cx.drawImage(img, 0, 0);
    const id = cx.getImageData(0, 0, cv.width, cv.height);
    const d = id.data, W2 = cv.width, H2 = cv.height;
    const white = (i) => d[i] > 236 && d[i + 1] > 236 && d[i + 2] > 236;
    const seen = new Uint8Array(W2 * H2);
    const q = [];
    for (let x = 0; x < W2; x++) { q.push(x, 0); q.push(x, H2 - 1); }
    for (let y = 0; y < H2; y++) { q.push(0, y); q.push(W2 - 1, y); }
    let head = 0;
    while (head < q.length) {
      const x = q[head++], y = q[head++];
      if (x < 0 || y < 0 || x >= W2 || y >= H2) continue;
      const p = y * W2 + x;
      if (seen[p]) continue;
      const i = p * 4;
      if (!white(i)) continue;
      seen[p] = 1;
      d[i + 3] = 0;
      q.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
    }
    cx.putImageData(id, 0, 0);
    fs.writeFileSync(out, cv.toBuffer('image/png'));
  }
  const img = await loadImage(out);
  // 量内容 bbox（抠完四周是透明），这样「脚底」就是真的脚底，不会被原图留白骗到
  const cv2 = createCanvas(img.width, img.height);
  const c2 = cv2.getContext('2d');
  c2.drawImage(img, 0, 0);
  const dd = c2.getImageData(0, 0, cv2.width, cv2.height).data;
  let x0 = cv2.width, y0 = cv2.height, x1 = 0, y1 = 0;
  for (let y = 0; y < cv2.height; y++) {
    for (let x = 0; x < cv2.width; x++) {
      if (dd[(y * cv2.width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return { img, x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

async function main() {
  for (const n of ['cheer', 'idol_mic_sing', 'jump_joy', 'tail_wag_dance', 'toast_cheers',
    'playful_fists', 'ciallo_wink', 'confident_hips', 'wave', 'sparkler_firework']) {
    const img = await loadPoseAlpha(n);
    if (img) IMGS[n] = img;
  }
  if (!IMGS.cheer) throw new Error('缺少 tools/day3制作/whale_girl_src/pose_cheer.png');
  console.log(`鲸鱼娘姿势：${Object.keys(IMGS).join(' / ')}（白底已抠）`);

  const times = argOf('--times');
  if (times) {
    const dir = path.join(HERE, 'mv_stills');
    fs.mkdirSync(dir, { recursive: true });
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    for (const t of times.split(',').map(Number)) {
      ctx.clearRect(0, 0, W, H);
      renderFrame(ctx, t);
      const f = path.join(dir, `mv_t${t.toFixed(2)}.png`);
      fs.writeFileSync(f, canvas.toBuffer('image/png'));
      console.log('check', f);
    }
    return;
  }

  if (!fs.existsSync(AUDIO)) {
    throw new Error(`找不到音频 ${AUDIO}；用 --audio 指定《朋友的酒》mp3（不要提交进仓库）`);
  }
  const total = Math.round(LIMIT * FPS);
  const ffmpeg = resolveFfmpeg();
  fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
  const ff = spawn(ffmpeg, [
    '-y', '-f', 'rawvideo', '-vcodec', 'rawvideo', '-pix_fmt', 'rgba',
    '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-ss', String(FROM), '-t', String(LIMIT), '-i', AUDIO,
    '-map', '0:v:0', '-map', '1:a:0', '-c:a', 'aac', '-b:a', '192k',
    '-c:v', 'libx264', '-preset', 'medium', '-tune', 'animation',
    '-crf', String(argOf('--crf', '21')), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-t', String(LIMIT), OUT
  ], { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  ff.stderr.on('data', (d) => { err += d.toString(); });
  ff.on('error', (e) => { err += `\n[spawn] ${e.message}`; });

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const t0 = Date.now();
  for (let f = 0; f < total; f++) {
    ctx.clearRect(0, 0, W, H);
    renderFrame(ctx, f / FPS);
    const raw = canvas.data();
    const ok = ff.stdin.write(Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength));
    if (!ok) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 60 === 0 || f === total - 1) {
      const el = (Date.now() - t0) / 1000;
      process.stdout.write(`\r  frame ${f + 1}/${total} (${((f + 1) / total * 100).toFixed(0)}%) ${((f + 1) / Math.max(0.1, el)).toFixed(1)}fps`);
    }
  }
  process.stdout.write('\n');
  ff.stdin.end();
  const code = await new Promise((r) => ff.on('close', r));
  if (code !== 0) {
    console.error(err.split('\n').slice(-14).join('\n'));
    throw new Error(`ffmpeg exited ${code}`);
  }
  console.log(`✓ ${OUT} (${(fs.statSync(OUT).size / 1e6).toFixed(2)} MB)`);
}

await main();
