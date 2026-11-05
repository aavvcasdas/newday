// room_base.mjs — 通用引擎的基础设施层（与任何单集解耦）
// 从历史单集渲染器中抽出的「海底房间 + 画布/字体/文本」底座，独立实现，
// 不 import 任何 dayN 渲染器；旧渲染器保持原样、互不影响。
// 逻辑画布固定 1280x720（与字幕安全区约定一致）：y 610..720 为字幕专属区。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '../..');
export const W = 1280;
export const H = 720;
export const FPS = 30;

function resolveCanvasModule() {
  const candidates = ['@napi-rs/canvas', '/tmp/node_render/node_modules/@napi-rs/canvas'];
  for (const c of candidates) {
    try { return require(c); } catch { /* try next */ }
  }
  throw new Error('缺少 @napi-rs/canvas：cd /tmp/node_render && npm i @napi-rs/canvas');
}
const canvasModule = resolveCanvasModule();
export const createCanvas = canvasModule.createCanvas;
export const loadImage = canvasModule.loadImage;
export const GlobalFonts = canvasModule.GlobalFonts;

const VFX = process.env.VIDEO_FX_DIR || path.join(ROOT, 'video-fx');
for (const [file, family] of [['ZCOOLKuaiLe-Regular.ttf', 'ZCOOLKuaiLe'], ['NotoSansSC-Bold.ttf', 'NotoSansSC'], ['Silkscreen-Regular.ttf', 'Silkscreen']]) {
  const p = path.join(VFX, 'assets/fonts', file);
  if (fs.existsSync(p) && GlobalFonts) GlobalFonts.registerFromPath(p, family);
}

export const CORE = require(path.join(VFX, 'src/core.js'));
export const PROPS = require(path.join(VFX, 'src/props.js'));
const { TAU, PAL, rectPts, ellPts, rrPts, paint, inkLine, glow, reseedBoil } = CORE;

export function resolveFfmpeg() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) return process.env.FFMPEG_PATH;
  if (process.env.FFMPEG && fs.existsSync(process.env.FFMPEG)) return process.env.FFMPEG;
  for (const p of ['/tmp/node_render/node_modules/@ffmpeg-installer/linux-x64/ffmpeg', path.join(ROOT, 'node_modules/@ffmpeg-installer/linux-x64/ffmpeg')]) {
    if (fs.existsSync(p)) return p;
  }
  try { return require('/tmp/node_render/node_modules/@ffmpeg-installer/ffmpeg').path; } catch { /* fall through */ }
  return 'ffmpeg';
}

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const mix = (a, b, p) => a + (b - a) * p;
export const smooth = (p) => { p = clamp01(p); return p * p * (3 - 2 * p); };
export const easeOutBack = (p) => { const c = 1.70158; p = clamp01(p); return 1 + (c + 1) * ((p - 1) ** 3) + c * ((p - 1) ** 2); };
export function seg(t, a, b) { return smooth((t - a) / (b - a)); }

/** 清晰文本（原生栅格绘制，无描边糊化）。 */
export function drawText(g, s, x, y, size = 24, color = '#E7F5FF', weight = 800) {
  g.save();
  g.font = `${weight} ${size}px NotoSansSC`;
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(String(s), x, y);
  g.restore();
}

/** 带深色描边的强调文本（横幅/铭牌用）。 */
export function drawOutlinedText(g, s, x, y, size, fill, stroke = 'rgba(6,20,44,0.92)') {
  g.save();
  g.font = `800 ${size}px NotoSansSC`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = Math.max(2, size * 0.14);
  g.strokeStyle = stroke;
  g.strokeText(String(s), x, y);
  g.fillStyle = fill;
  g.fillText(String(s), x, y);
  g.restore();
}

export function measureText(g, s, size, weight = 800) {
  g.save();
  g.font = `${weight} ${size}px NotoSansSC`;
  const w = g.measureText(String(s)).width;
  g.restore();
  return w;
}

/**
 * 海底基础房间（逻辑坐标 1280x720）。
 * 连续性锚点：左圆舷窗 (148,236,r=77)、右侧书架、绿植、地板地毯。
 * opts: { floorY, wallCol, animatePlants }
 */
export function drawBaseUnderwaterRoom(ctx, t, o = {}) {
  const floorY = o.floorY ?? 536;
  PROPS.wall(ctx, o.wallCol || '#1B2A52');
  paint(ctx, rectPts(-120, floorY - 126, W + 240, 126, 2), { wash: '#2A3D6E', ink: PAL.ink, sw: 1.2, washOp: 200 });
  for (let i = 0; i < 9; i++) inkLine(ctx, [[52 + i * 146, floorY - 126], [52 + i * 146, floorY]], 1.2, 'rgba(15,23,42,0.55)', 'room-panel', 0);
  for (let i = 0; i < 12; i++) {
    const x = 36 + i * 106;
    const y = 40 + Math.sin(t * 1.1 + i * 0.7) * 7 + Math.sin(i * 1.3) * 10;
    const col = i % 3 === 0 ? PAL.gold : (i % 3 === 1 ? PAL.whaleCyan : PAL.rose);
    glow(ctx, x, y, 16, col, 0.45);
    paint(ctx, ellPts(x, y, 4.2, 5.4, 10), { wash: col, ink: PAL.ink, sw: 0.7 });
  }
  inkLine(ctx, [[16, 24], [W - 16, 32]], 1.6, '#2B3A63', 'room-top', 0.2);
  PROPS.windowPorthole(ctx, 148, 236, 80, t, true);
  PROPS.shelf(ctx, 1010, 296, 230, 2);
  PROPS.shelf(ctx, 1010, 402, 230, 5);
  // 右侧书桌（承重面在右侧，不挡中央人物）
  paint(ctx, rrPts(742, 470, 330, 24, 7, 1.2), { wash: '#6B4B33', fill: '#3B2A1E', fillOp: 130, ink: PAL.ink, sw: 1.4 });
  paint(ctx, rectPts(766, 494, 18, 112, 1), { wash: '#4A3524', ink: PAL.ink, sw: 1.1 });
  paint(ctx, rectPts(1030, 494, 18, 112, 1), { wash: '#4A3524', ink: PAL.ink, sw: 1.1 });
  // 左侧矮柜（道具落点承重面）
  paint(ctx, rrPts(250, 496, 400, 20, 6, 1.2), { wash: '#5B452F', fill: '#2E2116', fillOp: 150, ink: PAL.ink, sw: 1.3 });
  paint(ctx, rectPts(268, 516, 16, 90, 1), { wash: '#40301F', ink: PAL.ink, sw: 1 });
  paint(ctx, rectPts(614, 516, 16, 90, 1), { wash: '#40301F', ink: PAL.ink, sw: 1 });
  PROPS.floorBand(ctx, floorY, '#2A2148');
  paint(ctx, ellPts(640, 630, 320, 62, 26), { wash: '#4A3868', washOp: 190, ink: PAL.ink, sw: 1.3 });
  paint(ctx, ellPts(640, 630, 244, 40, 24), { wash: '#5A4890', washOp: 150, ink: null });
  // 绿植
  paint(ctx, rrPts(1176, 476, 52, 54, 8, 1), { wash: '#B45309', ink: PAL.ink, sw: 1.2 });
  if (o.animatePlants) reseedBoil(t);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.32 + (o.animatePlants ? Math.sin(t * 1.15 + i) * 0.055 : 0);
    inkLine(ctx, [[1202, 480], [1202 + Math.cos(a) * 60, 480 + Math.sin(a) * 74]], 4.5, i % 2 ? PAL.sap : '#4D8B5C', 'room-plant', 0.35);
  }
  if (o.animatePlants) reseedBoil(0);
}

/** 前景承重桌案（下沿严格 <= 600，不侵入字幕区）。 */
export function drawForegroundTable(ctx, x, y, w) {
  if (y + 58 > 600) throw new Error(`前景桌案下沿越界：${y + 58} > 600`);
  paint(ctx, rrPts(x, y, w, 15, 6, 0), { wash: '#785C49', fill: '#AF956D', fillOp: 230, ink: '#383C4A', sw: 2 });
  for (const xx of [x + 14, x + w - 14]) inkLine(ctx, [[xx, y + 15], [xx - 4, y + 58]], 7, '#6D5B4B', 'table-leg', 0);
}

export { TAU, PAL };
