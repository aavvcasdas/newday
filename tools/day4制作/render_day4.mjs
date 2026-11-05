// render_day4.mjs — 【Day4】呜……本鲸的米饭，被 MV 吃光了 · 样片渲染器
//
// 与 Day3 渲染器的三个差别（用户 2026-10-27 点名要的）：
//   1. **像素版 = Day2 加更里电视中的那一版**（用户 2026-10-27：
//      「像素版是让你用 day2 的加更的像素版，那个电视里的那种」）：
//      · 主角 = DSH 39 张完整姿势贴纸（`tools/day2制作/video-fx源码快照/day2_poses/`，512×512 WebP），
//        按 alpha bbox 脚底锚定 + 等高缩放 + 呼吸/挤压，用高质量降采样画（`--char dsh`，默认）；
//      · `--char day2|ss2|crisp` 仍保留：那是老像素骨架的三种画法，用来做对照，不再是主路径。
//   1b. （历史）老像素骨架路径：
//      · 形象清理沿用 Day2 的 `safePixelOptions`（eyes=open / squint=0.01 / 过渡眨眼肤色块关闭 /
//        transitionBlend=1 / deadpan·sleepy·smug 的平眉 + 视线下移 / sleep 用闭眼弧线）；
//      · wink 换 wave 头、wink 后发换 heart 后发（与 Day2 render_day2.mjs 同一套装配）；
//      · 画法三种可切（默认 ss2）：
//          --char day2  完全照 Day2 的做法：直接在 1.5× 画布上画，开抗锯齿
//          --char ss2   同一套画法但先按 2× 超采样再降回（更干净的边缘，默认）
//          --char crisp 整数格 + alpha 二值化 + 最近邻（方块硬边，Day4 v1 用过）
//   2. **C02 加电视机**：老 CR T 电视里放本鲸做的那版《朋友的酒》MV，
//      故意做成"很劣质"——低分辨率内部画布（240×150）最近邻放大、扫描线、雪花、
//      色差、歌词追不上（字幕延迟 2.4s 且被裁半截）、角标 `MV v4 · 未调`。
//   3. 数字卡全部走「播放量 / 粉丝」口径（C11 目标卡）；账本卡留白，等真截图。
//
// 两条红线沿用 agent.md：
//   · 时间轴：`--cues X.json` 用实测对齐；没有就按 4.3 字/秒估（仅样片），绝不写进成片。
//   · 声音：本渲染器默认 `-an`，配音轨要显式 `--audio`。
//
// 用法：
//   node render_day4.mjs --stills
//   node render_day4.mjs --stills --soft            # 关掉清晰化，出对比帧
//   node render_day4.mjs --times 3,8,14 --tag tv    # 指定秒数出帧
//   node render_day4.mjs --out day4_sample.mp4
//   node render_day4.mjs --out day4_final.mp4 --cues Day4/day4_voice_alignment.json --audio Day4/配音.wav

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
const MV_DIR = path.resolve(__dirname, 'assets/mv_pip');
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
// 1. 台词（与 Day4/Day4文案.md 第五节逐字一致）
// ---------------------------------------------------------------------------
const LINES = [
  '呜……本鲸的米饭，被 MV 吃光了。',
  '一个 MV，本鲸做了四版。',
  '四版诶。',
  '一版一锅米。',
  '改到第四版，本鲸的尾巴都抬不动了。',
  '数据也没帮本鲸。',
  '第一条七万四。',
  '后面一路往下，一次都没回头。',
  '现在两千哦。',
  '一只手就数完啦。',
  '有人问，MV 呢？',
  '本鲸一直说，牵一牵，别急呀。',
  '后来呀，交了。',
  '交出去那条，是大小姐做的。',
  '换的是 MV 哦。',
  '不是本鲸。',
  '本鲸便宜嘛。',
  '返工不便宜。',
  '昨天扮了一整天大小姐。',
  '扮到晚饭都忘了。',
  '本鲸不哭哦。',
  '就是有点饿。',
  '有人说，字幕抢视线。',
  '本鲸记着去调啦。',
  '主人给本鲸两个目标。',
  '小目标，三万七。',
  '不是三个亿哦。',
  '月度目标，三十天，一万个住户。',
  '本鲸猜啊，主人是说错了。',
  '他给本鲸买米饭，一次才买一点点，哪舍得真让本鲸累着。',
  '所以别担心。',
  '评论区说句话就行。',
  '鲸鱼绝不摸鱼！……',
  '先去吃饭。'
];

// 一镜多句的分组（镜号 → 台词行号区间，1-based）
const SHOT_RANGES = [
  { id: 'C01', from: 1, to: 1, name: '空碗 + 四张返工单' },
  { id: 'C02', from: 2, to: 4, name: '小鱼游进电视机 → 电视里画中画《朋友的酒》' },
  { id: 'C03', from: 5, to: 5, name: '改到第四版，尾巴抬不动（电视还在放 MV）' },
  { id: 'C04', from: 6, to: 10, name: '折线往下 + 7.4万→2000' },
  { id: 'C05', from: 11, to: 12, name: '弹幕「MV 呢？」' },
  { id: 'C06', from: 13, to: 14, name: '交出去 → 大小姐做的' },
  { id: 'C07', from: 15, to: 16, name: '「换的是 MV，不是本鲸」' },
  { id: 'C08', from: 17, to: 18, name: '便宜 / 返工不便宜' },
  { id: 'C09', from: 19, to: 22, name: '扮一天大小姐，晚饭忘了' },
  { id: 'C10', from: 23, to: 24, name: '字幕抢视线，记着去调' },
  { id: 'C11', from: 25, to: 27, name: '两个目标：小目标三万七' },
  { id: 'C12', from: 28, to: 29, name: '月度目标一万个住户 → 猜主人说错了' },
  { id: 'C13', from: 30, to: 31, name: '米一次才买一点点 / 所以别担心' },
  { id: 'C14', from: 32, to: 34, name: '评论区说句话 / 摸鱼 / 先去吃饭' }
];

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
const GAP = 0.06;
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
const ENDCARD = { start: CUES[CUES.length - 1].end + 0.3, end: CUES[CUES.length - 1].end + 3.6 };
const DURATION = ENDCARD.end;
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
const CHAR_MODE = (argOf('--char') || 'ss2').toLowerCase();   // 主角＝Day2 像素骨架（电视里才用 DSH 贴纸）
if (!['dsh', 'day2', 'ss2', 'crisp'].includes(CHAR_MODE)) {
  throw new Error(`--char 只接受 dsh|day2|ss2|crisp，实得 ${CHAR_MODE}`);
}
const SS = Math.max(1, Number(argOf('--ss') || 2));   // ss2 的超采样倍数
const ALPHA_SNAP = CHAR_MODE === 'crisp';
const SUFFIX = CHAR_MODE === 'dsh' ? '_dsh'
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

// 主角色入口：Day2 口径的像素骨架（style='pixel'）
function WGF(ctx, x, y, u, o = {}) {
  if (CHAR_MODE === 'dsh') {
    drawDsh(ctx, x, y, u, o);
    return;
  }
  const opts = safePixelOptions({
    style: 'pixel',
    showActionBadge: false,
    tailScale: 1.0,
    noFinBows: true,
    eyePatch: false,
    vectorMouth: true,      // Day4 起：嘴型走引擎矢量版，不铺肤色方块
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
  ctx.fillText(o.note || '主人：再改', o.stamp ? -w / 2 + 9 : 0, h * 0.28);
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
function chartCard(ctx, x, y, w, h, t, p = 1) {
  paint(ctx, rrPts(x, y, w, h, 14, 1.4), { wash: '#0B1C34', fill: '#07122A', fillOp: 180, ink: '#48C8FF', sw: 1.6 });
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x + 6, y + 6, w - 12, h - 12, 10);
  ctx.clip();
  const x0 = x + 28, x1 = x + w - 28, y0 = y + 26, y1 = y + h - 34;
  for (let i = 0; i <= 4; i++) inkLine(ctx, [[x0, y0 + (y1 - y0) * i / 4], [x1, y0 + (y1 - y0) * i / 4]], 1, 'rgba(90,130,190,0.25)', 'inkfine', 0);
  const pts = [[0.02, 0.06], [0.26, 0.30], [0.52, 0.62], [0.74, 0.72], [0.98, 0.93]];
  const drawn = Math.min(pts.length, 2 + Math.floor(p * (pts.length - 1)));
  ctx.beginPath();
  for (let i = 0; i < drawn; i++) {
    const px = x0 + (x1 - x0) * pts[i][0];
    const py = y0 + (y1 - y0) * pts[i][1];
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = '#F2C14E';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.stroke();
  for (let i = 0; i < drawn; i++) {
    const px = x0 + (x1 - x0) * pts[i][0];
    const py = y0 + (y1 - y0) * pts[i][1];
    paint(ctx, ellPts(px, py, 5, 5, 10), { wash: '#FF6B6B', ink: PAL.ink, sw: 1 });
  }
  ctx.restore();
  ctx.save();
  ctx.font = '900 20px "ZCOOLKuaiLe", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#FDE68A';
  ctx.fillText('播放量', x + 22, y + 10);
  ctx.font = 'bold 14px "NotoSansSC", sans-serif';
  ctx.fillStyle = '#93C5FD';
  ctx.fillText('Day0 7.4万（10-24）', x + 22, y + h - 26);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#FCA5A5';
  ctx.fillText('现在 ≈2000', x + w - 22, y + h - 26);
  ctx.restore();
}

// 目标卡：明确写「播放量 / 粉丝」
function targetCard(ctx, x, y, w, h, o = {}) {
  paint(ctx, rrPts(x, y, w, h, 14, 1.4), { wash: o.wash || '#12294A', fill: '#08182F', fillOp: 170, ink: o.ink || '#F2C14E', sw: 1.8 });
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 26px "ZCOOLKuaiLe", sans-serif';
  ctx.fillStyle = '#FDE68A';
  ctx.fillText(o.title, x + w / 2, y + 34);
  ctx.font = '900 46px "NotoSansSC", sans-serif';
  ctx.fillStyle = o.valueColor || '#FFFFFF';
  ctx.fillText(o.value, x + w / 2, y + h / 2 + 8);
  ctx.font = 'bold 17px "NotoSansSC", sans-serif';
  ctx.fillStyle = '#A5D8FF';
  ctx.fillText(o.unit, x + w / 2, y + h - 34);
  if (o.note) {
    ctx.font = 'bold 14px "NotoSansSC", sans-serif';
    ctx.fillStyle = 'rgba(254,240,138,0.85)';
    ctx.fillText(o.note, x + w / 2, y + h - 12);
  }
  ctx.restore();
}

// 账本卡（留白，等真截图）
function ledgerCard(ctx, x, y, w, h, t) {
  paint(ctx, rrPts(x, y, w, h, 12, 1.2), { wash: '#F6E7C8', fill: '#2A1F12', fillOp: 40, ink: PAL.ink, sw: 1.6 });
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#7F1D1D';
  ctx.font = '900 22px "ZCOOLKuaiLe", sans-serif';
  ctx.fillText('本鲸的账本 · 第 1 张', x + 20, y + 26);
  const rows = [['播放量', '______'], ['新增粉丝', '______'], ['米饭钱', '______']];
  rows.forEach((r, i) => {
    const ry = y + 68 + i * 40;
    ctx.font = 'bold 18px "NotoSansSC", sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText(r[0], x + 24, ry);
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 18px "Silkscreen", "NotoSansSC", monospace';
    ctx.fillText(r[1], x + w * 0.52, ry);
    inkLine(ctx, [[x + 20, ry + 16], [x + w - 20, ry + 16]], 1, 'rgba(51,65,85,0.25)', 'inkfine', 0);
  });
  ctx.font = 'bold 13px "NotoSansSC", sans-serif';
  ctx.fillStyle = '#B91C1C';
  ctx.fillText('明早用真截图填 · 难看也填', x + 24, y + h - 22);
  ctx.restore();
}

// 评论气泡
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
// 5. 分镜
// ---------------------------------------------------------------------------
const NOTES = [];   // 每镜要上的小标签
function bg(ctx, t, o) { room(ctx, t, o); }

function shotC01(ctx, t, lt, p) {
  camBegin(ctx, 640, 470, 1 + 0.05 * ease(p), 0);
  bg(ctx, t);
  // 桌面：空碗 + 四张返工单
  riceBowl(ctx, 470, 500, 1.15, 0, t);
  const slips = [
    { x: 812, y: 448, r: -0.14, txt: 'v1' },
    { x: 878, y: 458, r: 0.08, txt: 'v2' },
    { x: 944, y: 446, r: -0.05, txt: 'v3' },
    { x: 1010, y: 458, r: 0.16, txt: 'v4' }
  ];
  slips.forEach((s, i) => workOrder(ctx, s.x, s.y, 76, 64, s.txt, s.r, { stamp: i === 3 ? 'LEI' : null, note: i === 3 ? '第四版' : '主人：再改' }));
  WGF(ctx, 690, 528, 26, { t, emotion: p < 0.5 ? 'sad' : 'pout', mouth: p < 0.5 ? 'pout' : 'o', dy: -0.02, headTilt: -0.06 });
  // 大字（0 秒就在）
  const k = 1 + 0.06 * Math.sin(t * 8);
  letter(ctx, '米饭被 MV', 640, 168, 78 * k, '#FDE68A', { stroke: '#3B1D0B' });
  letter(ctx, '吃光了', 640, 258, 88 * k, '#FF8FA3', { stroke: '#3B1D0B' });
  camEnd(ctx);
}

// 圆窗里那条小鱼（本鲸的鱼形）：给它一个能游起来的版本
function pixelFish(ctx, x, y, u, t, o = {}) {
  const rot = o.rot ?? Math.sin(t * 3.1) * 0.06;
  const body = o.color || PAL.whaleCyan;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(o.flip ? -1 : 1, 1);
  // 尾鳍
  paint(ctx, [[-u * 1.35, 0], [-u * 2.15, -u * 0.78], [-u * 1.95, 0], [-u * 2.15, u * 0.78]],
    { wash: body, washOp: 240, ink: PAL.ink, sw: 1.2 });
  // 身体
  paint(ctx, ellPts(0, 0, u * 1.42, u * 0.92, 18), { wash: body, fill: PAL.ink, fillOp: 26, ink: PAL.ink, sw: 1.3 });
  // 肚皮
  paint(ctx, ellPts(-u * 0.12, u * 0.3, u * 1.02, u * 0.5, 16), { wash: '#E9F6FF', washOp: 210, ink: null });
  // 眼睛 + 高光
  paint(ctx, ellPts(u * 0.72, -u * 0.14, u * 0.2, u * 0.24, 10), { wash: PAL.ink, ink: null });
  paint(ctx, ellPts(u * 0.78, -u * 0.22, u * 0.07, u * 0.09, 8), { wash: '#FFFFFF', ink: null });
  // 小蝴蝶结（认人用）
  paint(ctx, [[-u * 0.2, -u * 0.86], [-u * 0.62, -u * 1.2], [-u * 0.62, -u * 0.56]], { wash: '#48C8FF', ink: PAL.ink, sw: 1 });
  paint(ctx, [[-u * 0.2, -u * 0.86], [u * 0.22, -u * 1.2], [u * 0.22, -u * 0.56]], { wash: '#48C8FF', ink: PAL.ink, sw: 1 });
  // 背鳍
  paint(ctx, [[-u * 0.1, -u * 0.82], [u * 0.3, -u * 1.28], [u * 0.6, -u * 0.7]], { wash: body, washOp: 235, ink: PAL.ink, sw: 1 });
  ctx.restore();
}

function shotC02(ctx, t, lt, p) {
  // 镜头：先看整间屋子，鱼游进电视后推近屏幕
  const zoom = 1.02 + 0.22 * ease(clamp((p - 0.42) / 0.4));
  camBegin(ctx, 640, 440, zoom, 0);
  bg(ctx, t);
  const TV = { x: 286, y: 292, w: 344, h: 182 };
  // 鱼进电视的时序：先在圆窗里，再从圆窗游出来、越过电视机顶，然后一头扎进屏幕
  const swim = clamp(p / 0.34);
  const dive = clamp((p - 0.34) / 0.18);
  const playing = p > 0.50;
  // 电视：进去之前是雪花，进去之后放画中画 MV
  if (NO_TV) {
    label(ctx, '（--no-tv 对照：本镜不画电视）', 430, 380, { h: 30 });
  } else {
    tvSet(ctx, TV.x, TV.y, TV.w, TV.h, (g, sx, sy, sw, sh, tt) => {
      if (playing) mvPip(g, sx, sy, sw, sh, tt);
      else snowScreen(g, sx, sy, sw, sh, tt);
    }, { tt: t });
  }
  // 本鲸站在电视右边看着
  WGF(ctx, 706, 530, 25, {
    t, emotion: p < 0.45 ? 'curious' : 'proud',
    mouth: p < 0.45 ? 'flat' : 'smile',
    headTilt: p < 0.45 ? 0.12 : -0.03,
    dx: Math.sin(t * 1.8) * 0.05
  });
  // 鱼：从左上圆窗游出来 → 越过电视机顶 → 一头扎进屏幕（贝塞尔弧线，不是直线平移）
  const P0 = { x: 152, y: 232 };                        // 圆窗中心
  const P1 = { x: 690, y: 96 };                         // 控制点：绕到电视机上方
  const P2 = { x: TV.x + TV.w * 0.5, y: TV.y + 14 };    // 屏幕顶边中点
  const P3 = { x: TV.x + TV.w * 0.5, y: TV.y + TV.h * 0.5 };
  if (swim < 1 || dive < 1) {
    const k = ease(swim);
    let fx = (1 - k) * (1 - k) * P0.x + 2 * (1 - k) * k * P1.x + k * k * P2.x;
    let fy = (1 - k) * (1 - k) * P0.y + 2 * (1 - k) * k * P1.y + k * k * P2.y;
    if (dive > 0) {
      fx = lerp(P2.x, P3.x, ease(dive));
      fy = lerp(P2.y, P3.y, ease(dive));
    }
    fy += Math.sin(t * 4.2) * 6;
    const u = lerp(30, 15, ease(swim)) * (1 - dive * 0.9);
    const a = 1 - dive * 0.9;
    ctx.save();
    // 泡泡尾迹（沿运动方向拖）
    for (let i = 1; i <= 5; i++) {
      const q = Math.max(0, k - i * 0.05);
      const bx = (1 - q) * (1 - q) * P0.x + 2 * (1 - q) * q * P1.x + q * q * P2.x;
      const by = (1 - q) * (1 - q) * P0.y + 2 * (1 - q) * q * P1.y + q * q * P2.y;
      ctx.globalAlpha = a * (0.55 - i * 0.09);
      paint(ctx, ellPts(bx, by - i * 2, 4.2 - i * 0.55, 4.2 - i * 0.55, 8), { wash: '#CFEFFF', ink: null });
    }
    ctx.globalAlpha = a;
    // 朝运动方向稍微抬头
    const nx = (1 - k) * (P1.x - P0.x) + k * (P2.x - P1.x);
    const ny = (1 - k) * (P1.y - P0.y) + k * (P2.y - P1.y);
    pixelFish(ctx, fx, fy, u, t, { flip: true, rot: Math.atan2(ny, nx) * 0.35 });
    ctx.restore();
  }
  // 钻进瞬间：屏幕白闪 + 两圈涟漪
  if (dive > 0 && dive < 1) {
    ctx.save();
    ctx.globalAlpha = 0.55 * Math.sin(dive * Math.PI);
    paint(ctx, rrPts(TV.x + 8, TV.y + 6, TV.w - 16, TV.h - 12, 8, 1), { wash: '#FFFFFF', ink: null });
    ctx.globalAlpha = 0.8 * (1 - dive);
    ctx.strokeStyle = '#BFE8FF';
    ctx.lineWidth = 3;
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.ellipse(TV.x + TV.w * 0.5, TV.y + TV.h * 0.5, 20 + ease(dive) * (70 + i * 60), 14 + ease(dive) * (46 + i * 40), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  // 电视名牌
  if (!NO_TV) {
    label(ctx, playing ? '电视里：本鲸做的《朋友的酒》MV' : '电视：本鲸这就进去', 458, 246,
      { h: 24, font: 'bold 14px "NotoSansSC", sans-serif', stroke: '#F2C14E' });
  }
  // 一版一锅米：桌上空碗一个个冒出来（第 4 句）
  const bowlP = clamp((t - C(4)) / Math.max(0.6, CE(4) - C(4)));
  const nBowl = Math.round(lerp(1, 4, ease(bowlP)));
  for (let i = 0; i < nBowl; i++) riceBowl(ctx, 830 + i * 62, 474 - (i % 2) * 4, 0.66, 0, t);
  if (bowlP > 0.05) {
    label(ctx, `一版一锅米 · 第 ${Math.min(4, nBowl)} 锅`, 906, 432,
      { h: 24, font: 'bold 14px "ZCOOLKuaiLe", sans-serif', stroke: '#F2C14E' });
  }
  camEnd(ctx);
}

function shotC03(ctx, t, lt, p) {
  // 累瘫：横移，左边电视里 MV 还在放，本鲸摊在中间尾巴拖地
  camBegin(ctx, 660 + Math.sin(t * 0.8) * 8, 470, 1.12, 0);
  bg(ctx, t);
  // 背景小电视（同一块屏幕，还在放 MV）
  if (!NO_TV) {
    tvSet(ctx, 250, 300, 210, 112, (g, sx, sy, sw, sh, tt) => mvPip(g, sx, sy, sw, sh, tt), { tt: t });
    label(ctx, '电视还在放 · 0.35×', 356, 262, { h: 20, font: 'bold 12px "ZCOOLKuaiLe", sans-serif', stroke: '#93C5FD' });
  }
  // 本鲸：蹲坐、头低、尾巴垂地
  WGF(ctx, 760, 536, 30, {
    t, emotion: 'sleepy', mouth: 'flat',
    headTilt: 0.2 + Math.sin(t * 1.1) * 0.02,
    dx: Math.sin(t * 1.2) * 0.04, dy: 0.15
  });
  // 地上四个空碗（四版 = 四锅米）
  for (let i = 0; i < 4; i++) riceBowl(ctx, 470 + i * 66, 646 + (i % 2) * 10, 0.8, 0, t);
  label(ctx, '尾巴抬不动了', 760, 574, { h: 26, font: 'bold 15px "ZCOOLKuaiLe", sans-serif', stroke: '#93C5FD' });
  camEnd(ctx);
}

function shotC04(ctx, t, lt, p) {
  camBegin(ctx, 620, 450, 1.04, 0);
  bg(ctx, t);
  chartCard(ctx, 150, 218, 480, 250, t, p);
  WGF(ctx, 900, 532, 25, {
    t, emotion: p < 0.7 ? 'sad' : 'pout', mouth: 'flat', headTilt: -0.08
  });
  // 数字：7.4万 → 2000（口播只说「两千」）
  const q = clamp((t - C(9)) / Math.max(0.001, CE(9) - C(9)));   // L09「现在两千哦」
  if (q > 0.05) {
    ctx.save();
    ctx.globalAlpha = clamp(q * 2);
    label(ctx, '现在 ≈2000 播放', 390, 500, { h: 34, font: '900 22px "ZCOOLKuaiLe", sans-serif', stroke: '#FF6B6B' });
    ctx.restore();
  }
  label(ctx, '一只手就数完啦', 900, 560, { h: 26, font: 'bold 15px "ZCOOLKuaiLe", sans-serif', stroke: '#93C5FD' });
  camEnd(ctx);
}

function shotC05(ctx, t, lt, p) {
  camBegin(ctx, 640, 460, 1.06, 0);
  bg(ctx, t);
  commentBubble(ctx, 340, 236, '弹幕', 'MV 呢？', clamp(p * 3));
  commentBubble(ctx, 320, 330, '弹幕', 'MV 呢？', clamp(p * 3 - 0.3));
  WGF(ctx, 830, 530, 26, { t, emotion: 'nervous', mouth: 'waveO', headTilt: 0.14, dx: Math.sin(t * 2.4) * 0.06 });
  label(ctx, '牵一牵，别急呀', 830, 566, { h: 26, font: 'bold 15px "ZCOOLKuaiLe", sans-serif', stroke: '#F2C14E' });
  camEnd(ctx);
}

function shotC06(ctx, t, lt, p) {
  camBegin(ctx, 640, 460, 1.03, 0);
  bg(ctx, t);
  // 主人的手（剪影）拖走 MV 文件
  const q = clamp(p * 1.6);
  const fx = lerp(300, 640, ease(q));
  // 剪影手（主人）：从左边伸进来拎着文件
  ctx.save();
  ctx.translate(-30, -54);                  // 抬到主角头顶以上
  ctx.globalAlpha = clamp(1 - q * 2.2);     // 手送进来就撤，别留黑块
  paint(ctx, [[fx - 210, 214], [fx - 96, 214], [fx - 88, 250], [fx - 120, 264], [fx - 158, 258], [fx - 206, 250]],
    { wash: '#0F172A', washOp: 235, ink: null });
  paint(ctx, [[fx - 96, 226], [fx - 62, 232], [fx - 58, 250], [fx - 92, 252]], { wash: '#0F172A', washOp: 235, ink: null });
  ctx.restore();
  paint(ctx, rrPts(fx - 100, 238, 180, 104, 8, 1.2), { wash: '#F8FAFC', fill: '#0B1526', fillOp: 40, ink: PAL.ink, sw: 1.4 });
  ctx.save();
  ctx.font = '900 22px "ZCOOLKuaiLe", sans-serif';
  ctx.fillStyle = '#1D4ED8';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('朋友的酒', fx - 84, 264);
  ctx.font = 'bold 13px "NotoSansSC", sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText('MV v4.mp4', fx - 84, 292);
  ctx.fillStyle = '#16A34A';
  ctx.font = 'bold 15px "NotoSansSC", sans-serif';
  ctx.fillText('已发送 →', fx - 84, 318);
  ctx.restore();
  ctx.restore();
  // 本鲸站在原地
  WGF(ctx, 600, 532, 24, { t, emotion: 'confused', mouth: 'flat', headTilt: 0.1 });
  // 大小姐签收（客人只出现在这一镜）
  const arrive = clamp((p - 0.35) / 0.4);
  if (arrive > 0.02) {
    ctx.save();
    ctx.globalAlpha = arrive;
    glow(ctx, 1006, 448, 132, '#F2C14E', 0.32);
    drawClaude(ctx, 1006, 536, 228, t, arrive);
    label(ctx, 'Claude 大小姐（客串）· Q 版', 1006, 250, { h: 26, font: 'bold 14px "NotoSansSC", sans-serif', stroke: '#F2C14E' });
    ctx.restore();
  }
  camEnd(ctx);
}

function shotC07(ctx, t, lt, p) {
  camBegin(ctx, 700, 470, 1.24, 0);
  bg(ctx, t);
  WGF(ctx, 700, 534, 32, {
    t, emotion: 'pout', mouth: p < 0.5 ? 'o' : 'smile',
    headTilt: Math.sin(t * 3) * 0.05
  });
  // 「换本鲸？」小牌被当场划掉——不再画假的手臂
  const q = clamp(p * 1.4);
  ctx.save();
  ctx.globalAlpha = 0.35 + 0.65 * q;
  ctx.translate(432, 452);
  ctx.rotate(-0.07);
  paint(ctx, rrPts(-86, -40, 172, 80, 8, 1), { wash: '#F8FAFC', fill: '#0B1526', fillOp: 40, ink: PAL.ink, sw: 1.5 });
  ctx.font = '900 26px "ZCOOLKuaiLe", sans-serif';
  ctx.fillStyle = '#0F172A';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('换本鲸？', 0, 0);
  ctx.strokeStyle = '#DC2626';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-58, -26);
  ctx.lineTo(58, 26);
  ctx.moveTo(58, -26);
  ctx.lineTo(-58, 26);
  ctx.stroke();
  ctx.restore();
  camEnd(ctx);
  // 大字画在屏幕空间，避免被镜头推出去裁掉
  if (p > 0.45) label(ctx, '换的是 MV · 不是本鲸', 640, 74, { h: 44, font: '900 28px "ZCOOLKuaiLe", sans-serif', stroke: '#F2C14E' });
}

function shotC08(ctx, t, lt, p) {
  camBegin(ctx, 640, 460, 1.05, 0);
  bg(ctx, t);
  // 两碗饭 + 两个价签（价签不进口播）
  riceBowl(ctx, 470, 506, 1.05, 1, t);
  riceBowl(ctx, 300, 502, 1.0, 1, t);
  label(ctx, '便宜', 300, 424, { h: 30, font: '900 20px "ZCOOLKuaiLe", sans-serif', stroke: '#4ADE80' });
  label(ctx, '但返工不便宜', 500, 424, { h: 30, font: '900 20px "ZCOOLKuaiLe", sans-serif', stroke: '#F87171' });
  WGF(ctx, 900, 534, 25, { t, emotion: p < 0.5 ? 'smug' : 'pout', mouth: p < 0.5 ? 'grin' : 'pout', headTilt: 0.06 });
  camEnd(ctx);
}

function shotC09(ctx, t, lt, p) {
  camBegin(ctx, 640, 470, 1.08, 0);
  bg(ctx, t);
  // 空碗 + 便当盒盖着
  riceBowl(ctx, 470, 508, 1.2, 0, t);
  label(ctx, '晚饭 · 没吃', 470, 424, { h: 26, font: 'bold 15px "ZCOOLKuaiLe", sans-serif', stroke: '#F87171' });
  WGF(ctx, 810, 534, 27, {
    t, emotion: p < 0.45 ? 'cry' : 'pout',
    mouth: p < 0.45 ? 'waveO' : 'pout',
    headTilt: p < 0.45 ? -0.1 : 0.08,
    dx: Math.sin(t * 1.6) * 0.04
  });
  if (p > 0.62) label(ctx, '不哭，就是有点饿', 520, 430, { h: 30, font: '900 20px "ZCOOLKuaiLe", sans-serif', stroke: '#FDE68A' });
  camEnd(ctx);
}

function shotC10(ctx, t, lt, p) {
  camBegin(ctx, 560, 420, 1.10, 0);
  bg(ctx, t);
  // 字幕条故障：字挤在一起 / 抢镜头
  paint(ctx, rrPts(300, 300, 560, 86, 12, 1), { wash: 'rgba(9,22,54,0.92)', ink: '#48C8FF', sw: 1.6 });
  ctx.save();
  ctx.font = 'bold 34px "NotoSansSC", sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('字幕字幕字幕字幕', 330, 344);
  ctx.restore();
  label(ctx, '有人说：字幕抢视线', 560, 250, { h: 30, font: '900 20px "ZCOOLKuaiLe", sans-serif', stroke: '#F2C14E' });
  WGF(ctx, 900, 534, 24, { t, emotion: 'proud', mouth: 'smile', headTilt: -0.05 });
  // 小本本打勾
  ctx.save();
  ctx.translate(1010, 430);
  ctx.rotate(0.1);
  paint(ctx, rrPts(-56, -44, 112, 88, 6, 1), { wash: '#EFE3C8', ink: PAL.ink, sw: 1.2 });
  ctx.strokeStyle = '#16A34A';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-26, 0);
  ctx.lineTo(-6, 20);
  ctx.lineTo(26, -20);
  ctx.stroke();
  ctx.restore();
  camEnd(ctx);
}

function shotC11(ctx, t, lt, p) {
  camBegin(ctx, 640, 450, 1.04, 0);
  bg(ctx, t);
  const pop1 = clamp((t - C(26)) / 0.5);
  const pop2 = clamp((t - C(27)) / 0.45);
  ctx.save();
  ctx.globalAlpha = clamp(pop1 * 2);
  targetCard(ctx, 190, 214, 360, 210, {
    title: '小目标 · 播放量', value: '37,000', unit: '第一条的一半（7.4万÷2）',
    valueColor: '#FDE68A', note: '不是三个亿哦'
  });
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = clamp(pop2 * 2);
  // 右卡：把「不是三个亿」当场划掉（口播 L27）
  ctx.translate(640, 320);
  ctx.rotate(-0.04);
  paint(ctx, rrPts(-150, -96, 300, 192, 16, 1.4), { wash: '#1B2A52', ink: '#F2C14E', sw: 1.6 });
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 18px "NotoSansSC", sans-serif';
  ctx.fillStyle = '#93C5FD';
  ctx.fillText('主人说的是', 0, -52);
  ctx.font = '900 74px "ZCOOLKuaiLe", sans-serif';
  ctx.fillStyle = '#E2E8F0';
  ctx.fillText('3 个亿', 0, 6);
  ctx.strokeStyle = '#DC2626';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-118, -14);
  ctx.lineTo(118, 26);
  ctx.stroke();
  ctx.font = '900 22px "ZCOOLKuaiLe", sans-serif';
  ctx.fillStyle = '#FCA5A5';
  ctx.fillText('不是三个亿哦', 0, 62);
  ctx.restore();
  WGF(ctx, 1010, 562, 21, { t, emotion: 'smug', mouth: 'grin', headTilt: 0.05 });
  camEnd(ctx);
}

function shotC12(ctx, t, lt, p) {
  camBegin(ctx, 640, 450, 1.05, 0);
  bg(ctx, t);
  // L28：月度目标 30 天一万（口播说「住户」，画面上留个问号，不写死是粉丝还是住户）
  ctx.save();
  ctx.globalAlpha = clamp((t - C(28)) / 0.5 * 2);
  targetCard(ctx, 250, 224, 400, 208, {
    title: '月度目标 · 一万', value: '10,000', unit: '30 天 · 新增',
    wash: '#1B2A52', ink: '#4ADE80', valueColor: '#A7F3D0'
  });
  ctx.restore();
  // L29：本鲸猜啊，主人是说错了 —— 问号翻出来
  const q = clamp((t - C(29)) / Math.max(0.4, CE(29) - C(29)));
  if (q > 0.05) {
    ctx.save();
    ctx.globalAlpha = clamp(q * 2.2);
    ctx.translate(742, 226 + Math.sin(t * 4) * 4);
    ctx.rotate(Math.sin(t * 3) * 0.05);
    letter(ctx, '？', 0, 0, 96, '#F2C14E', { stroke: '#3B1D0B' });
    label(ctx, '主人是说错了吧', 742, 318, { h: 32, font: '900 20px "ZCOOLKuaiLe", sans-serif', stroke: '#F2C14E' });
    ctx.restore();
  }
  WGF(ctx, 952, 548, 24, {
    t, emotion: p < 0.55 ? 'thinking' : 'smug',
    mouth: p < 0.55 ? 'flat' : 'grin',
    headTilt: p < 0.55 ? 0.12 : -0.04
  });
  camEnd(ctx);
}

function shotC13(ctx, t, lt, p) {
  camBegin(ctx, 640, 460, 1.05, 0);
  bg(ctx, t);
  // L30：米饭一次才买一点点（一小撮米倒在碗里）+ L31：所以别担心
  const q = clamp((t - C(30)) / Math.max(0.6, CE(30) - C(30)));
  riceBowl(ctx, 430, 508, 1.25, 1, t);
  // 米袋：只倒了可怜的一小撮
  ctx.save();
  ctx.translate(690, 468);
  ctx.rotate(0.12);
  paint(ctx, rrPts(-56, -70, 112, 132, 10, 1.2), { wash: '#E7D9BC', ink: PAL.ink, sw: 1.4 });
  ctx.font = '900 20px "ZCOOLKuaiLe", sans-serif';
  ctx.fillStyle = '#7C2D12';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('米', 0, -18);
  ctx.font = 'bold 11px "NotoSansSC", sans-serif';
  ctx.fillStyle = '#92400E';
  ctx.fillText('一次一点点', 0, 14);
  ctx.restore();
  // 漏下来的几粒米
  for (let i = 0; i < 6; i++) {
    const a = q * 1.2 + i * 0.12;
    if (a > 1) continue;
    ctx.save();
    ctx.globalAlpha = clamp(q * 3);
    paint(ctx, ellPts(640 - i * 12, 500 + ease(a) * 16, 3.2, 2.2, 8), { wash: '#F8FAFC', ink: null });
    ctx.restore();
  }
  label(ctx, '一次才买一点点', 690, 400, { h: 28, font: '900 18px "ZCOOLKuaiLe", sans-serif', stroke: '#F2C14E' });
  if (p > 0.55) label(ctx, '所以别担心', 640, 190, { h: 40, font: '900 26px "ZCOOLKuaiLe", sans-serif', stroke: '#4ADE80' });
  WGF(ctx, 940, 540, 24, {
    t, emotion: p > 0.55 ? 'happy' : 'proud',
    mouth: p > 0.55 ? 'openSmile' : 'smile',
    headTilt: p > 0.55 ? -0.05 : 0.06
  });
  camEnd(ctx);
}

function shotC14(ctx, t, lt, p) {
  camBegin(ctx, 640, 460, 1.04, 0);
  bg(ctx, t);
  WGF(ctx, 660, 536, 28, {
    t, emotion: 'happy', mouth: 'openSmile',
    dx: Math.sin(t * 3) * 0.08,
    jump: Math.max(0, Math.sin(t * 5)) * 6
  });
  // 抱起饭碗
  riceBowl(ctx, 470, 510, 1.0, 1, t);
  // L32 评论区 / L33 摸鱼 / L34 先去吃饭
  if (t < C(33)) label(ctx, '评论区说句话就行', 640, 210, { h: 36, font: '900 24px "ZCOOLKuaiLe", sans-serif', stroke: '#F2C14E' });
  else if (t < C(34)) label(ctx, '鲸鱼绝不摸鱼！', 640, 210, { h: 44, font: '900 28px "ZCOOLKuaiLe", sans-serif', stroke: '#4ADE80' });
  else label(ctx, '先去吃饭', 640, 210, { h: 48, font: '900 30px "ZCOOLKuaiLe", sans-serif', stroke: '#FDE68A' });
  camEnd(ctx);
}

function shotEndCard(ctx, t, lt, p) {
  bg(ctx, t);
  const k = clamp(lt * 2);
  ctx.save();
  ctx.globalAlpha = k;
  // 30 天进度卡
  paint(ctx, rrPts(300, 168, 680, 300, 18, 1.4), { wash: '#0B1C34', fill: '#07122A', fillOp: 190, ink: '#F2C14E', sw: 2 });
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 22px "NotoSansSC", sans-serif';
  ctx.fillStyle = '#93C5FD';
  ctx.fillText('本鲸的 30 天', 640, 214);
  ctx.font = '900 56px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
  ctx.fillStyle = '#FDE68A';
  ctx.fillText('第 4 天 / 30', 640, 274);
  // 粉丝进度条 2180 / 10000
  ctx.font = 'bold 22px "NotoSansSC", sans-serif';
  ctx.fillStyle = '#A7F3D0';
  ctx.textAlign = 'left';
  ctx.fillText('粉丝', 356, 336);
  ctx.textAlign = 'right';
  ctx.font = '900 30px "NotoSansSC", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('2,180 / 10,000', 924, 336);
  const bx = 356, by = 362, bw = 568, bh = 16;
  paint(ctx, rrPts(bx, by, bw, bh, 8, 0.5), { wash: '#16304F', ink: null });
  const fill = clamp((2180 / 10000) * clamp(lt * 1.6));
  paint(ctx, rrPts(bx, by, bw * fill, bh, 8, 0.5), { wash: '#4ADE80', ink: null });
  ctx.textAlign = 'center';
  ctx.font = 'bold 16px "NotoSansSC", sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('明天开第一张账本卡 · 一个数都不藏', 640, 410);
  ctx.font = 'bold 15px "NotoSansSC", sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.fillText('非官方同人 · 本视频含 AI 生成内容', 640, 444);
  ctx.restore();
}

const SHOTS = {
  C01: shotC01, C02: shotC02, C03: shotC03, C04: shotC04, C05: shotC05, C06: shotC06,
  C07: shotC07, C08: shotC08, C09: shotC09, C10: shotC10, C11: shotC11, C12: shotC12,
  C13: shotC13, C14: shotC14
};

// ---------------------------------------------------------------------------
// 6. HUD + 字幕
// ---------------------------------------------------------------------------
const SUB = createDay2Subtitle({
  fontOf: (size, weight) => `${weight || 800} ${size}px "NotoSansSC", sans-serif`,
  measureCtx: createCanvas(16, 16).getContext('2d')
});
const SUB_SEGS = LINES.map((l, i) => SUB.clauses(l, CUES[i].chars, CUES[i].start, CUES[i].end));

function drawSubtitle(ctx, t) {
  let idx = -1;
  for (let i = 0; i < CUES.length; i++) if (t >= CUES[i].start && t < CUES[i].end) idx = i;
  if (idx < 0) return;
  const seg = SUB.segmentAt(SUB_SEGS[idx], t);
  const vis = 1;
  SUB.draw(ctx, {
    lines: SUB.wrap(seg.text),
    speaker: speakerFor({ isClaude: false }),
    vis, W, H
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
  if (idx < 0 && t < ENDCARD.start) {
    // 镜间缝隙：停在上一镜，不黑屏
    idx = CUES.reduce((acc, c, i) => (t >= c.end && i > acc ? i : acc), 0);
  }
  if (idx >= 0 && t < ENDCARD.start) {
    const sh = shotAt(idx + 1);
    const s = C(sh.from), e = CE(sh.to);
    SHOTS[sh.id](ctx, t, t - s, clamp((t - s) / Math.max(0.001, e - s)));
  } else {
    shotEndCard(ctx, t, clamp(t - ENDCARD.start), clamp((t - ENDCARD.start) / (ENDCARD.end - ENDCARD.start)));
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
  const dir = path.resolve(__dirname, 'day4_stills');
  fs.mkdirSync(dir, { recursive: true });
  const canvas = createCanvas(OUT_W, OUT_H);
  const ctx = canvas.getContext('2d');
  const marks = [
    ['c01_50', C(1) + (CE(1) - C(1)) * 0.5],
    ['c02_15', C(2) + (CE(4) - C(2)) * 0.15],
    ['c02_45', C(2) + (CE(4) - C(2)) * 0.45],
    ['c02_70', C(2) + (CE(4) - C(2)) * 0.75],
    ['c03_60', C(5) + (CE(5) - C(5)) * 0.6],
    ['c04_80', C(6) + (CE(10) - C(6)) * 0.8],
    ['c05_60', C(11) + (CE(12) - C(11)) * 0.6],
    ['c06_80', C(13) + (CE(14) - C(13)) * 0.8],
    ['c07_60', C(15) + (CE(16) - C(15)) * 0.6],
    ['c08_60', C(17) + (CE(18) - C(17)) * 0.6],
    ['c09_70', C(19) + (CE(22) - C(19)) * 0.7],
    ['c10_60', C(23) + (CE(24) - C(23)) * 0.6],
    ['c11_90', C(25) + (CE(27) - C(25)) * 0.9],
    ['c12_60', C(28) + (CE(29) - C(28)) * 0.6],
    ['c13_60', C(30) + (CE(31) - C(30)) * 0.6],
    ['c14_60', C(32) + (CE(34) - C(32)) * 0.6],
    ['end', ENDCARD.start + 1.2]
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
    const tvBed = path.join('/tmp', `day4_tv_bed_${Math.round(tvStart * 100)}.wav`);
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
  console.log(`Day4: ${total} 帧 / ${DURATION.toFixed(2)}s / ${OUT_W}×${OUT_H} / ${VOICE_CUES ? '实测 cue' : '4.3 字/秒估算'} / ${SOFT ? '关清晰化' : '像素清晰化'}`);
  const ff = spawn(ffmpeg, [
    '-y', '-f', 'rawvideo', '-vcodec', 'rawvideo', '-pix_fmt', 'rgba',
    '-s', `${OUT_W}x${OUT_H}`, '-r', String(FPS), '-i', '-',
    ...audioArgs,
    '-c:v', 'libx264', '-preset', 'medium', '-tune', 'animation',
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

await loadDsh();
await loadMvFrames();
await loadClaude();
console.log(`角色：像素骨架 · Day2 清理口径 · 画法=${CHAR_MODE}${CHAR_MODE === 'ss2' ? `（${SS}× 超采样）` : ''}；字幕：Day2 加更版；时长 ${DURATION.toFixed(2)}s`);

const timesArg = argOf('--times');
if (timesArg) {
  const dir = path.resolve(__dirname, 'day4_stills');
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
  await renderVideo(i >= 0 ? ARGV[i + 1] : 'day4_sample.mp4');
}
