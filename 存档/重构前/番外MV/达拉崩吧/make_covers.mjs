#!/usr/bin/env node
// make_covers.mjs — 生成《达拉崩吧》像素勇者番外MV 发布封面（3:4 竖版 1080×1440 + 4:3 横版 1440×1080）
// 100% 复用本项目 640×360 轻像素级 AI-girls 角色与 RPG 道具渲染底座（×3 整数临近放大），零生图、零阿拉伯数字、零水印。

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { FB, C, T, LUT } from './src/px.js';
import { getBakedSprite } from './src/sprites_data.js';
import {
  drawWhaleHero,
  drawCastSprite,
  drawDoubaoInCage,
  drawGagItemIcon,
} from './src/cast.js';
import { drawRpgWindow } from './src/ui.js';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT_DIR = path.join(HERE, '封面');
const DRAGON_13 = [...'昆图库塔卡提考特苏瓦西拉松'];

function loadCanvasLib() {
  const candidates = [
    '@napi-rs/canvas',
    '/tmp/node_render/node_modules/@napi-rs/canvas',
    path.join(ROOT, 'node_modules/@napi-rs/canvas'),
  ];
  for (const c of candidates) {
    try { return require(c); } catch { /* next */ }
  }
  throw new Error('缺少 @napi-rs/canvas，请先在 /tmp/node_render 安装 @napi-rs/canvas 与 @fontsource/noto-sans-sc');
}

const { createCanvas, loadImage, GlobalFonts, ImageData } = loadCanvasLib();

for (const fp of [
  path.join(ROOT, 'video-fx/assets/fonts/NotoSansSC-Bold.ttf'),
  '/tmp/node_render/node_modules/@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-900-normal.woff',
  '/tmp/node_render/node_modules/@fontsource/noto-sans-sc/files/noto-sans-sc-latin-900-normal.woff',
]) {
  if (fs.existsSync(fp)) GlobalFonts.registerFromPath(fp, 'NotoSansSC');
}

function sha256(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

// 将双层像素帧缓冲 FB(w, h)（含 2w×2h 高清角色层 hi）按精确 ×3 整数倍率渲染为 Canvas
function fbToUpscaledCanvas(fb, lut = LUT.full, scaleHi = 3) {
  const hw = fb.hw, hh = fb.hh;
  const lo = createCanvas(hw, hh);
  const g = lo.getContext('2d');
  const raw = new Uint8ClampedArray(hw * hh * 4);
  const u32 = new Uint32Array(raw.buffer);
  for (let hy = 0; hy < hh; hy++) {
    const ly = hy >> 1;
    const hrow = hy * hw;
    const lrow = ly * fb.w;
    for (let hx = 0; hx < hw; hx++) {
      const hIdx = fb.hi[hrow + hx];
      const idx = hIdx !== T ? hIdx : fb.d[lrow + (hx >> 1)];
      u32[hrow + hx] = lut[idx];
    }
  }
  g.putImageData(new ImageData(raw, hw, hh), 0, 0);

  const out = createCanvas(hw * scaleHi, hh * scaleHi);
  const og = out.getContext('2d');
  og.imageSmoothingEnabled = false;
  og.drawImage(lo, 0, 0, hw * scaleHi, hh * scaleHi);
  return out;
}

// 绘制无缝地牢溶洞背景 + 蓝晶火炬 + 地面石板
function drawDungeonStage(fb, floorY) {
  fb.clear(C.ink);
  fb.gradV(0, 0, fb.w, floorY, [C.ink, C.night, C.navy, C.plum]);

  // 地下溶洞石板地面 + 深色底边安全带
  fb.gradV(0, floorY, fb.w, fb.h - floorY, [C.dslate, C.night, C.ink]);
  fb.hline(0, fb.w - 1, floorY, C.slate);

  // 幽蓝像素水晶火炬点缀
  for (const tx of [12, fb.w - 13]) {
    fb.rect(tx - 2, floorY - 5, 5, 5, C.cyan);
    fb.rect(tx - 1, floorY - 8, 3, 3, C.uiW);
  }

  // 星火粒子点缀（仅分布在中下部舞台区）
  const yMin = Math.round(floorY * 0.42);
  for (let i = 0; i < 16; i++) {
    const px = (i * 37 + 13) % fb.w;
    const py = yMin + ((i * 29) % Math.max(18, floorY - yMin - 12));
    fb.px(px, py, i % 3 === 0 ? C.goldL : C.amber);
  }
}

// 绘制封面版 GPT 龙娘 Boss + 金币宝山 + 13 枚金色龙鳞圆盘（返回圆心供叠加 13 个真名汉字）
function drawCoverDragonBoss(fb, baseX, baseY, radius = 43) {
  fb.ellipse(baseX - 4, baseY + 6, 42, 9, C.goldD);
  fb.ellipse(baseX - 5, baseY + 4, 34, 6, C.gold);
  for (let i = 0; i < 12; i++) {
    fb.px(baseX - 30 + i * 5, baseY + 2 + (i % 3) * 2, C.goldL);
  }

  const bossSpr = getBakedSprite('gpt_boss_rage');
  const bx = baseX - 4;
  const by = baseY + 6;
  if (bossSpr) {
    fb.blitSpriteHi(bossSpr, bx * 2 - (bossSpr.w >> 1), by * 2 - bossSpr.h, false);
  }

  const centers = [];
  for (let i = 0; i < 13; i++) {
    const ang = Math.PI * 1.08 - (i / 12) * Math.PI * 1.16;
    const sx = Math.round(bx + Math.cos(ang) * radius);
    const sy = Math.round((by - 44) - Math.sin(ang) * 38);
    fb.disc(sx, sy, 5.4, C.ink);
    fb.disc(sx, sy, 4.4, i === 6 ? C.goldL : C.gold);
    centers.push([sx, sy]);
  }
  return centers;
}

// 在 13 枚金色龙鳞圆章中心写上「昆图库塔卡提考特苏瓦西拉松」
function drawDragonScaleChars(ctx, centers) {
  ctx.save();
  ctx.font = '900 22px NotoSansSC, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  centers.forEach(([sx, sy], i) => {
    ctx.fillStyle = '#181420';
    ctx.fillText(DRAGON_13[i], sx * 6, sy * 6 + 1);
  });
  ctx.restore();
}

// 绘制五格谐音道具栏（昆特牌 · 提琴 · 烤蛋挞[高亮!] · 苏打 · 马拉松）并返回每格中心像素坐标
function drawGagBar(fb, x, y, slotW = 16, slotH = 17, gap = 2) {
  const pad = 4;
  const totalW = slotW * 5 + gap * 4 + pad * 2;
  const totalH = slotH + pad * 2;
  drawRpgWindow(fb, x, y, totalW, totalH, { skin: 'parchment' });
  const slotCenters = [];
  for (let i = 0; i < 5; i++) {
    const sx = x + pad + i * (slotW + gap);
    const sy = y + pad;
    const isEggTart = i === 2;
    fb.rect(sx, sy, slotW, slotH, isEggTart ? C.goldL : C.sand);
    fb.box(sx, sy, slotW, slotH, isEggTart ? C.scarf : C.dbrown);
    if (isEggTart) fb.box(sx - 1, sy - 1, slotW + 2, slotH + 2, C.scarf);
    drawGagItemIcon(fb, sx + Math.floor(slotW / 2), sy + Math.floor(slotH / 2), i, 0);
    slotCenters.push((sx + slotW / 2) * 6);
  }
  return { slotCenters, bottomPx: (y + totalH) * 6 };
}

function drawPill(ctx, x, y, w, h, r, fill, stroke = null, lineWidth = 2.2) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

function drawCoverText(ctx, str, x, y, size, fill, {
  align = 'center',
  stroke = '#0E1525',
  strokeRatio = 0.15,
  shadowBlur = 16,
  record = null,
} = {}) {
  if (/[0-9]/.test(str)) {
    throw new Error(`封面文字严禁出现阿拉伯数字: "${str}"`);
  }
  ctx.save();
  ctx.font = `900 ${size}px NotoSansSC, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  const m = ctx.measureText(str);
  const left = align === 'center' ? x - m.width / 2 : (align === 'right' ? x - m.width : x);
  const ascent = m.actualBoundingBoxAscent || size * 0.82;
  const descent = m.actualBoundingBoxDescent || size * 0.22;
  const pad = size * 0.08;
  const bounds = {
    left: Math.round(left - pad),
    top: Math.round(y - ascent - pad),
    right: Math.round(left + m.width + pad),
    bottom: Math.round(y + descent + pad),
  };

  if (record) {
    if (
      bounds.left < 32 ||
      bounds.right > record.width - 32 ||
      bounds.top < 24 ||
      bounds.bottom > record.height - 24
    ) {
      throw new Error(`封面文字超出安全区 [${record.ratio}] "${str}": ${JSON.stringify(bounds)}`);
    }
    record.texts.push({ text: str, size, bounds });
  }

  if (shadowBlur > 0) {
    ctx.shadowColor = 'rgba(6, 10, 20, 0.75)';
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetY = 5;
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(3, size * strokeRatio);
    ctx.strokeText(str, x, y);
  }
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = fill;
  ctx.fillText(str, x, y);
  ctx.restore();
  return bounds;
}

function drawItemLabels(ctx, slotCenters, yBaseline) {
  const names = ['昆特牌', '提琴', '烤蛋挞', '苏打', '马拉松'];
  ctx.save();
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  names.forEach((nm, idx) => {
    const hi = idx === 2;
    ctx.font = `900 ${hi ? 23 : 19}px NotoSansSC, sans-serif`;
    ctx.strokeStyle = '#0E1525';
    ctx.lineWidth = 5;
    ctx.strokeText(nm, slotCenters[idx], yBaseline);
    ctx.fillStyle = hi ? '#FFE082' : '#E2E8F0';
    ctx.fillText(nm, slotCenters[idx], yBaseline);
  });
  ctx.restore();
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const reports = [];

  // —— 1) 3:4 竖版封面 (1080 × 1440, 像素舞台 180×240 -> hi 360×480 -> ×3 整数放大) ——
  {
    const w = 1080, h = 1440;
    const fb = new FB(180, 240);
    drawDungeonStage(fb, 210);

    // 左中上：五格谐音道具栏（y=78..103 -> 468..618px，标签在 644px，远高于下方鲸鱼娘头顶 798px！）
    const gag = drawGagBar(fb, 8, 78, 16, 17, 2);

    // 右中上：悬挂金鸟笼与豆包公主（x=136 -> 816px，与左侧道具栏 x=8..104 零重叠！）
    drawDoubaoInCage(fb, 136, 92, 1.2, true, 64);

    // 左下前景：高清大号勇者鲸鱼娘拔剑迎战（脚底 y=207 -> 1242px，头顶约 798px）
    drawWhaleHero(fb, 44, 207, 1.1, { pose: 'sword', scale: 2, scarfLen: 20 });

    // 右下前景：红瞳恶龙 Boss GPT龙娘 + 金币宝山 + 13 枚金色龙鳞真名圆章
    const scaleCenters = drawCoverDragonBoss(fb, 132, 205, 42);

    const canvas = fbToUpscaledCanvas(fb, LUT.full, 3);
    const ctx = canvas.getContext('2d');
    const record = { ratio: '3:4', width: w, height: h, watermark: false, texts: [] };

    // 顶部天幕平滑过渡渐变（无硬切横线）
    const topGrad = ctx.createLinearGradient(0, 0, 0, 445);
    topGrad.addColorStop(0, '#0E1424');
    topGrad.addColorStop(0.72, 'rgba(15, 21, 38, 0.94)');
    topGrad.addColorStop(1, 'rgba(15, 21, 38, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, w, 445);

    drawDragonScaleChars(ctx, scaleCenters);
    drawItemLabels(ctx, gag.slotCenters, gag.bottomPx + 26);

    // 顶部剧名胶囊签（零阿拉伯数字、零水印）
    drawPill(ctx, w / 2 - 210, 52, 420, 56, 28, 'rgba(15, 23, 38, 0.86)', 'rgba(255, 224, 130, 0.68)', 2.4);
    drawCoverText(ctx, '达拉崩吧 · 番外MV', w / 2, 90, 31, '#FFE7A3', {
      stroke: null,
      shadowBlur: 0,
      record,
    });

    // 主视觉双行爆梗大标题
    drawCoverText(ctx, '勇者名字装不下', w / 2, 224, 96, '#F8FAFC', { record });
    drawCoverText(ctx, '把恶龙念成烤蛋挞', w / 2, 352, 98, '#FFE082', { record });

    // 底部梗点副标题（深色石板安全区 y=1322..1390，不挡角色鞋尖 y=1242）
    drawPill(ctx, w / 2 - 324, 1322, 648, 68, 34, 'rgba(14, 20, 34, 0.88)', 'rgba(255, 214, 102, 0.55)', 2.2);
    drawCoverText(ctx, '本鲸拔剑救豆包 · 结局直接烤焦啦', w / 2, 1368, 36, '#FFF6D6', {
      stroke: '#0F172A',
      strokeRatio: 0.10,
      shadowBlur: 6,
      record,
    });

    const outFile = path.join(OUT_DIR, '达拉崩吧MV_封面_3比4.png');
    fs.writeFileSync(outFile, canvas.toBuffer('image/png'));
    const check = await loadImage(path.resolve(outFile));
    if (check.width !== w || check.height !== h) {
      throw new Error(`3:4 封面尺寸异常: ${check.width}x${check.height}`);
    }
    reports.push({ ...record, file: path.relative(ROOT, outFile), sha256: sha256(outFile) });
    console.log('COVER_3_4_OK', outFile);
  }

  // —— 2) 4:3 横版封面 (1440 × 1080, 像素舞台 240×180 -> hi 480×360 -> ×3 整数放大) ——
  {
    const w = 1440, h = 1080;
    const fb = new FB(240, 180);
    drawDungeonStage(fb, 156);

    // 左侧宽画幅加入王冠女王大小姐（y=154 -> 924px，鲜明金橙卷发，不挤占鲸鱼娘空间）
    drawCastSprite(fb, 22, 154, 'claude', 1.2, { pose: 'cheer', facing: 1 });

    // 中左主角：高清大号勇者鲸鱼娘拔剑指向恶龙（x=66 -> 396px，头顶约 498px，远低于左上标题区 328px）
    drawWhaleHero(fb, 66, 155, 1.1, { pose: 'sword', scale: 2, scarfLen: 18 });

    // 中间上方开阔区：五格谐音道具栏（向左微移至 x=74，与右侧「塔/卡」龙鳞圆章留出充裕呼吸间距）
    const gag = drawGagBar(fb, 74, 64, 12, 15, 2);

    // 右上悬挂金鸟笼与豆包公主（背景本身已是深邃夜幕，无需在笼子上方叠暗色遮罩，保持 100% 明亮金笼光泽！）
    drawDoubaoInCage(fb, 160, 42, 1.2, true, 0);

    // 右侧压轴：红瞳恶龙 Boss GPT龙娘（baseX=192，13 枚圆章完整入画！）
    const scaleCenters = drawCoverDragonBoss(fb, 192, 153, 41);

    const canvas = fbToUpscaledCanvas(fb, LUT.full, 3);
    const ctx = canvas.getContext('2d');
    const record = { ratio: '4:3', width: w, height: h, watermark: false, texts: [] };

    // 仅在左上方文字背后叠一层极柔和径向暗晕（x=0..860），完全不碰 x>=880 的金鸟笼豆包！
    const textGlow = ctx.createRadialGradient(420, 180, 60, 420, 180, 460);
    textGlow.addColorStop(0, 'rgba(12, 17, 32, 0.72)');
    textGlow.addColorStop(0.75, 'rgba(12, 17, 32, 0.35)');
    textGlow.addColorStop(1, 'rgba(12, 17, 32, 0)');
    ctx.fillStyle = textGlow;
    ctx.fillRect(0, 0, 890, 360);

    drawDragonScaleChars(ctx, scaleCenters);
    drawItemLabels(ctx, gag.slotCenters, gag.bottomPx + 24);

    // 左上剧名胶囊签 + 双行爆梗大标题（严格对齐《大禹治水》4:3 横版版式）
    drawPill(ctx, 72, 44, 404, 52, 26, 'rgba(15, 23, 38, 0.88)', 'rgba(255, 224, 130, 0.68)', 2.2);
    drawCoverText(ctx, '达拉崩吧 · 番外MV', 274, 80, 29, '#FFE7A3', {
      stroke: null,
      shadowBlur: 0,
      record,
    });

    drawCoverText(ctx, '勇者名字装不下', 74, 194, 88, '#F8FAFC', {
      align: 'left',
      record,
    });
    drawCoverText(ctx, '把恶龙念成烤蛋挞', 74, 308, 92, '#FFE082', {
      align: 'left',
      record,
    });

    // 底部深色石板梗点胶囊条（y=982..1044，不遮挡任何角色鞋尖 y=930）
    drawPill(ctx, w / 2 - 320, 982, 640, 62, 31, 'rgba(14, 20, 34, 0.88)', 'rgba(255, 214, 102, 0.55)', 2.2);
    drawCoverText(ctx, '本鲸拔剑救豆包 · 结局直接烤焦啦', w / 2, 1025, 34, '#FFF6D6', {
      stroke: '#0F172A',
      strokeRatio: 0.10,
      shadowBlur: 6,
      record,
    });

    const outFile = path.join(OUT_DIR, '达拉崩吧MV_封面_4比3.png');
    fs.writeFileSync(outFile, canvas.toBuffer('image/png'));
    const check = await loadImage(path.resolve(outFile));
    if (check.width !== w || check.height !== h) {
      throw new Error(`4:3 封面尺寸异常: ${check.width}x${check.height}`);
    }
    reports.push({ ...record, file: path.relative(ROOT, outFile), sha256: sha256(outFile) });
    console.log('COVER_4_3_OK', outFile);
  }

  const reportPath = path.join(OUT_DIR, '封面_验收.json');
  fs.writeFileSync(reportPath, JSON.stringify({ passed: true, watermark: false, covers: reports }, null, 2) + '\n');
  console.log('COVER_REPORT_OK', reportPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
