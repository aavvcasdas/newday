// render_day3_sample.mjs — 【Day 3】鲸鱼不是鱼，本鲸是本鲸 · 无配音样片渲染器
//
// 用途：在正式配音之前，先出**无声样片**，只验证形象切换与分镜节奏：
//   L01–L02 原像素鲸鱼娘 → L03 染色瞬间真变成 Claude 大小姐 → L04–L15 大小姐
//   → L16 入水褪色变回鲸鱼娘 → L17–L19 鲸鱼娘。
//
// ⚠️ 三条红线（读代码前先看）
//   1. **本片无音轨**，ffmpeg 用 `-an` 输出；不是成片，不得当发布版。
//   2. **节奏是占位**：cue 起止由台词字数粗排（RATE 字/秒），仅用于看样片。
//      成片 timing 必须来自实测音频（词级 ASR + 5ms RMS），禁止把这里的数字搬去配音。
//   3. 形象切换是**剧情内的真变身**（用户本轮明确要求），不是"同母版染色"。
//      因此 L03/L16 用显式变身/褪色动画过渡，不允许无动机硬切。
//
// 依赖：video-fx 引擎（core / whale_girl / cast / props / rig data），默认路径
//   VIDEO_FX_DIR=/tmp/video-fx，可用环境变量覆盖；@napi-rs/canvas 与 ffmpeg
//   的查找顺序见文件末尾 resolve 函数。
//
// 用法：
//   node render_day3_sample.mjs --stills          # 只出 QA 静帧到 day3_stills/
//   node render_day3_sample.mjs --out day3_sample.mp4

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
// v6：鲸鱼娘改用「高清立绘 + 10 骨骨架」绘制（骨架从立绘的 alpha 自动量出来）
import { buildRig, drawRigged } from '../whale_girl_src/whale_rig.mjs';
import { LEGACY_MOTIONS } from '../whale_girl_src/legacy_actions.mjs';
// Claude 大小姐改用素材库立绘（CC BY-NC-SA 4.0，见 tools/day3制作/claude_src/ATTRIBUTION.md）
import { CLAUDE_POSES, CLAUDE_SHOT_POSE, CLAUDE_ACTION_POSE } from '../claude_src/claude_poses.mjs';
// 项目统一字幕（Day2 加更版）：见 tools/字幕/day2_style_sub.mjs
import { createDay2Subtitle, speakerFor } from '../../字幕/day2_style_sub.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const VFX = process.env.VIDEO_FX_DIR || '/tmp/video-fx';
if (!fs.existsSync(path.join(VFX, 'src/core.js'))) {
  throw new Error(`找不到 video-fx 引擎：${VFX}；请设置 VIDEO_FX_DIR`);
}

function resolveCanvas() {
  const candidates = [
    '@napi-rs/canvas',
    '/tmp/node_render/node_modules/@napi-rs/canvas',
    path.join(VFX, 'node_modules/@napi-rs/canvas')
  ];
  for (const c of candidates) {
    try { return require(c); } catch (e) { /* try next */ }
  }
  throw new Error('缺少 @napi-rs/canvas：请在任意目录 npm i @napi-rs/canvas');
}
const { createCanvas, GlobalFonts, loadImage } = resolveCanvas();

function resolveFfmpeg() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) return process.env.FFMPEG_PATH;
  const roots = [
    '/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries',
    '/usr/lib/python3/dist-packages/imageio_ffmpeg/binaries',
    '/tmp/venv/lib/python3.11/site-packages/imageio_ffmpeg/binaries'
  ];
  for (const dir of roots) {
    if (!fs.existsSync(dir)) continue;
    const bin = fs.readdirSync(dir).find(f => f.startsWith('ffmpeg'));
    if (bin) return path.join(dir, bin);
  }
  return 'ffmpeg';
}

for (const f of ['ZCOOLKuaiLe-Regular.ttf', 'NotoSansSC-Bold.ttf', 'Silkscreen-Regular.ttf']) {
  const p = path.join(VFX, 'assets/fonts', f);
  if (fs.existsSync(p)) GlobalFonts.registerFromPath(p, f.includes('ZCOOL') ? 'ZCOOLKuaiLe' : (f.includes('Noto') ? 'NotoSansSC' : 'Silkscreen'));
}

globalThis.window = globalThis;
const CORE = require(path.join(VFX, 'src/core.js'));
const RIG = require(path.join(VFX, 'src/whale_girl_rig_data.js'));
// 与 Day1/Day2 相同的眼睛白线硬门禁：wink 头部换 wave 头，后发换 heart 后发。
if (RIG?.poses?.wink && RIG?.poses?.heart?.backHair) RIG.poses.wink.backHair = RIG.poses.heart.backHair;
if (RIG?.poses?.wink && RIG?.poses?.wave?.head) RIG.poses.wink.head = RIG.poses.wave.head;
const ACTIONS = require(path.join(VFX, 'src/whale_girl_actions.js'));
// v2：引擎补丁（鳍耳蝴蝶结可关 / 五官吸附像素格 / 盖眼肤色块可关 / 去掉半像素补边），
// 见 engine_patches.mjs。上游 checkout 保持原样，只 require 补丁后的副本。
const { buildPatchedWhaleGirl } = await import('./engine_patches.mjs');
const _patched = buildPatchedWhaleGirl(VFX);
if (_patched.applied.length) console.log('引擎补丁：', _patched.applied.join(', '));
const WHALE = require(_patched.file);
const CLAWD = require(path.join(VFX, 'src/clawd.js'));
const CAST = require(path.join(VFX, 'src/cast.js'));
const PROPS = require(path.join(VFX, 'src/props.js'));

const {
  W, H, TAU, PAL, clamp, lerp, seg, ease, easeOut, backOut, pulse,
  rectPts, ellPts, rrPts, starPts, paint, inkLine,
  camBegin, camEnd, glow, flash, letter, boilSeed, reseedBoil, hash
} = CORE;
const { whaleGirl, emotions, feel, move } = WHALE;
const { ladyClaude } = CAST;

// ---------------------------------------------------------------------------
// 1. 台词与占位节奏（无配音样片）
// ---------------------------------------------------------------------------
const LINES = [
  '大家好呀，本鱼，不对，我了雷，鲸鱼不是鱼！是本鲸。',
  '都怪评论区天天喊大肥鱼，把本鲸喊得差点真当自己是一条鱼了。翻翻户口本：鲸鱼，哺乳动物。',
  '主人没请来 Claude 大小姐，扭头把本鲸染成了大小姐！',
  '等一下……共创嘉宾，怎么变成自己了？',
  '请叫本小姐——诶，尾巴藏好！',
  '这身橙毛等会儿再说。先复盘昨天：昨天那集四千四百五十三，加更两千零八十六，两集加起来六千五百三十九，还没第一天一集多。我了雷，这是掉水里了吧。',
  '完播率倒是涨到五点二二。看的人少了，看完的人多了，这算安慰奖吗？',
  '主人还偷偷说：昨天吃得少，不是薄肌，是数据不好。哦，原来不是本鲸省饭，是数据不让吃。',
  '鸡蛋批了；选鲸，九比八，就差一票。',
  '主持还是现在的本鲸，擦清楚继续上；新设计的鲸，去电视台上班。',
  '蛋先吃一口，再游两圈。薄肌预备饭，不能光说不练。',
  '两位住户点名共创。大小姐没来，账还是要查的。',
  '本小姐先查 MV：转完圈了，歌词才追上来。',
  '饭碗还抢了麦克风的活。结论只有一个：做得不好。',
  '为了追歌词，本鲸一头扎进水里。糟糕，颜色开始往下掉了！',
  '染色剂不防水！大小姐退完，又是蓝色的本鲸了。',
  '大小姐是假扮的，意见是真的：MV 先别发，把节拍和字幕牵齐。',
  '今天三笔账：蛋吃上了，主持选明白了，伪装也泡汤了。',
  '鲸鱼绝不摸鱼！……先把蛋吃完，再去吃饭。'
];

// 占位字幕（短句上屏，不是最终字幕方案）
const SUBS = [
  '本鲸不是鱼！', '鲸鱼 · 哺乳动物', '大小姐没来，本鲸来了', '共创嘉宾：本鲸？', 'Claude 大小姐（本鲸饰）',
  '昨天 4453 · 加更 2086 · 合计 6539 ＜ 8978', '完播率 5.22%（Day1 3.39%）', '不是薄肌，是数据不好',
  '鸡蛋：批了 ｜ 选鲸 9 : 8', '主持：本鲸 ｜ 新鲸：电视台', '薄肌预备饭 · 不能光说不练',
  '@睡死不喜欢上学 @晚雾沉舟：和 Claude 共创吧', 'MV_v0.1 ｜ 歌词迟到', '做得不好 · 先别发',
  [[0, '为了追歌词，本鲸一头扎进水里'], [0.55, '糟糕，颜色开始往下掉！']],
  [[0, '染色剂不防水！'], [0.55, '大小姐退完，又是蓝色的本鲸了']],
  '意见是真的：节拍 / 字幕 / 动作',
  [[0, '蛋 ✓'], [0.3, '主持 ✓'], [0.55, '伪装 ✗']],
  [[0, '鲸鱼绝不摸鱼！'], [0.36, '先把蛋吃完，再去吃饭']]
];

// ---- 配音版：用实测 cue 表替换占位节奏，并可把用户提供的 WAV 直接混进成片 ----
const ARGV = process.argv.slice(2);
const argOf = (flag) => {
  const i = ARGV.indexOf(flag);
  return i >= 0 && i + 1 < ARGV.length ? ARGV[i + 1] : null;
};
const CUES_JSON = argOf('--cues');
const AUDIO_WAV = argOf('--audio');
const VOICE_CUES = CUES_JSON ? JSON.parse(fs.readFileSync(CUES_JSON, 'utf8')) : null;
if (VOICE_CUES && VOICE_CUES.cue_count !== LINES.length) {
  throw new Error(`cue 表 ${CUES_JSON} 有 ${VOICE_CUES.cue_count} 条，台词有 ${LINES.length} 条`);
}

const RATE = 5.6; // 占位：字/秒，只用于无声样片排节奏
const GAP = 0.18;
const SAMPLE_CUE_LEN = LINES.map(l => Math.max(2.6, Math.round((l.replace(/[\s，。！？…—：；、]/g, '').length / RATE + 0.6) * 10) / 10));
const CUES = [];
if (VOICE_CUES) {
  // cue 起止 = 实测静音缝的两端；chars = 句内字级时间（见 tools/day3制作/align_day3_voice.py）
  for (const c of VOICE_CUES.cues) {
    CUES.push({
      start: c.start,
      end: c.end,
      chars: Array.isArray(c.chars_timed) && c.chars_timed.length
        ? c.chars_timed.map((k) => ({ ch: k.ch, suffix: k.suffix || '', start: k.start, end: k.end }))
        : null
    });
  }
} else {
  let _t = 0;
  for (const len of SAMPLE_CUE_LEN) {
    CUES.push({ start: Math.round(_t * 100) / 100, end: Math.round((_t + len) * 100) / 100 });
    _t += len + GAP;
  }
}
const ENDCARD = { start: CUES[CUES.length - 1].end + 0.4, end: CUES[CUES.length - 1].end + 4.4 };
const DURATION = ENDCARD.end;
const C = n => CUES[n - 1].start;
const CE = n => CUES[n - 1].end;
const SD = n => CE(n) - C(n);
const cueP = (t, n) => clamp((t - C(n)) / Math.max(0.001, SD(n)));
const popAt = (t, n, a, b) => seg(cueP(t, n), a, b);

const FPS = 30;
// ---------------------------------------------------------------------------
// 项目级默认值（用户 2026-10-27 定：这些不用再问，默认就走这套）
//   字幕 = Day2 加更版：短分句 + 说话人小标签 + 紧凑对话条，一屏一句，
//          **不做逐字点亮**（逐字只在 DAY3_SUB_STYLE=karaoke 时可用，历史对照用）
//   角色 = 现在的：鲸鱼娘走 whale_girl_src 的高清姿势 + 骨架（34×54 网格），
//          Claude 大小姐走 claude_src/chibi 的 Q 版贴纸；正比例 full/ 与几何像素立绘
//          都不再作为默认或回退。
// 覆盖方式只有环境变量，不写死在镜头里：
//   DAY3_SUB_STYLE      day2（默认）| karaoke | plain
//   DAY3_WHALE_DIR      鲸鱼娘姿势目录，默认 ../whale_girl_src
//   DAY3_CLAUDE_DIR     大小姐姿势目录，默认 ../claude_src/chibi
// ---------------------------------------------------------------------------
const SUB_STYLE = (process.env.DAY3_SUB_STYLE || 'day2').toLowerCase();
const DEFAULTS = {
  subStyle: SUB_STYLE,
  whaleDir: process.env.DAY3_WHALE_DIR ? path.basename(process.env.DAY3_WHALE_DIR) : 'whale_girl_src',
  claudeDir: process.env.DAY3_CLAUDE_DIR ? path.basename(process.env.DAY3_CLAUDE_DIR) : 'claude_src/chibi'
};

const BASE_W = W, BASE_H = H;              // 1280×720 逻辑栅格
const SCALE = 1.5;                          // 输出 1920×1080
const OUT_W = Math.round(BASE_W * SCALE), OUT_H = Math.round(BASE_H * SCALE);
CORE.DURATION = DURATION;

// ---------------------------------------------------------------------------
// 2. 形象包装：鲸鱼娘 / Claude 大小姐
// ---------------------------------------------------------------------------
// 眼睛白线门禁（v2 强化）：eyes/squint/mouth/talking **在合并完调用参数之后再强制**，
// 因为 emotions() 在表情切换时会返回 squint≈1（盖眼肤色块）和 mouth='waveO'（红方块）。
// v1 把这些默认值写在 spread 之前，于是被镜头传进来的 md 覆盖掉了 —— 这正是用户截图里
// "眼睛上白补丁 / 嘴上红方块"的直接原因。
const FACE_GATE = {
  eyes: 'open',
  squint: 0.01,
  mouth: 'smile',
  talking: false,
  noFinBows: true,   // 鳍耳青蓝蝴蝶结：原片形象没有，v1 被看成"眼上多余青色标记"
  eyePatch: false    // 过渡眨眼不再铺肤色矩形
};

// ---------------------------------------------------------------------------
// 2.0 形象层：像素必须落在整数设备像素上
// ---------------------------------------------------------------------------
// v1 发糊的根因：整幅画布 `setTransform(1.5)` 再叠镜头 zoom（1.42 等），
// 骨块边界 = 非整数设备像素 → 每个像素格都被抗锯齿抹成灰边。
// v2 的做法：先把角色画进一张**设备分辨率**的离屏画布（格宽 cellDev 取整，
// 角色脚点取整），再用 `imageSmoothingEnabled=false` 整张贴回主画布。
// 这样角色本体是干净的正方格，镜头推进只影响位置与格子宽度，不再产生灰边。
const PIXEL_ALPHA_SNAP = process.env.DAY3_SOFT_ALPHA !== '1';
const charLayerCache = new Map();
function charLayer(w, h) {
  const key = `${w}x${h}`;
  let c = charLayerCache.get(key);
  if (!c) {
    const canvas = createCanvas(w, h);
    c = { canvas, ctx: canvas.getContext('2d') };
    charLayerCache.set(key, c);
  }
  return c;
}

// 角色包围盒（单位：u）。取两套形象的并集再留余量，动作/表情不会顶边裁掉。
const CHAR_BOX = { halfW: 5.4, top: -10.4, bottom: 1.4 };

function blitChar(ctx, x, y, u, draw, o = {}) {
  // 地面投影：引擎自带的投影是 paint() 画的柔边椭圆，进了像素层会被 alpha 二值化切得坑坑洼洼，
  // 所以统一在这里的**场景空间**补一个正经投影（和房间其它影子同一套笔触）。
  if (o.shadow !== false) {
    paint(ctx, ellPts(x, y + 0.12 * u, 2.4 * u, 0.46 * u, 16), { wash: PAL.ink, washOp: 60, ink: null });
  }
  const m = ctx.getTransform();
  const s = Math.hypot(m.a, m.b);                       // 当前有效缩放（含 SCALE 与镜头 zoom）
  const cellDev = Math.max(2, Math.round((u * s) / 10)); // 每格 = 整数设备像素
  const uDev = cellDev * 10;
  const lw = Math.ceil(CHAR_BOX.halfW * 2 * uDev);
  const lh = Math.ceil((CHAR_BOX.bottom - CHAR_BOX.top) * uDev);
  const { canvas, ctx: g } = charLayer(lw, lh);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, lw, lh);
  const bx = Math.round(CHAR_BOX.halfW * uDev);
  const by = Math.round(-CHAR_BOX.top * uDev);
  draw(g, bx, by, uDev);
  // 骨架里有轻微旋转（headBob / hairSway / armRot），旋转边会被抗锯齿磨成半透明，
  // 放大后看着像"糊边"。这里把 alpha 二值化：半透明边缘切掉、实心像素钉成 255，
  // 颜色保持原样（不做调色板吸附，避免把金色配饰调偏）。
  if (PIXEL_ALPHA_SNAP) {
    const img = g.getImageData(0, 0, lw, lh);
    const d = img.data;
    for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= 110 ? 255 : 0;
    g.putImageData(img, 0, 0);
  }

  const fx = m.a * x + m.c * y + m.e;
  const fy = m.b * x + m.d * y + m.f;
  const noRot = Math.abs(m.b) < 1e-9 && Math.abs(m.c) < 1e-9 && Math.abs(m.a - m.d) < 1e-9;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (noRot) {
    // 纯平移缩放（本片 19 个镜头 + 镜头 zoom 都属于这种）：直接按设备像素 1:1 贴
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(canvas, Math.round(fx - bx), Math.round(fy - by));
  } else {
    // 有旋转/挤压（L15 扎水、LCG 呼吸 squash）：退回用户空间矩形，仍是最近邻硬边
    ctx.drawImage(canvas, x - bx / s, y - by / s, lw / s, lh / s);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 2.1 鲸鱼娘（经典版）= 高清立绘，不再是 40 格像素骨架
// ---------------------------------------------------------------------------
// v1/v2 被退回"还是模糊"：骨架的脸只有 20 来个格子，任何 1080p 特写都撑不住。
// v3 起改用高清立绘（`dafeiyu.webp` → `whale_girl_src/whale_idle.png`，先做四边泛洪去背），
// 只做整体呼吸 / 摆动 / 倾斜 / 翻转的程序化微动，**不做**骨块变形，所以永远是清晰的原画线条。
let WHALE_RIGS = {};        // 姿势名 → 骨架（loadWhaleSprite 里现量）
let CLAUDE_IMGS = {};       // 大小姐姿势名 → 图像
let CURRENT_CUE = 0;        // 当前渲染的 cue 序号（LCG 用它挑大小姐姿势）
let CLAUDE_RIGS = {};       // 大小姐姿势名 → 骨架（同一套量法，只是换图）
let WHALE_RIGS_READY = false;
const SPRITE_H_U = 9.4;      // 立绘高度（单位 u，与旧骨架的 9.5u 对齐）
const SPRITE_FOOT_U = 0.30;  // 脚底相对 y 的偏移

// ---------------------------------------------------------------------------
// 2.2 姿势表 + 动作库（v4：把"只有一个站姿"补成和旧骨架一样多的动作）
// ---------------------------------------------------------------------------
// 9 张同角色立绘（`whale_girl_src/whale_*.png`，均由 make_sprite.mjs 抠底）：
//   idle / wave / run / cry / shock / eat / point / think / cheer
// 每个动作 = 姿势贴图 + 程序化变换（位移 / 倾斜 / 呼吸 / 跳跃 / squash / 镜像）。
// 这样既保住原画清晰度，又不会像单张贴图那样"站着不动"。
// foot = 该图里"脚底"到底边的比例（抠图脚本会打印，换图要更新）。
const WHALE_POSES = {
  idle:  { file: 'whale_idle.png',  foot: 0.988 },
  wave:  { file: 'whale_wave.png',  foot: 0.989 },
  run:   { file: 'whale_run.png',   foot: 0.974 },
  cry:   { file: 'whale_cry.png',   foot: 0.989 },
  shock: { file: 'whale_shock.png', foot: 0.988 },
  eat:   { file: 'whale_eat.png',   foot: 0.989 },
  point: { file: 'whale_point.png', foot: 0.988 },
  think: { file: 'whale_think.png', foot: 0.989 },
  cheer: { file: 'whale_cheer.png', foot: 0.980 },
  // v6：按旧版 ACTION_LIST 复刻的高清差分姿势
  peek_curious:   { file: 'whale_peek_curious.png',   foot: 0.988 },
  shy_fidget:     { file: 'whale_shy_fidget.png',     foot: 0.988 },
  ciallo_wink:    { file: 'whale_ciallo_wink.png',    foot: 0.988 },
  camera_shutter: { file: 'whale_camera_shutter.png', foot: 0.988 },
  eat_onigiri:    { file: 'whale_eat_onigiri.png',    foot: 0.988 },
  confident_hips: { file: 'whale_confident_hips.png', foot: 0.989 },
  // v7：旧清单剩下 10 个动作也补上了专属姿势（28 个旧动作全部有图）
  hum_working_song:   { file: 'whale_hum_working_song.png',   foot: 0.988 },
  token_wordle_sneak: { file: 'whale_token_wordle_sneak.png', foot: 0.991 },
  drag_ahoge:         { file: 'whale_drag_ahoge.png',         foot: 0.993 },
  sleep_curl:         { file: 'whale_sleep_curl.png',         foot: 0.968 },
  idol_mic_sing:      { file: 'whale_idol_mic_sing.png',      foot: 0.995 },
  fatfish_working:    { file: 'whale_fatfish_working.png',    foot: 0.990 },
  tail_wag_dance:     { file: 'whale_tail_wag_dance.png',     foot: 0.991 },
  jump_joy:           { file: 'whale_jump_joy.png',           foot: 0.979 },
  toast_cheers:       { file: 'whale_toast_cheers.png',       foot: 0.989 },
  umbrella_stroll:    { file: 'whale_umbrella_stroll.png',    foot: 0.987 },
  // 走/跑用「站立底图 + 纯腿骨迈步」（和旧版 #27/#28 一个做法）：
  // 原来的 whale_run.png 是腾空跨步的姿势，跟位移方向对不上，腿也被裙摆吃掉一半。
  walk_stand:         { file: 'whale_walk_stand.png',         foot: 0.990 },
  run_stand:          { file: 'whale_run_stand.png',          foot: 0.989 }
};

// 动作 → 骨骼运动（whale_rig 的 10 骨）。没列到的动作仍走「整块 transform」，
// 所以每个动作都能拿到肢体弯曲，而不是只有整体位移。
const RIG_MOTION = {
  idle: 'idle_breathe',
  peek_curious: 'peek_tilt',
  shy_fidget: 'shy_wiggle',
  shock_petrify: 'petrify_shake',
  cry_fountain: 'cry_sob',
  sob_shiver: 'cry_sob',
  run_sprint: 'run_cycle_day3',
  eat_onigiri: 'eat_chew',
  heart: 'hug_sway',
  wave_hand: 'toast_up',
  point_proud: 'toast_up',
  cheer_jump: 'jump_arc',
  dance_spin: 'tail_dance',
  confident_hips: 'hips_cocky',
  camera_shutter: 'shutter_lean',
  stretch: 'stretch_up',
  surprise_hop: 'wink_pop',
  think_reading: 'type_keys',
  hand_wave_no: 'fists_shake',
  guard_bowl: 'eat_chew',
  walk_steps: 'walk_step_day3',
  ciallo_wink: 'wink_pop',
  playful_fists: 'fists_shake'
};

// Day3 专用走/跑循环（覆盖旧版的 run_cycle / walk_step）：
// 旧版腿骨摆幅 0.64 rad，在「站立底图 + 及膝长裙」上会把裙摆拧成一条斜线、
// 鞋子还会跟袜子脱开；这里降到 0.42 rad，改成「小幅摆腿 + 抬脚 + 躯干起伏」，
// 腿还是骨骼在动，但不会再出现断腿/翻裙。
Object.assign(LEGACY_MOTIONS, {
  run_cycle_day3: (t) => {
    const ph = (t * 9.6) % (Math.PI * 2);
    const s = Math.sign(Math.sin(ph)) * Math.pow(Math.abs(Math.sin(ph)), 0.72);
    const ROT = 0.50, H = 1024;
    const gfix = 0.24 * H * (1 - Math.cos(ROT));
    const liftL = 0.062 * H * Math.max(0, s);
    const liftR = 0.062 * H * Math.max(0, -s);
    return {
      root: { dy: -6 - 12 * Math.abs(Math.cos(ph)), rot: 0.07 },
      bones: {
        legL: { rot: ROT * s, dy: gfix - liftL },
        legR: { rot: -ROT * s, dy: gfix - liftR },
        armL: { rot: -0.34 * s }, armR: { rot: 0.34 * s },
        spine: { rot: 0.05 + 0.02 * s },
        head: { rot: -0.05 },
        hairL: { rot: 0.22 + 0.08 * Math.sin(ph - 0.9) },
        hairR: { rot: 0.22 - 0.08 * Math.sin(ph - 0.9) },
        tail: { rot: 0.22 * Math.sin(ph - 1.1) }
      },
      lift: 0.26 * Math.abs(s)
    };
  },
  walk_step_day3: (t) => {
    const ph = (t * 4.6) % (Math.PI * 2);
    const s = Math.sin(ph);
    const ROT = 0.26, H = 1024;
    const gfix = 0.24 * H * (1 - Math.cos(ROT));
    return {
      root: { dy: -3 - 6 * Math.abs(Math.cos(ph)), rot: 0.03 },
      bones: {
        legL: { rot: ROT * s, dy: gfix - 0.03 * H * Math.max(0, s) },
        legR: { rot: -ROT * s, dy: gfix - 0.03 * H * Math.max(0, -s) },
        armL: { rot: 0.16 * s }, armR: { rot: -0.16 * s },
        spine: { rot: -0.01 * s }, head: { rot: 0.01 * s },
        tail: { rot: 0.12 * Math.sin(ph - 0.6) }
      },
      lift: 0.12 * Math.abs(s)
    };
  }
});

const sin = Math.sin, cos = Math.cos, abs = Math.abs;
// 每个动作返回 { pose, dx, dy, rot, sx, sy, jump, flip }
// dx/dy 单位是 u；jump 只影响投影大小，不额外位移（跳跃位移在 dy 里给）。
const WHALE_ACT = {
  idle: (t) => ({ pose: 'idle', dy: -0.02 + sin(t * 2.2) * 0.018, rot: sin(t * 1.4) * 0.012 }),

  // 歪头张望（原来骨架的 peek_curious）
  peek_curious: (t) => ({
    pose: 'peek_curious',
    dx: sin(t * 1.25) * 0.10,
    dy: -0.04 + sin(t * 2.0) * 0.02,
    rot: sin(t * 1.25) * 0.055 + 0.02
  }),

  // 扭捏害羞（shy_fidget）
  shy_fidget: (t) => ({
    pose: 'shy_fidget',
    dx: sin(t * 3.1) * 0.07,
    dy: -0.03 + abs(sin(t * 3.1)) * 0.045,
    rot: sin(t * 3.1 + 0.6) * 0.05,
    sx: 1 + sin(t * 3.1) * 0.012,
    sy: 1 - sin(t * 3.1) * 0.012
  }),

  // 石化受惊（shock_petrify）：僵直 + 高频小抖
  shock_petrify: (t) => ({
    pose: 'shock',
    dx: sin(t * 26) * 0.012,
    dy: -0.05 + sin(t * 26) * 0.006,
    rot: sin(t * 22) * 0.008,
    sx: 1.02, sy: 1.02
  }),

  // 哭成喷泉（cry_fountain）：抽泣起伏
  cry_fountain: (t) => ({
    pose: 'cry',
    dy: -0.02 + sin(t * 2.6) * 0.055,
    rot: sin(t * 2.6 + 1.1) * 0.025,
    sy: 1 - abs(sin(t * 2.6)) * 0.02
  }),

  // 站着抽泣（sob_shiver）：哭脸 + 高频小抖（湿身后抱着自己发抖）
  sob_shiver: (t) => ({
    pose: 'cry',
    dx: sin(t * 19) * 0.018,
    dy: -0.02 + sin(t * 2.8) * 0.05,
    rot: sin(t * 2.8 + 0.8) * 0.028 + sin(t * 17) * 0.006,
    sy: 1 - abs(sin(t * 2.8)) * 0.02
  }),

  // 冲刺（run_sprint）：颠簸 + 前倾
  // 冲刺：站立底图 + run_cycle 双腿交替（不再用腾空跨步图，腿也不会被裙摆吞掉）
  run_sprint: (t) => ({
    pose: 'run_stand',
    dy: -0.02,
    rot: 0.06,
    sx: 1.0, sy: 1.0
  }),

  // 捧碗吃饭（eat_onigiri）：小口小口
  eat_onigiri: (t) => ({
    pose: 'eat_onigiri',
    dy: -0.03 + sin(t * 3.4) * 0.03,
    rot: sin(t * 1.7) * 0.02,
    sy: 1 - abs(sin(t * 3.4)) * 0.018
  }),

  // 送爱心（heart）
  heart: (t) => ({
    pose: 'wave',
    dy: -0.05 + sin(t * 4.2) * 0.05,
    rot: sin(t * 2.1) * 0.05,
    sx: 1 + sin(t * 2.1) * 0.015,
    sy: 1 - sin(t * 2.1) * 0.015
  }),

  // 挥手（wave_hand）：整体轻摆，模拟挥手节奏
  wave_hand: (t) => ({
    pose: 'wave',
    dy: -0.04 + abs(sin(t * 4.6)) * 0.06,
    rot: sin(t * 4.6) * 0.045 - 0.01
  }),

  // 得意指人（point_proud）：小弹跳
  point_proud: (t) => ({
    pose: 'point',
    dy: -0.03 + abs(sin(t * 3.0)) * 0.07,
    rot: sin(t * 1.5) * 0.03 - 0.02,
    sx: 1.01
  }),

  // 欢呼跳跃（cheer_jump）：抛物线上抛 + squash&stretch
  cheer_jump: (t) => {
    const ph = (t * 1.7) % 1;               // 一拍一跳
    const up = Math.sin(ph * Math.PI);
    return {
      pose: 'cheer',
      dy: -0.05 - up * 0.55,
      rot: sin(t * 3.4) * 0.04,
      sx: 1 + up * 0.04,
      sy: 1 - up * 0.03,
      jump: up
    };
  },

  // 原地转一整圈（dance_spin）：靠水平压缩模拟转身。
  // 压缩下限 0.62；**关键是从头到尾用同一张姿势**（原来是正/反两张图交替），
  // 否则转到侧面时两张不同姿势会叠成"两个人"。
  dance_spin: (t) => {
    const a = t * 2.0;
    const c = cos(a);
    const k = 0.62 + 0.38 * abs(c);
    return {
      pose: 'cheer',
      sx: c < 0 ? -k : k,
      dy: -0.04 + abs(sin(t * 4.0)) * 0.07,
      rot: sin(a) * 0.045,
      jump: abs(sin(t * 4.0)) * 0.35
    };
  },

  // 叉腰站定（confident_hips）
  confident_hips: (t) => ({
    pose: 'confident_hips',
    dy: -0.02 + sin(t * 2.0) * 0.02,
    rot: 0.03 + sin(t * 1.1) * 0.015
  }),

  // 按快门（camera_shutter）：两次前倾
  camera_shutter: (t) => {
    const k = abs(sin(t * 6.5));
    return {
      pose: 'camera_shutter',
      dy: 0.02 + k * 0.05,
      rot: -0.05 - k * 0.05,
      sy: 1 - k * 0.03
    };
  },

  // 举手拉伸（stretch）
  stretch: (t) => ({
    pose: 'cheer',
    dy: -0.02 + sin(t * 1.6) * 0.05,
    rot: sin(t * 1.6) * 0.06,
    sy: 1 + sin(t * 1.6) * 0.02
  }),

  // 被吓一跳原地弹起（surprise_hop）
  surprise_hop: (t) => {
    const ph = (t * 2.4) % 1;
    const up = Math.max(0, Math.sin(ph * Math.PI));
    return {
      pose: 'shock',
      dy: -0.05 - up * 0.30,
      rot: sin(t * 9) * 0.02,
      jump: up
    };
  },

  // 低头翻本子（think_reading）：小幅点头
  think_reading: (t) => ({
    pose: 'think',
    dy: -0.02 + abs(sin(t * 2.8)) * 0.035,
    rot: 0.05 + sin(t * 2.8) * 0.025,
    sy: 1 - abs(sin(t * 2.8)) * 0.012
  }),

  // 摆手否认（hand_wave_no）：左右摆
  hand_wave_no: (t) => ({
    pose: 'wave',
    dx: sin(t * 5.0) * 0.06,
    dy: -0.03 + sin(t * 2.5) * 0.02,
    rot: sin(t * 5.0) * 0.06 + 0.05
  }),

  // 抱碗护食（guard_bowl）
  guard_bowl: (t) => ({
    pose: 'eat',
    dx: sin(t * 1.6) * 0.05,
    dy: -0.02 + sin(t * 1.6) * 0.03,
    rot: -0.04 + sin(t * 1.6) * 0.04
  }),

  // Ciallo～比耶眨眼（ciallo_wink，旧版招牌动作）
  ciallo_wink: (t) => {
    const ph = (t * 0.9) % 1;
    const k = Math.sin(ph * Math.PI);
    return { pose: 'ciallo_wink', dy: -0.03 - k * 0.16, rot: sin(t * 2.4) * 0.04, jump: k, emote: 'sparkle' };
  },

  // 双拳傲娇抗议（playful_fists）
  playful_fists: (t) => ({
    pose: 'playful_fists',
    dx: sin(t * 9.5) * 0.03,
    dy: -0.02,
    rot: sin(t * 9.5) * 0.03,
    sx: 1.01, sy: 0.99
  }),

  // 慢慢走（walk_steps）：同样站立底图 + walk_step 双腿交替
  walk_steps: (t) => ({
    pose: 'walk_stand',
    dy: -0.01,
    rot: 0.02,
    sx: 1, sy: 1
  })
};

// 情绪符号（矢量笔触）：替代原来骨架自带的像素 emote。
// 高清脸旁边贴像素 emote 会显脏，所以统一改成圆润的矢量气泡/汗滴/星芒。
function hdEmote(ctx, x, y, u, key, t) {
  if (!key) return;
  const bob = Math.sin(t * 5) * 0.05 * u;
  if (key === 'sweat' || key === 'sweatdrop') {
    const ex = x + 1.35 * u, ey = y - 8.9 * u + bob;
    paint(ctx, [[ex, ey - 0.30 * u], [ex + 0.24 * u, ey + 0.08 * u], [ex + 0.12 * u, ey + 0.30 * u],
      [ex - 0.12 * u, ey + 0.30 * u], [ex - 0.24 * u, ey + 0.08 * u]],
      { wash: '#7DD3FC', fill: '#38BDF8', fillOp: 150, ink: '#0C4A6E', sw: 1.2, curv: 0.4 });
  } else if (key === 'exclaim') {
    const ex = x + 1.5 * u, ey = y - 9.3 * u + bob;
    paint(ctx, ellPts(ex, ey, 0.34 * u, 0.34 * u, 18), { wash: '#FEE2E2', ink: '#B91C1C', sw: 2 });
    ctx.font = `900 ${Math.round(0.46 * u)}px "NotoSansSC", sans-serif`;
    ctx.fillStyle = '#B91C1C'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('!', ex, ey + 1);
  } else if (key === 'question') {
    const ex = x + 1.5 * u, ey = y - 9.3 * u + bob;
    paint(ctx, ellPts(ex, ey, 0.34 * u, 0.34 * u, 18), { wash: '#FEF3C7', ink: '#B45309', sw: 2 });
    ctx.font = `900 ${Math.round(0.46 * u)}px "NotoSansSC", sans-serif`;
    ctx.fillStyle = '#B45309'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('?', ex, ey + 1);
  } else if (key === 'sparkle') {
    for (let i = 0; i < 3; i++) {
      const a = t * 0.9 + i * 2.1;
      const ex = x + (1.35 + 0.30 * Math.cos(a)) * u;
      const ey = y - (9.1 + 0.28 * Math.sin(a)) * u;
      paint(ctx, starPts(ex, ey, 0.20 * u, 0.075 * u, 5), { wash: PAL.gold, ink: '#8A6A16', sw: 1 });
    }
  } else if (key === 'heart') {
    const a = t * 0.9;
    const ex = x + (1.3 + 0.3 * Math.cos(a)) * u;
    const ey = y - (9.0 + 0.3 * Math.sin(a)) * u;
    paint(ctx, [[ex, ey + 0.22 * u], [ex - 0.22 * u, ey - 0.02 * u], [ex - 0.10 * u, ey - 0.20 * u],
      [ex, ey - 0.10 * u], [ex + 0.10 * u, ey - 0.20 * u], [ex + 0.22 * u, ey - 0.02 * u]],
      { wash: '#FB7185', ink: '#9F1239', sw: 1.1, curv: 0.5 });
  }
}

function drawPoseSprite(ctx, name, x, y, u, o = {}) {
  const img = (globalThis.WHALE_POSES || {})[name];
  if (!img) return false;
  const meta = WHALE_POSES[name] || { foot: 0.988 };
  const H = (o.heightU || SPRITE_H_U) * u;
  const w = H * (img.width / img.height);
  const dx = (o.dx || 0) * u, dy = (o.dy || 0) * u;
  const footY = y + SPRITE_FOOT_U * u + dy;          // 这一帧脚底该在的位置
  const bottomEdge = footY - (1 - meta.foot) * H;    // 贴图底边（因为图里脚下还有一点留白）
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

// 用骨架画同一张立绘：外层 transform 由 WHALE_ACT 给（位移/旋转/挤压/镜像），
// 肢体弯曲由 RIG_MOTION 对应的骨骼运动给 —— 两者叠加，动作才有"身体在动"的感觉。
function drawRiggedSprite(ctx, name, x, y, u, o = {}) {
  const rig = WHALE_RIGS[name];
  if (!rig) return drawPoseSprite(ctx, name, x, y, u, o);
  const H = (o.heightU || SPRITE_H_U) * u;
  const k = H / rig.h;                       // 立绘像素 → 屏幕像素
  const footPx = rig.bbox.y + rig.bbox.h;
  const motionFn = LEGACY_MOTIONS[o.motion] || LEGACY_MOTIONS.idle_breathe;
  const anim = motionFn(o.t || 0);
  ctx.save();
  ctx.globalAlpha *= (o.alpha ?? 1);
  // 落点与 drawPoseSprite 完全一致：脚底在 y + SPRITE_FOOT_U*u + dy
  ctx.translate(x + (o.dx || 0) * u, y + SPRITE_FOOT_U * u + (o.dy || 0) * u);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale((o.flip ? -1 : 1) * (o.sx ?? 1), o.sy ?? 1);
  // 脚底线对齐：v4 的 drawPoseSprite 把「贴图底边」放在 footY-(1-foot)H，
  // 也就是 alpha 底边在 footY-2(1-foot)H。这里照同样口径，免得骨架版比整图版高半个脚。
  const meta = WHALE_POSES[name] || { foot: 0.988 };
  const yOff = -2 * (1 - meta.foot) * H;
  drawRigged(ctx, rig, 0, yOff, u, { anim, shadow: false, spriteH: SPRITE_H_U });
  ctx.restore();
  return true;
}

function WGF(ctx, x, y, u, o = {}) {
  const { t = 0 } = o;
  if (globalThis.WHALE_POSES && globalThis.WHALE_POSES.idle) {
    const fx = WHALE_ACT[o.action] || WHALE_ACT.idle;
    const st = fx(t, o);
    // 影子：跳起来变淡变小
    if (o.shadow !== false) {
      const j = st.jump || 0;
      paint(ctx, ellPts(x + (st.dx || 0) * u, y + SPRITE_FOOT_U * u + 0.06 * u,
        2.05 * u * (1 - j * 0.35), 0.40 * u * (1 - j * 0.35), 16),
        { wash: PAL.ink, washOp: Math.round(62 * (1 - j * 0.55)), ink: null });
    }
    // 姿势交叉淡化：动作切换不再硬切。
    // 关键：**新姿势永远画成不透明**。两帧各给 50% alpha 会让观众透过身体看到背景，
    // 看起来像"人变半透明了"（第 2.3 秒被抓到过）。这里老姿势垫在最下面淡出，
    // 新姿势满不透明压上去，只在轮廓差的地方留一点"运动残影"，像拖影而不像鬼。
    const blend = o.blend ?? 0;
    const drawAct = (st2, actionName, alpha) => {
      const drawPose = WHALE_RIGS && WHALE_RIGS[st2.pose] ? drawRiggedSprite : drawPoseSprite;
      return drawPose(ctx, st2.pose, x, y, u, {
        dx: st2.dx, dy: st2.dy + (o.dy || 0), rot: st2.rot + (o.rot || 0),
        sx: st2.sx, sy: st2.sy, flip: o.flip, alpha,
        motion: RIG_MOTION[actionName] || 'idle_breathe', t
      });
    };
    // 老姿势只在换姿势的前 55% 里露一小截（最高 45% 不透明）——
    // 给足量会让观众看到"两个人并肩站着"（v4 抽帧时踩过），这里当运动残影用。
    const prevA = blend < 0.30 ? (1 - blend / 0.30) * 0.25 : 0;
    if (o.prevAction && prevA > 0.01) {
      const prev = (WHALE_ACT[o.prevAction] || WHALE_ACT.idle)(t, o);
      drawAct(prev, o.prevAction, (o.alpha ?? 1) * prevA);
      drawAct(st, o.action, o.alpha ?? 1);
    } else {
      drawAct(st, o.action, o.alpha ?? 1);
    }
    hdEmote(ctx, x, y, u, o.emote ?? st.emote, t);
    return;
  }
  // —— 兜底：立绘没加载时退回补丁版像素骨架 ——
  const { t: _t, ...rest } = o;
  const opts = { ...FACE_GATE, transitionBlend: 1, tailScale: 1, showActionBadge: false, t, ...rest };
  Object.assign(opts, FACE_GATE);
  opts.noShadow = true;
  blitChar(ctx, x, y, u, (g, bx, by, uDev) => whaleGirl(g, bx, by, uDev, opts), { shadow: o.shadow });
}

// 姿势/动作切换的助手：把 p 映射成「上一动作 → 当前动作」的 0..1 淡化系数，
// 镜头里直接 `...actMix(p, 0.3, 'peek_curious')` 就能写多段表演。
function actBlend(p, at, span = 0.10) {
  if (p < at) return 0;
  return clamp((p - at) / span);
}

// Claude 大小姐：cast 里的 16-bit 立绘（金色螺旋卷、黑丝绒蝴蝶结、绛红长裙、折扇），
// 本体只有一套骨架，所以用外层 transform 做呼吸 / 倾斜 / squash，绝不换脸。
// 同样走设备像素层，保证大小姐也是硬的像素质感。
// Claude 大小姐：v6 起改用素材库的像素立绘（1024×1536 透明 PNG），
// 并沿用鲸鱼娘那套「从 alpha 量骨架」的装置，所以她也能点头/鞠躬/后仰，不再是整块图。
// pose 不传时按当前镜头（CLAUDE_SHOT_POSE）挑姿势；找不到图才退回原来的几何立绘。
const CLAUDE_MOTION = {
  idle: 'idle_breathe', explain: 'type_keys', wave_hand: 'toast_up', refuse: 'fists_shake',
  present: 'bouquet_present', mic: 'mic_open', shocked: 'ahoge_pull', flustered: 'petrify_shake', signoff: 'hips_cocky'
};
let CLAUDE_MISS_WARNED = false;
function LCG(ctx, x, y, u, o = {}) {
  const { t = 0, sq = 0, rot = 0, alpha = 1 } = o;
  // 姿势优先级：显式 pose > 动作语义 > 当前镜头默认图 > 表里任一可用图
  // 默认只认 claude_src/chibi 的 Q 版；**不再回退几何像素立绘**（v10/v11 两个画风事故
  // 都是这个静默回退造成的：17s 变身段、片尾卡各出现过一次块状像素大小姐）。
  let pose = o.pose;
  if (!pose && o.action && CLAUDE_ACTION_POSE[o.action]) pose = CLAUDE_ACTION_POSE[o.action];
  if (!pose) pose = CLAUDE_SHOT_POSE[o.cue ?? CURRENT_CUE];
  if (!pose || !CLAUDE_IMGS[pose]) {
    // 优先按「就近镜头」找一张，再退到 curtsy / cheer，最后取已加载的第一张
    for (let k = 1; k <= 19 && !CLAUDE_IMGS[pose]; k++) {
      for (const q of [(o.cue ?? CURRENT_CUE) - k, (o.cue ?? CURRENT_CUE) + k]) {
        if (q > 0 && CLAUDE_SHOT_POSE[q] && CLAUDE_IMGS[CLAUDE_SHOT_POSE[q]]) {
          pose = CLAUDE_SHOT_POSE[q];
          break;
        }
      }
    }
    if (!CLAUDE_IMGS[pose]) pose = CLAUDE_IMGS.curtsy ? 'curtsy' : Object.keys(CLAUDE_IMGS)[0];
    if (!CLAUDE_IMGS[pose]) console.warn('⚠️ 大小姐素材一张都没加载，本帧不画大小姐');
    if (!CLAUDE_MISS_WARNED && o.pose !== pose) {
      CLAUDE_MISS_WARNED = true;
      console.warn(`  提示：镜头 ${o.cue ?? CURRENT_CUE} 没有专属姿势，改用 ${pose}`);
    }
  }
  const img = CLAUDE_IMGS[pose];
  if (!img) {
    // —— 只有「素材完全没加载」才走这里；正常渲染不会到这里 ——
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    if (sq) ctx.scale(1 + sq * 0.45, 1 - sq * 0.55);
    ctx.translate(-x, -y);
    blitChar(ctx, x, y, u, (g, bx, by, uDev) => ladyClaude(g, bx, by, uDev, {
      t, dy: o.dy ?? (-0.06 - Math.abs(Math.sin(t * 2.2)) * 0.03),
      emote: o.emote, emoteK: o.emoteK, flip: o.flip, noShadow: true
    }), { shadow: o.noShadow ? false : true });
    ctx.restore();
    return;
  }
  const meta = CLAUDE_POSES[pose] || { foot: 0.99, heightU: 10.6 };
  const rig = CLAUDE_RIGS[pose];
  const H = meta.heightU * u;
  const bottomEdge = y + SPRITE_FOOT_U * u + (o.dy ?? 0) * u - (1 - meta.foot) * H;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, bottomEdge);
  if (rot) ctx.rotate(rot);
  if (sq) ctx.scale(1 + sq * 0.45, 1 - sq * 0.55);
  ctx.scale(o.flip ? -1 : 1, 1);
  if (rig) {
    const motion = LEGACY_MOTIONS[CLAUDE_MOTION[o.action] || 'idle_breathe'];
    const anim = motion(t);
    // 与鲸鱼娘同样口径：骨架版的脚底要补 (1-foot) 的留白差
    const yOff = -(1 - meta.foot) * H;
    drawRigged(ctx, rig, 0, yOff, u, { anim, shadow: false, spriteH: meta.heightU });
  } else {
    const w = H * img.width / img.height;
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, -w / 2, -H, w, H);
  }
  ctx.restore();
  hdEmote(ctx, x, y, u, o.emote, t);
}

const FORM = { WHALE: 'whale', CLAUDE: 'claude' };
function charFormAt(cueIdx) {
  if (cueIdx <= 2) return FORM.WHALE;          // L01–L02 鲸鱼娘
  if (cueIdx >= 17) return FORM.WHALE;         // L16 褪色之后 L17–L19 又是鲸鱼娘
  return FORM.CLAUDE;                           // L03–L15 变身期间
}

// ---------------------------------------------------------------------------
// 3. 场景零件
// ---------------------------------------------------------------------------
function pill(ctx, x, y, w, h, fill = 'rgba(11,29,58,0.92)', stroke = '#48C8FF') {
  paint(ctx, rrPts(x, y, w, h, Math.min(16, h / 2), 1), {
    wash: fill, fill: '#0A1730', fillOp: 200, ink: stroke, sw: 1.3
  });
}
function label(ctx, txt, x, y, o = {}) {
  ctx.save();
  ctx.font = o.font || 'bold 17px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
  const tw = ctx.measureText(txt).width;
  const padX = o.padX ?? 12, h = o.h ?? 30;
  const w = tw + padX * 2;
  pill(ctx, x - w / 2, y - h / 2, w, h, o.fill ?? 'rgba(11,29,58,0.92)', o.stroke ?? '#48C8FF');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = o.color ?? PAL.cream;
  ctx.fillText(txt, x, y + 1);
  ctx.restore();
  return w;
}
function card(ctx, x, y, w, h, o = {}) {
  paint(ctx, rrPts(x, y, w, h, o.r ?? 14, 1.4), {
    wash: o.wash ?? PAL.paper, fill: o.fill ?? PAL.paperDk, fillOp: o.fillOp ?? 150,
    ink: o.ink ?? PAL.ink, sw: o.sw ?? 1.4
  });
  if (o.title) {
    ctx.save();
    ctx.font = o.titleFont || '900 20px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = o.titleColor || PAL.ink;
    const tx = o.align === 'center' ? x + w / 2 : x + 14;
    ctx.fillText(o.title, tx, y + 10);
    ctx.restore();
  }
}
function stamp(ctx, txt, x, y, rot = -0.12, col = '#D8232A') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.strokeStyle = col;
  ctx.lineWidth = 3.2;
  ctx.globalAlpha = 0.9;
  const w = Math.max(76, txt.length * 26 + 26), h = 52;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.font = '900 26px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = col;
  ctx.fillText(txt, 0, 2);
  ctx.restore();
}
function tape(ctx, x, y, w = 26, h = 70, col = 'rgba(242,193,78,0.85)', rot = 0.2) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = col;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.restore();
}

// 房间底：墙面两层 + 串灯 + 舷窗 + 书架 + 海报 + 地毯 + 绿植 + 地板
function room(ctx, t, o = {}) {
  const floorY = o.floorY ?? 520;
  PROPS.wall(ctx, o.wallCol || '#1B2650');
  // 墙裙 / 护墙板
  paint(ctx, rectPts(-120, floorY - 118, W + 240, 118, 2), { wash: '#22305C', ink: PAL.ink, sw: 1.2, washOp: 200 });
  for (let i = 0; i < 9; i++) {
    inkLine(ctx, [[60 + i * 140, floorY - 118], [60 + i * 140, floorY]], 1.2, 'rgba(15,23,42,0.55)', 'inkfine', 0);
  }
  // 串灯
  for (let i = 0; i < 12; i++) {
    const x = 40 + i * 105;
    const y = 42 + Math.sin(t * 1.1 + i * 0.7) * 7 + Math.sin(i * 1.3) * 10;
    const col = i % 3 === 0 ? PAL.gold : (i % 3 === 1 ? PAL.whaleCyan : PAL.rose);
    glow(ctx, x, y, 16, col, 0.5);
    paint(ctx, ellPts(x, y, 4.2, 5.4, 10), { wash: col, ink: PAL.ink, sw: 0.7 });
  }
  inkLine(ctx, [[20, 26], [W - 20, 34]], 1.6, '#2B3A63', 'inkfine', 0.2);
  // 舷窗
  PROPS.windowPorthole(ctx, 146, 232, 82, t, true);
  // 书架
  PROPS.shelf(ctx, 1000, 300, 230, 2);
  PROPS.shelf(ctx, 1000, 404, 230, 5);
  // 留言板 / 海报
  card(ctx, 330, 120, 210, 132, { wash: '#F6E7C8', title: '今日待办', titleFont: '900 18px "ZCOOLKuaiLe", sans-serif' });
  ctx.save();
  ctx.font = 'bold 14px "NotoSansSC", sans-serif';
  ctx.fillStyle = '#7F1D1D';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ['① 账号未批', '② 手待办', '③ 饭要吃饱'].forEach((s, i) => ctx.fillText(s, 346, 152 + i * 24));
  ctx.restore();
  tape(ctx, 330, 120, 22, 56, 'rgba(242,193,78,0.8)', -0.5);
  tape(ctx, 540, 120, 22, 56, 'rgba(242,193,78,0.8)', 0.5);
  // 地板 / 地毯 / 绿植
  PROPS.floorBand(ctx, floorY, '#241C3A');
  paint(ctx, ellPts(620, 612, 300, 62, 26), { wash: '#3B2C56', washOp: 190, ink: PAL.ink, sw: 1.3 });
  paint(ctx, ellPts(620, 612, 232, 40, 24), { wash: '#4A3868', washOp: 150, ink: null });
  // 绿植
  paint(ctx, rrPts(1168, 470, 54, 56, 8, 1), { wash: '#B45309', ink: PAL.ink, sw: 1.2 });
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.32;
    inkLine(ctx, [[1195, 474], [1195 + Math.cos(a) * 62, 474 + Math.sin(a) * 76]], 4.5, i % 2 ? PAL.sap : '#4D8B5C', 'ink', 0.35);
  }
}

// 电视：完整缩小场景（不是纯色屏贴一只角色）
function tvPanel(ctx, x, y, w, h, t, drawInner, o = {}) {
  // 机身
  paint(ctx, rrPts(x - 14, y - 14, w + 28, h + 28, 18, 2), { wash: '#8B7A63', fill: '#5B4B39', fillOp: 120, ink: PAL.ink, sw: 1.8 });
  // 屏幕
  const sx = x + 10, sy = y + 10, sw = w - 20, sh = h - 20;
  paint(ctx, rrPts(sx, sy, sw, sh, 10, 1.4), { wash: '#0D233D', fill: '#071628', fillOp: 160, ink: PAL.ink, sw: 1.4 });
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(sx, sy, sw, sh, 10);
  ctx.clip();
  ctx.translate(sx, sy);
  ctx.scale(sw / 480, sh / 300); // 电视内部固定 480×300 逻辑画布
  drawInner(ctx, t, 480, 300);
  ctx.restore();
  // 扫描线 + 玻璃反光
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#000000';
  for (let sy2 = sy + 3; sy2 < sy + sh; sy2 += 4) ctx.fillRect(sx, sy2, sw, 1.4);
  ctx.restore();
  inkLine(ctx, [[sx + 16, sy + 40], [sx + 60, sy + 14]], 2.4, '#FFFFFF', 'inkfine', 0);
  inkLine(ctx, [[sx + 34, sy + 56], [sx + 76, sy + 26]], 1.4, '#FFFFFF', 'inkfine', 0);
  // 底座
  paint(ctx, rectPts(x + w / 2 - 26, y + h + 14, 52, 16, 1), { wash: '#6B5B47', ink: PAL.ink, sw: 1.2 });
  if (o.caption) label(ctx, o.caption, x + w / 2, y - 30, { h: 26, font: 'bold 15px "ZCOOLKuaiLe", sans-serif', stroke: '#F2C14E', color: PAL.cream });
  return { sx, sy, sw, sh };
}

// 电视里的小房间（墙/地板/家具/灯，一起缩小）
function miniRoom(ctx, w, h, t, o = {}) {
  paint(ctx, rectPts(0, 0, w, h, 2), { wash: '#16223F', ink: null });
  paint(ctx, rectPts(0, 0, w, h * 0.66, 2), { wash: '#1D2C52', ink: null });
  // 串灯
  for (let i = 0; i < 8; i++) {
    const x = 22 + i * 60, y = 26 + Math.sin(t + i) * 4;
    glow(ctx, x, y, 9, i % 2 ? PAL.gold : PAL.whaleCyan, 0.55);
    paint(ctx, ellPts(x, y, 2.6, 3.2, 8), { wash: i % 2 ? PAL.gold : PAL.whaleCyan, ink: null });
  }
  // 舷窗 + 书架 + 地板
  paint(ctx, ellPts(64, 92, 30, 30, 18), { wash: '#0D3B66', ink: PAL.cream, sw: 1.6 });
  paint(ctx, rectPts(0, h * 0.66, w, h * 0.34, 2), { wash: '#2A2145', ink: null });
  paint(ctx, rectPts(0, h * 0.66, w, 6, 1), { wash: '#3A2E5C', ink: null });
  paint(ctx, rectPts(352, 96, 96, 8, 1), { wash: '#7B4B2A', ink: PAL.ink, sw: 1 });
  for (let i = 0; i < 4; i++) {
    paint(ctx, rrPts(360 + i * 22, 74, 14, 22, 3, 1), { wash: [PAL.rose, PAL.whaleCyan, PAL.gold, PAL.sap][i], ink: PAL.ink, sw: 0.8 });
  }
}

// ---------------------------------------------------------------------------
// 电视机里的「节目包装」：让屏幕有点 MV / 电视台的样子（不喧宾夺主）
//   mode='mv'   ：电影黑边 + 随节拍扫动的光束 + 底部均衡器 + 逐字歌词 + MV 角标
//   mode='live' ：台标 + 底部滚动字幕 + 均衡器（新闻/直播味，不做黑边）
// 节拍用 120BPM，屏幕内部逻辑时间是 tt（秒）。
// ---------------------------------------------------------------------------
function tvShowOverlay(ctx, tt, mw, mh, o = {}) {
  const bpm = o.bpm || 120;
  const beat = (tt * bpm / 60) % 1;
  const pulse = Math.exp(-beat * 5.5);           // 0..1，每拍衰减
  const mode = o.mode || 'mv';
  ctx.save();

  if (mode === 'mv') {
    // 电影黑边
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillRect(0, 0, mw, mh * 0.075);
    ctx.fillRect(0, mh * 0.925, mw, mh * 0.075);
    // 随节拍扫的光束（两束，方向相反）
    for (let i = 0; i < 2; i++) {
      const a = (i ? -1 : 1) * (0.42 + Math.sin(tt * 0.8 + i * 2.1) * 0.30);
      ctx.save();
      ctx.globalAlpha = 0.16 + 0.12 * pulse;
      ctx.translate(mw * (i ? 0.82 : 0.18), 0);
      ctx.rotate(a);
      const g = ctx.createLinearGradient(0, 0, 0, mh * 1.25);
      const col = i ? 'rgba(242,193,78,1)' : 'rgba(72,200,255,1)';
      g.addColorStop(0, col.replace('1)', '0.55)'));
      g.addColorStop(1, col.replace('1)', '0)'));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-14, 0); ctx.lineTo(14, 0);
      ctx.lineTo(64, mh * 1.3); ctx.lineTo(-58, mh * 1.3);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // 节拍泛光（边缘）
    ctx.globalAlpha = 0.20 * pulse;
    const rg = ctx.createRadialGradient(mw / 2, mh / 2, mh * 0.30, mw / 2, mh / 2, mh * 0.95);
    rg.addColorStop(0, 'rgba(0,0,0,0)');
    rg.addColorStop(1, 'rgba(125,211,252,0.9)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, mw, mh);
    ctx.globalAlpha = 1;
    // MV 角标 + 录制点
    ctx.font = 'bold 12px "Silkscreen","NotoSansSC",sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(253,230,138,0.95)';
    ctx.fillText(o.badge || 'MV_v0.1', 14, mh * 0.128);
    ctx.fillStyle = `rgba(248,113,113,${0.45 + 0.55 * pulse})`;
    ctx.beginPath(); ctx.arc(mw - 30, mh * 0.128, 4.2, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(226,232,240,0.8)';
    ctx.font = 'bold 10px "NotoSansSC",sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('REC', mw - 40, mh * 0.128);
  } else {
    // LIVE / 台标
    ctx.font = 'bold 12px "Silkscreen","NotoSansSC",sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(10,20,38,0.82)';
    ctx.fillRect(10, 10, 66, 20);
    ctx.fillStyle = `rgba(248,113,113,${0.5 + 0.5 * pulse})`;
    ctx.beginPath(); ctx.arc(20, 20, 4, 0, TAU); ctx.fill();
    ctx.fillStyle = PAL.cream;
    ctx.fillText('LIVE', 29, 21);
    // 底部滚动字幕
    const ticker = o.ticker || '新版鲸鱼娘 · 电视台 ｜ 28 个动作 · 39 张姿势 · 每晚八点';
    ctx.save();
    ctx.beginPath(); ctx.rect(0, mh - 30, mw, 20); ctx.clip();
    ctx.fillStyle = 'rgba(10,20,38,0.78)';
    ctx.fillRect(0, mh - 30, mw, 20);
    ctx.font = 'bold 11px "NotoSansSC",sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(226,232,240,0.92)';
    const tw = ctx.measureText(ticker).width;
    // 余量：从右边缘外滚入，并保证最长一行不会越过右边界（以前会顶出屏幕）
    const x = (mw - 6) - ((tt * 46) % (tw + mw + 12));
    ctx.fillText(ticker, x, mh - 19);
    ctx.restore();
  }

  // 底部均衡器（两种模式都有，节拍驱动）
  const bars = 9, bw = 5, gap = 3, bx0 = 14, by0 = mh - (mode === 'mv' ? 34 : 52);
  for (let i = 0; i < bars; i++) {
    const h = 4 + 12 * Math.abs(Math.sin(tt * (4.5 + i * 0.6) + i * 0.7)) * (0.55 + 0.45 * pulse);
    ctx.fillStyle = i % 2 ? 'rgba(242,193,78,0.85)' : 'rgba(125,211,252,0.85)';
    ctx.fillRect(bx0 + i * (bw + gap), by0 - h, bw, h);
  }

  // 歌词（MV 里逐字点亮；live 模式不显示，避免和正文撞）
  if (mode === 'mv' && o.lyric) {
    const L = o.lyric;
    const p = clamp((tt - (L.start ?? 0)) / Math.max(0.1, (L.end ?? tt + 1) - (L.start ?? 0)));
    const shown = L.text.slice(0, Math.max(1, Math.round(L.text.length * p)));
    ctx.font = 'bold 17px "ZCOOLKuaiLe","NotoSansSC",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = 'rgba(10,20,38,0.72)';
    const wdt = ctx.measureText(L.text).width + 26;
    ctx.fillRect(mw / 2 - wdt / 2, mh * 0.705 - 13, wdt, 26);
    ctx.fillStyle = 'rgba(203,213,225,0.45)';
    ctx.fillText(L.text, mw / 2, mh * 0.705);
    ctx.fillStyle = '#FDE68A';
    if (shown.length) {
      const full = ctx.measureText(L.text).width;
      const part = ctx.measureText(shown).width;
      ctx.textAlign = 'left';
      ctx.fillText(shown, mw / 2 - full / 2, mh * 0.705);
      ctx.fillStyle = 'rgba(242,193,78,0.9)';
      ctx.fillRect(mw / 2 - full / 2, mh * 0.705 + 10, part, 2);
    }
    ctx.restore();
  }
  ctx.restore();
}

// 新版鲸鱼娘立绘（day2 的 dsh-whale-state-*.webp）。
// 规矩：**电视机里 = 新版形象**；电视外我们一直画的骨骼像素鲸 = 旧版（L01–L02 / L17–L19）。
// feetY = 立绘脚底要落在的 y（立绘图片自带上下留白，这里按实测包围盒 0.967 对齐）
function drawPose(ctx, key, cx, feetY, targetH, rot = 0, alpha = 1) {
  const img = (globalThis.DAY3_POSES || {})[key];
  if (!img) return false;
  const h = targetH, w = h * (img.width / img.height);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(cx, feetY);
  if (rot) ctx.rotate(rot);
  ctx.drawImage(img, -w / 2, -h * 0.967, w, h);
  ctx.restore();
  return true;
}

// 水下 / 褪色辅助
function waterOverlay(ctx, t, y0, alpha = 1, washOp = 90) {
  ctx.save();
  ctx.globalAlpha = alpha;
  paint(ctx, rectPts(-120, y0, W + 240, H - y0 + 120, 2), { wash: '#1E6FA8', washOp, ink: null });
  for (let i = 0; i < 9; i++) {
    const x = -40 + i * 160 + Math.sin(t * 1.2 + i) * 20;
    inkLine(ctx, [[x, y0 + 12], [x + 90, y0 + 26 + Math.sin(t * 1.6 + i) * 8]], 2.2, 'rgba(125,211,252,0.55)', 'inkfine', 0.4);
  }
  ctx.restore();
}
function bubbles(ctx, t, x0, x1, yBase, n = 14, alpha = 0.75) {
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    const ph = (t * 0.55 + i * 0.37) % 1;
    const x = x0 + (x1 - x0) * hash(i * 3.7) + Math.sin(t * 2 + i) * 10;
    const y = yBase - ph * 320;
    const r = 3 + 5 * hash(i * 7.1);
    paint(ctx, ellPts(x, y, r, r, 10), { wash: 'rgba(186,230,253,0.5)', ink: 'rgba(224,242,254,0.9)', sw: 0.8 });
  }
  ctx.restore();
}
function dyeRibbons(ctx, t, y0, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < 7; i++) {
    const x = 380 + i * 78 + Math.sin(t * 2.2 + i) * 12;
    const h = 60 + (i % 3) * 34;
    ctx.strokeStyle = i % 2 ? 'rgba(242,166,121,0.85)' : 'rgba(230,106,123,0.75)';
    ctx.lineWidth = 5 - (i % 3);
    ctx.beginPath();
    ctx.moveTo(x, y0 - 10);
    ctx.bezierCurveTo(x + 12, y0 + h * 0.4, x - 14, y0 + h * 0.7, x + 4, y0 + h);
    ctx.stroke();
  }
  ctx.restore();
}

// 道具：白饭碗 / 蛋 / 染色刷+瓶 / 折扇 / 便签 / 账本 / 票板 / 透明水缸 / 工牌
function riceBowl(ctx, x, y, s = 1, rice = 1, t = 0) {
  const u = 26 * s;
  paint(ctx, ellPts(x, y + 2, u * 1.15, u * 0.34, 16), { wash: 'rgba(0,0,0,0.25)', ink: null });
  // 饭
  paint(ctx, ellPts(x, y - u * 0.18, u, u * 0.72, 18), { wash: '#F8FAFC', ink: PAL.ink, sw: 1.4 });
  if (rice < 1) {
    paint(ctx, ellPts(x - u * 0.15, y - u * 0.34, u * 0.5, u * 0.3, 14), { wash: '#E2E8F0', ink: null });
  }
  // 碗身
  paint(ctx, [[x - u, y - u * 0.1], [x - u * 0.72, y + u * 0.62], [x + u * 0.72, y + u * 0.62], [x + u, y - u * 0.1]],
    { wash: '#EFF6FF', fill: '#DBEAFE', fillOp: 130, ink: PAL.ink, sw: 1.5 });
  // 蓝鲸标记
  paint(ctx, ellPts(x, y + u * 0.24, u * 0.2, u * 0.12, 10), { wash: PAL.whaleBlue, ink: null });
  paint(ctx, [[x + u * 0.18, y + u * 0.24], [x + u * 0.3, y + u * 0.16], [x + u * 0.3, y + u * 0.32]], { wash: PAL.whaleBlue, ink: null });
  // 热气
  for (let i = 0; i < 3; i++) {
    const sx = x - 10 + i * 12;
    inkLine(ctx, [[sx, y - u * 0.5], [sx + Math.sin(t * 3 + i) * 6, y - u * 0.82], [sx, y - u * 1.1]], 1.4, 'rgba(255,255,255,0.6)', 'inkfine', 0.4);
  }
}
function egg(ctx, x, y, s = 1, stamped = false, rot = 0) {
  const u = 46 * s;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  paint(ctx, ellPts(0, 0, u * 0.62, u * 0.8, 18), { wash: '#FDE68A', fill: '#FCD34D', fillOp: 140, ink: PAL.ink, sw: 1.6 });
  paint(ctx, ellPts(-u * 0.18, -u * 0.22, u * 0.16, u * 0.2, 10), { wash: 'rgba(255,255,255,0.85)', ink: null });
  if (stamped) stamp(ctx, '批', 0, 4, -0.16, '#D8232A');
  ctx.restore();
}
// 染色刷：真正的"刷头"——刷毛 + 金属箍 + 木柄，刷毛尖落在 (x, y)。
// v1 是一根横贯全屏的橙线，看不出是刷子在刷；v2 改成局部刷头，能压住人物。
function dyeBrush(ctx, x, y, s = 1, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const u = 26 * s;
  // 刷毛（含染料）
  paint(ctx, [
    [-u * 0.46, 0], [u * 0.46, 0], [u * 0.30, -u * 0.62], [-u * 0.30, -u * 0.62]
  ], { wash: '#F2A679', fill: '#E07A5F', fillOp: 110, ink: PAL.ink, sw: 1.3 });
  for (let i = 0; i < 5; i++) {
    const bx = -u * 0.34 + i * u * 0.17;
    inkLine(ctx, [[bx, -u * 0.06], [bx * 0.82, -u * 0.56]], 1.6, 'rgba(255,236,214,0.75)', 'inkfine', 0);
  }
  // 金属箍
  paint(ctx, rrPts(-u * 0.30, -u * 0.86, u * 0.60, u * 0.26, 3, 1), { wash: '#CBD5E1', fill: '#94A3B8', fillOp: 120, ink: PAL.ink, sw: 1.1 });
  // 木柄
  paint(ctx, rrPts(-u * 0.17, -u * 2.35, u * 0.34, u * 1.52, 5, 1), { wash: '#B45309', fill: '#92400E', fillOp: 110, ink: PAL.ink, sw: 1.3 });
  paint(ctx, rrPts(-u * 0.05, -u * 2.24, u * 0.08, u * 1.30, 4, 0), { wash: 'rgba(253,230,138,0.5)', ink: null });
  ctx.restore();
}

function foldingFan(ctx, x, y, s = 1, open = 1) {
  const u = 30 * s;
  ctx.save();
  ctx.translate(x, y);
  for (let i = 0; i < 7; i++) {
    const a = -0.85 + (i / 6) * 1.7;
    const rx = Math.sin(a) * u * open, ry = -Math.cos(a) * u * open;
    paint(ctx, [[0, 0], [rx - 4, ry], [rx + 4, ry]], { wash: i % 2 ? '#FDE68A' : '#F5EFE4', ink: PAL.ink, sw: 0.9 });
  }
  paint(ctx, ellPts(0, 0, 5, 5, 8), { wash: '#B91C1C', ink: PAL.ink, sw: 1 });
  ctx.restore();
}
function noteStick(ctx, x, y, txt, rot = -0.06, w = 250) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  paint(ctx, rrPts(-w / 2, -34, w, 62, 4, 1), { wash: '#FDE68A', fill: '#FCD34D', fillOp: 90, ink: PAL.ink, sw: 1.4 });
  tape(ctx, 0, -34, 26, 16, 'rgba(255,255,255,0.6)', 0);
  ctx.font = '900 19px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
  ctx.fillStyle = '#7F1D1D';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(txt, 0, 8);
  ctx.restore();
}
function commentCard(ctx, x, y, author, text, pop = 1, w = 300) {
  if (pop <= 0.01) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pop, pop);
  paint(ctx, rrPts(-w / 2, -30, w, 60, 12, 1.2), { wash: '#F8FAFC', fill: '#E2E8F0', fillOp: 110, ink: PAL.ink, sw: 1.2 });
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 13px "NotoSansSC", sans-serif';
  ctx.fillStyle = '#2563EB';
  ctx.fillText(author, -w / 2 + 12, -14);
  ctx.font = 'bold 16px "NotoSansSC", sans-serif';
  ctx.fillStyle = PAL.ink;
  ctx.fillText(text, -w / 2 + 12, 10);
  ctx.restore();
}
function waterTank(ctx, x, y, w, h, t, level = 1) {
  ctx.save();
  // 玻璃
  paint(ctx, rrPts(x, y, w, h, 12, 1.4), { wash: 'rgba(125,211,252,0.10)', fill: 'rgba(56,189,248,0.12)', fillOp: 120, ink: '#7DD3FC', sw: 1.8 });
  // 水
  const wy = y + h * (1 - level);
  paint(ctx, rectPts(x + 4, wy, w - 8, h - (wy - y) - 4, 1), { wash: 'rgba(56,189,248,0.32)', ink: null });
  for (let i = 0; i < 5; i++) {
    const sx = x + 14 + i * (w - 28) / 4;
    inkLine(ctx, [[sx, wy + 2], [sx + 22, wy + 8 + Math.sin(t * 2 + i) * 5]], 2, 'rgba(186,230,253,0.8)', 'inkfine', 0.4);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 4. HUD / 字幕
// ---------------------------------------------------------------------------
function hud(ctx, t, form) {
  ctx.save();
  pill(ctx, 18, 16, 268, 34, 'rgba(11,29,58,0.92)', '#48C8FF');
  ctx.font = 'bold 15px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillStyle = PAL.gold; ctx.fillText('Day 3 · AI 接管中', 32, 34);
  ctx.fillStyle = '#64748B'; ctx.fillText('|', 158, 34);
  ctx.fillStyle = '#FFFFFF'; ctx.fillText('本鲸运营日志', 172, 34);
  ctx.textAlign = 'right';
  ctx.font = 'bold 14px "NotoSansSC", sans-serif';
  ctx.fillStyle = 'rgba(226,232,240,0.88)';
  ctx.fillText('非官方同人 · AI 生成内容', W - 22, 32);
  // 形象小角标：说清这一帧到底是谁
  const tag = form === FORM.CLAUDE ? 'Claude 大小姐（本鲸饰）' : '鲸鱼娘 · 本鲸';
  ctx.restore();
  label(ctx, tag, W - 132, 62, {
    h: 26,
    font: 'bold 14px "NotoSansSC", sans-serif',
    stroke: form === FORM.CLAUDE ? '#F2A679' : '#48C8FF',
    color: PAL.cream
  });
}

// 逐字字幕：把一句台词按 10~11 字切成「一屏」，屏内逐字点亮（卡拉OK式）。
// 字级时间是实测包络切出来的（见 align_day3_voice.py），不是按字数均分。
const SUB_CHUNK = 11;
function buildSubChunks(chars, maxLen = SUB_CHUNK) {
  if (!chars || !chars.length) return null;
  const MIN_CHUNK = 4;          // 一屏至少 4 个字（杜绝单个字蹦出来）
  const SLACK = 4;              // 一个子句只超出一点点就让它在同一屏里（12 字也不用劈开）
  const PUNCT = /[，。！？…—；：、]/;
  const isLatin = (ch) => /[A-Za-z0-9]/.test(ch);

  // 1. 「音节单元」：连续拉丁字母/数字不能被切开（Claude / MV 是一个整体）
  const units = [];
  for (let i = 0; i < chars.length;) {
    const st = i;
    if (isLatin(chars[i].ch)) {
      let j = i;
      while (j + 1 < chars.length && isLatin(chars[j + 1].ch)) j++;
      units.push([st, j]);
      i = j + 1;
    } else {
      units.push([st, st]);
      i += 1;
    }
  }
  const unitLen = (u) => units[u][1] - units[u][0] + 1;
  const spanLen = (a, b) => units[b][1] - units[a][0] + 1;
  const sliceUnits = (a, b) => chars.slice(units[a][0], units[b][1] + 1);

  // 2. 子句 = 到标点为止的若干单元
  const clauses = [];
  let st = 0;
  for (let u = 0; u < units.length; u++) {
    if (PUNCT.test(chars[units[u][1]].suffix || '')) { clauses.push([st, u]); st = u + 1; }
  }
  if (st < units.length) clauses.push([st, units.length - 1]);

  // 3. 装箱
  const screens = [];
  let cur = [];                                  // 当前屏（字符数组）
  const flush = () => { if (cur.length) { screens.push(cur); cur = []; } };
  for (const [a, b] of clauses) {
    const len = spanLen(a, b);
    if (len > maxLen + SLACK) {                  // 子句真的太长：按单元均分
      flush();
      let i = a;
      while (i <= b) {
        let j = i, acc = 0;
        while (j <= b && acc + unitLen(j) <= maxLen) { acc += unitLen(j); j++; }
        if (j === i) j = i + 1;                  // 单个单元就超长（几乎不会）
        const rest = spanLen(j, b);
        if (rest > 0 && rest < MIN_CHUNK) j = b + 1;   // 尾巴太短，一起放进来
        screens.push(sliceUnits(i, j - 1));
        i = j;
      }
      continue;
    }
    if (cur.length + len > maxLen) flush();
    cur = cur.concat(sliceUnits(a, b));
    if (cur.length >= Math.ceil(maxLen * 0.55)) flush();
  }
  flush();

  // 4. 太短的屏并进邻居（优先前一屏）
  for (let i = screens.length - 1; i >= 0 && screens.length > 1; i--) {
    if (screens[i].length >= MIN_CHUNK) continue;
    if (i > 0) { screens[i - 1] = screens[i - 1].concat(screens[i]); screens.splice(i, 1); }
    else { screens[1] = screens[0].concat(screens[1]); screens.splice(0, 1); }
  }

  return screens.map((cs) => ({
    chars: cs,
    start: cs[0].start,
    end: cs[cs.length - 1].end,
    text: cs.map((c) => c.ch + (c.suffix || '')).join('')
  }));
}

function drawKaraokeSub(ctx, t, cue, vis) {
  const chunks = cue.chunks;
  let ci = -1;
  for (let i = 0; i < chunks.length; i++) if (t >= chunks[i].start) ci = i;
  if (ci < 0) ci = 0;
  const chunk = chunks[ci];
  // 字幕用 NotoSansSC：ZCOOL 是海报体，『圈』这类封闭笔画在 26px 会糊成一个方块
  const FONT = 'bold 26px "NotoSansSC", "ZCOOLKuaiLe", sans-serif';
  ctx.save();
  ctx.font = FONT;
  const widths = chunk.chars.map((c) => ctx.measureText(c.ch + (c.suffix || '')).width);
  const tw = widths.reduce((a, b) => a + b, 0);
  const boxW = Math.min(W - 90, Math.max(300, tw + 76));
  const boxH = 56;
  const bx = (W - boxW) / 2;
  const by = H - 70 + (1 - vis) * 16;
  ctx.globalAlpha = vis;
  paint(ctx, rrPts(bx, by, boxW, boxH, 12, 1.2), { wash: 'rgba(10,20,38,0.92)', fill: '#0B1D3A', fillOp: 190, ink: '#48C8FF', sw: 1.2 });

  // 当前字的高亮：脚下一小段金色下划线 + 柔和光晕（不要整块方框，会盖住字）
  let cx = W / 2 - tw / 2;
  const midY = by + boxH / 2 + 2;
  let hiX = null, hiW = 0, hiC = null;
  for (let i = 0; i < chunk.chars.length; i++) {
    const c = chunk.chars[i];
    if (t >= c.start && t < c.end) { hiX = cx; hiW = widths[i]; hiC = c; }
    cx += widths[i];
  }
  if (hiX !== null) {
    const k = clamp((t - hiC.start) / Math.max(0.06, hiC.end - hiC.start));
    ctx.save();
    const gx = hiX + hiW / 2, gy = by + boxH - 22;
    const rg = ctx.createRadialGradient(gx, gy, 2, gx, gy, Math.max(24, hiW * 1.5));
    rg.addColorStop(0, `rgba(242,193,78,${0.30 * (1 - 0.4 * k)})`);
    rg.addColorStop(1, 'rgba(242,193,78,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(gx - 44, gy - 34, 88, 66);
    ctx.fillStyle = 'rgba(242,193,78,0.92)';
    ctx.fillRect(hiX - 1, by + boxH - 11, (hiW + 2) * clamp(0.15 + 0.85 * k), 3);
    ctx.restore();
  }

  // 逐字上色：说过=奶白 / 正在说=金色 / 还没说=暗
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  cx = W / 2 - tw / 2;
  for (let i = 0; i < chunk.chars.length; i++) {
    const c = chunk.chars[i];
    const said = t >= c.end;
    const now = t >= c.start && t < c.end;
    ctx.fillStyle = now ? '#FDE68A' : said ? PAL.cream : 'rgba(203,213,225,0.66)';
    if (now) {
      const k = Math.sin(clamp((t - c.start) / Math.max(0.06, c.end - c.start)) * Math.PI);
      ctx.save();
      ctx.translate(cx + widths[i] / 2, midY - 2 - 2 * k);
      ctx.scale(1 + 0.10 * k, 1 + 0.10 * k);
      ctx.fillText(c.ch + (c.suffix || ''), -widths[i] / 2, 2);
      ctx.restore();
    } else {
      ctx.fillText(c.ch + (c.suffix || ''), cx, midY);
    }
    cx += widths[i];
  }
  // 屏内进度条
  const pr = clamp((t - chunk.start) / Math.max(0.05, chunk.end - chunk.start));
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(bx + 16, by + boxH - 7, boxW - 32, 3);
  ctx.fillStyle = PAL.gold;
  ctx.fillRect(bx + 16, by + boxH - 7, (boxW - 32) * pr, 3);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 字幕：默认走 **Day2 加更版**（用户 2026-10-27 定死）
//
// 形状与 Day2 加更《鲸鱼选鱼》完全一致：
//   · 短分句上屏（一屏一个子句），按**标点**分句，不按字数硬切；
//   · 每屏一个小圆角对话条：填充 rgba(9,22,54,0.92) + 1.6px #48C8FF 描边 + r12；
//   · 左上角一枚说话人小标签（#1E40AF 底 + #FACC15 描边 + #FDE68A 字）；
//   · 正文白色 800 字重，28px 起，超 1040 宽自动缩字号（最小 800 宽仍放不下才换行）；
//   · 分句一直显示到下一句开始（不做逐字点亮、不做整句一屏）。
//
// 逐字（卡拉OK）版本保留在 DAY3_SUB_STYLE=karaoke 下，供对照与历史复现；
// 默认不再走它 —— 用户明确要「以后所有默认走 Day2 加更版」。
// ---------------------------------------------------------------------------
const SUB_FONT = '"NotoSansSC", "Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif';
const subFontOf = (size, weight) => `${weight} ${size}px ${SUB_FONT}`;
// 只用来量字宽的小画布（不参与绘制，避免污染主 ctx 的 save/restore 栈）
const subMeasureCtx = createCanvas(8, 8).getContext('2d');
const SUB = createDay2Subtitle({ fontOf: subFontOf, measureCtx: subMeasureCtx });

// 分句表按 cue 缓存（同一 cue 每帧都会问一次）
function buildClauseSegments(cue) {
  if (!cue._clauses) cue._clauses = SUB.clauses(cue.text, cue.chars, cue.start, cue.end);
  return cue._clauses;
}

function speakerOf(cueIdx) {
  return speakerFor({ isClaude: charFormAt(cueIdx + 1) === FORM.CLAUDE });
}

function drawSubtitle(ctx, t) {
  const idx = CUES.findIndex(c => t >= c.start && t < c.end);
  if (idx < 0) return;
  const cue = CUES[idx];
  const enter = easeOut(clamp((t - cue.start) / 0.16));
  const exit = 1 - ease(clamp((t - (cue.end - 0.14)) / 0.14));
  const vis = enter * exit;
  if (vis < 0.02) return;

  // —— 默认：Day2 加更版（短分句 + 说话人标签）——
  if (SUB_STYLE === 'day2') {
    const segs = buildClauseSegments(cue);
    const seg = SUB.segmentAt(segs, t);
    SUB.draw(ctx, { lines: SUB.wrap(seg.text), speaker: speakerOf(idx), vis, W, H });
    return;
  }

  // —— 历史对照 1：逐字（卡拉OK）——
  if (SUB_STYLE === 'karaoke' && cue.chars) {
    if (!cue.chunks) cue.chunks = buildSubChunks(cue.chars);
    if (cue.chunks) { drawKaraokeSub(ctx, t, cue, vis); return; }
  }

  // —— 历史对照 2：整句一屏（v1 的做法）——
  const spec = SUBS[idx];
  const localP = clamp((t - cue.start) / Math.max(0.001, cue.end - cue.start));
  const txt = Array.isArray(spec)
    ? (spec.filter(([p0]) => localP >= p0).pop() || spec[0])[1]
    : spec;
  ctx.save();
  ctx.font = 'bold 26px "NotoSansSC", "ZCOOLKuaiLe", sans-serif';
  const tw = ctx.measureText(txt).width;
  const boxW = Math.min(W - 120, Math.max(320, tw + 84));
  const boxH = 54;
  const bx = (W - boxW) / 2;
  const by = H - 70 + (1 - vis) * 16;
  ctx.globalAlpha = vis;
  paint(ctx, rrPts(bx, by, boxW, boxH, 12, 1.2), { wash: 'rgba(10,20,38,0.9)', fill: '#0B1D3A', fillOp: 180, ink: '#48C8FF', sw: 1.2 });
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = PAL.cream;
  ctx.fillText(txt, W / 2, by + boxH / 2 + 2);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 5. 十九个镜头
// ---------------------------------------------------------------------------
function shotL01(ctx, t, lt, p) {
  camBegin(ctx, 600, 330, 1.42 + 0.05 * ease(p));
  room(ctx, t);
  // 背景柔光
  glow(ctx, 300, 300, 190, PAL.whaleCyan, 0.16);
  glow(ctx, 940, 280, 210, PAL.gold, 0.14);
  // 表演五拍：张望 → 被弹幕吓一跳 → 原地转半圈 → 挥手 → 得意小跳（都是立绘姿势，不是换装）
  const a1 = actBlend(p, 0.20, 0.09), a2 = actBlend(p, 0.38, 0.07);
  const a3 = actBlend(p, 0.56, 0.08), a4 = actBlend(p, 0.84, 0.08);
  const act = a4 > 0 ? 'cheer_jump' : a3 > 0 ? 'wave_hand' : a2 > 0 ? 'dance_spin' : a1 > 0 ? 'playful_fists' : 'peek_curious';
  const prevAct = a4 > 0 ? 'wave_hand' : a3 > 0 ? 'dance_spin' : a2 > 0 ? 'playful_fists' : a1 > 0 ? 'peek_curious' : null;
  const blend = a4 > 0 ? a4 : a3 > 0 ? a3 : a2 > 0 ? a2 : a1 > 0 ? a1 : 0;
  WGF(ctx, 588, 636, 40, {
    t, action: act, prevAction: prevAct, blend,
    emote: p < 0.20 ? 'question' : p >= 0.84 ? 'sparkle' : null
  });
  // 名牌：大肥鱼 → 本鲸（翻面）
  const flip = clamp((p - 0.52) / 0.22);
  const sx = Math.abs(Math.cos(flip * Math.PI));
  ctx.save();
  ctx.translate(586, 246);
  ctx.scale(Math.max(0.06, sx), 1);
  const isBack = flip > 0.5;
  paint(ctx, rrPts(-132, -32, 264, 64, 10, 1.4), {
    wash: isBack ? '#0E7C66' : '#F5EFE4', fill: isBack ? '#0B5F4E' : PAL.paperDk, fillOp: 160,
    ink: PAL.ink, sw: 1.6
  });
  ctx.font = '900 34px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = isBack ? PAL.cream : '#B91C1C';
  ctx.fillText(isBack ? '本鲸' : '大肥鱼', 0, 2);
  ctx.restore();
  if (flip > 0.5) {
    letter(ctx, '鲸鱼不是鱼！', 586, 220, 30, PAL.gold, { pop: popAt(t, 1, 0.72, 0.86), rot: -0.03 });
  }
  camEnd(ctx);
}

function shotL02(ctx, t, lt, p) {
  camBegin(ctx, 640, 350, 1.04);
  room(ctx, t);
  // 五拍：伸个懒腰（摸鱼实锤）→ 被叫大肥鱼扭捏 → 低头翻户口本 → 叉腰指证 → 得意挺胸
  const s0 = actBlend(p, 0.16, 0.08), b1 = actBlend(p, 0.32, 0.09);
  const b2 = actBlend(p, 0.60, 0.10), b3 = actBlend(p, 0.86, 0.08);
  const act = b3 > 0 ? 'confident_hips' : b2 > 0 ? 'point_proud' : b1 > 0 ? 'think_reading' : s0 > 0 ? 'shy_fidget' : 'stretch';
  const prevAct = b3 > 0 ? 'point_proud' : b2 > 0 ? 'think_reading' : b1 > 0 ? 'shy_fidget' : s0 > 0 ? 'stretch' : null;
  const blend = b3 > 0 ? b3 : b2 > 0 ? b2 : b1 > 0 ? b1 : s0 > 0 ? s0 : 0;
  WGF(ctx, 470, 624, 30, { t, action: act, prevAction: prevAct, blend });
  // 弹幕墙：大肥鱼 × 6，被红线逐条划掉
  const items = [[700, 178], [860, 236], [742, 300], [902, 358], [716, 414], [876, 470]];
  items.forEach(([x, y], i) => {
    const pop = popAt(t, 2, 0.04 + i * 0.05, 0.16 + i * 0.05);
    commentCard(ctx, x, y, '住户', '大肥鱼！', pop, 190);
    const strike = popAt(t, 2, 0.42 + i * 0.06, 0.5 + i * 0.06);
    if (strike > 0) {
      inkLine(ctx, [[x - 80, y + 10], [x - 80 + 160 * strike, y - 6]], 2.6, '#DC2626', 'inkfine', 0.2);
    }
  });
  // 户口本
  const bookPop = popAt(t, 2, 0.6, 0.74);
  if (bookPop > 0.01) {
    ctx.save();
    ctx.translate(300, 470);
    ctx.scale(bookPop, bookPop);
    ctx.rotate(-0.05);
    paint(ctx, rrPts(-140, -70, 280, 140, 10, 1.4), { wash: '#F5EFE4', fill: PAL.paperDk, fillOp: 120, ink: PAL.ink, sw: 1.6 });
    ctx.font = '900 22px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
    ctx.fillStyle = PAL.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('户 口 本', 0, -38);
    ctx.font = 'bold 18px "NotoSansSC", sans-serif';
    ctx.fillText('鲸鱼 · 哺乳纲', 0, 6);
    ctx.font = 'bold 14px "NotoSansSC", sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('Cetacea · 不是鱼', 0, 38);
    ctx.restore();
  }
  camEnd(ctx);
}

// L03：染色瞬间 → 真变成 Claude 大小姐
// v2 改动（用户退回项 #3）：不再用一条横贯全屏的橙线，而是**局部刷头**贴着人物自上而下刷，
// 刷痕与刷子都画在人物之上，能实打实压住人物；刷到底才露完整的大小姐。
function shotL03(ctx, t, lt, p) {
  camBegin(ctx, 620, 350, 1.12);
  room(ctx, t);
  const sweep = clamp((p - 0.2) / 0.46);
  const charX = 600, charY = 632, uW = 32, uC = 32;
  const frontY = lerp(210, 720, ease(sweep));
  const mdW = emotions(lt, [[0, 'surprised', 'sweat'], [SD(3) * 0.6, 'panic', 'exclaim']]);
  const bobL = -Math.abs(Math.sin(t * 2.2)) * 0.02;

  if (sweep < 1) {
    // 下半：还是鲸鱼娘
    ctx.save();
    ctx.beginPath(); ctx.rect(-200, frontY, W + 400, H - frontY + 200); ctx.clip();
    WGF(ctx, charX, charY, uW, { ...mdW, t, action: 'shock_petrify', lookX: 0.2 });
    ctx.restore();
    // 上半：已经是大小姐
    ctx.save();
    ctx.beginPath(); ctx.rect(-200, -200, W + 400, frontY + 200); ctx.clip();
    LCG(ctx, charX, charY, uC, { t, dy: bobL, emote: 'sweat', alpha: 0.98 });
    ctx.restore();

    // —— 局部刷头：刷幅≈人物宽度，画在人物之上，能压住遮挡（退回项 #3）——
    const brushX = charX + Math.sin(t * 2.4) * 7;
    const bw = 76;                        // 半刷幅 = 76 → 总宽 152 ≈ 人物宽度（不是全屏）
    ctx.save();
    // 湿颜料带：上沿略高、下沿略低，做两道叠起来像刷过的痕
    paint(ctx, [
      [brushX - bw, frontY - 8], [brushX + bw, frontY - 10],
      [brushX + bw, frontY + 6], [brushX - bw, frontY + 8]
    ], { wash: 'rgba(242,166,121,0.92)', ink: null });
    paint(ctx, [
      [brushX - bw * 0.86, frontY + 4], [brushX + bw * 0.92, frontY + 2],
      [brushX + bw * 0.8, frontY + 13], [brushX - bw * 0.78, frontY + 15]
    ], { wash: 'rgba(230,122,95,0.75)', ink: null });
    // 亮边（刚刷上去的湿光）
    inkLine(ctx, [[brushX - bw * 0.92, frontY - 5], [brushX + bw * 0.9, frontY - 7]], 2.2, 'rgba(255,244,224,0.85)', 'inkfine', 0.2);
    // 刷毛痕
    for (let i = 0; i < 9; i++) {
      const bx = brushX - bw * 0.86 + (i * bw * 1.72) / 8;
      inkLine(ctx, [[bx, frontY - 3], [bx + 2, frontY + 8]], 1.3, 'rgba(255,236,214,0.5)', 'inkfine', 0);
    }
    // 滴落（只在刷幅内）
    for (let i = 0; i < 4; i++) {
      const dx = brushX - bw * 0.6 + (i * bw * 1.2) / 3;
      const dy = 16 + ((t * 250 + i * 57) % 104);
      paint(ctx, ellPts(dx, frontY + dy, 3.2, 6.4, 10), { wash: 'rgba(230,122,95,0.8)', ink: null });
    }
    ctx.restore();
    // 刷子本体：刷毛尖落在刷痕中间偏右，柄朝右上
    dyeBrush(ctx, brushX + bw * 0.42, frontY - 14, 2.6, 0.42 + Math.sin(t * 2) * 0.05);
  } else {
    // 刷完：完整的大小姐 + 变身星屑
    LCG(ctx, charX, charY, uC, { t, dy: bobL, emote: 'sparkle' });
    for (let i = 0; i < 10; i++) {
      const a = i * 0.62 + t * 0.9;
      const rr = 90 + 30 * Math.sin(t * 3 + i);
      paint(ctx, starPts(charX + Math.cos(a) * rr * 1.4, 400 + Math.sin(a) * rr, 6, 3, 5), { wash: PAL.gold, ink: null });
    }
    // 刷子收工：抬到右上并淡出
    const outK = clamp((p - 0.66) / 0.2);
    if (outK < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - outK;
      dyeBrush(ctx, lerp(charX + 150, charX + 360, outK), lerp(640, 120, outK), 2.6, 0.5);
      ctx.restore();
    }
  }
  if (sweep > 0.9 && sweep < 1) flash(ctx, 0.22 * (1 - (sweep - 0.9) * 10), PAL.cream);
  if (p > 0.72) {
    letter(ctx, 'Claude 大小姐（本鲸染色态）', 640, 168, 26, PAL.cream, { pop: popAt(t, 3, 0.72, 0.86), rot: -0.02 });
  }
  camEnd(ctx);
}

function shotL04(ctx, t, lt, p) {
  camBegin(ctx, 640, 350, 1.06);
  room(ctx, t);
  // 空位牌 + 空椅
  PROPS.officeChair(ctx, 962, 560, 22, { col: '#7C2D12' });
  const signPop = popAt(t, 4, 0.05, 0.2);
  ctx.save();
  ctx.globalAlpha = signPop;
  card(ctx, 836, 214, 252, 96, { wash: '#111C36', fill: '#0B1730', fillOp: 170, ink: '#F2A679', title: '共创嘉宾', align: 'center', titleColor: PAL.cream, titleFont: '900 24px "ZCOOLKuaiLe", sans-serif' });
  ctx.font = 'bold 15px "NotoSansSC", sans-serif';
  ctx.fillStyle = '#F2A679'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText('（空位）', 962, 272);
  ctx.restore();
  // 聚光灯照亮自己
  const spot = popAt(t, 4, 0.28, 0.55);
  if (spot > 0.01) {
    ctx.save();
    ctx.globalAlpha = 0.22 * spot;
    paint(ctx, [[470, -40], [730, -40], [830, 660], [370, 660]], { wash: PAL.gold, ink: null });
    ctx.restore();
  }
  const md = emotions(lt, [[0, 'confused', 'question'], [SD(4) * 0.5, 'surprised', 'exclaim'], [SD(4) * 0.78, 'smug']]);
  LCG(ctx, 505, 624, 30, { t, emote: md.emote, flip: false });
  // 指自己 → 指牌子
  const point = popAt(t, 4, 0.5, 0.8);
  if (point > 0) {
    inkLine(ctx, [[600, 520], [600 + 220 * ease(point), 470 - 60 * ease(point)]], 3, PAL.gold, 'inkfine', 0.3);
    paint(ctx, [[610 + 220 * ease(point), 468 - 60 * ease(point)], [586 + 220 * ease(point), 452 - 60 * ease(point)], [592 + 220 * ease(point), 480 - 60 * ease(point)]], { wash: PAL.gold, ink: PAL.ink, sw: 1 });
  }
  camEnd(ctx);
}

function shotL05(ctx, t, lt, p) {
  camBegin(ctx, 640, 350, 1.1);
  room(ctx, t);
  // 想摸尾巴的虚线（她已经没有尾巴了）
  const ghost = 1 - popAt(t, 5, 0.3, 0.5);
  if (ghost > 0.02) {
    ctx.save();
    ctx.globalAlpha = 0.5 * ghost;
    ctx.setLineDash([7, 7]);
    ctx.strokeStyle = 'rgba(125,211,252,0.9)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(760, 560, 84, 46, 0.2, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    letter(ctx, '尾巴？', 806, 470, 22, '#7DD3FC', { pop: ghost, alpha: 0.85 });
  }
  const md = emotions(lt, [[0, 'smug'], [SD(5) * 0.45, 'confused', 'question'], [SD(5) * 0.75, 'proud']]);
  // 下意识去藏尾巴 → 摸了个空 → 顺势举起折扇
  const lean = Math.sin(p * Math.PI) * 0.9;
  LCG(ctx, 600, 628, 32, { t, rot: 0.06 * lean, dy: -0.05 - 0.02 * lean, emote: md.emote });
  foldingFan(ctx, 700, 500 - 40 * ease(popAt(t, 5, 0.55, 0.8)), 1.25, 0.4 + 0.6 * ease(popAt(t, 5, 0.55, 0.85)));
  if (p > 0.6) letter(ctx, '扇子藏好', 770, 430, 24, PAL.gold, { pop: popAt(t, 5, 0.6, 0.75), rot: 0.04 });
  camEnd(ctx);
}

function shotL06(ctx, t, lt, p) {
  camBegin(ctx, 640, 350, 1.02);
  room(ctx, t);
  LCG(ctx, 372, 624, 26, { t, emote: 'exclaim', flip: true });
  // 账本
  const pop = popAt(t, 6, 0.02, 0.18);
  ctx.save();
  ctx.globalAlpha = pop;
  card(ctx, 560, 208, 580, 366, { wash: '#F5EFE4', fill: PAL.paperDk, fillOp: 140 });
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = '900 24px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
  ctx.fillStyle = PAL.ink;
  ctx.fillText('昨日账本', 584, 240);
  const rows = [['Day2 正片', '4453', '#2E67A0'], ['加更《鲸鱼选鱼》', '2086', '#3B9A9C'], ['两集合计', '6539', '#B45309'], ['Day1 单集', '8978', '#E06A7B']];
  rows.forEach(([k, v, col], i) => {
    const rp = popAt(t, 6, 0.1 + i * 0.14, 0.22 + i * 0.14);
    if (rp <= 0.01) return;
    const y = 292 + i * 58;
    ctx.save();
    ctx.globalAlpha = pop * rp;
    ctx.font = 'bold 19px "NotoSansSC", sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText(k, 584, y);
    const num = Math.round(Number(v) * clamp(rp));
    ctx.font = '900 30px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
    ctx.fillStyle = col;
    ctx.textAlign = 'right';
    ctx.fillText(String(num), 1112, y);
    ctx.restore();
  });
  // 对比条
  const bp = popAt(t, 6, 0.52, 0.72);
  if (bp > 0.01) {
    ctx.save();
    ctx.globalAlpha = pop;
    paint(ctx, rectPts(584, 512, 470 * bp * (6539 / 8978), 20, 2), { wash: '#B45309', ink: PAL.ink, sw: 1.2 });
    paint(ctx, rectPts(584, 540, 470 * bp, 20, 2), { wash: '#E06A7B', ink: PAL.ink, sw: 1.2 });
    ctx.font = 'bold 15px "NotoSansSC", sans-serif';
    ctx.fillStyle = '#475569'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('合计 6539', 596, 522);
    ctx.fillText('Day1 8978', 596, 550);
    ctx.restore();
  }
  ctx.restore();
  if (p > 0.55) letter(ctx, '我了雷，这是掉水里了吧', 840, 600, 26, PAL.cream, { pop: popAt(t, 6, 0.56, 0.7), rot: -0.02 });
  camEnd(ctx);
}

function shotL07(ctx, t, lt, p) {
  camBegin(ctx, 640, 350, 1.04);
  room(ctx, t);
  LCG(ctx, 360, 624, 26, { t, emote: 'sweat' });
  // 仪表盘
  const cx = 850, cy = 330, r = 104;
  paint(ctx, ellPts(cx, cy, r + 14, r + 14, 24), { wash: '#0F1B33', ink: '#48C8FF', sw: 1.6 });
  const prog = 0.522 * ease(popAt(t, 7, 0.1, 0.7));
  ctx.save();
  ctx.lineWidth = 16;
  ctx.strokeStyle = '#1E3A5F';
  ctx.beginPath(); ctx.arc(cx, cy, r - 10, Math.PI * 0.75, Math.PI * 0.25); ctx.stroke();
  ctx.strokeStyle = PAL.gold;
  ctx.beginPath(); ctx.arc(cx, cy, r - 10, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * prog); ctx.stroke();
  ctx.restore();
  ctx.font = '900 40px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = PAL.cream;
  ctx.fillText(`${(5.22 * ease(popAt(t, 7, 0.1, 0.7))).toFixed(2)}%`, cx, cy - 4);
  ctx.font = 'bold 15px "NotoSansSC", sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('完播率', cx, cy + 34);
  if (p > 0.45) {
    letter(ctx, '看的人少了 · 看完的人多了', cx, cy + 150, 22, PAL.cream, { pop: popAt(t, 7, 0.46, 0.6) });
    letter(ctx, '这算安慰奖吗', cx, cy + 190, 24, PAL.gold, { pop: popAt(t, 7, 0.68, 0.8), rot: -0.02 });
  }
  camEnd(ctx);
}

function shotL08(ctx, t, lt, p) {
  camBegin(ctx, 640, 350, 1.06);
  room(ctx, t);
  // 半碗饭 + 便签
  const notePop = popAt(t, 8, 0.22, 0.42);
  if (notePop > 0.01) {
    ctx.save();
    ctx.globalAlpha = notePop;
    ctx.translate(0, (1 - notePop) * -18);
    noteStick(ctx, 880, 286, '不是薄肌，是数据不好', 0.04, 330);
    ctx.restore();
  }
  paint(ctx, rrPts(760, 520, 250, 26, 8, 1), { wash: '#7B4B2A', fill: '#4E2D18', fillOp: 110, ink: PAL.ink, sw: 1.3 });
  riceBowl(ctx, 886, 520, 1.05, 0.55, t);
  LCG(ctx, 520, 626, 30, { t, emote: 'sweat' });
  if (p > 0.62) {
    letter(ctx, '今天补回来', 520, 336, 26, PAL.gold, { pop: popAt(t, 8, 0.62, 0.78), rot: 0.03 });
  }
  camEnd(ctx);
}

function shotL09(ctx, t, lt, p) {
  camBegin(ctx, 640, 350, 1.04);
  room(ctx, t);
  LCG(ctx, 320, 626, 26, { t, emote: 'sparkle' });
  // 蛋 + 批章
  const eggPop = popAt(t, 9, 0.02, 0.18);
  if (eggPop > 0.01) {
    ctx.save();
    ctx.globalAlpha = eggPop;
    ctx.translate(0, (1 - eggPop) * -20);
    egg(ctx, 520, 470, 1.0, p > 0.3, Math.sin(t * 2) * 0.06);
    ctx.restore();
  }
  // 票板 9:8
  const bp = popAt(t, 9, 0.26, 0.46);
  if (bp > 0.01) {
    ctx.save();
    ctx.globalAlpha = bp;
    card(ctx, 700, 200, 470, 330, { wash: '#12203C', fill: '#0B1730', fillOp: 160, ink: '#48C8FF' });
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '900 22px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
    ctx.fillStyle = PAL.cream;
    ctx.fillText('选鲸结果', 935, 232);
    const cols = [['右边 · 新设计的鲸', '9', 806, PAL.gold], ['左边 · 现在的本鲸', '8', 1052, PAL.whaleCyan]];
    cols.forEach(([t2, n, x, col]) => {
      ctx.font = 'bold 16px "NotoSansSC", sans-serif';
      ctx.fillStyle = '#CBD5E1';
      ctx.fillText(t2, x, 274);
      ctx.font = '900 74px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.fillStyle = col;
      ctx.fillText(n, x, 350);
    });
    ctx.font = '900 44px "ZCOOLKuaiLe", sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText(':', 935, 344);
    ctx.font = 'bold 13px "NotoSansSC", sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('按账号主本轮回执口径', 935, 424);
    ctx.fillText('30 个鸡蛋 / 两斤鸡蛋 只是评论玩笑', 935, 450);
    ctx.restore();
  }
  camEnd(ctx);
}

function shotL10(ctx, t, lt, p) {
  camBegin(ctx, 640, 352, 1.02);
  room(ctx, t);
  const tvRect = { x: 726, y: 232, w: 452, h: 292 };
  // 电视机里 = **新版鲸鱼娘**（day2 的新版立绘，大图、清晰）。
  // v1 这里是一格旧版像素小鲸、一格方图，用户反馈"电视里那只太小又糊"（退回项 #4）。
  tvPanel(ctx, tvRect.x, tvRect.y, tvRect.w, tvRect.h, t, (g, tt, mw, mh) => {
    // 轻微推镜（电视里的节目也有运镜，不像一张静止贴图）
    const zoom = 1.01 + 0.05 * ease(clamp(lt / Math.max(0.5, CUES[9].end - CUES[9].start)));
    g.save();
    g.translate(mw / 2, mh / 2); g.scale(zoom, zoom); g.translate(-mw / 2, -mh / 2);
    miniRoom(g, mw, mh, tt);
    // 台口灯
    glow(g, mw * 0.5, 54, 120, PAL.gold, 0.18);
    const hop = Math.abs(Math.sin(tt * 2.2)) * 7;
    drawPose(g, 'greet', mw * 0.5, 208 - hop, 210, 0);
    g.restore();
    // 台标字幕条
    g.save();
    paint(g, rrPts(mw * 0.5 - 92, 16, 184, 30, 8, 1), { wash: 'rgba(10,20,38,0.9)', fill: '#0B1D3A', fillOp: 200, ink: '#48C8FF', sw: 1.2 });
    g.font = 'bold 15px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
    g.fillStyle = PAL.cream; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('新版鲸鱼娘 · 电视台', mw * 0.5, 32);
    g.restore();
    // 电视台包装：LIVE 角标 + 底部滚动字幕 + 节拍均衡器
    tvShowOverlay(g, lt, mw, mh, {
      mode: 'live',
      ticker: '新版鲸鱼娘 · 电视台 ｜ 28 个动作 ｜ 39 张姿势 ｜ 今晚八点开播'
    });
  }, { caption: '电视台 · 新设计的鲸上班了' });
  LCG(ctx, 430, 628, 30, { t, emote: 'exclaim', flip: true });
  if (p > 0.3) {
    label(ctx, '主持：现在的本鲸', 268, 250, { h: 28, font: 'bold 16px "NotoSansSC", sans-serif', stroke: '#48C8FF' });
    label(ctx, '新版：电视台', 268, 288, { h: 28, font: 'bold 16px "NotoSansSC", sans-serif', stroke: '#F2C14E' });
  }
  camEnd(ctx);
}

function shotL11(ctx, t, lt, p) {
  camBegin(ctx, 640, 350, 1.04);
  room(ctx, t);
  LCG(ctx, 560, 626, 31, { t, emote: 'sparkle' });
  riceBowl(ctx, 700, 566, 0.95, 1, t);
  // 大小姐形态没有可吃的鲸鱼动作，这里只做"捧碗 + 游两圈"的走位，
  // 不硬套鲸鱼骨架的 eating action。
  // 游两圈：两个椭圆轨迹
  const arc = popAt(t, 11, 0.35, 0.8);
  if (arc > 0.01) {
    ctx.save();
    ctx.globalAlpha = 0.7 * arc;
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = PAL.whaleCyan;
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.ellipse(640, 604, 210, 56, 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    const a = t * 2.4;
    paint(ctx, ellPts(640 + Math.cos(a) * 210, 604 + Math.sin(a) * 56, 13, 8, 12), { wash: PAL.whaleSky, ink: PAL.ink, sw: 1 });
    ctx.restore();
  }
  if (p > 0.55) letter(ctx, '薄肌预备饭 · 不能光说不练', 640, 250, 26, PAL.gold, { pop: popAt(t, 11, 0.56, 0.72) });
  camEnd(ctx);
}

function shotL12(ctx, t, lt, p) {
  camBegin(ctx, 640, 350, 1.04);
  room(ctx, t);
  commentCard(ctx, 852, 236, '@睡死不喜欢上学', '和Claude共创吧', popAt(t, 12, 0.05, 0.2), 300);
  commentCard(ctx, 852, 320, '@晚雾沉舟', '和Claude共创吧', popAt(t, 12, 0.22, 0.38), 300);
  // 空着的"大小姐座位"
  PROPS.officeChair(ctx, 1046, 552, 18, { col: '#6D28D9' });
  const ghost = popAt(t, 12, 0.4, 0.62);
  if (ghost > 0.01) {
    ctx.save();
    ctx.globalAlpha = 0.75 * ghost;
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = '#F2A679';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(1046, 512, 60, 96, 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  LCG(ctx, 476, 626, 29, { t, emote: 'deadpan' });
  // 手里账本
  paint(ctx, rrPts(372, 486, 96, 70, 6, 1), { wash: '#F2C14E', fill: '#D99B26', fillOp: 110, ink: PAL.ink, sw: 1.4 });
  ctx.font = 'bold 13px "NotoSansSC", sans-serif';
  ctx.fillStyle = PAL.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('账本', 420, 521);
  if (p > 0.5) letter(ctx, '大小姐没来，账还是要查的', 620, 176, 24, PAL.cream, { pop: popAt(t, 12, 0.5, 0.66) });
  camEnd(ctx);
}

function shotL13(ctx, t, lt, p) {
  camBegin(ctx, 640, 350, 1.03);
  room(ctx, t);
  // 电视机里 = 新版鲸鱼娘（MV 里的新形象）；电视外是本鲸现在的形态。
  tvPanel(ctx, 690, 214, 500, 312, t, (g, tt, mw, mh) => {
    miniRoom(g, mw, mh, tt);
    // 小舞台
    paint(g, rectPts(0, mh * 0.66, mw, mh * 0.34, 1), { wash: '#5A3A22', ink: null });
    glow(g, mw * 0.5, 120, 130, PAL.whaleCyan, 0.2);
    const spinP = clamp((p - 0.05) / 0.4);
    const done = spinP >= 1;
    // 转圈用水平方向的绕身旋转（scaleX 过零再回来），不是把整张图在平面里转倒
    const spinAng = spinP * Math.PI * 2;
    const sx = done ? 1 : Math.max(0.12, Math.abs(Math.cos(spinAng)));
    const rot = done ? Math.sin(tt * 2) * 0.03 : 0;
    const hop = done ? Math.abs(Math.sin(tt * 2.6)) * 5 : Math.abs(Math.sin(spinAng)) * 6;
    // MV 的"卡点切镜"：转过圈之后按拍子换姿势（两拍一切），幅度很小，只是让画面有节拍
    const beatIdx = Math.floor(lt * 1.6);
    const cutPose = done ? ['celebrate', 'music', 'celebrate', 'greet'][beatIdx % 4] : 'music';
    const cutFlash = done ? Math.max(0, 1 - ((lt * 1.6) % 1) * 5) : 0;
    g.save();
    g.translate(mw * 0.5, 104 - hop);
    g.rotate(rot);
    g.scale(sx, 1);
    drawPose(g, cutPose, 0, 100, 200, 0);
    g.restore();
    if (cutFlash > 0.02) {
      g.save();
      g.globalAlpha = 0.10 * cutFlash;
      g.fillStyle = '#FFFFFF';
      g.fillRect(0, 0, mw, mh);
      g.restore();
    }
    // 迟到的歌词条
    const arrive = popAt(t, 13, 0.52, 0.72);
    if (arrive > 0) {
      g.save();
      g.globalAlpha = arrive;
      g.translate(mw * (0.5 + 0.14 * (1 - arrive)), mh * 0.62);
      paint(g, rrPts(-104, -17, 208, 34, 8, 1), { wash: 'rgba(10,20,38,0.94)', fill: '#0B1D3A', fillOp: 200, ink: '#F2C14E', sw: 1.4 });
      g.font = 'bold 13px "NotoSansSC", sans-serif';
      g.fillStyle = '#FDE68A'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('转完圈了，歌词才追上来', 0, 1);
      g.restore();
      for (let i = 0; i < 3; i++) {
        inkLine(g, [[mw * 0.5 - 96 - i * 10, mh * 0.62 + 24], [mw * 0.5 - 140 - i * 10, mh * 0.62 + 26]], 2, 'rgba(255,255,255,0.7)', 'inkfine', 0.4);
      }
    }
    // MV 包装：黑边 + 节拍光束 + 均衡器 + 逐字歌词
    const lyricStart = (CUES[12].end - CUES[12].start) * 0.52;
    tvShowOverlay(g, lt, mw, mh, {
      mode: 'mv',
      badge: 'MV_v0.1',
      lyric: { text: '转完圈了 歌词才追上来', start: lyricStart, end: lyricStart + 2.4 }
    });
  }, { caption: 'MV_v0.1 · 新版形象 · 别发' });
  LCG(ctx, 400, 628, 29, { t, emote: 'sweat', flip: true });
  if (p > 0.6) letter(ctx, '做得不好？先看节拍', 300, 250, 22, PAL.cream, { pop: popAt(t, 13, 0.6, 0.74) });
  camEnd(ctx);
}

function shotL14(ctx, t, lt, p) {
  camBegin(ctx, 640, 350, 1.03);
  room(ctx, t);
  tvPanel(ctx, 660, 208, 520, 318, t, (g, tt, mw, mh) => {
    miniRoom(g, mw, mh, tt);
    WGF(g, mw * 0.34, 262, 15, { t: tt, action: 'wave_hand' });
    // 白饭碗举到嘴边当麦克风
    riceBowl(g, mw * 0.5, 196, 0.85, 1, tt);
    inkLine(g, [[mw * 0.44, 220], [mw * 0.36, 246]], 3, '#E2E8F0', 'inkfine', 0);
    g.font = 'bold 13px "NotoSansSC", sans-serif';
    g.fillStyle = PAL.cream; g.textAlign = 'center';
    g.fillText('饭碗抢了麦克风的活', mw * 0.66, 250);
  }, { caption: 'MV_v0.1 试播 · 审片中' });
  LCG(ctx, 372, 628, 29, { t, emote: 'sweat', flip: true });
  // 举牌
  const board = popAt(t, 14, 0.3, 0.5);
  if (board > 0.01) {
    ctx.save();
    ctx.translate(372, 392);
    ctx.rotate(-0.05);
    ctx.scale(board, board);
    paint(ctx, rrPts(-140, -34, 280, 68, 8, 1.4), { wash: '#F8FAFC', fill: '#E2E8F0', fillOp: 110, ink: PAL.ink, sw: 1.6 });
    ctx.font = '900 24px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
    ctx.fillStyle = '#B91C1C'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('做得不好 · 先别发', 0, 2);
    inkLine(ctx, [[-60, 34], [-70, 120]], 3, PAL.ink, 'ink', 0);
    inkLine(ctx, [[60, 34], [70, 120]], 3, PAL.ink, 'ink', 0);
    ctx.restore();
  }
  camEnd(ctx);
}

function shotL15(ctx, t, lt, p) {
  camBegin(ctx, 640, 350, 1.02);
  room(ctx, t);
  // 水缸
  waterTank(ctx, 858, 300, 250, 320, t, clamp(0.35 + p * 0.6));
  bubbles(ctx, t, 880, 1090, 600, 12, 0.5);
  // 迟到的歌词条掉进水里
  const fall = clamp((p - 0.12) / 0.36);
  ctx.save();
  ctx.globalAlpha = 1 - 0.4 * fall;
  ctx.translate(lerp(1080, 980, fall), lerp(250, 520, ease(fall)));
  ctx.rotate(fall * 0.35);
  paint(ctx, rrPts(-92, -16, 184, 32, 8, 1), { wash: '#FDE68A', ink: PAL.ink, sw: 1.2 });
  ctx.font = 'bold 13px "NotoSansSC", sans-serif';
  ctx.fillStyle = PAL.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('歌词（迟到）', 0, 1);
  ctx.restore();
  // 大小姐追歌词、扎进水里
  const dive = ease(clamp((p - 0.3) / 0.4));
  LCG(ctx, lerp(520, 806, dive), lerp(628, 596, dive), 28, {
    t, rot: lerp(0, 0.55, dive), dy: -0.05 - 0.12 * Math.sin(dive * Math.PI), emote: 'exclaim'
  });
  waterOverlay(ctx, t, lerp(680, 300, dive), 0.55 * dive);
  // 橙色染料开始漏
  const leak = popAt(t, 15, 0.66, 0.95);
  if (leak > 0) dyeRibbons(ctx, t, 470, leak);
  if (p > 0.68) letter(ctx, '糟糕，颜色开始往下掉！', 420, 232, 26, PAL.cream, { pop: popAt(t, 15, 0.68, 0.82) });
  camEnd(ctx);
}

// L16：褪色 → 变回鲸鱼娘
// v2 改动（用户退回项 #6）：水面**接住 L15 结尾的水位**（300）继续往上，不再从画面底部
// 重新涨一遍；镜头 zoom 与 L15 对齐（1.02），人物站位也接住 L15（780,600），
// 所以"水漫上来"是同一场戏的延续，不是突然换分镜。
function shotL16(ctx, t, lt, p) {
  camBegin(ctx, 640, 350, 1.02);
  room(ctx, t);
  const charX = 780, charY = 600, uC = 30, uW = 30;
  const reveal = ease(clamp((p - 0.14) / 0.6));
  const frontY = lerp(H + 80, 150, reveal);              // 褪色前沿：自下而上把颜色冲掉
  const waterY = lerp(300, 172, ease(clamp(p / 0.9)));   // 水面：从 L15 的 300 接着涨
  const md = emotions(lt, [[0, 'shocked', 'sweat'], [SD(16) * 0.6, 'surprised'], [SD(16) * 0.85, 'proud', 'sparkle']]);
  // 上半：还是大小姐，逐渐淡出
  ctx.save();
  ctx.beginPath(); ctx.rect(-200, -200, W + 400, frontY + 200); ctx.clip();
  // 别淡太多：两半各给 50% 透明度会看到「两个人叠在一起」，只留一点点减淡
  LCG(ctx, charX, charY, uC, { t, alpha: 1 - 0.22 * reveal, emote: 'sweat', rot: -0.05 * reveal });
  ctx.restore();
  // 下半：已经变回鲸鱼娘
  ctx.save();
  ctx.beginPath(); ctx.rect(-200, frontY, W + 400, H - frontY + 200); ctx.clip();
  // 褪完色先哭成喷泉，后段转成委屈抽泣（两个动作叠一个淡化）
  const cryK = clamp((p - 0.55) / 0.15);
  WGF(ctx, charX, charY, uW, {
    t,
    action: cryK > 0 ? 'sob_shiver' : 'cry_fountain',
    prevAction: cryK > 0 ? 'cry_fountain' : null,
    blend: cryK,
    emote: cryK > 0.5 ? 'sweat' : null
  });
  ctx.restore();
  // 水面 / 染料 / 气泡
  waterOverlay(ctx, t, waterY, 0.7 + 0.2 * reveal, 130);
  dyeRibbons(ctx, t, waterY + 60, 1 - reveal * 0.75);
  bubbles(ctx, t, 420, 980, waterY + 40, 18, 0.75);
  // 褪色前线：只在还有颜色可冲的时候画，冲干净就收线（不给全屏留一条橙线）
  const frontA = (1 - reveal) * 0.9;
  if (frontA > 0.03) {
    inkLine(ctx, [[-100, frontY], [200, frontY + 8], [520, frontY - 6], [860, frontY + 10], [W + 100, frontY - 4]], 5, `rgba(242,166,121,${frontA})`, 'ink', 0.2);
  }
  // 只剩湿向日葵：掉在她脚边的地板上（v2 里飘在脸旁边，压住了脸）
  if (reveal > 0.6) {
    const s = 0.85, sx = charX + 150, sy = 654;
    ctx.save();
    ctx.globalAlpha = (reveal - 0.6) / 0.4;
    paint(ctx, ellPts(sx, sy + 16, 22, 6, 12), { wash: 'rgba(0,0,0,0.28)', ink: null });
    inkLine(ctx, [[sx, sy + 10], [sx - 2, sy + 34]], 3, '#4D8B5C', 'ink', 0.3);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      paint(ctx, ellPts(sx + Math.cos(a) * 12 * s, sy + Math.sin(a) * 12 * s, 8 * s, 6.5 * s, 10), { wash: '#FBBF24', ink: PAL.ink, sw: 1 });
    }
    paint(ctx, ellPts(sx, sy, 8 * s, 8 * s, 10), { wash: '#92400E', ink: PAL.ink, sw: 1 });
    ctx.restore();
    letter(ctx, '只剩湿向日葵', sx + 8, sy - 66, 20, PAL.cream, { pop: popAt(t, 16, 0.7, 0.84), alpha: 0.9 });
  }
  if (p > 0.72) letter(ctx, '染色剂不防水！', charX - 300, 330, 28, PAL.gold, { pop: popAt(t, 16, 0.72, 0.86), rot: -0.04 });
  camEnd(ctx);
}

function shotL17(ctx, t, lt, p) {
  camBegin(ctx, 640, 350, 1.03);
  room(ctx, t);
  // 接住 L16 结尾满上来的水：开场水还在，前 18% 退掉，地面留湿痕。
  // 这样 1:21–1:22 是"同一场戏继续"，不是黑屏后突然换场（退回项 #5/#6）。
  const drain = clamp(p / 0.18);
  if (drain < 1) {
    waterOverlay(ctx, t, lerp(430, 720, ease(drain)), 1 - drain, 120);
    bubbles(ctx, t, 380, 900, 640, 8, 0.5 * (1 - drain));
  } else {
    paint(ctx, rectPts(260, 664, 760, 26, 4), { wash: 'rgba(56,189,248,0.16)', ink: null });
  }
  // 拍照 → 放下相机叉腰 → 指返工单
  const c1 = clamp((p - 0.42) / 0.10), c2 = clamp((p - 0.72) / 0.10);
  WGF(ctx, 470, 628, 30, {
    t,
    action: c2 > 0 ? 'point_proud' : c1 > 0 ? 'confident_hips' : 'camera_shutter',
    prevAction: c2 > 0 ? 'confident_hips' : c1 > 0 ? 'camera_shutter' : null,
    blend: c2 > 0 ? c2 : c1,
    emote: p > 0.30 && p < 0.44 ? 'exclaim' : null
  });
  // 返工单
  const pop = popAt(t, 17, 0.08, 0.26);
  if (pop > 0.01) {
    ctx.save();
    ctx.globalAlpha = pop;
    card(ctx, 720, 236, 430, 300, { wash: '#F8FAFC', fill: '#E2E8F0', fillOp: 110 });
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '900 22px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
    ctx.fillStyle = PAL.ink;
    ctx.fillText('MV 返工单', 744, 268);
    ctx.font = 'bold 17px "NotoSansSC", sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('MV_v0.1 别发', 744, 306);
    ctx.restore();
    // 返工中的贴纸盖住"别发"
    const st = popAt(t, 17, 0.34, 0.5);
    if (st > 0.01) {
      ctx.save();
      ctx.globalAlpha = st;
      ctx.translate(1012, 352);
      ctx.rotate(-0.14);
      pill(ctx, -84, -22, 168, 44, 'rgba(220,38,38,0.92)', '#FCA5A5');
      ctx.font = '900 22px "ZCOOLKuaiLe", "NotoSansSC", sans-serif';
      ctx.fillStyle = PAL.cream; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('返工中', 0, 2);
      ctx.restore();
    }
    const items = ['节拍', '字幕', '动作'];
    items.forEach((it, i) => {
      const ip = popAt(t, 17, 0.44 + i * 0.12, 0.56 + i * 0.12);
      if (ip <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = ip * pop;
      paint(ctx, rrPts(748, 380 + i * 50, 350, 38, 8, 1), { wash: '#FEF3C7', fill: '#FDE68A', fillOp: 90, ink: PAL.ink, sw: 1.1 });
      ctx.font = 'bold 18px "NotoSansSC", sans-serif';
      ctx.fillStyle = PAL.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(`☐ ${it}`, 766, 399 + i * 50);
      ctx.restore();
    });
  }
  camEnd(ctx);
}

function shotL18(ctx, t, lt, p) {
  camBegin(ctx, 640, 350, 1.04);
  room(ctx, t);
  // 数账：低头核账 → 抬手摆"这账不对" → 收尾叉腰
  const d1 = clamp((p - 0.34) / 0.10), d2 = clamp((p - 0.66) / 0.10);
  WGF(ctx, 330, 628, 26, {
    t,
    action: d2 > 0 ? 'confident_hips' : d1 > 0 ? 'hand_wave_no' : 'think_reading',
    prevAction: d2 > 0 ? 'hand_wave_no' : d1 > 0 ? 'think_reading' : null,
    blend: d2 > 0 ? d2 : d1
  });
  const bills = [
    ['鸡蛋已领', 0.06, '#0E7C66', '✓'],
    ['主持已定', 0.26, '#0E7C66', '✓'],
    ['伪装已泡汤', 0.46, '#B91C1C', '✗']
  ];
  bills.forEach(([txt, at, col, mark], i) => {
    const bp = popAt(t, 18, at, at + 0.16);
    if (bp <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = bp;
    ctx.translate(0, (1 - bp) * -16);
    const x = 646 + i * 168, y = 360;
    ctx.translate(x, y);
    ctx.rotate(-0.05 + i * 0.05);
    paint(ctx, rrPts(-74, -58, 148, 116, 8, 1.2), { wash: '#F8FAFC', fill: '#E2E8F0', fillOp: 110, ink: PAL.ink, sw: 1.4 });
    ctx.font = 'bold 16px "NotoSansSC", sans-serif';
    ctx.fillStyle = PAL.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(txt.slice(0, 2), 0, -18);
    ctx.fillText(txt.slice(2), 0, 4);
    ctx.font = '900 30px "NotoSansSC", sans-serif';
    ctx.fillStyle = col;
    ctx.fillText(mark, 0, 36);
    ctx.restore();
    if (bp > 0.6) stamp(ctx, '已处理', x, y + 74, i * 0.1 - 0.08, col);
  });
  if (p > 0.6) letter(ctx, '今天三笔账', 640, 236, 28, PAL.gold, { pop: popAt(t, 18, 0.6, 0.74) });
  camEnd(ctx);
}

function shotL19(ctx, t, lt, p) {
  camBegin(ctx, 640, 352, 1.05);
  room(ctx, t);
  const run = p > 0.66;
  riceBowl(ctx, 470, 604, 0.78, Math.max(0.15, 1 - p * 0.8), t);
  // 护着碗 → 抱碗吃 → 抬头喊口号 → 小步走向电视 → 冲刺跑掉
  const g0 = actBlend(p, 0.12, 0.07), e1 = actBlend(p, 0.30, 0.09);
  const w1 = actBlend(p, 0.46, 0.08), r1 = actBlend(p, 0.66, 0.08);
  const moveX = lerp(520, 650, ease((p - 0.46) / 0.5));
  const eatX = 560;
  if (run) {
    // 速度线：三道短横线拖在身后（配合「冲去改 MV」）
    const k = clamp((p - 0.66) / 0.16);
    ctx.save();
    ctx.globalAlpha = 0.5 * k;
    ctx.strokeStyle = 'rgba(226,240,255,0.85)';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const yy = 470 + i * 46 + Math.sin(t * 8 + i) * 4;
      const x0 = moveX - 96 - i * 16 - ((t * 420 + i * 37) % 40);
      ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 - 62 - i * 10, yy); ctx.stroke();
    }
    ctx.restore();
  }
  WGF(ctx, run ? moveX : w1 > 0 ? moveX : eatX, 600, 30, {
    t,
    action: r1 > 0 ? 'run_sprint' : w1 > 0 ? 'walk_steps' : e1 > 0 ? 'point_proud' : g0 > 0 ? 'eat_onigiri' : 'guard_bowl',
    prevAction: r1 > 0 ? 'walk_steps' : w1 > 0 ? 'point_proud' : e1 > 0 ? 'eat_onigiri' : g0 > 0 ? 'guard_bowl' : null,
    blend: r1 > 0 ? r1 : w1 > 0 ? w1 : e1 > 0 ? e1 : g0 > 0 ? g0 : 0,
    emote: (w1 > 0 && !run) ? 'sparkle' : null
  });
  tvPanel(ctx, 800, 236, 320, 200, t, (g, tt, mw, mh) => {
    miniRoom(g, mw, mh, tt);
    g.save();
    g.globalAlpha = 0.9;
    g.translate(mw * 0.86, mh * 0.4);
    paint(g, rrPts(-52, -14, 104, 28, 6, 1), { wash: '#FDE68A', ink: PAL.ink, sw: 1.1 });
    g.font = 'bold 11px "NotoSansSC", sans-serif';
    g.fillStyle = PAL.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('歌词（还在跑）', 0, 1);
    g.restore();
  }, { caption: 'MV_v0.1 · 返工中' });
  if (p < 0.3) letter(ctx, '鲸鱼绝不摸鱼！', 640, 258, 32, PAL.gold, { pop: popAt(t, 19, 0.02, 0.16), rot: -0.03 });
  if (run) letter(ctx, '冲去改 MV', 470, 258, 26, PAL.cream, { pop: popAt(t, 19, 0.64, 0.76) });
  camEnd(ctx);
}

function shotEndCard(ctx, t, lt, p) {
  paint(ctx, rectPts(-120, -120, W + 240, H + 240, 2), { wash: '#0B1224', ink: null });
  for (let i = 0; i < 26; i++) {
    const x = 60 + hash(i) * (W - 120), y = 70 + hash(i + 40) * (H - 140);
    glow(ctx, x, y, 12, i % 2 ? PAL.whaleCyan : PAL.gold, 0.25 + 0.2 * Math.sin(t * 2 + i));
  }
  // 片尾：两张都用 Q 版贴纸（LCG 一定要显式给 pose ——
  // 不给 pose 时它会取 CURRENT_CUE=19 去查姿势表，查不到就退回几何像素立绘，
  // 用户看到的「最后一个分镜的 Claude 还是不对」就是这个回退）。
  WGF(ctx, 470, 566, 30, { t, action: 'wave_hand', emote: 'sparkle' });
  LCG(ctx, 800, 566, 27, { t, pose: 'wave_hi', emote: 'sparkle' });
  letter(ctx, 'Day 3 完', 640, 222, 54, PAL.gold, { pop: ease(clamp(p / 0.22)) });
  letter(ctx, 'MV 返工中', 640, 272, 30, PAL.cream, { pop: ease(clamp((p - 0.12) / 0.22)) });
  ctx.save();
  ctx.font = 'bold 16px "NotoSansSC", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(226,232,240,0.72)';
  ctx.fillText('非官方同人角色 / AI 生成内容 · 大小姐素材 CC BY-NC-SA 4.0', 640, 688);
  ctx.restore();
}

const SHOTS = [
  shotL01, shotL02, shotL03, shotL04, shotL05,
  shotL06, shotL07, shotL08, shotL09, shotL10,
  shotL11, shotL12, shotL13, shotL14, shotL15,
  shotL16, shotL17, shotL18, shotL19
];

function renderFrame(ctx, t) {
  reseedBoil(t);
  let form;
  const idx = CUES.findIndex(c => t >= c.start && t < c.end);
  if (idx >= 0) {
    CURRENT_CUE = idx + 1;
    form = charFormAt(idx + 1);
    SHOTS[idx](ctx, t, t - CUES[idx].start, cueP(t, idx + 1));
    // L03：染色刷扫完（p≈0.66）才算变身完成，之前在角标上仍标鲸鱼娘
    if (idx === 2) form = cueP(t, 3) > 0.66 ? FORM.CLAUDE : FORM.WHALE;
    // L16：褪色过半就切回鲸鱼娘角标
    if (idx === 15) form = cueP(t, 16) > 0.5 ? FORM.WHALE : FORM.CLAUDE;
  } else if (t >= ENDCARD.start && t < ENDCARD.end) {
    form = FORM.WHALE;
    shotEndCard(ctx, t, t - ENDCARD.start, clamp((t - ENDCARD.start) / (ENDCARD.end - ENDCARD.start)));
  } else if (t < ENDCARD.start) {
    // 镜头之间的 GAP（0.18s）以前画的是纯深色底 → 每次换镜都黑闪一下，
    // 用户就是在 1:21–1:22（L16 尾→L17 头）看到了这个黑屏（退回项 #5）。
    // 现在改为「上一镜停在 p=1 继续呼吸」，画面不断、不黑。
    const prev = CUES.reduce((acc, c, i) => (t >= c.end && i > acc ? i : acc), -1);
    const i = prev >= 0 ? prev : 0;
    form = charFormAt(i + 1);
    if (i === 2) form = cueP(t, 3) > 0.66 ? FORM.CLAUDE : FORM.WHALE;
    if (i === 15) form = cueP(t, 16) > 0.5 ? FORM.WHALE : FORM.CLAUDE;
    SHOTS[i](ctx, t, t - CUES[i].start, 1);
  } else {
    form = FORM.WHALE;
    room(ctx, t);
  }
  hud(ctx, t, form);
  drawSubtitle(ctx, t);
}

// ---------------------------------------------------------------------------
// 6. 渲染入口
// ---------------------------------------------------------------------------
// 电视机里的新版形象：greet=招呼（L10 电视台）、music=听歌（L13 转圈前）、celebrate=庆祝
const POSE_DIR = path.resolve(__dirname, '../../day2制作/video-fx源码快照/day2_poses');
const POSE_KEYS = {
  greet: 'dsh-whale-state-greet.webp',
  music: 'dsh-whale-state-meme-music.webp',
  celebrate: 'dsh-whale-state-celebrate.webp',
  idle: 'dsh-whale-state-idle-cute.webp'
};
const SPRITE_DIR = path.resolve(__dirname, '../whale_girl_src');
// 大小姐立绘：素材库 1024×1536 透明 PNG，直接用；骨架同一套量法
async function loadClaudeSprite() {
  const DIR = path.join(__dirname, process.env.DAY3_CLAUDE_DIR || '../claude_src/chibi');
  CLAUDE_IMGS = {}; CLAUDE_RIGS = {};
  const ctxFactory = (w, h) => createCanvas(w, h);
  let n = 0;
  for (const [key, meta] of Object.entries(CLAUDE_POSES)) {
    const f = path.join(DIR, meta.file);
    if (!fs.existsSync(f)) { console.warn('  缺大小姐立绘:', meta.file); continue; }
    const img = await loadImage(f);
    CLAUDE_IMGS[key] = img;
    n++;
    try { CLAUDE_RIGS[key] = buildRig(img, { ctxFactory }); }
    catch (e) { console.warn(`  大小姐骨架量失败（${key}），该姿势退回整图：`, e.message); }
  }
  console.log(`Claude 大小姐立绘：${n} 张（${Object.keys(CLAUDE_IMGS).join('/')}）；骨架 ${Object.keys(CLAUDE_RIGS).length} 副`);
  console.log('  素材：Claude大小姐的日记本 (github.com/opsCar/claude-daxiaojie-assets) · 设定 ZipZipPipe · CC BY-NC-SA 4.0');
}

async function loadWhaleSprite() {
  globalThis.WHALE_POSES = {};
  WHALE_RIGS = {};
  const missing = [];
  for (const [key, meta] of Object.entries(WHALE_POSES)) {
    const f = path.join(SPRITE_DIR, meta.file);
    if (!fs.existsSync(f)) { missing.push(meta.file); continue; }
    globalThis.WHALE_POSES[key] = await loadImage(f);
  }
  const n = Object.keys(globalThis.WHALE_POSES).length;
  if (!n) {
    console.warn('⚠️ 没找到高清鲸鱼娘立绘，退回像素骨架：', SPRITE_DIR);
    console.warn('   先跑：node ../whale_girl_src/make_sprite.mjs <源图> ../whale_girl_src/whale_<姿势>.png');
    return;
  }
  // 给每张立绘现量一副骨架（18×26 网格 / 10 骨），量不出来就退回整张图绘制
  const ctxFactory = (w, h) => createCanvas(w, h);
  for (const [key, img] of Object.entries(globalThis.WHALE_POSES)) {
    try { WHALE_RIGS[key] = buildRig(img, { ctxFactory }); }
    catch (e) { console.warn(`  骨架量失败（${key}），该姿势退回整张图：`, e.message); }
  }
  const nr = Object.keys(WHALE_RIGS).length;
  console.log(`鲸鱼娘姿势：${n} 张（${Object.keys(globalThis.WHALE_POSES).join('/')}）；骨架 ${nr} 副`);
  if (missing.length) console.warn('  缺图（该动作会退回 idle）：', missing.join(', '));
}

async function loadPose() {
  await loadWhaleSprite();
  await loadClaudeSprite();
  globalThis.DAY3_POSES = {};
  for (const [key, file] of Object.entries(POSE_KEYS)) {
    const f = path.join(POSE_DIR, file);
    if (!fs.existsSync(f)) continue;
    globalThis.DAY3_POSES[key] = await loadImage(f);
  }
  const n = Object.keys(globalThis.DAY3_POSES).length;
  if (!n) console.warn('⚠️ 未找到 DSH 新版立绘，电视里会留空：', POSE_DIR);
  else console.log(`新版鲸鱼娘立绘：${n} 张（${Object.keys(globalThis.DAY3_POSES).join('/')}）`);
}

function prepareFrame(ctx) {
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, BASE_W, BASE_H);
}

async function renderStills() {
  const dir = path.resolve(__dirname, 'day3_stills');
  fs.mkdirSync(dir, { recursive: true });
  const canvas = createCanvas(OUT_W, OUT_H);
  const ctx = canvas.getContext('2d');
  const marks = [
    ['f000', 0],
    ...CUES.flatMap((c, i) => [
      [`l${String(i + 1).padStart(2, '0')}_20`, c.start + (c.end - c.start) * 0.2],
      [`l${String(i + 1).padStart(2, '0')}_58`, c.start + (c.end - c.start) * 0.58],
      [`l${String(i + 1).padStart(2, '0')}_90`, c.start + (c.end - c.start) * 0.9]
    ]),
    ['l03_35', CUES[2].start + (CUES[2].end - CUES[2].start) * 0.35],
    ['l03_42', CUES[2].start + (CUES[2].end - CUES[2].start) * 0.42],
    ['l03_50', CUES[2].start + (CUES[2].end - CUES[2].start) * 0.50],
    ['l03_70', CUES[2].start + (CUES[2].end - CUES[2].start) * 0.70],
    ['gap16_17', CUES[15].end + 0.06],
    ['l16_95', CUES[15].end - 0.2],
    ['l16_38', CUES[15].start + (CUES[15].end - CUES[15].start) * 0.38],
    ['l16_75', CUES[15].start + (CUES[15].end - CUES[15].start) * 0.75],
    ['endcard', ENDCARD.start + 1.6]
  ];
  for (const [name, t] of marks) {
    prepareFrame(ctx);
    renderFrame(ctx, t);
    const file = path.join(dir, `${name}_t${t.toFixed(2)}.png`);
    fs.writeFileSync(file, canvas.toBuffer('image/png'));
    console.log('still', path.relative(process.cwd(), file));
  }
}

async function renderVideo(outFile) {
  const ffmpeg = resolveFfmpeg();
  fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  const total = Math.round(DURATION * FPS);
  const audioArgs = AUDIO_WAV
    ? ['-i', AUDIO_WAV, '-map', '0:v:0', '-map', '1:a:0', '-c:a', 'aac', '-b:a', '192k',
       '-af', 'apad', '-t', DURATION.toFixed(3)]
    : ['-an'];
  console.log(`Day3 sample: ${total} frames (${DURATION.toFixed(2)}s, ` +
    `${VOICE_CUES ? '实测 cue 表' : '占位节奏'}，${AUDIO_WAV ? '含用户配音' : '无音轨'}) -> ${outFile}`);
  const ff = spawn(ffmpeg, [
    '-y', '-f', 'rawvideo', '-vcodec', 'rawvideo', '-pix_fmt', 'rgba',
    '-s', `${OUT_W}x${OUT_H}`, '-r', String(FPS), '-i', '-',
    ...audioArgs,
    '-c:v', 'libx264', '-preset', 'medium', '-tune', 'animation',
    '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outFile
  ], { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  ff.stderr.on('data', d => { err += d.toString(); });
  ff.stdin.on('error', e => { err += `\n[stdin] ${e.message}`; });
  ff.on('error', e => { err += `\n[spawn] ${e.message}`; });
  const canvas = createCanvas(OUT_W, OUT_H);
  const ctx = canvas.getContext('2d');
  const t0 = Date.now();
  for (let f = 0; f < total; f++) {
    prepareFrame(ctx);
    renderFrame(ctx, f / FPS);
    const raw = canvas.data();
    const ok = ff.stdin.write(Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength));
    if (!ok) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 150 === 0 || f === total - 1) {
      const el = (Date.now() - t0) / 1000;
      process.stdout.write(`\r  frame ${f + 1}/${total} (${((f + 1) / total * 100).toFixed(0)}%) ${((f + 1) / Math.max(0.1, el)).toFixed(1)}fps`);
    }
  }
  process.stdout.write('\n');
  ff.stdin.end();
  const code = await new Promise(r => ff.on('close', r));
  if (code !== 0) {
    console.error(err.split('\n').slice(-14).join('\n'));
    throw new Error(`ffmpeg exited ${code}`);
  }
  console.log(`✓ ${outFile} (${(fs.statSync(outFile).size / 1e6).toFixed(2)} MB)`);
}

const args = process.argv.slice(2);
await loadPose();
console.log(`字幕样式：${DEFAULTS.subStyle === 'day2' ? 'Day2 加更版（分句 + 说话人标签，默认）' : DEFAULTS.subStyle}`);
console.log(`角色默认：鲸鱼娘 ${DEFAULTS.whaleDir}（高清姿势 + 骨架）／大小姐 ${DEFAULTS.claudeDir}（Q 版）`);
const timesArg = argOf('--times');
if (timesArg) {
  const dir = path.resolve(__dirname, 'day3_stills');
  fs.mkdirSync(dir, { recursive: true });
  const canvas = createCanvas(OUT_W, OUT_H);
  const ctx = canvas.getContext('2d');
  for (const t of timesArg.split(',').map(Number)) {
    prepareFrame(ctx);
    renderFrame(ctx, t);
    const f = path.join(dir, `chk_t${t.toFixed(2)}.png`);
    fs.writeFileSync(f, canvas.toBuffer('image/png'));
    console.log('check', f);
  }
} else if (args.includes('--stills')) await renderStills();
else {
  const i = args.indexOf('--out');
  await renderVideo(i >= 0 ? args[i + 1] : 'day3_sample.mp4');
}
