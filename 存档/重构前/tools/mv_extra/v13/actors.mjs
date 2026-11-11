/**
 * actors.mjs — Day12 HD Whale Girl Protagonist + Universal 10-Bone LBS Skeletal Supporting Cast
 * & Beat-Synced Choreography Engine for 《把回忆拼好给你》 v4.
 *
 * Upgrades per user review:
 *  1. Protagonist uses pinned Day12 HD Whale Girl anime illustration poses (24 poses, zero 笨鱼,
 *     zero legacy blocky pixel rig) driven by both multi-pose switching and 10-bone LBS mesh.
 *  2. ALL 6 supporting characters (Doubao, Claude, Gemini, Qwen, GPT, Kimi) are
 *     rigged with a Face-Shielded 10-Bone LBS triangle mesh + voxel-mv style beat-locked
 *     choreography phrases (walking, side-tapping, jumping, waving, turning, canon/mirror group
 *     formations, and live prop handoffs) — zero static cutout frames!
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { buildRig, drawRigged, BONE_ORDER } from '../../engine/whale_rig/whale_rig.mjs';
import { drawExtrudedPiece } from './jigsaw.mjs';
import { actionFrame } from './actions.mjs';

const require = createRequire(import.meta.url);
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const { createCanvas, loadImage, GlobalFonts } = require('../../engine/node_modules/@napi-rs/canvas');

const fontThin = path.join(ROOT, 'tools/mv_extra/cache/font.ttf');
const fontBold = path.join(ROOT, 'tools/mv_extra/cache/NotoSansSC-Bold.ttf');
const fontPlay = path.join(ROOT, 'tools/mv_extra/cache/ZCOOLKuaiLe-Regular.ttf');
if (!GlobalFonts.registerFromPath(fontThin, 'MvCJK')) {
  throw new Error('Missing font.ttf — run `.venv/bin/python tools/mv_extra/v4/setup_v4.py` first');
}
if (!GlobalFonts.registerFromPath(fontBold, 'MvBold')) {
  throw new Error('Missing NotoSansSC-Bold.ttf — run `.venv/bin/python tools/mv_extra/v4/setup_v4.py` first');
}
GlobalFonts.registerFromPath(fontPlay, 'MvPlay');

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const mix = (a, b, k) => a + (b - a) * k;
const ease = (x) => {
  const k = clamp(x);
  return k * k * (3 - 2 * k);
};
const TAU = Math.PI * 2;

export const TEMPO_GRID = {
  spb: 0.85,
  halfBeat: 0.425,
  beat0: 0.2833333333333333,
};

export const GUEST_NAMES = ['doubao', 'claude', 'gemini', 'qwen', 'gpt', 'kimi'];

export const ACTOR_META = {
  whale:  { cn: '鲸鱼娘', accent: '#53b8e6', glow: 'rgba(105, 205, 255, 0.48)', chibi: true },
  doubao: { cn: '豆包',   accent: '#ff8e6e', glow: 'rgba(255, 162, 128, 0.45)', chibi: false },
  claude: { cn: 'Claude', accent: '#ff9d42', glow: 'rgba(255, 180, 98, 0.48)',  chibi: true },
  gemini: { cn: 'Gemini', accent: '#9d7BFF', glow: 'rgba(172, 140, 255, 0.48)', chibi: false },
  qwen:   { cn: '千问',   accent: '#6c8cff', glow: 'rgba(130, 162, 255, 0.46)', chibi: false },
  gpt:    { cn: 'GPT',    accent: '#7cdbc5', glow: 'rgba(145, 235, 212, 0.45)', chibi: false },
  kimi:   { cn: 'Kimi',   accent: '#7aa2f7', glow: 'rgba(142, 180, 255, 0.48)', chibi: false },
};

const WHALE_CACHE_DIR = path.join(ROOT, 'tools/mv_extra/cache/day12_actors/whale');
const CLAUDE_CACHE_DIR = path.join(ROOT, 'tools/mv_extra/cache/day12_actors/claude_chibi');

export const WHALE_POSE_FILES = {
  idle: 'whale_idle.png',
  wave: 'whale_wave.png',
  walk_stand: 'whale_walk_stand.png',
  walk_a: 'whale_walk_a.png',
  walk_b: 'whale_walk_b.png',
  run_a: 'whale_run_a.png',
  run_b: 'whale_run_b.png',
  umbrella_stroll: 'whale_umbrella_stroll.png',
  wake_stretch: 'whale_wake_stretch.png',
  cheer: 'whale_cheer.png',
  jump_joy: 'whale_jump_joy.png',
  sparkler_firework: 'whale_sparkler_firework.png',
  camera_shutter: 'whale_camera_shutter.png',
  rose_bouquet: 'whale_rose_bouquet.png',
  tail_wag_dance: 'whale_tail_wag_dance.png',
  confident_hips: 'whale_confident_hips.png',
  point: 'whale_point.png',
  think: 'whale_think.png',
  shock: 'whale_shock.png',
  shy_fidget: 'whale_shy_fidget.png',
  ciallo_wink: 'whale_ciallo_wink.png',
  peek_curious: 'whale_peek_curious.png',
  idol_mic_sing: 'whale_idol_mic_sing.png',
  playful_fists: 'whale_playful_fists.png',
};

export const CLAUDE_POSE_FILES = {
  wave_hi: 'pose_wave_hi.png',
  reading_book: 'pose_reading_book.png',
  cheer: 'pose_cheer.png',
  dance: 'pose_dance.png',
  curtsy: 'pose_curtsy.png',
  sing: 'pose_sing.png',
  pointing_viewer: 'pose_pointing_viewer.png',
  ok_hand: 'pose_ok_hand.png',
  megaphone: 'pose_megaphone.png',
  question: 'pose_question.png',
  noodles: 'pose_noodles.png',
};

/**
 * Flood-clean any trapped near-white studio background pocket at the bottom shoe gap
 * (connected to transparent pixels in y >= 0.84 * h) while preserving white socks/laces.
 */
function cleanShoeGapCanvas(img) {
  const w = img.width;
  const h = img.height;
  const cv = createCanvas(w, h);
  const g = cv.getContext('2d');
  g.drawImage(img, 0, 0);
  const imgData = g.getImageData(0, 0, w, h);
  const d = imgData.data;
  const yStart = Math.floor(h * 0.84);
  const visited = new Uint8Array(w * h);
  const queue = [];

  const isStudioWhite = (idx) => {
    const r = d[idx];
    const gr = d[idx + 1];
    const b = d[idx + 2];
    const a = d[idx + 3];
    if (a === 0) return false;
    const mx = Math.max(r, gr, b);
    const mn = Math.min(r, gr, b);
    return mn >= 238 && mx - mn <= 10;
  };

  for (let y = yStart; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const idx = p * 4;
      if (d[idx + 3] < 16) {
        visited[p] = 1;
        queue.push(p);
      }
    }
  }

  let head = 0;
  while (head < queue.length) {
    const p = queue[head++];
    const x = p % w;
    const y = (p / w) | 0;
    const neighbors = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= w || ny < yStart || ny >= h) continue;
      const np = ny * w + nx;
      if (visited[np]) continue;
      const nidx = np * 4;
      if (isStudioWhite(nidx)) {
        visited[np] = 1;
        d[nidx + 3] = 0;
        queue.push(np);
      }
    }
  }

  g.putImageData(imgData, 0, 0);
  return cv;
}

/**
 * Bake a subtle code-film directing references `paper-popup` off-white die-cut standee rim around an actor canvas
 * so characters read crisply against dense multi-plane sets while keeping 100% original RGB inside.
 */
function bakeDieCutSprite(srcCanvas, { rimPx = 3, addRim = true } = {}) {
  if (!addRim) return srcCanvas;
  const pad = rimPx + 3;
  const w = srcCanvas.width + pad * 2;
  const h = srcCanvas.height + pad * 2;

  const silhouette = createCanvas(w, h);
  const sg = silhouette.getContext('2d');
  const angles = 12;
  for (let i = 0; i < angles; i++) {
    const th = (i / angles) * TAU;
    sg.drawImage(srcCanvas, pad + Math.cos(th) * rimPx, pad + Math.sin(th) * rimPx);
  }
  sg.globalCompositeOperation = 'source-in';
  sg.fillStyle = 'rgba(255, 249, 236, 0.92)';
  sg.fillRect(0, 0, w, h);

  const edge = createCanvas(w, h);
  const eg = edge.getContext('2d');
  eg.drawImage(silhouette, 0, 2.2);
  eg.globalCompositeOperation = 'source-in';
  eg.fillStyle = 'rgba(138, 118, 96, 0.52)';
  eg.fillRect(0, 0, w, h);

  const out = createCanvas(w, h);
  const og = out.getContext('2d');
  og.drawImage(edge, 0, 0);
  og.drawImage(silhouette, 0, 0);
  og.drawImage(srcCanvas, pad, pad);
  return out;
}

/**
 * Build a Face-Shielded 10-Bone LBS Rig from any character PNG/canvas.
 * Protects the head/face core so eyes/mouths stay 100% unwarped while limbs/hair/torso articulate.
 */
function buildFaceShieldedRig(img, { chibi = true, addRim = true } = {}) {
  const cleaned = cleanShoeGapCanvas(img);
  const sprite = bakeDieCutSprite(cleaned, { rimPx: chibi ? 3 : 3.5, addRim });
  const rig = buildRig(sprite, { ctxFactory: createCanvas, nx: 26, ny: 38 });

  const B = rig.bbox;
  const headIdx = BONE_ORDER.indexOf('head');
  const spineIdx = BONE_ORDER.indexOf('spine');
  const legLIdx = BONE_ORDER.indexOf('legL');
  const legRIdx = BONE_ORDER.indexOf('legR');

  const faceTopY = B.y;
  const faceChinY = B.y + B.h * (chibi ? 0.46 : 0.25);
  const faceCenterX = rig.bones.head.head.x;
  const faceHalfW = B.w * (chibi ? 0.31 : 0.24);
  const legStartY = B.y + B.h * (chibi ? 0.80 : 0.58);
  const midX = rig.bones.root.head.x;

  for (let i = 0; i < rig.verts.length; i++) {
    const [vx, vy] = rig.verts[i];
    // 1. Face shield: lock facial features 100% rigidly to head bone
    if (vy >= faceTopY && vy <= faceChinY) {
      const dxNorm = Math.abs(vx - faceCenterX) / Math.max(1, faceHalfW);
      const dyNorm = (vy - faceTopY) / Math.max(1, faceChinY - faceTopY);
      if (dxNorm < 0.92 && dyNorm < 0.92) {
        rig.weights[i] = [[headIdx, 1.0]];
        continue;
      }
      if (dxNorm < 1.15) {
        const k = clamp((1.15 - dxNorm) / 0.23);
        rig.weights[i] = [
          [headIdx, 0.65 + 0.35 * k],
          [spineIdx, 0.35 * (1 - k)],
        ];
        continue;
      }
    }

    // 2. Explicit outer-arm articulation for tall cutouts (Doubao, Gemini, Qwen, GPT, Kimi)
    if (!chibi && vy > B.y + B.h * 0.25 && vy < B.y + B.h * 0.60) {
      const armDist = (Math.abs(vx - midX) - B.w * 0.22) / Math.max(1, B.w * 0.22);
      if (armDist > 0) {
        const armW = 0.82 * ease(clamp(armDist)) * Math.sin(clamp((vy - (B.y + B.h * 0.25)) / (B.h * 0.35)) * Math.PI);
        const armBone = BONE_ORDER.indexOf(vx < midX ? 'armL' : 'armR');
        if (armW > 0.10) {
          rig.weights[i] = [
            [armBone, armW],
            [spineIdx, 1 - armW],
          ];
          continue;
        }
      }
    }

    // 3. Crisp lower-leg articulation for tall & chibi cutouts alike
    if (vy > legStartY) {
      const below = ease(clamp((vy - legStartY) / (B.h * 0.11)));
      const isLeft = vx < midX;
      const sideSep = clamp(Math.abs(vx - midX) / (B.w * 0.06));
      const legBone = isLeft ? legLIdx : legRIdx;
      const legW = 0.88 * below * (0.48 + 0.52 * sideSep);
      if (legW > 0.08) {
        rig.weights[i] = [
          [legBone, legW],
          [0, 1 - legW],
        ];
      }
    }
  }

  return rig;
}

// Load raw images & build rigs
export const images = {};
for (const n of ['doubao', 'gemini', 'qwen', 'gpt', 'kimi']) {
  images[n] = await loadImage(path.join(ROOT, `assets/ai-girls/chibi-v5/${n}.png`));
}
images.claude = await loadImage(path.join(CLAUDE_CACHE_DIR, 'pose_wave_hi.png'));

const WHALE_RIGS = new Map();
for (const [pose, fn] of Object.entries(WHALE_POSE_FILES)) {
  const p = path.join(WHALE_CACHE_DIR, fn);
  if (!fs.existsSync(p)) {
    throw new Error(`Missing cached Day12 Whale Girl pose ${p} — run setup_v4.py`);
  }
  const im = await loadImage(p);
  WHALE_RIGS.set(pose, buildFaceShieldedRig(im, { chibi: true, addRim: true }));
}

const CLAUDE_RIGS = new Map();
for (const [pose, fn] of Object.entries(CLAUDE_POSE_FILES)) {
  const im = await loadImage(path.join(CLAUDE_CACHE_DIR, fn));
  CLAUDE_RIGS.set(pose, buildFaceShieldedRig(im, { chibi: true, addRim: false }));
}
const GUEST_RIGS = new Map();
const GUEST_WAVE_RIGS = new Map();
for (const n of ['doubao', 'gemini', 'qwen', 'gpt', 'kimi']) {
  GUEST_RIGS.set(n, buildFaceShieldedRig(images[n], { chibi: true, addRim: true }));
  const waving = await loadImage(path.join(ROOT, `assets/ai-girls/chibi-v6/${n}_wave.png`));
  GUEST_WAVE_RIGS.set(n, buildFaceShieldedRig(waving, { chibi: true, addRim: true }));
}

const SOLES = new Map();
export function measureSole(name) {
  const im = images[name];
  if (!im) throw new Error(`Unknown guest image: ${name}`);
  if (!SOLES.has(name)) {
    const tmp = createCanvas(im.width, im.height);
    const g = tmp.getContext('2d');
    g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, im.width, im.height).data;
    let bottom = im.height - 1;
    scan: for (; bottom >= 0; bottom--) {
      for (let xx = 0; xx < im.width; xx++) {
        if (d[(bottom * im.width + xx) * 4 + 3] > 127) break scan;
      }
    }
    SOLES.set(name, bottom);
  }
  return SOLES.get(name);
}

// Fast quantized stamp cache (keeps 30fps multi-character LBS rendering snappy & deterministic)
const STAMP_CACHE = new Map();
const STAMP_W = 540;
const STAMP_H = 620;
const STAMP_FOOT_Y = 568;
const STAMP_REF_H = 440;

function qNum(v, step = 0.015) {
  return Math.round((v || 0) / step) * step;
}

function quantizeAnim(anim = {}) {
  const r = anim.root || {};
  const b = anim.bones || {};
  const qb = {};
  for (const k of BONE_ORDER) {
    if (b[k]) {
      qb[k] = {
        rot: qNum(b[k].rot, 0.018),
        dx: qNum(b[k].dx, 1.2),
        dy: qNum(b[k].dy, 1.2),
        s: b[k].s != null ? qNum(b[k].s, 0.01) : 1,
      };
    }
  }
  return {
    root: {
      dx: qNum(r.dx, 1.2),
      dy: qNum(r.dy, 1.2),
      rot: qNum(r.rot, 0.012),
      sx: r.sx != null ? qNum(r.sx, 0.015) : 1,
      sy: r.sy != null ? qNum(r.sy, 0.015) : 1,
    },
    bones: qb,
    lift: qNum(anim.lift || 0, 0.03),
  };
}

function getRiggedStamp(rigKey, rig, anim) {
  const qa = quantizeAnim(anim);
  const key = `${rigKey}|${JSON.stringify(qa)}`;
  let stamp = STAMP_CACHE.get(key);
  if (!stamp) {
    stamp = createCanvas(STAMP_W, STAMP_H);
    const g = stamp.getContext('2d');
    const cx = rig.bbox.x + rig.bbox.w / 2;
    const u = STAMP_REF_H / 12.0;
    const anchorX = STAMP_W / 2 - (cx * STAMP_REF_H) / rig.h;
    drawRigged(g, rig, anchorX, STAMP_FOOT_Y, u, {
      spriteH: 12.0,
      shadow: false,
      anim: qa,
    });
    STAMP_CACHE.set(key, stamp);
    if (STAMP_CACHE.size > 32) {
      STAMP_CACHE.delete(STAMP_CACHE.keys().next().value);
    }
  }
  return stamp;
}

// Live motion telemetry for automated non-static cast verification in film.test.mjs
let MOTION_AUDIT_LOG = null;
export function startMotionAudit() {
  MOTION_AUDIT_LOG = [];
}
export function stopMotionAudit() {
  const out = MOTION_AUDIT_LOG || [];
  MOTION_AUDIT_LOG = null;
  return out;
}

export function recordActor(entry) {
  if (MOTION_AUDIT_LOG) {
    MOTION_AUDIT_LOG.push(entry);
  }
}

export function travelMotion(t, { start = 0, end = 1, x0 = 0, x1 = 0, steps = 3 } = {}) {
  const k = clamp((t - start) / Math.max(1e-6, end - start));
  const q = ease(k);
  return {
    x: mix(x0, x1, q),
    phase: q * TAU * steps,
    stride: Math.sin(Math.PI * k),
    moving: t > start && t < end,
    progress: q,
  };
}

/**
 * Compute beat-synced choreography offsets & 10-bone LBS skeletal animation!
 * Modeled directly on voxel-mv/kit/engine/moves.json + whale_rig_actions.mjs.
 */
export function solveChoreography(
  t,
  {
    move = 'groove_sway',
    canon = 0,
    mirror = 1,
    energy = 1.0,
    speed = 1.0,
    travel = null, // { start, end, x0, x1, y0?, y1?, steps? }
  } = {}
) {
  const beatFloat = ((t - TEMPO_GRID.beat0) / TEMPO_GRID.spb) * speed - canon;
  const beatIdx = Math.floor(beatFloat);
  const beatFrac = beatFloat - beatIdx;
  const barPhase = ((beatFloat % 4) + 4) % 4;
  const p = beatFloat * Math.PI;
  const m = mirror >= 0 ? 1 : -1;
  const e = clamp(energy, 0.35, 1.8);

  let dx = 0;
  let dy = 0;
  let jump = 0;
  let lean = 0;
  let squash = 0;
  let flip = false;
  let stepPulse = Math.max(0, Math.sin(beatFrac * Math.PI));
  let claudeCycle = 'wave_hi';
  let whaleWalkPose = null;

  const bones = {
    spine: { rot: 0 },
    head: { rot: 0, dy: 0 },
    armL: { rot: 0 },
    armR: { rot: 0 },
    legL: { rot: 0 },
    legR: { rot: 0 },
    hairL: { rot: 0 },
    hairR: { rot: 0 },
    tail: { rot: 0 },
  };

  if (move.startsWith('perform_')) {
    const action = move.slice('perform_'.length);
    const frame = actionFrame(t, action, canon * 0.17);
    const v = frame.value * e;
    if (action === 'wave') {
      bones.armL.rot = 0.38 * v; bones.armR.rot = -0.60 * v;
      bones.head.rot = 0.10 * v; bones.spine.rot = -0.03 * v;
      lean = 0.025 * v;
    } else if (action === 'walk') {
      bones.legL.rot = 0.38 * v; bones.legR.rot = -0.38 * v;
      bones.armL.rot = -0.20 * v; bones.armR.rot = 0.20 * v;
      dx = 13 * Math.sin(t * 1.1 + canon) * e;
      dy = 1.5 * Math.abs(v); lean = 0.04 * v;
    } else if (action === 'dance') {
      bones.armL.rot = -0.35 + 0.38 * v; bones.armR.rot = 0.35 + 0.38 * v;
      bones.legL.rot = 0.18 * v; bones.legR.rot = -0.18 * v;
      dx = 9 * v; lean = 0.09 * v; bones.head.rot = -0.09 * v;
    } else if (action === 'present') {
      bones.armL.rot = -0.20 - 0.35 * v; bones.armR.rot = 0.25 + 0.35 * v;
      bones.head.rot = -0.08 * v; lean = 0.035 * v;
    } else if (action === 'float') {
      dx = 11 * v; dy = 12 * v; lean = 0.08 * v;
      bones.armL.rot = -0.20 + 0.32 * v; bones.armR.rot = 0.20 + 0.32 * v;
      bones.legL.rot = 0.16 * v; bones.legR.rot = -0.16 * v;
    } else {
      bones.head.rot = 0.06 * v; bones.spine.rot = -0.025 * v;
      bones.armL.rot = 0.10 * v; bones.armR.rot = -0.10 * v;
    }
    claudeCycle = action === 'wave' ? 'wave_hi' : action === 'dance' ? 'dance' : action === 'present' ? 'pointing_viewer' : 'reading_book';
  } else if (move === 'natural') {
    // A held conversation pose: the feet stay grounded; gestures and head lead.
    const sw = Math.sin(t * 1.65 + canon * 2);
    dx = m * 3 * sw * e;
    lean = m * 0.024 * sw * e;
    bones.spine.rot = -m * 0.022 * sw * e;
    bones.head.rot = m * 0.035 * Math.sin(t * 1.45 + canon) * e;
    bones.armL.rot = -0.10 * e + 0.12 * Math.sin(t * 2.0 + canon) * e;
    bones.armR.rot = 0.12 * e + 0.15 * Math.sin(t * 2.15 + canon) * e;
    bones.legL.rot = 0.018 * sw * e;
    bones.legR.rot = -0.018 * sw * e;
    claudeCycle = Math.floor(t / 2.55) % 2 ? 'wave_hi' : 'dance';
  } else if (move === 'side_tap') {
    const dir = barPhase < 2 ? -1 : 1;
    const slide = ease(clamp((barPhase % 2) / 0.52));
    dx = m * dir * 34 * e * slide;
    const bounce = Math.abs(Math.sin(p));
    jump = 17 * e * bounce;
    squash = (1 - bounce) * 1.05 * e;
    lean = m * dir * 0.095 * e;
    bones.spine.rot = m * 0.08 * Math.sin(p * 0.5) * e;
    bones.head.rot = -m * 0.10 * Math.sin(p * 0.5 - 0.35) * e;
    bones.armL.rot = (-0.36 - 0.32 * bounce) * e;
    bones.armR.rot = (0.36 + 0.42 * Math.sin(p)) * e;
    bones.legL.rot = 0.34 * Math.sin(p) * e;
    bones.legR.rot = -0.34 * Math.sin(p) * e;
    claudeCycle = barPhase < 2 ? 'dance' : 'wave_hi';
  } else if (move === 'wave_beat') {
    const w = Math.sin(p * 1.5);
    dx = m * 26 * Math.sin(p * 0.5) * e;
    jump = 16 * e * Math.max(0, Math.sin(p));
    squash = 0.85 * e * Math.max(0, -Math.sin(p));
    lean = m * 0.085 * Math.sin(p * 0.5) * e;
    bones.armR.rot = -0.88 * e + 0.44 * w * e;
    bones.armL.rot = 0.32 * Math.cos(p) * e;
    bones.head.rot = 0.11 * Math.sin(p * 0.5 + 0.3) * e;
    bones.spine.rot = -0.065 * Math.sin(p * 0.5) * e;
    bones.legL.rot = 0.28 * Math.sin(p) * e;
    bones.legR.rot = -0.28 * Math.sin(p) * e;
    claudeCycle = barPhase < 2 ? 'wave_hi' : 'pointing_viewer';
  } else if (move === 'clap_step') {
    const stepWave = Math.sin(p * 0.5);
    dx = m * 36 * stepWave * e;
    const hop = Math.max(0, Math.sin(p * 2));
    jump = 20 * e * hop;
    squash = 1.05 * e * (1 - hop);
    lean = m * 0.095 * stepWave * e;
    const clap = Math.abs(Math.sin(p * 2));
    bones.armL.rot = (-0.52 + 0.34 * clap) * e;
    bones.armR.rot = (0.52 - 0.34 * clap) * e;
    bones.head.rot = 0.12 * Math.sin(p) * e;
    bones.legL.rot = 0.36 * Math.sin(p) * e;
    bones.legR.rot = -0.36 * Math.sin(p) * e;
    claudeCycle = clap > 0.55 ? 'cheer' : 'dance';
  } else if (move === 'cheer_jump') {
    const air = Math.max(0, Math.sin(p));
    jump = 36 * e * air;
    squash = air < 0.08 ? 1.25 * e * (1 - beatFrac) : -0.60 * air;
    dx = m * 26 * Math.sin(p * 0.5) * e;
    lean = m * 0.095 * Math.cos(p * 0.5) * e;
    bones.armL.rot = (-0.78 - 0.34 * air) * e;
    bones.armR.rot = (0.78 + 0.34 * air) * e;
    bones.legL.rot = (0.30 * air - 0.16 * (1 - air)) * e;
    bones.legR.rot = (-0.30 * air + 0.16 * (1 - air)) * e;
    bones.head.rot = -0.09 * air + 0.08 * Math.sin(p * 0.5);
    bones.spine.rot = -0.06 * air * m;
    claudeCycle = air > 0.35 ? 'cheer' : 'dance';
  } else if (move === 'turn_dance') {
    dx = m * 32 * Math.sin(p * 0.5) * e;
    jump = 22 * e * Math.max(0, Math.sin(p));
    flip = barPhase >= 2 && barPhase < 3.5;
    squash = (barPhase > 1.85 && barPhase < 2.18) || barPhase > 3.35 ? 1.3 * e : 0.45 * e;
    lean = m * 0.10 * Math.sin(p) * e;
    bones.armR.rot = (-0.68 + 0.40 * Math.sin(p * 1.5)) * e;
    bones.armL.rot = (0.38 * Math.cos(p)) * e;
    bones.legL.rot = 0.34 * Math.sin(p) * e;
    bones.legR.rot = -0.34 * Math.sin(p) * e;
    bones.head.rot = 0.11 * Math.sin(p * 0.5) * e;
    claudeCycle = flip ? 'pointing_viewer' : 'dance';
  } else if (move === 'lantern_lift') {
    const liftK = 0.5 + 0.5 * Math.sin(p * 0.5);
    dx = m * 24 * Math.cos(p * 0.5) * e;
    jump = 15 * e * Math.max(0, Math.sin(p));
    lean = -m * 0.08 * liftK * e;
    bones.armR.rot = (-0.92 - 0.28 * liftK) * e;
    bones.armL.rot = (-0.44 - 0.20 * liftK) * e;
    bones.head.rot = (-0.12 * liftK + 0.05 * Math.sin(p)) * e;
    bones.spine.rot = -0.06 * liftK * e;
    bones.legL.rot = 0.26 * Math.sin(p) * e;
    bones.legR.rot = -0.26 * Math.sin(p) * e;
    claudeCycle = liftK > 0.55 ? 'sing' : 'wave_hi';
  } else if (move === 'underwater_float') {
    dx = m * 26 * Math.sin(t * 1.45 + canon) * e;
    dy = 18 * Math.cos(t * 1.75 + canon) * e;
    lean = m * 0.11 * Math.sin(t * 1.2 + canon) * e;
    bones.spine.rot = 0.08 * Math.sin(t * 1.5 + canon) * e;
    bones.head.rot = -0.10 * Math.cos(t * 1.4 + canon) * e;
    bones.armL.rot = (-0.56 + 0.30 * Math.sin(t * 1.9 + canon)) * e;
    bones.armR.rot = (0.56 + 0.30 * Math.cos(t * 1.8 + canon)) * e;
    bones.legL.rot = 0.26 * Math.sin(t * 2.1 + canon) * e;
    bones.legR.rot = -0.26 * Math.sin(t * 2.1 + canon) * e;
    claudeCycle = 'curtsy';
  } else {
    // 'groove_sway' default expressive rhythm
    const sw = Math.sin(p * 0.5);
    const bt = Math.abs(Math.sin(p));
    dx = m * 28 * sw * e;
    jump = 18 * e * bt;
    squash = 0.92 * e * (1 - bt);
    lean = m * 0.09 * sw * e;
    bones.spine.rot = -m * 0.08 * sw * e;
    bones.head.rot = m * 0.11 * Math.sin(p * 0.5 - 0.4) * e;
    bones.armL.rot = (0.36 * sw - 0.22 * bt) * e;
    bones.armR.rot = (0.36 * sw + 0.32 * bt) * e;
    bones.legL.rot = 0.30 * Math.sin(p) * e;
    bones.legR.rot = -0.30 * Math.sin(p) * e;
    claudeCycle = barPhase < 1.5 ? 'dance' : barPhase < 3 ? 'wave_hi' : 'ok_hand';
  }

  // Keep a subtle breathing/weight-shift layer between held keyframes.
  if (move.startsWith('perform_')) {
    dx += 0.8 * Math.sin(t * 2.3 + canon);
    bones.head.rot += 0.025 * Math.sin(t * 1.7 + canon);
    bones.armR.rot += 0.025 * Math.sin(t * 2.4 + canon);
  }

  // Distance-driven walking / running overlay when `travel` is provided!
  if (travel) {
    const tr = travelMotion(t, travel);
    dx += tr.x - travel.x0;
    if (tr.y1 != null || travel.y1 != null) {
      dy += mix(0, (travel.y1 ?? 0) - (travel.y0 ?? 0), tr.progress);
    }
    if (tr.moving) {
      const gSin = Math.sin(tr.phase);
      const gCos = Math.cos(tr.phase);
      jump = Math.max(jump, 11 * Math.abs(gSin) * tr.stride);
      bones.legL.rot = 0.34 * gSin * tr.stride;
      bones.legR.rot = -0.34 * gSin * tr.stride;
      bones.armL.rot = -0.26 * gSin * tr.stride;
      bones.armR.rot = 0.26 * gSin * tr.stride;
      lean += (travel.x1 >= travel.x0 ? 1 : -1) * 0.045 * tr.stride;
      const cyc = ((Math.floor((tr.phase / TAU) * 4) % 4) + 4) % 4;
      whaleWalkPose = travel.run
        ? cyc % 2 === 0
          ? 'run_a'
          : 'run_b'
        : ['walk_a', 'walk_stand', 'walk_b', 'walk_stand'][cyc];
    }
  }

  // Secondary hair & tail follow-through lag (always alive!)
  const lagPhase = p - 0.65;
  bones.hairL.rot = 0.14 * Math.sin(lagPhase) * e - lean * 0.8;
  bones.hairR.rot = 0.14 * Math.cos(lagPhase * 0.95) * e - lean * 0.8;
  bones.tail.rot = 0.22 * Math.sin(lagPhase * 1.1) * e;

  return {
    dx,
    dy,
    jump,
    lean,
    squash,
    flip,
    stepPulse,
    claudeCycle,
    whaleWalkPose,
    anim: {
      root: {
        dy: squash * 12,
        sx: 1 + squash * 0.032,
        sy: 1 - squash * 0.036,
      },
      bones,
      lift: clamp(jump / 38),
    },
  };
}

function drawContactShadowAndRing(c, x, y, rx, jump, alpha, accentCol, beatPulse = 0) {
  const airK = clamp(jump / 46);
  c.save();
  // Beat-synced luminous floor ripple under dancing feet!
  if (beatPulse > 0.15 && accentCol) {
    const rr = rx * (1.05 + 0.55 * (1 - beatPulse));
    c.strokeStyle = accentCol;
    c.globalAlpha = alpha * 0.34 * beatPulse * (1 - airK * 0.5);
    c.lineWidth = 2.0;
    c.beginPath();
    c.ellipse(x, y + 3, rr, rr * 0.23, 0, 0, TAU);
    c.stroke();
  }
  c.fillStyle = `rgba(9, 17, 29, ${0.28 * alpha * (1 - airK * 0.48)})`;
  c.beginPath();
  c.ellipse(
    x,
    y + 3.5,
    Math.max(4, rx * (1 - airK * 0.24)),
    Math.max(2, rx * 0.19 * (1 - airK * 0.24)),
    0,
    0,
    TAU
  );
  c.fill();
  c.restore();
}

export function drawActorProp(c, prop, x, y, h, t, dir = 1) {
  if (!prop) return;
  const handX = x + dir * h * 0.27;
  const handY = y - h * 0.44 + Math.sin(t * 4.2) * 3;
  c.save();
  if (prop === 'lantern') {
    const g = c.createRadialGradient(handX, handY + 12, 2, handX, handY + 12, 34);
    g.addColorStop(0, 'rgba(255, 224, 140, 0.82)');
    g.addColorStop(1, 'rgba(255, 178, 92, 0)');
    c.fillStyle = g;
    c.fillRect(handX - 34, handY - 22, 68, 68);
    c.strokeStyle = '#6c4f33';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(handX - dir * 8, handY - 4);
    c.lineTo(handX + dir * 4, handY - 8);
    c.lineTo(handX + dir * 4, handY + 3);
    c.stroke();
    c.fillStyle = '#ffcf75';
    c.beginPath();
    c.roundRect(handX + dir * 4 - 9, handY + 3, 18, 22, 5);
    c.fill();
    c.fillStyle = '#fff8df';
    c.fillRect(handX + dir * 4 - 5, handY + 7, 10, 13);
  } else if (prop === 'sparkler') {
    const tipX = handX + dir * 16;
    const tipY = handY - 18;
    c.strokeStyle = '#9aa8b8';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(handX - dir * 4, handY + 4);
    c.lineTo(tipX, tipY);
    c.stroke();
    const g = c.createRadialGradient(tipX, tipY, 1, tipX, tipY, 26);
    g.addColorStop(0, 'rgba(255, 250, 210, 0.95)');
    g.addColorStop(0.5, 'rgba(255, 178, 92, 0.55)');
    g.addColorStop(1, 'rgba(255, 120, 80, 0)');
    c.fillStyle = g;
    c.fillRect(tipX - 26, tipY - 26, 52, 52);
    c.strokeStyle = '#fff6c8';
    c.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + t * 9;
      const r1 = 4 + (i % 2) * 3;
      const r2 = 13 + Math.sin(t * 14 + i) * 5;
      c.beginPath();
      c.moveTo(tipX + Math.cos(a) * r1, tipY + Math.sin(a) * r1);
      c.lineTo(tipX + Math.cos(a) * r2, tipY + Math.sin(a) * r2);
      c.stroke();
    }
  } else if (prop === 'puzzle') {
    drawExtrudedPiece(
      c,
      handX - 15,
      handY - 14 + Math.sin(t * 5) * 2.5,
      30,
      30,
      { top: 1, right: 1, bottom: 0, left: -1 },
      { fill: '#ffd166', side: '#c99433', stroke: '#fff6d8', depth: 4, angle: Math.sin(t * 3) * 0.14 }
    );
  } else if (prop === 'paper_boat') {
    c.translate(handX + dir * 6, handY + 2);
    c.rotate(Math.sin(t * 3.6) * 0.12);
    c.fillStyle = '#fff7e5';
    c.beginPath();
    c.moveTo(-16, 4);
    c.lineTo(16, 4);
    c.lineTo(10, 12);
    c.lineTo(-10, 12);
    c.closePath();
    c.fill();
    c.fillStyle = '#f2dec0';
    c.beginPath();
    c.moveTo(0, -10);
    c.lineTo(9, 4);
    c.lineTo(-9, 4);
    c.closePath();
    c.fill();
  } else if (prop === 'umbrella_mint') {
    const ux = x + dir * 8;
    const uy = y - h * 0.92;
    c.strokeStyle = '#635247';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(ux, y - h * 0.36);
    c.lineTo(ux, uy - 8);
    c.stroke();
    c.fillStyle = '#7ed6c2';
    c.strokeStyle = '#e9fff9';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(ux, uy + 14, 74, Math.PI, 0);
    c.closePath();
    c.fill();
    c.stroke();
  } else if (prop === 'ribbon') {
    c.beginPath();
    c.moveTo(handX, handY);
    c.bezierCurveTo(
      handX + dir * 55,
      handY - 26 + Math.sin(t * 3.8) * 16,
      handX + dir * 125,
      handY + 18 + Math.cos(t * 3.2) * 18,
      handX + dir * 195,
      handY - 12 + Math.sin(t * 4.1 + 1) * 22
    );
    c.strokeStyle = '#eb5e55';
    c.lineWidth = 7;
    c.lineCap = 'round';
    c.stroke();
    c.strokeStyle = '#ffd2c9';
    c.lineWidth = 1.6;
    c.stroke();
  } else if (prop === 'star_wand') {
    const tx = handX + dir * 12;
    const ty = handY - 14;
    c.strokeStyle = '#f3d18c';
    c.lineWidth = 2.2;
    c.beginPath();
    c.moveTo(handX - dir * 3, handY + 8);
    c.lineTo(tx, ty);
    c.stroke();
    c.fillStyle = '#ffe588';
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU + t * 2.5 - Math.PI / 2;
      const r = i % 2 === 0 ? 10 : 4.5;
      const px = tx + Math.cos(a) * r;
      const py = ty + Math.sin(a) * r;
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.closePath();
    c.fill();
  }
  c.restore();
}

/**
 * Render the Day12 HD Whale Girl protagonist with multi-pose switching + 10-bone LBS skeletal mesh!
 */
export function whale(
  c,
  {
    t = 0,
    x = 520,
    y = 605,
    h = 228,
    u = null, // back-compat scale (~7.2 px per u)
    pose = 'wave',
    move = 'groove_sway',
    canon = 0,
    mirror = 1,
    energy = 1.0,
    speed = 1.0,
    travel = null,
    flipX = false,
    alpha = 1,
    noShadow = false,
    prop = null,
    heldPiece = false,
    heldLantern = false,
    heldRibbon = null,
  } = {}
) {
  const targetH = u != null ? u * 7.4 : h;
  const ch = solveChoreography(t, { move, canon, mirror, energy, speed, travel });

  // Map legacy v3 pose aliases cleanly onto Day12 HD Whale Girl poses
  const POSE_ALIAS = {
    heart: 'shy_fidget',
    hips: 'confident_hips',
    panic: 'shock',
    wink: 'ciallo_wink',
    stand: 'idle',
  };
  let resolvedPose = ch.whaleWalkPose || POSE_ALIAS[pose] || pose;
  if (!WHALE_RIGS.has(resolvedPose)) {
    resolvedPose = 'wave';
  }
  const rig = WHALE_RIGS.get(resolvedPose);

  const px = x + ch.dx;
  const py = y + ch.dy;
  const finalFlip = Boolean(flipX) !== Boolean(ch.flip);
  const scale = targetH / STAMP_REF_H;

  if (!noShadow) {
    drawContactShadowAndRing(
      c,
      px,
      py,
      targetH * 0.25,
      ch.jump,
      alpha,
      ACTOR_META.whale.accent,
      ch.stepPulse
    );
  }

  const stamp = getRiggedStamp(`whale:${resolvedPose}`, rig, ch.anim);
  c.save();
  c.globalAlpha *= alpha;
  c.translate(px, py - ch.jump);
  if (ch.lean) c.rotate(ch.lean);
  c.scale(finalFlip ? -scale : scale, scale);
  c.drawImage(stamp, -STAMP_W / 2, -STAMP_FOOT_Y);
  c.restore();

  const activeProp =
    prop || (heldPiece ? 'puzzle' : heldLantern ? 'lantern' : heldRibbon ? 'ribbon' : null);
  if (activeProp) {
    c.save();
    c.globalAlpha *= alpha;
    drawActorProp(c, activeProp, px, py - ch.jump, targetH, t, finalFlip ? -1 : 1);
    c.restore();
  }

  recordActor({
    actor: 'whale',
    t,
    x: px,
    y: py - ch.jump,
    jump: ch.jump,
    lean: ch.lean,
    pose: resolvedPose,
    armRot: ch.anim.bones.armR.rot,
    legRot: ch.anim.bones.legL.rot,
  });

  return { actor: 'whale', x: px, y: py, h: targetH, jump: ch.jump, pose: resolvedPose };
}

/**
 * Render an active LBS-rigged & beat-choreographed AI companion using the selected still illustration.
 */
export function guest(
  c,
  name,
  {
    t = 0,
    x = 820,
    y = 605,
    h = null,
    pose = null, // for Claude multi-pose override
    move = 'side_tap',
    canon = 0.5,
    mirror = -1,
    energy = 1.0,
    speed = 1.0,
    travel = null,
    flipX = false,
    opacity = 1,
    noShadow = false,
    prop = null,
  } = {}
) {
  const meta = ACTOR_META[name] || ACTOR_META.doubao;
  const defaultH = name === 'claude' ? 218 : 268;
  const targetH = h ?? defaultH;

  const ch = solveChoreography(t, { move, canon, mirror, energy, speed, travel });

  const resolvedPose = name === 'claude' ? (pose && CLAUDE_RIGS.has(pose) ? pose : ch.claudeCycle) : (pose === 'wave' ? 'wave' : 'idle');
  const rig = name === 'claude' ? CLAUDE_RIGS.get(resolvedPose) : (resolvedPose === 'wave' ? GUEST_WAVE_RIGS.get(name) : GUEST_RIGS.get(name));
  if (!rig) throw new Error(`Unknown companion or pose: ${name} ${resolvedPose}`);
  const rigKey = name === 'claude' ? `claude:${resolvedPose}` : `guest:${name}:${resolvedPose}`;

  const px = x + ch.dx;
  const py = y + ch.dy;
  const finalFlip = Boolean(flipX) !== Boolean(ch.flip);
  const scale = targetH / STAMP_REF_H;

  if (!noShadow) {
    drawContactShadowAndRing(
      c,
      px,
      py,
      targetH * (meta.chibi ? 0.24 : 0.18),
      ch.jump,
      opacity,
      meta.accent,
      ch.stepPulse
    );
  }

  const stamp = getRiggedStamp(rigKey, rig, ch.anim);
  c.save();
  c.globalAlpha *= opacity;
  c.translate(px, py - ch.jump);
  if (ch.lean) c.rotate(ch.lean);
  c.scale(finalFlip ? -scale : scale, scale);
  c.drawImage(stamp, -STAMP_W / 2, -STAMP_FOOT_Y);
  c.restore();

  if (prop) {
    c.save();
    c.globalAlpha *= opacity;
    drawActorProp(c, prop, px, py - ch.jump, targetH, t, finalFlip ? -1 : 1);
    c.restore();
  }

  recordActor({
    actor: name,
    t,
    x: px,
    y: py - ch.jump,
    jump: ch.jump,
    lean: ch.lean,
    pose: resolvedPose,
    armRot: ch.anim.bones.armR.rot,
    legRot: ch.anim.bones.legL.rot,
  });

  return {
    actor: name,
    x: px,
    y: py,
    h: targetH,
    jump: ch.jump,
    pose: resolvedPose,
    visibleFootEdgeY: py,
  };
}

/**
 * Render a 1920x1080 Cast & Rig Action Verification Sheet (code-film directing references DIRECTOR.md §9).
 */
export function renderCastSheet() {
  const cv = createCanvas(1920, 1080);
  const c = cv.getContext('2d');

  const bg = c.createLinearGradient(0, 0, 0, 1080);
  bg.addColorStop(0, '#16273b');
  bg.addColorStop(1, '#233c54');
  c.fillStyle = bg;
  c.fillRect(0, 0, 1920, 1080);

  c.font = '700 32px MvBold';
  c.fillStyle = '#fff3d6';
  c.textAlign = 'center';
  c.fillText('《把回忆拼好给你》v6 · Day12 高清主角 + 全配角 10 骨蒙皮编舞盘点表', 960, 52);
  c.font = '600 17px MvCJK';
  c.fillStyle = '#b9d4e4';
  c.fillText(
    '主角升级：Day12 高清鲸鱼娘多姿态立绘 + 10 骨 LBS 蒙皮（零像素块、零笨鱼）｜配角全员动态：6 位 AI 伙伴全部接入护脸骨骼蒙皮与节拍编舞',
    960,
    86
  );

  // Upper shelf: All 7 characters mid-dance!
  c.fillStyle = 'rgba(11, 20, 32, 0.48)';
  c.beginPath();
  c.roundRect(44, 110, 1832, 466, 14);
  c.fill();
  c.fillStyle = '#7391a4';
  c.fillRect(84, 492, 1752, 4);

  const lineup = [
    { kind: 'whale', label: '鲸鱼娘 (Day12高清主角)', sub: '24姿态 + 10骨蒙皮', x: 196, pose: 'jump_joy', move: 'cheer_jump', prop: 'sparkler' },
    { kind: 'doubao', label: '豆包 (搭档·你)', sub: '10骨蒙皮 + 走位/撑伞/挥手', x: 452, h: 292, move: 'wave_beat', prop: 'lantern' },
    { kind: 'claude', label: 'Claude 大小姐', sub: 'Q版多姿态 + 骨骼动作', x: 706, h: 256, pose: 'cheer', move: 'clap_step' },
    { kind: 'gemini', label: 'Gemini', sub: '10骨蒙皮 + 欢呼跳/烟花', x: 960, h: 292, move: 'cheer_jump', prop: 'sparkler' },
    { kind: 'qwen', label: 'Qwen 千问', sub: '10骨蒙皮 + 踏步/灯笼', x: 1214, h: 294, move: 'side_tap', prop: 'paper_boat' },
    { kind: 'gpt', label: 'GPT', sub: '10骨蒙皮 + 拼图收集舞', x: 1468, h: 292, move: 'groove_sway', prop: 'puzzle' },
    { kind: 'kimi', label: 'Kimi', sub: '10骨蒙皮 + 星棒/观海律动', x: 1722, h: 292, move: 'lantern_lift', prop: 'star_wand' },
  ];

  lineup.forEach((it, idx) => {
    drawExtrudedPiece(
      c,
      it.x - 92,
      478,
      184,
      28,
      { top: 0, right: 1, bottom: 0, left: -1 },
      { fill: '#decab0', side: '#9d886c', stroke: '#f7ebd2', depth: 6 }
    );
    if (it.kind === 'whale') {
      whale(c, { t: 1.42, x: it.x, y: 486, h: 278, pose: it.pose, move: it.move, prop: it.prop, energy: 0.7 });
    } else {
      guest(c, it.kind, {
        t: 1.42 + idx * 0.18,
        x: it.x,
        y: 486,
        h: it.h,
        pose: it.pose,
        move: it.move,
        prop: it.prop,
        energy: 0.75,
      });
    }
    c.font = '700 20px MvBold';
    c.fillStyle = '#fff3d6';
    c.textAlign = 'center';
    c.fillText(it.label, it.x, 536);
    c.font = '600 13px MvCJK';
    c.fillStyle = '#a3c4d6';
    c.fillText(it.sub, it.x, 560);
  });

  // Lower shelf: Day12 Whale Girl key MV poses across the 5 acts!
  c.fillStyle = 'rgba(11, 20, 32, 0.48)';
  c.beginPath();
  c.roundRect(44, 602, 1832, 434, 14);
  c.fill();
  c.font = '700 22px MvBold';
  c.fillStyle = '#f8e2b8';
  c.textAlign = 'center';
  c.fillText('Day12 高清鲸鱼娘 · 本片关键剧情姿态与多帧真实步态预览', 960, 642);
  c.fillStyle = '#7391a4';
  c.fillRect(84, 954, 1752, 4);

  const poses = [
    ['peek_curious', '开场好奇探看'],
    ['walk_a', '迈步 A'],
    ['walk_b', '迈步 B'],
    ['umbrella_stroll', '雨夜撑伞'],
    ['point', '海岸远眺'],
    ['idol_mic_sing', '副歌高唱'],
    ['sparkler_firework', '手持烟花'],
    ['camera_shutter', '快门定格'],
    ['ciallo_wink', '终章重逢眨眼'],
  ];
  poses.forEach(([pName, title], idx) => {
    const sx = 148 + idx * 203;
    whale(c, { t: 0.65 + idx * 0.22, x: sx, y: 952, h: 242, pose: pName, move: 'wave_beat', energy: 0.45 });
    c.font = '700 16px MvBold';
    c.fillStyle = '#f3e5c8';
    c.fillText(title, sx, 994);
  });

  return cv;
}
