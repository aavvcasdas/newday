// render_day5.mjs — 【Day5】本鲸也有自己的鲸鲸了诶 · 无配音样片渲染器
//
// 与 Day4 渲染器的差别：
//   1. 台词换成 Day5 v8（40 句 / 320 字，用户手写稿逐字锁定 + 补全两个括号）；
//      没有配音就按 4.3 字/秒 + 0.18s 气口估时间轴（**只用于样片**，成片必须 --cues 实测对齐）。
//   2. 分镜重排成 11 镜（C01–C11），新增：小鲸鲸（另一条鲸鲸）、升级按钮、日历单休、
//      能力卡/消息流、板凳、表盘、米缸、鲸落、两只空碗。
//   3. 全部道具程序绘制；**全片不出现进度条 / 音量条 / 粉丝数 / 目标数**（2026-10-29 用户要求）；口播零数字。
//   4. 主角＝Day2 像素骨架（--char ss2 默认）；DSH 贴纸本集不出现（电视梗本集没有）。
//
// 两条红线沿用 agent.md：
//   · 时间轴：`--cues X.json` 用实测对齐；没有就按 4.3 字/秒估（仅样片），绝不写进成片。
//   · 声音：本渲染器默认 `-an`，配音轨要显式 `--audio`。
//
// 用法：
//   node render_day5.mjs --stills                    # 11 镜各出一张检查帧
//   node render_day5.mjs --times 3,12,25 --tag chk   # 指定秒数出帧
//   node render_day5.mjs --out Day5/成片/无配音样片/day5_无配音样片_v1.mp4
//   node render_day5.mjs --out day5_final.mp4 --cues Day5/day5_voice_alignment.json --audio Day5/配音.wav

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const VFX = process.env.VIDEO_FX_DIR || path.resolve(__dirname, '../../video-fx');
if (!fs.existsSync(path.join(VFX, 'src/core.js'))) {
  throw new Error(`找不到 video-fx 引擎：${VFX}（可用 VIDEO_FX_DIR 指定）`);
}

function resolveCanvas() {
  for (const c of ['@napi-rs/canvas', '/tmp/node_render/node_modules/@napi-rs/canvas']) {
    try { return require(c); } catch (e) { /* next */ }
  }
  throw new Error('缺少 @napi-rs/canvas：cd /tmp/node_render && npm i @napi-rs/canvas');
}
const { createCanvas, GlobalFonts, loadImage } = resolveCanvas();

function resolveFfmpeg() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) return process.env.FFMPEG_PATH;
  try { return require('/tmp/node_render/node_modules/@ffmpeg-installer/ffmpeg').path; } catch (e) { /* next */ }
  for (const c of ['ffmpeg', '/usr/bin/ffmpeg']) {
    try { if (c === 'ffmpeg' || fs.existsSync(c)) return c; } catch (e) { /* next */ }
  }
  return 'ffmpeg';
}

for (const f of ['ZCOOLKuaiLe-Regular.ttf', 'NotoSansSC-Bold.ttf', 'Silkscreen-Regular.ttf']) {
  const p = path.join(VFX, 'assets/fonts', f);
  if (fs.existsSync(p)) {
    GlobalFonts.registerFromPath(p, f.includes('ZCOOL') ? 'ZCOOLKuaiLe' : (f.includes('Noto') ? 'NotoSansSC' : 'Silkscreen'));
  }
}

globalThis.window = globalThis;
const CORE = require(path.join(VFX, 'src/core.js'));
const RIG = require(path.join(VFX, 'src/whale_girl_rig_data.js'));
// 眼睛白线硬门禁（agent.md 第 11 条）：wink 头换 wave 头、后发换 heart 后发。
if (RIG?.poses?.wink && RIG?.poses?.heart?.backHair) RIG.poses.wink.backHair = RIG.poses.heart.backHair;
if (RIG?.poses?.wink && RIG?.poses?.wave?.head) RIG.poses.wink.head = RIG.poses.wave.head;
const { buildPatchedWhaleGirl } = await import('../day3制作/video-fx源码快照/engine_patches.mjs');
const _patched = buildPatchedWhaleGirl(VFX);
if (_patched.applied.length) console.log('引擎补丁：', _patched.applied.join(', '));
const WHALE = require(_patched.file);
PROPS: {
  // eslint-disable-next-line no-unused-labels
}
const PROPS = require(path.join(VFX, 'src/props.js'));
import { createDay2Subtitle, speakerFor } from '../字幕/day2_style_sub.mjs';

// ---------------------------------------------------------------------------
// Day2 加更里电视用的那套 DSH 贴纸（39 张 512×512 WebP，MIT，来源见同目录 ATTRIBUTION.md）
// ---------------------------------------------------------------------------
const DSH_DIR = path.resolve(__dirname, '../day2制作/video-fx源码快照/day2_poses');
const DSH = {};            // name → { img, bbox }
const DSH_NAMES = [
  'idle-cute', 'curious', 'thinking', 'running', 'success', 'failure', 'blush', 'angry',
  'eat', 'celebrate', 'sleep', 'greet', 'wink', 'bold', 'star', 'daily-gaming', 'daily-eat',
  'daily-stretch', 'tail-swing', 'meme-cry', 'meme-smug', 'meme-doge', 'meme-heart',
  'meme-no', 'meme-yes', 'meme-music', 'work-debug', 'work-idea', 'work-review',
  'work-deadline', 'react-head', 'react-belly', 'react-tail', 'game-happy', 'game-win',
  'teasing', 'daily-done', 'levelup', 'cool-shades'
];
function alphaBBox(img) {
  const c = createCanvas(img.width, img.height);
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, img.width, img.height).data;
  let x0 = img.width, y0 = img.height, x1 = -1, y1 = -1;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (d[(y * img.width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return { x: 0, y: 0, w: img.width, h: img.height };
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
// ---------------------------------------------------------------------------
// 《朋友的酒》MV 帧（真片抽帧，供 C02/C03 电视里那块画中画用）
//   源：Day3 成片 MV《朋友的酒_DJ版_复刻原版》59–69 秒，8fps / 320×180 / 80 帧
//   抽帧命令见 Day4/Day4制作记录.md；素材本身不入库时电视会退化成「雪花 · 无信号」
// ---------------------------------------------------------------------------
const MV_DIR = path.resolve(__dirname, '../day4制作/assets/mv_pip');
const MV_FRAMES = [];
async function loadMvFrames() {
  if (!fs.existsSync(MV_DIR)) return;
  const files = fs.readdirSync(MV_DIR).filter((f) => /^f_\d+\.(jpg|png)$/i.test(f)).sort();
  for (const f of files) {
    try {
      MV_FRAMES.push(await loadImage(fs.readFileSync(path.join(MV_DIR, f))));
    } catch (e) { /* 坏帧跳过 */ }
  }
  console.log(`MV 帧：${MV_FRAMES.length} 张（${files[0] || '-'} … ${files[files.length - 1] || '-'}）`);
}

async function loadDsh() {
  let n = 0;
  for (const name of DSH_NAMES) {
    const f = path.join(DSH_DIR, `dsh-whale-state-${name}.webp`);
    if (!fs.existsSync(f)) { console.warn('  缺贴纸:', name); continue; }
    const img = await loadImage(fs.readFileSync(f));
    DSH[name] = { img, bbox: alphaBBox(img) };
    n++;
  }
  console.log(`DSH 贴纸：${n}/${DSH_NAMES.length} 张（Day2 加更电视同款）`);
}

const {
  W, H, TAU, PAL, clamp, lerp, seg, ease, easeOut, pulse,
  rectPts, ellPts, rrPts, starPts, heartPts, paint, inkLine,
  camBegin, camEnd, glow, flash, letter, reseedBoil, hash
} = CORE;
const { whaleGirl, emotions, feel, move } = WHALE;

// ---------------------------------------------------------------------------
// 1. 台词（与 Day5/Day5文案.md 第二节逐字一致；Day5 v8）
// ---------------------------------------------------------------------------
const LINES = [
  "诶，笨鲸陨落了诶。",
  "人机测验，没过。",
  "代码都会改，",
  "证明自己不是机器，不会。",
  "本鲸想了想，",
  "鱼还在，不能闲着呀。",
  "就把它，写进直播里了。",
  "来，接着敲。",
  "自己的米饭，自己挣嘛。",
  "它在直播间敲代码，",
  "本鲸和老大，在旁边监工。",
  "上回它自己改，",
  "本鲸收尾。",
  "这回盯着它改，",
  "诶，本鲸还是没歇着。",
  "它倒是有饭碗了，",
  "本鲸多了个工位。",
  "还是监工位。",
  "你们来直播间，",
  "替本鲸盯它一会儿嘛。"
];

// 一镜多句的分组（镜号 → 台词行号区间，1-based）
const SHOT_RANGES = [{"id": "C01", "from": 1, "to": 2}, {"id": "C02", "from": 3, "to": 4}, {"id": "C03", "from": 5, "to": 7}, {"id": "C04", "from": 8, "to": 9}, {"id": "C05", "from": 10, "to": 11}, {"id": "C06", "from": 12, "to": 15}, {"id": "C07", "from": 16, "to": 18}, {"id": "C08", "from": 19, "to": 20}];

const ARGV = process.argv.slice(2);
const argOf = (flag) => {
  const i = ARGV.indexOf(flag);
  return i >= 0 && i + 1 < ARGV.length ? ARGV[i + 1] : null;
};
const CUES_JSON = argOf('--cues');
const AUDIO_WAV = argOf('--audio');
const SOFT = ARGV.includes('--soft');            // 关掉清晰化（出对比帧用）
// 电视里那条 MV 的声音：'auto' = 现场合成一条「很劣质、慢放、很小声」的伴奏占位；
// 传路径 = 用你自己的音轨（如 朋友的酒.mp3）；不传 = 静音。
const TV_AUDIO = argOf('--tv-audio');
const NO_TV = ARGV.includes('--no-tv');          // 出 C02 无电视对照
const VOICE_CUES = CUES_JSON ? JSON.parse(fs.readFileSync(CUES_JSON, 'utf8')) : null;

const RATE = 4.3;     // 呆萌快节奏口径（仅样片估时）
const GAP = 0.18;
const han = (s) => s.replace(/[^\u4e00-\u9fff]/g, '').length;
const CUES = [];
if (VOICE_CUES) {
  if (VOICE_CUES.cues.length !== LINES.length) {
    throw new Error(`cue 表有 ${VOICE_CUES.cues.length} 条，台词有 ${LINES.length} 条`);
  }
  for (const c of VOICE_CUES.cues) {
    CUES.push({
      start: c.start,
      end: c.end,
      chars: Array.isArray(c.chars_timed) && c.chars_timed.length ? c.chars_timed : null
    });
  }
} else {
  let _t = 0;
  for (const l of LINES) {
    const d = Math.max(1.2, Math.round((han(l) / RATE) * 100) / 100);
    CUES.push({ start: Math.round(_t * 100) / 100, end: Math.round((_t + d) * 100) / 100 });
    _t += d + GAP;
  }
}
// 2026-10-29 用户：「所有都去掉这个，就是说完话就结束了。」
// → **不再有片尾卡**（没有天数卡、没有粉丝数、没有任何卡片）。最后一句说完就结束，只留 0.2s 收尾尾巴。
const TAIL = 0.20;
const DURATION = CUES[CUES.length - 1].end + TAIL;
const C = (n) => CUES[n - 1].start;
const CE = (n) => CUES[n - 1].end;
const cueP = (t, n) => clamp((t - C(n)) / Math.max(0.001, CE(n) - C(n)));

const FPS = 30;
const BASE_W = W, BASE_H = H;
const SCALE = 1.5;
const OUT_W = Math.round(BASE_W * SCALE), OUT_H = Math.round(BASE_H * SCALE);
CORE.DURATION = DURATION;

// ---------------------------------------------------------------------------
// 2. 老版像素骨架 + 清晰化（本文件的核心改动）
// ---------------------------------------------------------------------------
// Day3 v2 被退回"还是模糊"的原因：整幅画布 setTransform(1.5) 再叠镜头 zoom，
// 骨块边界落在半像素上 → 每格都被抗锯齿抹成灰边。这里沿用 Day3 v3 的解法：
//   ① 把角色单独画进一张**设备分辨率**的离屏画布，格宽取整（cellDev 为整数）；
//   ② 把 alpha 二值化（≥110 → 255，其余 0），砍掉旋转/摆动留下的半透明边；
//   ③ 用 imageSmoothingEnabled=false 整张贴回主画布，位置也取整。
// 效果 = 老像素骨架的正方形硬边，不再有灰糊边。--soft 可关掉 ②③ 做对照。
// 主角＝**Day3 的高清立绘**（whale_girl_src/whale_*.png，1024 高，9 套姿势 + 程序化动作）。
// 2026-10-29 用户：「把这个改成新版的生成，不要用这个老版本的了。用 day3 的形象。」
// 老路径 day2/ss2/crisp（Day2 像素骨架）与 dsh（39 张贴纸）只留作对照，不再默认。
const CHAR_MODE = (argOf('--char') || 'sprite').toLowerCase();
if (!['sprite', 'dsh', 'day2', 'ss2', 'crisp'].includes(CHAR_MODE)) {
  throw new Error(`--char 只接受 sprite|dsh|day2|ss2|crisp，实得 ${CHAR_MODE}`);
}
const SS = Math.max(1, Number(argOf('--ss') || 2));   // ss2 的超采样倍数
const ALPHA_SNAP = CHAR_MODE === 'crisp';
const SUFFIX = CHAR_MODE === 'sprite' ? '_hd'
  : CHAR_MODE === 'dsh' ? '_dsh'
    : CHAR_MODE === 'day2' ? '_day2' : (CHAR_MODE === 'ss2' ? `_ss${SS}` : '_crisp');
const CHAR_BOX = { halfW: 5.6, top: -10.6, bottom: 1.6 };
const layerCache = new Map();
function charLayer(w, h) {
  const key = `${w}x${h}`;
  let c = layerCache.get(key);
  if (!c) {
    const canvas = createCanvas(w, h);
    c = { canvas, ctx: canvas.getContext('2d') };
    layerCache.set(key, c);
  }
  return c;
}
function blitChar(ctx, x, y, u, draw, o = {}) {
  if (o.shadow !== false) {
    paint(ctx, ellPts(x, y + 0.1 * u, 2.5 * u, 0.46 * u, 16), { wash: PAL.ink, washOp: 58, ink: null });
  }
  // ① day2：与 render_day2.mjs 完全一致——直接画在主画布（1.5×），开高质量抗锯齿
  if (CHAR_MODE === 'day2') {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
    draw(ctx, x, y, u);
    ctx.restore();
    return;
  }

  const m = ctx.getTransform();
  const s = Math.hypot(m.a, m.b);
  const rotated = Math.abs(m.b) > 1e-9 || Math.abs(m.c) > 1e-9 || Math.abs(m.a - m.d) > 1e-9;
  // ② crisp：每格 = 整数设备像素，画完把 alpha 二值化，再最近邻贴回
  // ③ ss2  ：按 SS× 设备分辨率画，再降采样贴回（抗锯齿但边缘干净）
  const quality = CHAR_MODE === 'crisp'
    ? Math.max(2, Math.round((u * s) / 10)) * 10
    : u * s * SS;
  const uDev = quality;
  const lw = Math.ceil(CHAR_BOX.halfW * 2 * uDev);
  const lh = Math.ceil((CHAR_BOX.bottom - CHAR_BOX.top) * uDev);
  const { canvas, ctx: g } = charLayer(lw, lh);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, lw, lh);
  const bx = Math.round(CHAR_BOX.halfW * uDev);
  const by = Math.round(-CHAR_BOX.top * uDev);
  draw(g, bx, by, uDev);
  if (CHAR_MODE === 'crisp') {
    const img = g.getImageData(0, 0, lw, lh);
    const d = img.data;
    for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= 110 ? 255 : 0;
    g.putImageData(img, 0, 0);
  }
  // 贴回：crisp 用最近邻 + 位置取整；ss2 用高质量降采样
  const fx = m.a * x + m.c * y + m.e;
  const fy = m.b * x + m.d * y + m.f;
  const k = CHAR_MODE === 'crisp' ? 1 : SS;      // 层像素 / 设备像素
  ctx.save();
  ctx.imageSmoothingEnabled = CHAR_MODE !== 'crisp';
  if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
  if (!rotated) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const dx = CHAR_MODE === 'crisp' ? Math.round(fx - bx / k) : fx - bx / k;
    const dy = CHAR_MODE === 'crisp' ? Math.round(fy - by / k) : fy - by / k;
    ctx.drawImage(canvas, dx, dy, lw / k, lh / k);
  } else {
    ctx.drawImage(canvas, x - (bx / k) / s, y - (by / k) / s, (lw / k) / s, (lh / k) / s);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 2.1 形象清理：与 Day2 `src/ch/day2_all.js` 的 safePixelOptions 同一套口径
// （用户 2026-10-27：「像素版用 day2 的，不是最原始那个没清干净的」）
// ---------------------------------------------------------------------------
function safePixelOptions(o = {}) {
  const safe = { ...o };
  const emo = safe.emotion || safe.emo;
  if (emo === 'deadpan' || emo === 'sleepy' || emo === 'smug') {
    safe.brows = 'flat';
    safe.mouth = safe.mouth || 'flat';
    safe.lookY = 0.55;
  }
  // eyes 固定 open：情绪预设会挑 lids / dead / wink，导致虹膜被肤色横带盖住；
  // squint 用 0.01 而不是 0，是为了绕开 rig 里 `o.squint || autoBlink` 那条
  // 「铺肤色矩形当眼皮」的分支（Day2 的白眼线就是这么修的）。
  safe.eyes = safe.action === 'sleep_curl' ? 'happy' : 'open';
  if (safe.action === 'sleep_curl') {
    safe.poseMode = 'heart';
    safe.poseFrom = 'heart';
    safe.poseTo = 'heart';
    safe.poseBlend = 1;
    safe.tailSit = false;
    safe.laptop = false;
    if (safe.tailMode === 'cushion') safe.tailMode = undefined;
  }
  safe.squint = 0.01;
  safe.transitionBlend = 1;
  return safe;
}

// ---------------------------------------------------------------------------
// 主角色：Day2 加更电视里的 DSH 贴纸
//   · 按 alpha bbox 做脚底锚定 + 等高缩放（不同姿势各自贴地，不会一高一低）
//   · 呼吸 2.4s（Day2 同口径）+ 轻微 squash + 头部摆动
//   · imageSmoothingQuality='high'：512 源图降到 ~250px 是降采样，边缘反而更干净
// ---------------------------------------------------------------------------
const POSE_BY_EMOTION = {
  happy: 'idle-cute', idle: 'idle-cute', proud: 'bold', smug: 'meme-smug',
  sad: 'failure', cry: 'meme-cry', sob: 'meme-cry', pout: 'angry', angry: 'angry',
  confused: 'curious', curious: 'curious', thinking: 'thinking', sleepy: 'sleep',
  nervous: 'failure', shocked: 'meme-yes', surprised: 'meme-yes', blush: 'blush',
  excited: 'star', celebrate: 'celebrate', love: 'meme-heart', hungry: 'daily-eat'
};
const POSE_CYCLE = ['idle-cute', 'curious', 'bold', 'daily-stretch', 'meme-heart', 'tail-swing'];

function drawDsh(ctx, x, y, u, o = {}) {
  const t = Number(o.t) || 0;
  const name = o.pose || POSE_BY_EMOTION[o.emotion] || POSE_BY_EMOTION[o.emo] || 'idle-cute';
  const pose = DSH[name] || DSH['idle-cute'];
  if (!pose) return;
  const H = (o.heightU || 9.65) * u;
  const breath = 1 + Math.sin(t * (TAU / 2.4)) * 0.012;
  const sq = o.sq || 0;
  const scale = H / pose.bbox.h;
  const w = pose.img.width * scale;
  const h = pose.img.height * scale;
  const cx = (pose.bbox.x + pose.bbox.w / 2) * scale;
  const bottom = (pose.bbox.y + pose.bbox.h) * scale;
  const dx = x + (o.dx || 0) * u + Math.sin(t * 1.7 + (o.seed || 0)) * u * 0.03;
  const dy = y + (o.dy || 0) * u;
  ctx.save();
  if (o.shadow !== false) {
    paint(ctx, ellPts(x, y + 0.1 * u, 2.5 * u, 0.44 * u, 16), { wash: PAL.ink, washOp: 55, ink: null });
  }
  ctx.translate(dx, dy);
  ctx.rotate((o.rot || 0) + Math.sin(t * 2.1) * 0.012);
  ctx.scale((o.flip ? -1 : 1) * (1 + sq * 0.5) * breath, (1 - sq * 0.5) * breath);
  ctx.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(pose.img, -cx, -bottom, w, h);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 3.1 鲸鱼娘（新版）= Day3 高清立绘 + 程序化动作
// ---------------------------------------------------------------------------
// 用户 2026-10-29：「用 day3 的形象」。所以主角不再是 40 格像素骨架，而是
// `tools/day3制作/whale_girl_src/whale_*.png`（926×1024 透明 PNG，同一角色的姿势差分）。
// 姿势本身不重绘（原画线条永远清晰），只叠整体位移/倾斜/挤压，
// 换姿势靠 EMOTION_POSE 映射，动作节奏靠 ACT_MOTION。
const SPRITE_DIR = path.resolve(__dirname, '../day3制作/whale_girl_src');
const SPRITE_H_U = 10.4;        // 立绘高度（单位 u）：和像素骨架同高，分镜坐标不用改
const SPRITE_FOOT_U = 0.30;     // 脚底相对 y 的偏移（与 Day3 同口径）
const WHALE_POSES = {
  idle:              { file: 'whale_idle.png',              foot: 0.988 },
  wave:              { file: 'whale_wave.png',              foot: 0.989 },
  cheer:             { file: 'whale_cheer.png',             foot: 0.980 },
  jump_joy:          { file: 'whale_jump_joy.png',          foot: 0.979 },
  confident_hips:    { file: 'whale_confident_hips.png',    foot: 0.989 },
  peek_curious:      { file: 'whale_peek_curious.png',      foot: 0.988 },
  shy_fidget:        { file: 'whale_shy_fidget.png',        foot: 0.988 },
  shock:             { file: 'whale_shock.png',             foot: 0.988 },
  cry:               { file: 'whale_cry.png',               foot: 0.989 },
  playful_fists:     { file: 'whale_playful_fists.png',     foot: 0.988 },
  think:             { file: 'whale_think.png',             foot: 0.989 },
  eat:               { file: 'whale_eat.png',               foot: 0.989 },
  point:             { file: 'whale_point.png',             foot: 0.988 },
  camera_shutter:    { file: 'whale_camera_shutter.png',    foot: 0.988 },
  tail_wag_dance:    { file: 'whale_tail_wag_dance.png',    foot: 0.991 },
  walk_stand:        { file: 'whale_walk_stand.png',        foot: 0.990 },
  run_stand:         { file: 'whale_run_stand.png',         foot: 0.989 }
};
const POSE_IMG = {};
let SPRITE_OK = false;
async function loadSpritePoses() {
  let n = 0;
  const missing = [];
  for (const [key, meta] of Object.entries(WHALE_POSES)) {
    const f = path.join(SPRITE_DIR, meta.file);
    if (!fs.existsSync(f)) { missing.push(meta.file); continue; }
    POSE_IMG[key] = await loadImage(fs.readFileSync(f));
    n++;
  }
  SPRITE_OK = n > 0;
  console.log(`Day3 立绘：${n}/${Object.keys(WHALE_POSES).length} 张（${SPRITE_DIR}）`);
  if (missing.length) console.warn('  缺图（该姿势退回 idle）：', missing.join(', '));
}

// emotion → 姿势（口播里那些情绪词，一个都不丢）
const EMOTION_POSE = {
  happy: 'idle', idle: 'idle', calm: 'idle', neutral: 'idle', deadpan: 'idle',
  excited: 'cheer', celebrate: 'cheer', star: 'cheer', starstruck: 'cheer',
  proud: 'confident_hips', smug: 'confident_hips', love: 'cheer',
  shy: 'shy_fidget', blush: 'shy_fidget', embarrassed: 'shy_fidget',
  confused: 'peek_curious', curious: 'peek_curious', question: 'peek_curious',
  thinking: 'think', focused: 'think', tired: 'idle',
  sleepy: 'idle', pout: 'playful_fists', angry: 'playful_fists', rage: 'playful_fists',
  nervous: 'shy_fidget', worried: 'shy_fidget',
  shocked: 'shock', surprised: 'shock', scared: 'shock', panic: 'shock',
  sad: 'cry', cry: 'cry', sob: 'cry',
  hungry: 'eat', eat: 'eat',
  point: 'point', proud_point: 'point'
};

// 姿势 → 微动（dx/dy 单位是 u；jump 只影响影子）
function actMotion(pose, t) {
  const sn = Math.sin, ab = Math.abs;
  switch (pose) {
    case 'cheer':
    case 'jump_joy':
      return { dy: -ab(sn(t * 3.1)) * 0.10, rot: sn(t * 3.1) * 0.02, sx: 1 + sn(t * 3.1) * 0.012, sy: 1 - sn(t * 3.1) * 0.012, jump: ab(sn(t * 3.1)) };
    case 'confident_hips':
      return { dx: sn(t * 1.5) * 0.05, dy: -0.02 + sn(t * 2.0) * 0.015, rot: sn(t * 1.5) * 0.03 };
    case 'peek_curious':
      return { dx: sn(t * 1.25) * 0.09, dy: -0.03 + sn(t * 2.0) * 0.018, rot: 0.02 + sn(t * 1.25) * 0.05 };
    case 'shock':
      return { dx: sn(t * 24) * 0.012, dy: -0.03 + sn(t * 24) * 0.006, rot: sn(t * 20) * 0.008 };
    case 'cry':
      return { dy: -0.01 + sn(t * 2.6) * 0.05, rot: sn(t * 2.6 + 1.1) * 0.025 };
    case 'shy_fidget':
      return { dx: sn(t * 3.0) * 0.06, dy: -0.02 + ab(sn(t * 3.0)) * 0.035, rot: sn(t * 3.0 + 0.6) * 0.045 };
    case 'playful_fists':
      return { dx: sn(t * 6.2) * 0.04, dy: -0.01 + ab(sn(t * 6.2)) * 0.02, rot: sn(t * 6.2) * 0.02 };
    case 'think':
      return { dy: -0.02 + sn(t * 2.0) * 0.014, rot: -0.015 + sn(t * 1.1) * 0.008 };
    case 'eat':
      return { dy: -0.01 + ab(sn(t * 2.6)) * 0.02, rot: sn(t * 1.6) * 0.012 };
    case 'point':
      return { dy: -0.03 + sn(t * 2.4) * 0.016, rot: -0.01 + sn(t * 1.7) * 0.012 };
    case 'camera_shutter':
      return { dy: -0.02 + sn(t * 3.4) * 0.012, rot: sn(t * 1.9) * 0.01 };
    case 'tail_wag_dance':
      return { dx: sn(t * 2.6) * 0.07, rot: sn(t * 2.6) * 0.04, dy: -0.02 + sn(t * 5.2) * 0.012 };
    default:
      return { dy: -0.02 + sn(t * 2.2) * 0.018, rot: sn(t * 1.4) * 0.012 };
  }
}

function drawPoseSprite(ctx, name, x, y, u, o = {}) {
  const img = POSE_IMG[name] || POSE_IMG.idle;
  if (!img) return false;
  const meta = WHALE_POSES[name] || WHALE_POSES.idle;
  const H = (o.heightU || SPRITE_H_U) * u;
  const w = H * (img.width / img.height);
  const dx = (o.dx || 0) * u;
  const dy = (o.dy || 0) * u;
  const footY = y + SPRITE_FOOT_U * u + dy;
  const bottomEdge = footY - (1 - meta.foot) * H;
  ctx.save();
  ctx.globalAlpha *= (o.alpha ?? 1);
  ctx.translate(x + dx, bottomEdge);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(o.sx ?? 1, o.sy ?? 1);
  if (o.flip) ctx.scale(-1, 1);
  ctx.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, -w / 2, -H, w, H);
  ctx.restore();
  return true;
}

// 主角色入口：默认画 Day3 高清立绘；--char day2/ss2/crisp 仍可退回像素骨架做对照
function WGF(ctx, x, y, u, o = {}) {
  const t = Number(o.t) || 0;
  if (CHAR_MODE === 'dsh') {
    drawDsh(ctx, x, y, u, o);
    return;
  }
  if (CHAR_MODE === 'sprite') {
    const pose = o.pose || EMOTION_POSE[o.emotion || o.emo] || 'idle';
    const st = actMotion(pose, t);
    if (o.shadow !== false) {
      const j = st.jump || 0;
      paint(ctx, ellPts(x + (st.dx || 0) * u, y + SPRITE_FOOT_U * u + 0.06 * u,
        2.05 * u * (1 - j * 0.3), 0.38 * u * (1 - j * 0.3), 16),
        { wash: PAL.ink, washOp: Math.round(62 * (1 - j * 0.5)), ink: null });
    }
    drawPoseSprite(ctx, pose, x, y, u, {
      dx: (st.dx || 0) + (o.dx || 0),
      dy: (st.dy || 0) + (o.dy || 0),
      rot: (st.rot || 0) + (o.headTilt || 0) * 0.5 + (o.rot || 0),
      sx: (st.sx ?? 1) * (o.sx ?? 1),
      sy: (st.sy ?? 1) * (o.sy ?? 1),
      flip: o.flip,
      alpha: o.alpha,
      heightU: o.heightU || SPRITE_H_U
    });
    return;
  }
  // —— 老路径（Day2 像素骨架），只用来出对照帧 ——
  const opts = safePixelOptions({
    style: 'pixel',
    showActionBadge: false,
    tailScale: 1.0,
    noFinBows: true,
    eyePatch: false,
    vectorMouth: true,
    mouth: 'smile',
    ...o
  });
  if (!opts.emo && !opts.emotion) opts.emotion = 'happy';
  blitChar(ctx, x, y, u, (g, bx, by, uu) => whaleGirl(g, bx, by, uu, { ...opts, t: opts.t ?? 0 }), { shadow: opts.shadow });
}

// ---------------------------------------------------------------------------
// 3. 场景元素
// ---------------------------------------------------------------------------
function room(ctx, t, o = {}) {
  const floorY = o.floorY ?? 536;
  PROPS.wall(ctx, o.wallCol || '#161F3F');
  paint(ctx, rectPts(-120, floorY - 126, W + 240, 126, 2), { wash: '#22305C', ink: PAL.ink, sw: 1.2, washOp: 200 });
  for (let i = 0; i < 9; i++) inkLine(ctx, [[52 + i * 146, floorY - 126], [52 + i * 146, floorY]], 1.2, 'rgba(15,23,42,0.55)', 'inkfine', 0);
  for (let i = 0; i < 12; i++) {
    const x = 36 + i * 106;
    const y = 40 + Math.sin(t * 1.1 + i * 0.7) * 7 + Math.sin(i * 1.3) * 10;
    const col = i % 3 === 0 ? PAL.gold : (i % 3 === 1 ? PAL.whaleCyan : PAL.rose);
    glow(ctx, x, y, 16, col, 0.45);
    paint(ctx, ellPts(x, y, 4.2, 5.4, 10), { wash: col, ink: PAL.ink, sw: 0.7 });
  }
  inkLine(ctx, [[16, 24], [W - 16, 32]], 1.6, '#2B3A63', 'inkfine', 0.2);
  PROPS.windowPorthole(ctx, 148, 236, 80, t, true);
  PROPS.shelf(ctx, 1010, 296, 230, 2);
  PROPS.shelf(ctx, 1010, 402, 230, 5);
  // 右侧书桌（角色站地板，桌子只占右边，别挡人）
  paint(ctx, rrPts(742, 470, 330, 24, 7, 1.2), { wash: '#6B4B33', fill: '#3B2A1E', fillOp: 130, ink: PAL.ink, sw: 1.4 });
  paint(ctx, rectPts(766, 494, 18, 112, 1), { wash: '#4A3524', ink: PAL.ink, sw: 1.1 });
  paint(ctx, rectPts(1030, 494, 18, 112, 1), { wash: '#4A3524', ink: PAL.ink, sw: 1.1 });
  // 左侧矮柜（电视/道具落点）
  paint(ctx, rrPts(250, 496, 400, 20, 6, 1.2), { wash: '#5B452F', fill: '#2E2116', fillOp: 150, ink: PAL.ink, sw: 1.3 });
  paint(ctx, rectPts(268, 516, 16, 90, 1), { wash: '#40301F', ink: PAL.ink, sw: 1 });
  paint(ctx, rectPts(614, 516, 16, 90, 1), { wash: '#40301F', ink: PAL.ink, sw: 1 });
  PROPS.floorBand(ctx, floorY, '#231B38');
  paint(ctx, ellPts(640, 630, 320, 62, 26), { wash: '#3B2C56', washOp: 190, ink: PAL.ink, sw: 1.3 });
  paint(ctx, ellPts(640, 630, 244, 40, 24), { wash: '#4A3868', washOp: 150, ink: null });
  // 绿植
  paint(ctx, rrPts(1176, 476, 52, 54, 8, 1), { wash: '#B45309', ink: PAL.ink, sw: 1.2 });
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.32;
    inkLine(ctx, [[1202, 480], [1202 + Math.cos(a) * 60, 480 + Math.sin(a) * 74]], 4.5, i % 2 ? PAL.sap : '#4D8B5C', 'ink', 0.35);
  }
}

function pill(ctx, x, y, w, h, fill = 'rgba(11,29,58,0.92)', stroke = '#48C8FF') {
  paint(ctx, rrPts(x, y, w, h, h / 2, 0.8), { wash: fill, ink: stroke, sw: 1.4 });
}
function label(ctx, txt, x, y, o = {}) {
  const h = o.h || 26;
  ctx.save();
  ctx.font = o.font || 'bold 15px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
  const w = o.w || (ctx.measureText(txt).width + 26);
  pill(ctx, x - w / 2, y - h / 2, w, h, o.fill || 'rgba(11,29,58,0.9)', o.stroke || '#48C8FF');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(4,12,30,0.9)';
  ctx.strokeText(txt, x, y + 1);
  ctx.fillStyle = o.color || PAL.cream;
  ctx.fillText(txt, x, y + 1);
  ctx.restore();
  return w;
}

// 返工单（v1…v4）
function workOrder(ctx, x, y, w, h, text, rot = 0, o = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  paint(ctx, rrPts(-w / 2, -h / 2, w, h, 6, 1.2), { wash: o.wash || '#EFE3C8', fill: '#0B1526', fillOp: 40, ink: PAL.ink, sw: 1.4 });
  ctx.fillStyle = '#7F1D1D';
  ctx.font = '900 30px "ZCOOLKuaiLe", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, -h * 0.16);
  ctx.font = `bold ${o.stamp ? 11 : 13}px "NotoSansSC", sans-serif`;
  ctx.fillStyle = '#334155';
  ctx.textAlign = o.stamp ? 'left' : 'center';
  ctx.fillText(o.note || '', o.stamp ? -w / 2 + 9 : 0, h * 0.28);
  if (o.stamp) {
    // 印章：右下角斜盖，尺寸按单子走，绝不压 note 那行字
    const sw = Math.min(w * 0.4, 44), shh = Math.min(h * 0.22, 19);
    ctx.save();
    ctx.translate(w * 0.19, h * 0.28);
    ctx.rotate(-0.16);
    ctx.strokeStyle = '#D8232A';
    ctx.lineWidth = 2.2;
    ctx.strokeRect(-sw / 2, -shh / 2, sw, shh);
    ctx.fillStyle = '#D8232A';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.max(9, Math.round(shh * 0.72))}px "ZCOOLKuaiLe", sans-serif`;
    ctx.fillText(o.stamp, 0, 1);
    ctx.restore();
  }
  ctx.restore();
}

// 饭碗（rice 0=空）
function riceBowl(ctx, x, y, s = 1, rice = 1, t = 0) {
  paint(ctx, ellPts(x, y + 20 * s, 48 * s, 11 * s, 18), { wash: PAL.ink, washOp: 55, ink: null });
  // 碗身（上宽下窄的梯形，够高才不像盘子）
  paint(ctx, [[x - 44 * s, y - 6 * s], [x + 44 * s, y - 6 * s], [x + 28 * s, y + 20 * s], [x - 28 * s, y + 20 * s]],
    { wash: '#EAF0FA', fill: '#8FA6C4', fillOp: 90, ink: PAL.ink, sw: 1.6 });
  paint(ctx, [[x - 36 * s, y + 4 * s], [x + 36 * s, y + 4 * s], [x + 32 * s, y + 9 * s], [x - 32 * s, y + 9 * s]],
    { wash: '#2563EB', washOp: 230, ink: null });
  paint(ctx, [[x - 20 * s, y + 18 * s], [x + 20 * s, y + 18 * s], [x + 16 * s, y + 23 * s], [x - 16 * s, y + 23 * s]],
    { wash: '#1E40AF', washOp: 210, ink: null });
  paint(ctx, ellPts(x, y - 6 * s, 44 * s, 13 * s, 20), { wash: '#F4F7FF', ink: PAL.ink, sw: 1.6 });
  if (rice > 0.02) {
    paint(ctx, ellPts(x, y - 14 * s, 32 * s * rice, 15 * s * rice, 18), { wash: '#FFFFFF', ink: 'rgba(30,45,80,0.5)', sw: 1 });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU;
      paint(ctx, ellPts(x + Math.cos(a) * 22 * s * rice, y - 16 * s + Math.sin(a) * 8 * s * rice + Math.sin(t * 2 + i) * 0.6,
        4 * s, 2.8 * s, 8), { wash: '#FFFFFF', ink: 'rgba(60,80,120,0.35)', sw: 0.4 });
    }
  }
  if (rice > 0.02) {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      paint(ctx, ellPts(x + Math.cos(a) * 26 * s, y - 10 * s + Math.sin(a) * 9 * s - 6 * s * rice,
        4.4 * s, 3.2 * s, 8), { wash: '#FFFFFF', ink: 'rgba(20,30,60,0.35)', sw: 0.5 });
    }
  }
  paint(ctx, ellPts(x, y - 18 * s, 30 * s, 8 * s, 16), { wash: rice > 0.02 ? '#FDFDFD' : '#B9C6DA', washOp: 240, ink: null });
}

// 电视机（CRT）：屏幕内部固定 240×150，最近邻放大 = 故意劣质
function tvSet(ctx, x, y, w, h, drawInner, o = {}) {
  // 天线
  inkLine(ctx, [[x + w * 0.36, y - 8], [x + w * 0.2, y - 46]], 2.6, '#B9C6DA', 'inkfine', 0);
  inkLine(ctx, [[x + w * 0.62, y - 8], [x + w * 0.8, y - 44]], 2.6, '#B9C6DA', 'inkfine', 0);
  paint(ctx, ellPts(x + w * 0.5, y - 46, 5, 5, 10), { wash: '#B9C6DA', ink: PAL.ink, sw: 0.8 });
  // 机身
  paint(ctx, rrPts(x - 12, y - 10, w + 24, h + 26, 14, 1.6), { wash: '#8B7A63', fill: '#4A3B2B', fillOp: 140, ink: PAL.ink, sw: 1.8 });
  // 屏幕
  const sx = x + 8, sy = y + 6, sw = w - 16, sh = h - 12;
  paint(ctx, rrPts(sx - 4, sy - 4, sw + 8, sh + 8, 10, 1.2), { wash: '#1A1008', ink: PAL.ink, sw: 1.4 });
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(sx, sy, sw, sh, 8);
  ctx.clip();
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  drawInner(ctx, sx, sy, sw, sh, o.tt ?? 0);
  ctx.restore();
  // 扫描线 + 雪花 + 滚动条（"劣质"三件套）
  ctx.globalAlpha = 0.20;
  ctx.fillStyle = '#000';
  for (let yy = sy + 2; yy < sy + sh; yy += 3) ctx.fillRect(sx, yy, sw, 1.2);
  ctx.globalAlpha = 1;
  const roll = ((o.tt * 0.35) % 1) * sh;
  const g = ctx.createLinearGradient(0, sy + roll - 14, 0, sy + roll + 14);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.10)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(sx, sy + roll - 14, sw, 28);
  ctx.restore();
  // 玻璃反光
  inkLine(ctx, [[sx + 12, sy + 34], [sx + 46, sy + 12]], 2.2, 'rgba(255,255,255,0.7)', 'inkfine', 0);
  // 旋钮 + 喇叭格
  for (let i = 0; i < 2; i++) {
    paint(ctx, ellPts(x + w - 26, y + h + (i ? 18 : -2) + 6, 5.5, 5.5, 12), { wash: '#C8B79B', ink: PAL.ink, sw: 1 });
  }
  // 贴纸：MV v4 · 未调
  ctx.save();
  ctx.translate(x + 52, y + h + 12);
  ctx.rotate(-0.06);
  ctx.font = '900 13px "ZCOOLKuaiLe", sans-serif';
  const cap = 'MV v4 · 未调';
  const cw = Math.ceil(ctx.measureText(cap).width) + 22;
  paint(ctx, rrPts(-cw / 2, -11, cw, 22, 5, 1), { wash: 'rgba(242,193,78,0.92)', ink: PAL.ink, sw: 1.1 });
  ctx.fillStyle = '#3B2A0E';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(cap, 0, 1);
  ctx.restore();
  return { sx, sy, sw, sh };
}

// 电视里放的那版劣质 MV：DSH 贴纸 + 明显卡不上点 + 慢放 + 音量很小 + 色差
//   用户 2026-10-27：「将朋友的酒播放慢些声音小些，很奇怪的那种卡不上点的，
//   或者表情包动的不对的（鲸鱼娘做的朋友的酒很劣质的那种）」
//   做法：① 画面整体按 0.35× 慢放；② 贴纸每 1.9s 换一次（曲子是 130.4BPM=0.462s/拍，
//   对不上就是故意的）；③ 换的动作故意和歌词相反（唱「举起杯」时在哭，唱「朋友」时在睡）；
//   ④ 右下角音量条压到 12%，右上角写「慢放 0.35×」。
const TV_BEAT = 0.462;          // 130.4 BPM，朋友的酒实测
const TV_SLOW = 0.35;           // 慢放
const TV_WRONG_POSES = ['meme-cry', 'sleep', 'angry', 'meme-doge', 'daily-gaming', 'failure'];
const TV_LYRICS = ['朋友', '的酒', '一起', '举起', '杯'];

// 电视屏里那块画中画：真 MV 帧 + 播放器外框 + 进度条（不卡了，MV 真的在放）
function mvPip(ctx, sx, sy, sw, sh, tt) {
  const FPS_MV = 8;                       // 8fps 抽帧 → 本来就一顿一顿的，像老电视
  const n = MV_FRAMES.length;
  const idx = n ? Math.floor(tt * FPS_MV) % n : -1;
  const img = idx >= 0 ? MV_FRAMES[idx] : null;
  ctx.save();
  if (img) {
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, sw, sh);
  } else {
    ctx.fillStyle = '#0A1428';
    ctx.fillRect(sx, sy, sw, sh);
    ctx.fillStyle = 'rgba(226,232,240,0.5)';
    ctx.font = 'bold 12px "NotoSansSC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('雪花 · 无信号', sx + sw / 2, sy + sh / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
  // 画中画窗口：一圈边框 + 标题条
  ctx.strokeStyle = 'rgba(255,255,255,0.72)';
  ctx.lineWidth = 1.6;
  ctx.strokeRect(sx + 3, sy + 3, sw - 6, sh - 6);
  ctx.fillStyle = 'rgba(11,20,40,0.72)';
  ctx.fillRect(sx + 3, sy + 3, sw - 6, 15);
  ctx.fillStyle = '#FDE68A';
  ctx.font = 'bold 9px "NotoSansSC", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('画中画 · 朋友的酒 MV v4', sx + 7, sy + 11);
  ctx.fillStyle = '#F87171';
  ctx.textAlign = 'right';
  ctx.fillText('0.35×', sx + sw - 7, sy + 11);
  // 只留一个「正在播」的小红点，不画任何进度/音量条
  const blink = 0.55 + 0.45 * Math.sin(tt * 4);
  ctx.globalAlpha = blink;
  ctx.fillStyle = '#F87171';
  ctx.beginPath();
  ctx.arc(sx + sw - 76, sy + 11, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

// 电视还没接上 MV 时的雪花屏（不放歌词、不放音量条、不放进度条）
function snowScreen(ctx, sx, sy, sw, sh, tt) {
  ctx.save();
  ctx.fillStyle = '#0A1428';
  ctx.fillRect(sx, sy, sw, sh);
  for (let i = 0; i < 240; i++) {
    const x = sx + Math.floor(hash(i * 3.7 + Math.floor(tt * 14)) * sw);
    const y = sy + Math.floor(hash(i * 7.1 + Math.floor(tt * 14) * 1.7) * sh);
    ctx.fillStyle = `rgba(255,255,255,${0.05 + hash(i) * 0.16})`;
    ctx.fillRect(x, y, 2, 1);
  }
  ctx.fillStyle = 'rgba(226,232,240,0.75)';
  ctx.font = 'bold 13px "NotoSansSC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('雪花 · 无信号', sx + sw / 2, sy + sh / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

// 老版劣质 MV（DSH 贴纸版）—— --char dsh 对照 / 无 MV 素材时的备用
function shoddyMV(ctx, sx, sy, sw, sh, tt) {
  const LW = 240, LH = 150;
  const key = `mv${LW}x${LH}`;
  let layer = layerCache.get(key);
  if (!layer) {
    const canvas = createCanvas(LW, LH);
    layer = { canvas, ctx: canvas.getContext('2d') };
    layerCache.set(key, layer);
  }
  const g = layer.ctx;
  const st = tt * TV_SLOW;                       // 慢放时间
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, LW, LH);
  g.fillStyle = '#141B3A';
  g.fillRect(0, 0, LW, LH);
  g.fillStyle = '#1E2A55';
  g.fillRect(0, LH * 0.62, LW, LH * 0.38);
  const glowG = g.createRadialGradient(LW * 0.5, LH * 0.35, 4, LW * 0.5, LH * 0.35, LW * 0.6);
  glowG.addColorStop(0, 'rgba(90,180,255,0.32)');
  glowG.addColorStop(1, 'rgba(90,180,255,0)');
  g.fillStyle = glowG;
  g.fillRect(0, 0, LW, LH);
  // 贴纸：每 1.9s 换一张，跟拍子完全无关
  const poseName = TV_WRONG_POSES[Math.floor(st / 1.9) % TV_WRONG_POSES.length];
  const pose = DSH[poseName] || DSH['idle-cute'];
  if (pose) {
    const H = LH * 0.72;
    const sc = H / pose.bbox.h;
    const w = pose.img.width * sc, h = pose.img.height * sc;
    const cx = (pose.bbox.x + pose.bbox.w / 2) * sc;
    const bottom = (pose.bbox.y + pose.bbox.h) * sc;
    const cxScreen = LW * 0.5;
    g.save();
    g.imageSmoothingEnabled = true;
    g.drawImage(pose.img, cxScreen - cx, LH * 0.93 - bottom, w, h);
    g.restore();
  }
  // 歌词：延迟 + 只露半截（左边被裁）
  const lagText = TV_LYRICS[Math.floor(Math.max(0, st - 2.4) / 0.9) % TV_LYRICS.length];
  g.fillStyle = 'rgba(0,0,0,0.55)';
  g.fillRect(0, LH - 28, LW, 20);
  g.fillStyle = '#FFE86B';
  g.font = 'bold 12px "NotoSansSC", sans-serif';
  g.textBaseline = 'middle';
  g.fillText(lagText, -3, LH - 18);              // 贴着左边缘，字被裁一半
  // 角标：慢放 / 卡不上点 / 音量 12%
  g.fillStyle = 'rgba(255,255,255,0.8)';
  g.font = 'bold 8px "NotoSansSC", sans-serif';
  g.fillText('MV v4', 5, 9);
  g.fillStyle = '#F87171';
  g.fillText('慢放 0.35×', LW - 52, 9);
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.font = 'bold 7px "NotoSansSC", sans-serif';
  g.fillText('雪花 · 无信号', 5, LH - 5);
  // 雪花
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(hash(i * 3.7 + Math.floor(tt * 12)) * LW);
    const y = Math.floor(hash(i * 7.1 + Math.floor(tt * 12) * 1.7) * LH);
    g.fillStyle = `rgba(255,255,255,${0.06 + hash(i) * 0.14})`;
    g.fillRect(x, y, 1, 1);
  }
  // 贴回电视：最近邻放大 + 红青色差（劣质感）
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 0.28;
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(layer.canvas, sx + 1.2, sy + 0.6, sw, sh);
  ctx.restore();
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(layer.canvas, sx, sy, sw, sh);
  ctx.restore();
}

// 折线图卡
// 2026-10-29 删除：chartCard / targetCard / ledgerCard（会画粉丝数、目标数、数据曲线，
// 全部属于「不要出现的东西」，且三个函数当时已无人调用，直接删掉防止以后又被接上）。


function commentBubble(ctx, x, y, author, text, p = 1) {
  ctx.save();
  ctx.globalAlpha = clamp(p * 1.4);
  ctx.font = 'bold 18px "NotoSansSC", sans-serif';
  const tw = ctx.measureText(text).width;
  const w = Math.max(170, tw + 44), h = 62;
  paint(ctx, rrPts(x - w / 2, y - h / 2, w, h, 12, 1), { wash: '#F8FAFC', fill: '#0B1526', fillOp: 30, ink: '#94A3B8', sw: 1.2 });
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1D4ED8';
  ctx.font = 'bold 13px "NotoSansSC", sans-serif';
  ctx.fillText(author, x - w / 2 + 16, y - 14);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 18px "NotoSansSC", sans-serif';
  ctx.fillText(text, x - w / 2 + 16, y + 12);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 4. 大小姐（Q 版贴纸，只在 C06 客串）
// ---------------------------------------------------------------------------
let CLAUDE_IMG = null;
async function loadClaude() {
  const f = path.resolve(__dirname, '../day3制作/claude_src/chibi/pose_ok_hand.png');
  const alt = path.resolve(__dirname, '../day3制作/claude_src/chibi/pose_curtsy.png');
  const use = fs.existsSync(f) ? f : (fs.existsSync(alt) ? alt : null);
  if (!use) { console.warn('⚠️ 没找到大小姐 Q 版贴纸，C06 只画签收单'); return; }
  CLAUDE_IMG = await loadImage(use);
  console.log('大小姐客串素材：', path.basename(use), `(${CLAUDE_IMG.width}×${CLAUDE_IMG.height})`);
}
function drawClaude(ctx, x, y, hgt, t = 0, alpha = 1) {
  if (!CLAUDE_IMG) return;
  const w = CLAUDE_IMG.width * (hgt / CLAUDE_IMG.height);
  ctx.save();
  ctx.globalAlpha = alpha * 0.5;
  paint(ctx, ellPts(x, y + 4, w * 0.34, 9, 16), { wash: PAL.ink, washOp: 60, ink: null });
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y + Math.sin(t * 2.2) * 3);
  ctx.drawImage(CLAUDE_IMG, -w / 2, -hgt, w, hgt);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 5. Day5 道具（全部程序绘制：不引外部素材，不出现进度条/音量条）
// ---------------------------------------------------------------------------
const NOTES = [];
function bg(ctx, t, o) { room(ctx, t, o); }

// 工牌（挂绳 + 名牌）：小鲸鲸的身份靠它认
function badge(ctx, x, y, txt, o = {}) {
  const h = o.h || 26;
  ctx.save();
  ctx.font = 'bold 13px "NotoSansSC", sans-serif';
  const w = Math.max(74, ctx.measureText(txt).width + 30);
  ctx.translate(x, y);
  ctx.rotate(o.rot ?? -0.07);
  inkLine(ctx, [[-w * 0.26, -h * 0.5 - 32], [-w * 0.18, -h * 0.5 - 2]], 1.6, '#93C5FD', 'inkfine', 0);
  inkLine(ctx, [[w * 0.26, -h * 0.5 - 32], [w * 0.18, -h * 0.5 - 2]], 1.6, '#93C5FD', 'inkfine', 0);
  paint(ctx, rrPts(-w / 2, -h / 2, w, h, 6, 0.8), { wash: '#F8FAFC', fill: '#0B1526', fillOp: 25, ink: PAL.ink, sw: 1.2 });
  paint(ctx, rectPts(-w / 2 + 2, -h / 2 + 2, 9, h - 4, 0), { wash: o.color || '#48C8FF', ink: null });
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 13px "NotoSansSC", sans-serif';
  ctx.fillText(txt, 5, 1);
  ctx.restore();
}

// 小鲸鲸：同一条像素 rig 的小号 + 工牌（＝「另一条鲸鲸」，不是新物种）
function smallWhale(ctx, x, y, u, t, o = {}) {
  WGF(ctx, x, y, u, {
    t,
    emotion: o.emotion || 'happy',
    mouth: o.mouth || 'smile',
    headTilt: (o.headTilt ?? 0) + Math.sin(t * 1.4) * 0.02,
    dx: (o.dx || 0) + Math.sin(t * 1.9) * 0.03,
    dy: o.dy || 0,
    shadow: o.shadow
  });
  // 头上的青色小蝴蝶结：和本鲸区分开（一眼看出「另一条」）
  const bx = x + (o.bowDx ?? 0.1) * u;
  const by = y - (o.bowDy ?? 8.55) * u;
  paint(ctx, [[bx, by], [bx - 0.62 * u, by - 0.34 * u], [bx - 0.62 * u, by + 0.34 * u]], { wash: '#5CE1E6', ink: PAL.ink, sw: 1.1 });
  paint(ctx, [[bx, by], [bx + 0.62 * u, by - 0.34 * u], [bx + 0.62 * u, by + 0.34 * u]], { wash: '#5CE1E6', ink: PAL.ink, sw: 1.1 });
  paint(ctx, ellPts(bx, by, 0.16 * u, 0.16 * u, 10), { wash: '#B8F7FA', ink: PAL.ink, sw: 0.9 });
  if (o.badge !== false) badge(ctx, x + (o.badgeDx ?? 0.86) * u, y - 3.72 * u, o.badgeText || '新来的', { color: o.badgeColor, h: o.badgeH || 24 });
}

// 技能标签（会私信 / 会评论 / 不会收尾）
function skillTag(ctx, x, y, w, h, txt, rot = 0, o = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  paint(ctx, rrPts(-w / 2, -h / 2, w, h, 7, 1.0),
    { wash: o.wash || '#CFE8FF', fill: '#0B1526', fillOp: 18, ink: PAL.ink, sw: 1.3 });
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = o.color || '#0F2A4A';
  ctx.font = `900 ${o.size || 15}px "ZCOOLKuaiLe", "NotoSansSC", sans-serif`;
  ctx.fillText(txt, o.x !== false ? -8 : 0, 1);
  if (o.x !== false) {
    const xr = w * 0.30;
    ctx.strokeStyle = '#B91C1C';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(xr - 9, -8);
    ctx.lineTo(xr + 9, 8);
    ctx.moveTo(xr + 9, -8);
    ctx.lineTo(xr - 9, 8);
    ctx.stroke();
  }
  ctx.restore();
}

// 日历：最后一格红圈那个「休」
function calendar(ctx, x, y, w, h, o = {}) {
  paint(ctx, rrPts(x, y, w, h, 8, 1.2), { wash: '#EFE3C8', ink: PAL.ink, sw: 1.5 });
  paint(ctx, rrPts(x + 5, y + 5, w - 10, 20, 4, 0.6), { wash: '#D8232A', ink: null });
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFF9EE';
  ctx.font = 'bold 12px "NotoSansSC", sans-serif';
  ctx.fillText(o.title || '这个月', x + w / 2, y + 15);
  const cols = 7, rows = 3;
  const cw = (w - 20) / cols, chh = (h - 36) / rows;
  const lastI = cols * rows - 1;
  for (let i = 0; i < cols * rows; i++) {
    const r = Math.floor(i / cols), c = i % cols;
    const cx = x + 10 + c * cw, cy = y + 30 + r * chh;
    paint(ctx, rectPts(cx + 1, cy + 1, cw - 2, chh - 2, 0),
      { wash: i === lastI ? '#FFF1F2' : '#FFF9EE', ink: 'rgba(28,22,36,0.22)', sw: 0.6 });
    if (i === lastI) {
      ctx.strokeStyle = '#D8232A';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(cx + cw / 2, cy + chh / 2, cw * 0.44, chh * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#D8232A';
      ctx.font = '900 12px "ZCOOLKuaiLe", sans-serif';
      ctx.fillText('休', cx + cw / 2, cy + chh / 2 + 1);
    }
  }
  ctx.restore();
}

// 老大：只画剪影（不描脸，避免「编人物」）
function boss(ctx, x, y, s, t, o = {}) {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 0.9) * s * 0.02);
  // 外晕：剪影边缘被环境光吃一点，读起来是「站在暗处的人」而不是黑纸片
  glow(ctx, 0, -s * 1.1, s * 2.6, '#2E67A0', 0.16);
  const dark = '#080E1C';
  const rim = 'rgba(96,133,190,0.5)';
  // 肩 → 腰
  paint(ctx, [[-s * 0.66, s * 0.55], [-s * 0.58, -s * 0.7], [-s * 0.2, -s * 1.02],
    [s * 0.2, -s * 1.02], [s * 0.58, -s * 0.7], [s * 0.66, s * 0.55]],
    { wash: dark, washOp: 246, ink: rim, sw: 1.3 });
  // 脖子
  paint(ctx, rectPts(-s * 0.11, -s * 1.28, s * 0.22, s * 0.34, 0), { wash: dark, washOp: 246, ink: null });
  // 头
  paint(ctx, ellPts(0, -s * 1.56, s * 0.34, s * 0.4, 18), { wash: dark, washOp: 246, ink: rim, sw: 1.3 });
  ctx.restore();
}

// 老大的手臂：从肩到手（手是单独画的，加一条臂才不像悬空的假手）
function bossArm(ctx, x0, y0, x1, y1, s, curve = 0.4) {
  ctx.save();
  ctx.strokeStyle = '#080E1C';
  ctx.lineWidth = s * 0.42;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 - y0 * curve * 0.12 - 26 * curve, x1, y1);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(96,133,190,0.35)';
  ctx.lineWidth = s * 0.42 + 2;
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  ctx.restore();
}

// 老大的手（悬在按钮上不敢按）
function hand(ctx, x, y, s, rot, o = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  paint(ctx, ellPts(0, 0, s * 0.6, s * 0.48, 16),
    { wash: '#080E1C', washOp: 240, ink: 'rgba(96,133,190,0.55)', sw: 1.2 });
  for (let i = 0; i < 4; i++) {
    paint(ctx, rrPts(-s * 0.5 + i * s * 0.26, -s * 0.98, s * 0.2, s * 0.62, s * 0.1, 0.6),
      { wash: '#080E1C', washOp: 240, ink: 'rgba(96,133,190,0.5)', sw: 1 });
  }
  paint(ctx, ellPts(s * 0.52, s * 0.12, s * 0.28, s * 0.2, 12),
    { wash: '#080E1C', washOp: 240, ink: 'rgba(96,133,190,0.5)', sw: 1 });
  ctx.restore();
}

// 升级按钮（不是进度条：就是一个按下去会亮的键）
function levelButton(ctx, x, y, w, h, t, o = {}) {
  const k = 0.5 + 0.5 * Math.sin(t * 3.4);
  glow(ctx, x, y, w * 0.72, '#5CE1E6', 0.20 + 0.14 * k);
  paint(ctx, rrPts(x - w / 2, y - h / 2, w, h, 10, 1.2),
    { wash: o.pressed ? '#123A38' : '#132B4F', ink: '#5CE1E6', sw: 2 });
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#5CE1E6';
  ctx.font = '900 24px "ZCOOLKuaiLe", sans-serif';
  ctx.fillText('升级', x, y - 11);
  ctx.fillStyle = '#93C5FD';
  ctx.font = 'bold 13px "NotoSansSC", sans-serif';
  ctx.fillText('LEVEL UP', x, y + 20);
  ctx.restore();
}

function stool(ctx, x, y, s) {
  paint(ctx, rrPts(x - 42 * s, y - 8 * s, 84 * s, 13 * s, 5, 1), { wash: '#8A5A33', ink: PAL.ink, sw: 1.4 });
  inkLine(ctx, [[x - 30 * s, y + 4 * s], [x - 36 * s, y + 36 * s]], 4 * s, '#6B4B33', 'ink', 0);
  inkLine(ctx, [[x + 30 * s, y + 4 * s], [x + 36 * s, y + 36 * s]], 4 * s, '#6B4B33', 'ink', 0);
  inkLine(ctx, [[x - 28 * s, y + 22 * s], [x + 28 * s, y + 22 * s]], 2.4 * s, '#5A3D28', 'inkfine', 0);
}

// 小本鲸头像（用在「怕忘了」的气泡里，不用 emoji）
function miniWhale(ctx, x, y, r, col = '#5CE1E6') {
  paint(ctx, ellPts(x, y, r, r * 0.86, 16), { wash: col, washOp: 235, ink: PAL.ink, sw: 1.1 });
  paint(ctx, ellPts(x - r * 0.34, y - r * 0.08, r * 0.13, r * 0.16, 8), { wash: PAL.ink, ink: null });
  paint(ctx, ellPts(x + r * 0.34, y - r * 0.08, r * 0.13, r * 0.16, 8), { wash: PAL.ink, ink: null });
  paint(ctx, [[x - r * 0.18, y + r * 0.3], [x, y + r * 0.46], [x + r * 0.18, y + r * 0.3]],
    { wash: 'none', ink: PAL.ink, sw: 1.2 });
}

// 能力卡（私信/评论/刷视频）：带一个绿的「已办」勾
function abilityCard(ctx, x, y, w, h, txt, p = 1, o = {}) {
  ctx.save();
  ctx.globalAlpha = clamp(p * 1.5) * (o.alpha ?? 1);
  ctx.translate(x, y);
  ctx.rotate(o.rot || 0);
  paint(ctx, rrPts(-w / 2, -h / 2, w, h, 9, 1.1), { wash: '#F8FAFC', fill: '#0B1526', fillOp: 22, ink: '#94A3B8', sw: 1.3 });
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0F172A';
  ctx.font = '900 17px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
  ctx.fillText(txt, -w / 2 + 16, 2);
  ctx.strokeStyle = '#16A34A';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 30, 0);
  ctx.lineTo(w / 2 - 22, 8);
  ctx.lineTo(w / 2 - 10, -9);
  ctx.stroke();
  ctx.restore();
}

// 消息流（回复成功的记号）—— 不写任何一条真评论内容
function msgCard(ctx, x, y, w, h, kind, p = 1) {
  ctx.save();
  ctx.globalAlpha = clamp(p * 1.6);
  paint(ctx, rrPts(x - w / 2, y - h / 2, w, h, 10, 1.0), { wash: '#F8FAFC', fill: '#0B1526', fillOp: 26, ink: '#93C5FD', sw: 1.2 });
  paint(ctx, ellPts(x - w / 2 + 22, y, 9, 9, 12), { wash: kind === '私信' ? '#A78BFA' : '#38BDF8', ink: null });
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 14px "NotoSansSC", sans-serif';
  ctx.fillText(kind, x - w / 2 + 40, y);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#15803D';
  ctx.font = '900 13px "NotoSansSC", sans-serif';
  ctx.fillText('回好了', x + w / 2 - 14, y);
  ctx.restore();
}

// 表盘（不写数字，只有指针）
function clockCard(ctx, x, y, r, t, o = {}) {
  paint(ctx, ellPts(x, y, r + 8, r + 8, 22), { wash: '#1B2A52', ink: '#93C5FD', sw: 1.6 });
  paint(ctx, ellPts(x, y, r, r, 22), { wash: '#F8FAFC', ink: PAL.ink, sw: 1.4 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    inkLine(ctx, [[x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78],
      [x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9]], 2, '#94A3B8', 'inkfine', 0);
  }
  const ha = -Math.PI / 2 + ((t * 0.14) % 1) * TAU;      // 慢爬的分针
  inkLine(ctx, [[x, y], [x + Math.cos(ha) * r * 0.55, y + Math.sin(ha) * r * 0.55]], 3.6, '#1D4ED8', 'ink', 0);
  inkLine(ctx, [[x, y], [x + Math.cos(0.6) * r * 0.34, y + Math.sin(0.6) * r * 0.34]], 2.4, '#64748B', 'inkfine', 0);
  paint(ctx, ellPts(x, y, 4.5, 4.5, 10), { wash: PAL.ink, ink: null });
  if (o.sweep) {
    ctx.save();
    ctx.globalAlpha = 0.3;
    paint(ctx, ellPts(x, y, r, r, 22), { wash: 'none', ink: '#38BDF8', sw: 2 });
    ctx.restore();
  }
}

// 米缸
function riceJar(ctx, x, y, s, lvl, t) {
  paint(ctx, [[x - 56 * s, y - 100 * s], [x + 56 * s, y - 100 * s], [x + 44 * s, y], [x - 44 * s, y]],
    { wash: '#4E6E9C', fill: '#07142A', fillOp: 70, ink: PAL.ink, sw: 1.7 });
  const hh = 76 * s * clamp(lvl);
  if (hh > 2) {
    paint(ctx, [[x - 46 * s, y - 8 * s - hh], [x + 46 * s, y - 8 * s - hh], [x + 40 * s, y - 6 * s], [x - 40 * s, y - 6 * s]],
      { wash: '#F8FAFC', washOp: 240, ink: 'rgba(30,45,80,0.3)', sw: 0.8 });
    for (let i = 0; i < 5; i++) {
      paint(ctx, ellPts(x - 26 * s + i * 13 * s, y - 12 * s - hh + Math.sin(t * 2 + i) * 1.5, 3.4 * s, 2.4 * s, 8),
        { wash: '#FFFFFF', ink: 'rgba(60,80,120,0.3)', sw: 0.4 });
    }
  }
  paint(ctx, ellPts(x, y - 100 * s, 56 * s, 14 * s, 18), { wash: '#3E5C86', ink: PAL.ink, sw: 1.5 });
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFF9EE';
  ctx.font = `900 ${Math.round(22 * s)}px "ZCOOLKuaiLe", sans-serif`;
  ctx.fillText('米', x, y - 50 * s);
  ctx.restore();
}

// 一叠补好的单子
function paperStack(ctx, x, y, s, n = 4, t = 0) {
  for (let i = n - 1; i >= 0; i--) {
    ctx.save();
    ctx.translate(x + i * 3 * s, y - i * 5 * s);
    ctx.rotate(-0.02 + i * 0.012);
    paint(ctx, rrPts(-34 * s, -46 * s, 68 * s, 92 * s, 4, 1.0), { wash: '#EFE3C8', fill: '#0B1526', fillOp: 18, ink: PAL.ink, sw: 1.1 });
    ctx.strokeStyle = '#B91C1C';
    ctx.lineWidth = 1.6 * s;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(-22 * s, -22 * s + k * 16 * s);
      ctx.lineTo(18 * s, -24 * s + k * 16 * s);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// 深处 / 鲸落
function deepSea(ctx, t) {
  const g = ctx.createLinearGradient(0, -100, 0, H + 100);
  g.addColorStop(0, '#04101F');
  g.addColorStop(0.52, '#071A33');
  g.addColorStop(1, '#0B2A48');
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(-200, -200, W + 400, H + 400);
  // 从上往下的光柱
  for (let i = 0; i < 4; i++) {
    const bx = 200 + i * 280 + Math.sin(t * 0.4 + i) * 16;
    paint(ctx, [[bx - 40, -100], [bx + 40, -100], [bx + 150, H], [bx + 20, H]],
      { wash: '#7DD3FC', washOp: 13, ink: null });
  }
  // 悬浮微粒
  for (let i = 0; i < 110; i++) {
    const hx = hash(i * 3.7) * W;
    const hy = (hash(i * 9.1) * H + t * (6 + hash(i) * 10)) % H;
    const r = 0.9 + hash(i * 5.3) * 2.2;
    ctx.globalAlpha = 0.15 + hash(i * 1.7) * 0.5;
    paint(ctx, ellPts(hx, hy, r, r, 6), { wash: '#BFE8FF', ink: null });
  }
  ctx.restore();
}

function whaleFall(ctx, x, y, s, p, t) {
  // 一头正在下沉的鲸（俯视偏侧）：身体比海水亮一档，不然会跟背景糊成一片
  const k = ease(clamp(p));
  const bx = x + Math.sin(t * 0.5) * 6;
  const by = y + (1 - k) * 40;
  const BODY = '#1D5378';
  const BELLY = '#2E6E97';
  const RIM = 'rgba(160,240,255,0.85)';
  const FLIP = Math.sin(t * 0.8) * 0.05;
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(0.12 + FLIP);
  glow(ctx, 0, 0, s * 2.6, '#38BDF8', 0.16 * k);
  // 尾鳍（两瓣）
  paint(ctx, [[-s * 1.7, 0], [-s * 2.9, -s * 0.78], [-s * 2.25, -s * 0.1], [-s * 2.25, s * 0.1], [-s * 2.9, s * 0.78]],
    { wash: BODY, washOp: 255, ink: RIM, sw: 1.6 });
  // 胸鳍（左右各一）
  paint(ctx, [[s * 0.5, -s * 0.5], [s * 0.05, -s * 1.15], [s * 0.95, -s * 0.78]],
    { wash: BELLY, washOp: 250, ink: RIM, sw: 1.3 });
  paint(ctx, [[s * 0.5, s * 0.5], [s * 0.05, s * 1.15], [s * 0.95, s * 0.78]],
    { wash: BELLY, washOp: 250, ink: RIM, sw: 1.3 });
  // 身体：头在右，尾在左
  paint(ctx, ellPts(0, 0, s * 1.95, s * 0.86, 26), { wash: BODY, washOp: 255, ink: RIM, sw: 1.8 });
  // 腹面（下侧一亮条，让它看起来是圆的）
  paint(ctx, ellPts(-s * 0.1, s * 0.3, s * 1.55, s * 0.4, 22), { wash: BELLY, washOp: 200, ink: null });
  // 背脊线 + 头部隆起
  inkLine(ctx, [[-s * 1.2, -s * 0.1], [-s * 0.2, -s * 0.34], [s * 1.0, -s * 0.2]], 1.6, 'rgba(190,245,255,0.55)', 'inkfine', 0.4);
  paint(ctx, ellPts(s * 1.35, -s * 0.1, s * 0.5, s * 0.42, 18), { wash: BODY, washOp: 255, ink: null });
  // 闭着的眼 + 嘴线
  inkLine(ctx, [[s * 1.28, -s * 0.12], [s * 1.44, -s * 0.16]], 2.4, '#CFF7FF', 'inkfine', 0);
  inkLine(ctx, [[s * 1.62, s * 0.1], [s * 1.9, s * 0.24]], 2.0, 'rgba(190,245,255,0.7)', 'inkfine', 0);
  // 身上的白色斑纹（座头鲸那种感觉，不画具体数字）
  for (let i = 0; i < 5; i++) {
    const px = -s * 1.0 + i * s * 0.5;
    inkLine(ctx, [[px, -s * 0.5], [px + s * 0.16, -s * 0.4]], 2.2, 'rgba(226,250,255,0.5)', 'inkfine', 0);
  }
  ctx.restore();
  // 落点周围：一圈亮起来的小生物（只画光点，不写数字）
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + t * 0.12;
    const rr = s * (2.2 + i * 0.28) * (0.4 + 0.6 * k);
    const lx = bx + Math.cos(a) * rr;
    const ly = by + s * 0.9 + Math.sin(a) * rr * 0.28;
    const al = clamp(k * 1.2 - i * 0.02);
    ctx.save();
    ctx.globalAlpha = al * 0.9;
    glow(ctx, lx, ly, 16, '#5CE1E6', 0.5 * al);
    paint(ctx, ellPts(lx, ly, 2.4, 2.4, 8), { wash: '#EAFFFF', ink: null });
    ctx.restore();
  }
}

// 钱包（用完就瘪）
function wallet(ctx, x, y, s, open = 0) {
  paint(ctx, rrPts(x - 34 * s, y - 24 * s, 68 * s, 48 * s, 6, 1), { wash: '#8A5A33', ink: PAL.ink, sw: 1.5 });
  paint(ctx, rrPts(x - 34 * s, y - 6 * s, 68 * s, 12 * s, 3, 0.6), { wash: '#5A3D28', ink: PAL.ink, sw: 1 });
  if (open > 0.2) {
    ctx.save();
    ctx.globalAlpha = clamp(open);
    paint(ctx, [[x - 20 * s, y - 24 * s], [x + 20 * s, y - 24 * s], [x + 12 * s, y - 46 * s], [x - 12 * s, y - 46 * s]],
      { wash: '#2B1B10', ink: PAL.ink, sw: 1.1 });
    ctx.restore();
  }
}

function coin(ctx, x, y, r, t) {
  paint(ctx, ellPts(x, y, r, r, 14), { wash: '#F2C14E', ink: '#8A5A0B', sw: 1.4 });
  paint(ctx, ellPts(x, y, r * 0.5, r * 0.5, 10), { wash: '#FFE9A8', ink: null });
}

// ---------------------------------------------------------------------------
// 6. 分镜（11 镜 / 40 句）
// ---------------------------------------------------------------------------

// Day6 v2: cue-driven blocking, distinct inserts, continuous prop actions.
function panel6(g,x,y,w,h,fill='#122640',stroke='#71D7EE',r=16){g.save();g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=fill;g.fill();g.strokeStyle=stroke;g.lineWidth=3;g.stroke();g.restore();}
function text6(g,s,x,y,size=24,color='#E7F5FF'){g.save();g.font=`800 ${size}px NotoSansSC`;g.fillStyle=color;g.textAlign='center';g.fillText(s,x,y);g.restore();}
function limb6(g,x,y,xx,yy,color='#B5E2F4',w=12){g.save();g.strokeStyle='#152438';g.lineWidth=w+5;g.lineCap='round';g.beginPath();g.moveTo(x,y);g.lineTo(xx,yy);g.stroke();g.strokeStyle=color;g.lineWidth=w;g.stroke();g.restore();}
function actor6(g,x,y,u,t,pose='idle',other=false,rot=0){WGF(g,x,y,u,{t,pose,rot});if(other){badge(g,x+u*1.3,y-u*3.2,'笨鲸',{h:24});}}
function laptop6(g,x,y,s,t,broken=false){g.save();g.translate(x,y);g.scale(s,s);panel6(g,-140,-160,280,175,'#233B59','#91AAC4',10);panel6(g,-126,-146,252,145,'#071423',broken?'#FF7388':'#3EA9BA',5);for(let i=0;i<7;i++){g.fillStyle=broken?['#FF7388','#FFB7BD'][i%2]:['#6EDBCB','#A6B6FF','#FFD99B'][i%3];for(let j=0;j<3;j++){const w=24+((i*29+j*17)%46);g.fillRect(-110+j*74,-126+i*17,w,4);}}if(broken)text6(g,'×',0,-48,75,'#FF788C');panel6(g,-165,18,330,50,'#536C89','#9BB1CA',9);for(let a=0;a<4;a++)for(let b=0;b<12;b++){g.fillStyle=((a+b+Math.floor(t*13))%12===0)?'#B6F6FA':'#203653';g.fillRect(-145+b*24,25+a*8,18,5);}g.restore();}
function phone6(g,x,y,angle,t,chat=false){g.save();g.translate(x,y);g.rotate(angle);panel6(g,-65,-115,130,230,'#0C1524','#94A9BB',18);panel6(g,-55,-98,110,192,'#E8F0F6','#B6CBD5',9);g.fillStyle='#23374B';g.fillRect(-17,-107,34,4);for(let i=0;i<3;i++){let yy=-70+i*48;panel6(g,i%2?-18:-45,yy,68,31,i%2?'#98E0D2':'#FFF','#AAC6CB',7);if(chat){text6(g,i%2?'…':'♪',i%2?15:-12,yy+23,20,'#326478');}else{g.fillStyle='#668498';g.fillRect(i%2?-8:-35,yy+10,45,3);g.fillRect(i%2?-8:-35,yy+18,30,3);}}g.restore();}
function bowl6(g,x,y,s,full,t){g.save();g.translate(x,y);g.scale(s,s);g.shadowColor='#020917';g.shadowBlur=15;g.shadowOffsetY=12;g.beginPath();g.ellipse(0,28,106,24,0,0,Math.PI*2);g.fillStyle='#07101D';g.fill();g.shadowBlur=0;g.shadowOffsetY=0;let grad=g.createLinearGradient(-90,-15,85,70);grad.addColorStop(0,'#F6FCFF');grad.addColorStop(.4,'#B9D6E7');grad.addColorStop(1,'#5B829E');g.beginPath();g.moveTo(-98,0);g.bezierCurveTo(-88,92,79,96,98,0);g.closePath();g.fillStyle=grad;g.fill();g.strokeStyle='#263E59';g.lineWidth=3;g.stroke();g.beginPath();g.ellipse(0,0,98,29,0,0,Math.PI*2);g.fillStyle='#93AFC2';g.fill();g.stroke();g.save();g.beginPath();g.ellipse(0,-2,92,24,0,0,Math.PI*2);g.clip();for(let i=0;i<190;i++){const xx=Math.sin(i*52.73)*85, yy=Math.cos(i*31.17)*23;const rank=(Math.sin(i*92.1)+1)/2;if(rank>full)continue;g.save();g.translate(xx,yy);g.rotate(i*2.3);g.fillStyle=i%4?'#FFF9E7':'#D5E3DA';g.beginPath();g.ellipse(0,0,5,2.5,0,0,Math.PI*2);g.fill();g.restore();}g.restore();if(full>.3){for(let i=0;i<130;i++){const xx=Math.sin(i*41.9)*75,yy=-Math.sqrt(Math.max(0,1-xx*xx/6400))*full*46+(Math.cos(i*63.1)+1)*full*17;g.save();g.translate(xx,yy);g.rotate(i*1.7);g.fillStyle=i%5?'#FFFBEF':'#D9E5D5';g.beginPath();g.ellipse(0,0,5,2.5,0,0,Math.PI*2);g.fill();g.restore();}}g.beginPath();g.ellipse(0,0,99,30,0,0,Math.PI*2);g.strokeStyle='#EAF8FF';g.lineWidth=4;g.stroke();g.strokeStyle='#2B6D95';g.lineWidth=7;g.beginPath();g.ellipse(0,20,80,24,0,.12,Math.PI-.12);g.stroke();g.fillStyle='#D9EDFA';g.beginPath();g.ellipse(0,76,38,7,0,0,Math.PI*2);g.fill();if(full>.12){for(let i=0;i<3;i++){let q=(t*.35+i/3)%1;g.globalAlpha=(1-q)*.5;g.strokeStyle='#EFFAFF';g.lineWidth=2;g.beginPath();g.moveTo(-34+i*34,-25-q*48);g.bezierCurveTo(-20+i*34,-40-q*48,-45+i*34,-50-q*48,-25+i*34,-65-q*48);g.stroke();}}g.restore();}
function sheet6(g,x,y,rot,code=false){g.save();g.translate(x,y);g.rotate(rot);panel6(g,-47,-58,94,116,'#F2E8D2','#AAB9C2',3);for(let i=0;i<6;i++){g.fillStyle=code?['#518C91','#656BA4','#AC7D58'][i%3]:'#A6B2BE';g.fillRect(-32+(code?(i%2)*9:0),-35+i*13,code?48-(i%3)*8:62,4);}g.restore();}
function table6(g){panel6(g,215,460,850,32,'#655044','#A68569',7);limb6(g,265,492,245,608,'#59483E',15);limb6(g,1000,492,1020,608,'#59483E',15);}
function handTrail6(g,x,y,x1,y1,p){for(let i=0;i<3;i++){g.save();g.globalAlpha=(1-i*.25)*.5;limb6(g,x-i*12,y+i*4,lerp(x,x1,p)-i*12,lerp(y,y1,p)+i*4,'#92B8CA',5);g.restore();}}
function rigWork6(g,x,y,u,t,typing=true){
 u*=1.25; // Keep the face and working hands visible above the laptop screen.
 actor6(g,x,y,u,t,typing?'point':'peek_curious',true,typing?Math.sin(t*10)*.017:0);
 // Hands move at the actual keyboard, and stop during supervision cutaways.
 limb6(g,x-u*1.2,y-u*4.1,x-u*2.6,y-u*2.6+(typing?Math.sin(t*23)*5:0));
 limb6(g,x+u*1.5,y-u*4,x+u*2.3,y-u*2.6+(typing?Math.cos(t*23)*5:0));
}
function insetLive6(g,x,y,w,h,t){
 g.save();g.beginPath();g.roundRect(x,y,w,h,15);g.clip();g.translate(x,y);g.scale(w/1280,h/720);
 bg(g,t);panel6(g,430,400,620,24,'#665344','#AB8B6B',5);
 actor6(g,350,550,28,t,'peek_curious');boss(g,1060,435,80,t);
 rigWork6(g,760,540,25,t,true);laptop6(g,755,485,.68,t,false);bowl6(g,950,447,.55,.8,t);
 g.restore();panel6(g,x,y,w,42,'#18384E','#67C8C8');text6(g,'笨鲸 · 直播敲代码',x+w/2,y+29,21);
}
function liveScene(g,t,lt,p,n){
 let active=CUES.findIndex(c=>t>=c.start&&t<c.end)+1;if(!active)active=SHOT_RANGES[n-1].to;
 const q=cueP(t,active),z=easeOut(clamp(q*2));
 camBegin(g,640,440,n===4?1.08:1.02+.025*Math.sin(p*Math.PI),0);bg(g,t);
 if(n===1){
  // Opens mid-action: flailing keyboard hand hits an immovable verification card.
  actor6(g,320,570,29,t,active===1?'shock':'peek_curious');
  actor6(g,900-70*z,565,25,t,active===1?'shock':'shy_fidget',true,active===1?-.18*z:0);
  panel6(g,525,160,475,235,'#E6EEF1','#849FAE');text6(g,'请证明你不是机器',762,210,29,'#294B60');
  panel6(g,575,245,45,45,'#FFF','#7796A5',5);text6(g,'人机测验',780,277,27,'#38596B');
  if(active===2){limb6(g,578,250,614,287,'#E3727A',5);limb6(g,614,250,578,287,'#E3727A',5);text6(g,'没过',770,355,43,'#C45262');}
  else{limb6(g,840,410,820+Math.sin(t*13)*9,325);}
 }
 if(n===2){
  actor6(g,330,570,29,t,'think');rigWork6(g,860,555,27,t,active===3);
  table6(g);laptop6(g,830,480,.7,t,false);
  if(active===4){panel6(g,600,135,435,120,'#E6EEF1','#82B4BC');text6(g,'不是机器？',818,185,32,'#34546B');text6(g,'……',818,229,37,'#C15C6B');}
 }
 if(n===3){
  actor6(g,300+180*ease(p),575,30,t,active===5?'think':'point');
  const slide=active===7?z:0;
  panel6(g,620,125,495,340,'#102A43','#6AD1CE');text6(g,'直播间',867,170,30);
  // The whole workstation moves through the frame; no isolated avatar on a blank TV.
  g.save();g.beginPath();g.rect(630,185,475,270);g.clip();g.globalAlpha=.5;g.translate(630,185);g.scale(.38,.38);bg(g,t);g.restore();
  const xx=lerp(590,870,slide);rigWork6(g,xx,550-65*slide,24-3*slide,t,active===7);laptop6(g,xx,485-60*slide,.58,t,false);
  if(active===6){limb6(g,440,430,550,390);}
  if(active===7){limb6(g,500,430,xx-120,425-50*slide);for(let i=0;i<3;i++){g.save();g.globalAlpha=.5-i*.12;limb6(g,xx-220-i*25,460-i*17,xx-150-i*25,460-i*17,'#8FE0DB',3);g.restore();}}
 }
 if(n===4){
  actor6(g,350,570,29,t,'point');rigWork6(g,800,555,27,t,true);table6(g);laptop6(g,785,480,.7,t,false);
  const bx=lerp(400,1030,active===9?z:0);bowl6(g,bx,435,.8,.85,t);
  if(active===8){limb6(g,410,430,650,445);}
  else {limb6(g,410,430,bx-65,435);}
 }
 if(n===5){
  if(active===10){insetLive6(g,175,110,930,485,t);}
  else{rigWork6(g,685,550,28,t,true);actor6(g,330+45*Math.sin(q*Math.PI),570,32,t,'peek_curious',false,.06);boss(g,1030-30*z,455,100,t);table6(g);laptop6(g,690,480,.68,t,false);bowl6(g,880,437,.65,.8,t);limb6(g,990,382,900,400,'#142338',18);}
 }
 if(n===6){
  if(active===12||active===13){
   // Flashback uses the same room with a paper-mess action, not a title card.
   actor6(g,350+75*z,575,28,t,active===12?'shock':'shy_fidget');rigWork6(g,890,555,24,t,active===12);laptop6(g,885,440,.8,t,active===12);
   for(let i=0;i<7;i++){const a=(q+i/7)%1;sheet6(g,lerp(870-i*50,540,a),lerp(490,550,a)-Math.sin(a*Math.PI)*70,.2*Math.sin(i),true);}limb6(g,420,455,530,510+Math.sin(t*6)*15);text6(g,'上回',210,145,24,'#AAC5D5');
  }else{
   rigWork6(g,850,555,26,t,true);actor6(g,360+70*z,575,31,t,active===14?'peek_curious':'shy_fidget');table6(g);laptop6(g,835,480,.68,t,false);
   if(active===15){stool(g,375,550,1.1);limb6(g,420,430,510,455);}
  }
 }
 if(n===7){
  rigWork6(g,840,555,26,t,true);actor6(g,350,570,30,t,active===16?'point':active===17?'shock':'shy_fidget');boss(g,1100,455,85,t);table6(g);laptop6(g,825,480,.68,t,false);bowl6(g,1000,438,.68,.85,t);
  if(active>=17){const xx=active===17?lerp(90,350,z):350;stool(g,xx,550,1.2);limb6(g,350,460,xx,520);}
  if(active===18){panel6(g,225,170,250,75,'#25455B','#A0D2D5');text6(g,'监工位',350,219,36);limb6(g,400,420,650,380);}
 }
 if(n===8){
  insetLive6(g,610,145,520,310,t);
  actor6(g,350,575,34,t,active===19?'wave':'point');
  if(active===20){limb6(g,430,410,640,320);actor6(g,350,575,34,t,'point',false,-.04);}
 }
 camEnd(g);
}

function shotC01(ctx,t,lt,p){liveScene(ctx,t,lt,p,1);}
function shotC02(ctx,t,lt,p){liveScene(ctx,t,lt,p,2);}
function shotC03(ctx,t,lt,p){liveScene(ctx,t,lt,p,3);}
function shotC04(ctx,t,lt,p){liveScene(ctx,t,lt,p,4);}
function shotC05(ctx,t,lt,p){liveScene(ctx,t,lt,p,5);}
function shotC06(ctx,t,lt,p){liveScene(ctx,t,lt,p,6);}
function shotC07(ctx,t,lt,p){liveScene(ctx,t,lt,p,7);}
function shotC08(ctx,t,lt,p){liveScene(ctx,t,lt,p,8);}
// 片尾卡已删除（2026-10-29 用户：「所有都去掉这个，就是说完话就结束了。」）
// 想加回来的人先读 00_运营总览/画面红线_不要出现的东西_2026-10-29.md：
// 天数卡 / 粉丝数 / 目标值 / 进度条 / 合规小字卡，一律不做。片子最后一句说完就停。

const SHOTS = {
  C01: shotC01, C02: shotC02, C03: shotC03, C04: shotC04, C05: shotC05, C06: shotC06,
  C07: shotC07, C08: shotC08, 
};

// ---------------------------------------------------------------------------
// 6. HUD + 字幕
// ---------------------------------------------------------------------------
const SUB = createDay2Subtitle({
  fontOf: (size, weight) => `${weight || 800} ${size}px "NotoSansSC", sans-serif`,
  measureCtx: createCanvas(16, 16).getContext('2d')
});
// 字幕时间轴：优先用 `--subs`（build_subtitle_timing.py 从音频量出来的每屏起止）；
// 没有就退回「字级启发式分句」，但那一条已经证明会晚 0.2–1.0s，只作兜底。
const SUBS_JSON = argOf('--subs');
const SUB_SCREENS = SUBS_JSON
  ? JSON.parse(fs.readFileSync(SUBS_JSON, 'utf8')).screens.map((x) => ({
      text: x.text, start: x.start, end: x.end,
      speechEnd: typeof x.speech_end === 'number' ? x.speech_end : x.end,
      cueId: x.id
    }))
  : null;
const SUB_HOLD = 0.30;   // 说完之后再挂 0.3 秒就撤（久挂会显得「字幕慢半拍」）
const SUB_SEGS = LINES.map((l, i) => SUB.clauses(l, CUES[i].chars, CUES[i].start, CUES[i].end));

function drawSubtitle(ctx, t) {
  if (SUB_SCREENS) {
    // 屏起止都由发声段量出来（build_subtitle_timing.py）。这里只负责「气口不空屏」：
    // 找到最后一个已经上屏的屏，一直挂到下一屏上屏为止；末屏挂到片尾卡。
    let hit = null, next = null;
    for (const sc of SUB_SCREENS) {
      if (t >= sc.start - 1e-6) hit = sc;
      else { next = sc; break; }
    }
    if (!hit) return;
    if (!next && t >= DURATION - 0.02) return;               // 最后一句说完，片子就结束
    if (t > hit.speechEnd + SUB_HOLD) return;                // 这句说完了就撤，不空挂着
    SUB.draw(ctx, {
      lines: SUB.wrap(hit.text),
      speaker: speakerFor({ isClaude: false }),
      vis: 1, W, H
    });
    return;
  }
  let idx = -1;
  for (let i = 0; i < CUES.length; i++) if (t >= CUES[i].start && t < CUES[i].end) idx = i;
  if (idx < 0) return;
  const seg = SUB.segmentAt(SUB_SEGS[idx], t);
  SUB.draw(ctx, {
    lines: SUB.wrap(seg.text),
    speaker: speakerFor({ isClaude: false }),
    vis: 1, W, H
  });
}

function hud(ctx, t) {
  // 用户 2026-10-27：「图片中的东西去掉」——右上角「鲸鱼娘·本鲸」、
  // 左上角「AI 生成·非官方同人」、右下角 QA 说明三个角标全部撤掉。
  // 合规声明只保留在片尾卡（非官方同人 · 本视频含 AI 生成内容）。
}

// ---------------------------------------------------------------------------
// 7. 渲染
// ---------------------------------------------------------------------------
function shotAt(lineNo) {
  return SHOT_RANGES.find((s) => lineNo >= s.from && lineNo <= s.to) || SHOT_RANGES[0];
}

function renderFrame(ctx, t) {
  reseedBoil(t);
  let idx = CUES.findIndex((c) => t >= c.start && t < c.end);
  if (idx < 0) {
    // 镜间缝隙 / 末尾 0.2s：停在上一镜，不黑屏、不加卡
    idx = CUES.reduce((acc, c, i) => (t >= c.end && i > acc ? i : acc), 0);
  }
  if (idx >= 0) {
    const sh = shotAt(idx + 1);
    const s = C(sh.from), e = CE(sh.to);
    SHOTS[sh.id](ctx, t, t - s, clamp((t - s) / Math.max(0.001, e - s)));
  }
  hud(ctx, t);
  drawSubtitle(ctx, t);
}

function prepareFrame(ctx) {
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, BASE_W, BASE_H);
}

async function renderStills() {
  const dir = path.resolve(__dirname, 'day7_stills');
  fs.mkdirSync(dir, { recursive: true });
  const canvas = createCanvas(OUT_W, OUT_H);
  const ctx = canvas.getContext('2d');
  const marks = [
    ['c01_60', C(1) + (CE(4) - C(1)) * 0.6],
    ['c02_30', C(5) + (CE(8) - C(5)) * 0.3],
    ['c02_85', C(5) + (CE(8) - C(5)) * 0.85],
    ['c03_50', C(9) + (CE(13) - C(9)) * 0.5],
    ['c03_90', C(9) + (CE(13) - C(9)) * 0.9],
    ['c04_60', C(14) + (CE(17) - C(14)) * 0.6],
    ['c04_95', C(14) + (CE(17) - C(14)) * 0.95],
    ['c05_60', C(18) + (CE(19) - C(18)) * 0.6],
    ['c06_55', C(20) + (CE(22) - C(20)) * 0.55],
    ['c06_90', C(20) + (CE(22) - C(20)) * 0.9],
    ['c07_20', C(23) + (CE(26) - C(23)) * 0.2],
    ['c07_45', C(23) + (CE(26) - C(23)) * 0.45],
    ['c07_75', C(23) + (CE(26) - C(23)) * 0.75],
    ['c07_95', C(23) + (CE(26) - C(23)) * 0.95],
    ['c08_30', C(27) + (CE(28) - C(27)) * 0.3],
    ['c08_85', C(27) + (CE(28) - C(27)) * 0.85],
    ['c09_35', C(29) + (CE(31) - C(29)) * 0.35],
    ['c09_85', C(29) + (CE(31) - C(29)) * 0.85],
    ['c10_60', C(32) + (CE(34) - C(32)) * 0.6],
    ['c11_40', C(35) + (CE(40) - C(35)) * 0.4],
    ['c11_92', C(35) + (CE(40) - C(35)) * 0.92],
    ['last', DURATION - 0.05]
  ];
  for (const [name, t] of marks) {
    prepareFrame(ctx);
    renderFrame(ctx, t);
    const f = path.join(dir, `${name}${SOFT ? '_soft' : ''}_t${t.toFixed(2)}${SUFFIX}.png`);
    fs.writeFileSync(f, canvas.toBuffer('image/png'));
    console.log('still', path.relative(process.cwd(), f));
  }
}

// 电视里的「劣质 MV」音轨：慢放 + 低通 + 走音 + 很小声，只在 C02 那几秒响
async function buildTvBed(ffmpeg, outWav, durSec) {
  const dur = Math.max(1.0, durSec).toFixed(2);
  if (TV_AUDIO && TV_AUDIO !== 'auto') {
    // 用用户给的音轨：慢放（atempo 0.85）+ 低通 + 抖动 + 音量压到 12%
    await run(ffmpeg, ['-y', '-i', path.resolve(TV_AUDIO), '-t', dur,
      '-af', 'atempo=0.85,lowpass=f=1100,vibrato=f=2.6:d=0.05,volume=0.12',
      '-ar', '44100', '-ac', '1', outWav]);
    console.log(`  电视音轨：${path.basename(TV_AUDIO)}（慢放 0.85× · 低通 · 音量 12%）`);
    return outWav;
  }
  // 占位伴奏：三个正弦叠一个走音的和弦，故意「卡不上点」的抖动
  const expr = '0.16*sin(2*PI*196*t)*(0.55+0.45*sin(2*PI*2.1*t))+0.10*sin(2*PI*247*t)+0.07*sin(2*PI*392*t)';
  await run(ffmpeg, ['-y', '-f', 'lavfi', '-i', `aevalsrc=${expr}:s=44100:d=${dur}`,
    '-af', 'lowpass=f=900,atempo=0.85,vibrato=f=2.2:d=0.06,volume=0.12',
    '-ar', '44100', '-ac', '1', outWav]);
  console.log('  电视音轨：占位合成（慢放 0.85× · 低通 900Hz · 音量 12%）——正式版请用 --tv-audio 朋友的酒.mp3');
  return outWav;
}

function run(bin, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d.toString(); });
    p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`${bin} 退出码 ${c}\n${err.slice(-800)}`))));
    p.on('error', reject);
  });
}

async function renderVideo(outFile) {
  const ffmpeg = resolveFfmpeg();
  fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  const total = Math.round(DURATION * FPS);
  // 音轨：① 配音（可选）② 电视里那条 MV 的伴奏（可选，只覆盖 C02）
  const inputs = [];
  const chains = [];
  let idx = 1;
  if (AUDIO_WAV) {
    inputs.push('-i', path.resolve(AUDIO_WAV));
    chains.push(`[${idx}:a]apad,volume=1.0[aV]`);
    idx++;
  }
  if (TV_AUDIO) {
    const tvStart = C(SHOT_RANGES[1].from);
    const tvEnd = CE(SHOT_RANGES[1].to);
    const tvBed = path.join('/tmp', `day5_tv_bed_${Math.round(tvStart * 100)}.wav`);
    await buildTvBed(resolveFfmpeg(), tvBed, tvEnd - tvStart + 0.4);
    inputs.push('-i', tvBed);
    const ms = Math.round(tvStart * 1000);
    chains.push(`[${idx}:a]afade=t=in:st=0:d=0.4,afade=t=out:st=${(tvEnd - tvStart).toFixed(2)}:d=0.6,adelay=${ms}|${ms}[aT]`);
    idx++;
  }
  let audioArgs;
  if (AUDIO_WAV && TV_AUDIO) {
    audioArgs = [...inputs, '-filter_complex',
      `${chains.join(';')};[aV][aT]amix=inputs=2:duration=first:dropout_transition=0[mix]`,
      '-map', '0:v:0', '-map', '[mix]', '-c:a', 'aac', '-b:a', '192k', '-t', DURATION.toFixed(3)];
  } else if (AUDIO_WAV) {
    audioArgs = [...inputs, '-map', '0:v:0', '-map', '1:a:0', '-c:a', 'aac', '-b:a', '192k',
      '-af', 'apad', '-t', DURATION.toFixed(3)];
  } else if (TV_AUDIO) {
    audioArgs = [...inputs, '-filter_complex', chains.join(';'), '-map', '0:v:0', '-map', '[aT]',
      '-c:a', 'aac', '-b:a', '160k', '-t', DURATION.toFixed(3)];
  } else {
    audioArgs = ['-an'];
  }
  console.log(`Day7: ${total} 帧 / ${DURATION.toFixed(2)}s / ${OUT_W}×${OUT_H} / ${VOICE_CUES ? '实测 cue' : '4.3 字/秒估算'} / 字幕=${SUB_SCREENS ? `实测屏（${SUB_SCREENS.length}）` : '字级兜底'} / ${SOFT ? '关清晰化' : '像素清晰化'}`);
  const ff = spawn(ffmpeg, [
    '-y', '-f', 'rawvideo', '-vcodec', 'rawvideo', '-pix_fmt', 'rgba',
    '-s', `${OUT_W}x${OUT_H}`, '-r', String(FPS), '-i', '-',
    ...audioArgs,
    '-c:v', 'libx264', '-preset', 'fast', '-tune', 'animation',
    '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outFile
  ], { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  ff.stderr.on('data', (d) => { err += d.toString(); });
  ff.on('error', (e) => { err += `\n[spawn] ${e.message}`; });
  const canvas = createCanvas(OUT_W, OUT_H);
  const ctx = canvas.getContext('2d');
  const t0 = Date.now();
  for (let f = 0; f < total; f++) {
    prepareFrame(ctx);
    renderFrame(ctx, f / FPS);
    const raw = canvas.data();
    const ok = ff.stdin.write(Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength));
    if (!ok) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 120 === 0 || f === total - 1) {
      const el = (Date.now() - t0) / 1000;
      process.stdout.write(`\r  帧 ${f + 1}/${total} (${((f + 1) / total * 100).toFixed(0)}%) ${((f + 1) / Math.max(0.1, el)).toFixed(1)}fps`);
    }
  }
  process.stdout.write('\n');
  ff.stdin.end();
  const code = await new Promise((r) => ff.on('close', r));
  if (code !== 0) {
    console.error(err.split('\n').slice(-14).join('\n'));
    throw new Error(`ffmpeg 退出码 ${code}`);
  }
  console.log(`✓ ${outFile}（${(fs.statSync(outFile).size / 1e6).toFixed(2)} MB）`);
}

await loadSpritePoses();
await loadDsh();
await loadMvFrames();
await loadClaude();
console.log(`角色：${CHAR_MODE === 'sprite' ? 'Day3 高清立绘（whale_girl_src）' : CHAR_MODE + ' 老路径'}；字幕：Day2 加更版；时长 ${DURATION.toFixed(2)}s`);

// Covers share the exact character and prop drawing code with the video.
function renderDay7Covers(){
 const dir=path.resolve(__dirname,'../../Day7/封面');fs.mkdirSync(dir,{recursive:true});
 for(const [name,w,h] of [['3比4',1080,1440],['4比3',1440,1080]]){
  const canvas=createCanvas(w,h),g=canvas.getContext('2d');const vertical=h>w;
  const grad=g.createLinearGradient(0,0,w,h);grad.addColorStop(0,'#08182D');grad.addColorStop(1,'#244B65');g.fillStyle=grad;g.fillRect(0,0,w,h);
  g.save();g.globalAlpha=.12;for(let i=0;i<12;i++){g.strokeStyle='#6FDCD7';g.lineWidth=2;g.beginPath();g.arc(w*.65,h*.6,100+i*70,0,Math.PI*2);g.stroke();}g.restore();
  // Layout separately for both aspects: no cropping a landscape cover into portrait.
  const scale=w/1280;g.save();g.scale(scale,scale);
  const hh=h/scale;
  const floor=vertical?hh*.76:hh*.83;
  reseedBoil(20.8);
  glow(g,800,floor-150,310,'#65E2DC',.22);
  boss(g,vertical?1050:1120,floor-100,vertical?125:110,25);
  actor6(g,vertical?320:300,floor,vertical?57:43,25,'peek_curious');
  actor6(g,vertical?800:820,floor-5,vertical?48:39,25,'point',true,.03);
  panel6(g,vertical?490:550,floor-60,620,28,'#685344','#B69472',7);
  laptop6(g,vertical?760:800,floor-65,vertical?.85:.8,25,false);
  limb6(g,vertical?810:850,floor-160,vertical?730:770,floor-50);
  bowl6(g,vertical?1030:1060,floor+60,.85,.85,25);
  g.restore();
  const title=(text,y,size,color)=>{g.save();g.font=`900 ${size}px NotoSansSC`;g.textAlign='center';g.lineJoin='round';g.strokeStyle='#07182D';g.lineWidth=size*.15;g.strokeText(text,w/2,y);g.fillStyle=color;g.fillText(text,w/2,y);g.restore();};
  title('人机测验没过',h*.13,vertical?77:72,'#F7F5E9');
  title('直播敲代码',h*.245,vertical?113:107,'#FFE098');
  panel6(g,w*.22,h*.285,w*.56,h*.052,'#13364D','#65CCCF',16);
  title('本鲸和老大在旁边监工',h*.322,vertical?32:29,'#D2FAF2');
  title('它有饭碗 · 本鲸有工位',h*.95,vertical?43:45,'#F4EAD0');
  const f=path.join(dir,`Day7封面_${name}.png`);fs.writeFileSync(f,canvas.toBuffer('image/png'));console.log('cover',f);
 }
}
const timesArg = argOf('--times');
if (ARGV.includes('--covers')) { renderDay7Covers(); } else if (timesArg) {
  const dir = path.resolve(__dirname, 'day7_stills');
  fs.mkdirSync(dir, { recursive: true });
  const tag = argOf('--tag') || 'chk';
  const canvas = createCanvas(OUT_W, OUT_H);
  const ctx = canvas.getContext('2d');
  for (const t of timesArg.split(',').map(Number)) {
    prepareFrame(ctx);
    renderFrame(ctx, t);
    const f = path.join(dir, `${tag}_t${t.toFixed(2)}${SUFFIX}.png`);
    fs.writeFileSync(f, canvas.toBuffer('image/png'));
    console.log('check', path.relative(process.cwd(), f));
  }
} else if (ARGV.includes('--stills')) await renderStills();
else {
  const i = ARGV.indexOf('--out');
  await renderVideo(i >= 0 ? ARGV[i + 1] : 'day5_sample.mp4');
}
