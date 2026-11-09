#!/usr/bin/env node
// make_covers.mjs — 生成《我怀疑大禹治水》MV 发布封面（3:4 竖版 1080x1440 + 4:3 横版 1440x1080）
// 以镜 5「凿壁偷光 -> 偷光了我的积蓄（白米饭一粒一粒快速被吸走）」无字幕纯净实渲帧为主画面，零生图、零水印。

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '../engine/room_base.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT_DIR = path.join(ROOT, '番外MV/我怀疑大禹治水/封面');

function sha256(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function drawPill(ctx, x, y, w, h, r, fill, stroke = null, lineWidth = 2) {
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
  stroke = '#101826',
  strokeRatio = 0.14,
  shadowBlur = 16,
  record = null,
} = {}) {
  ctx.save();
  ctx.font = `900 ${size}px NotoSansSC, "Noto Sans CJK SC", sans-serif`;
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
    ctx.shadowColor = 'rgba(8, 13, 24, 0.65)';
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
}

async function renderCleanShot5Plate() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dayu_cover_plate_'));
  // 帧 489 (t = 16.30s)：青花瓷「积蓄」大碗内白米饭正一粒接一粒沿金光光束高速飞入墙洞！
  execFileSync(
    process.execPath,
    [
      path.join(ROOT, 'tools/remotion-engine/render_cli.mjs'),
      '--mode', 'mv',
      '--spec', path.join(ROOT, 'tools/mv_dayu/mv.spec.mjs'),
      '--no-subtitles',
      '--still-frames', '489',
      '--out-dir', tmpDir,
    ],
    { cwd: ROOT, stdio: 'inherit' }
  );
  const plateFile = path.join(tmpDir, 'frame_0489.png');
  if (!fs.existsSync(plateFile)) {
    throw new Error(`未找到镜 5 封面底板帧: ${plateFile}`);
  }
  const img = await loadImage(path.resolve(plateFile));
  fs.rmSync(tmpDir, { recursive: true, force: true });
  return img;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const plate = await renderCleanShot5Plate();
  const reports = [];

  // 1) 3:4 竖版封面 (1080 x 1440)
  {
    const w = 1080;
    const h = 1440;
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    const record = { ratio: '3:4', width: w, height: h, watermark: false, texts: [] };

    // 夜读深蓝灰底色 + 底部书房暗木地板自然延展
    ctx.fillStyle = '#2B3444';
    ctx.fillRect(0, 0, w, h);

    // 完整保留主角惊呆 + 青花瓷「积蓄」米饭碗 + 一粒粒飞走的大米 + 右侧凿穿砖墙洞（srcX=455..1715, 宽 1260 等比缩至 1080）
    const srcX = 455;
    const srcW = 1260;
    const scale = w / srcW;
    const dstH = Math.round(plate.height * scale); // 926px
    const dstY = 392;
    ctx.drawImage(plate, srcX, 0, srcW, plate.height, 0, dstY, w, dstH);

    // 顶部与原画天际无缝融合渐变 + 底部深色地面自然延展
    const topGrad = ctx.createLinearGradient(0, 0, 0, dstY + 120);
    topGrad.addColorStop(0, '#1D2533');
    topGrad.addColorStop(0.72, '#2B3444');
    topGrad.addColorStop(1, 'rgba(43, 52, 68, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, w, dstY + 120);

    ctx.fillStyle = '#231F20';
    ctx.fillRect(0, dstY + dstH - 4, w, h - (dstY + dstH - 4));

    // 顶部剧名胶囊签（封面版式约定：标题文字不写阿拉伯数字；非 Day 正传剧本门禁，见 agent.md 文首 2026-11-09 覆盖条）
    drawPill(ctx, w / 2 - 228, 54, 456, 56, 28, 'rgba(15, 23, 38, 0.82)', 'rgba(255, 224, 130, 0.62)', 2.2);
    drawCoverText(ctx, '我怀疑大禹治水 · 番外MV', w / 2, 92, 31, '#FFE7A3', {
      stroke: null,
      shadowBlur: 0,
      record,
    });

    // 主视觉双行爆梗大标题
    drawCoverText(ctx, '我怀疑凿壁偷光', w / 2, 228, 96, '#F8FAFC', { record });
    drawCoverText(ctx, '偷光了我的积蓄', w / 2, 358, 108, '#FFE082', { record });

    // 底部梗点副标题（落在深色地面安全区，不挡角色脚尖）
    drawPill(ctx, w / 2 - 280, 1318, 560, 68, 34, 'rgba(15, 22, 36, 0.86)', 'rgba(255, 214, 102, 0.5)', 2);
    drawCoverText(ctx, '连白米饭都一粒一粒吸走啦', w / 2, 1364, 38, '#FFF6D6', {
      stroke: '#0F172A',
      strokeRatio: 0.10,
      shadowBlur: 6,
      record,
    });

    const outFile = path.join(OUT_DIR, '大禹治水MV_封面_3比4.png');
    fs.writeFileSync(outFile, canvas.toBuffer('image/png'));
    const check = await loadImage(path.resolve(outFile));
    if (check.width !== w || check.height !== h) {
      throw new Error(`3:4 封面尺寸异常: ${check.width}x${check.height}`);
    }
    reports.push({ ...record, file: path.relative(ROOT, outFile), sha256: sha256(outFile) });
    console.log('COVER_3_4_OK', outFile);
  }

  // 2) 4:3 横版封面 (1440 x 1080)
  {
    const w = 1440;
    const h = 1080;
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    const record = { ratio: '4:3', width: w, height: h, watermark: false, texts: [] };

    ctx.fillStyle = '#2B3444';
    ctx.fillRect(0, 0, w, h);

    // 完整纳入左侧提灯 Kimi + 惊呆主角 + 青花瓷「积蓄」大碗 + 一粒粒飞走的大米 + 右侧凿穿砖墙洞（srcX=45..1725 等比缩至 1440）
    const srcX = 45;
    const srcW = 1680;
    const scale = w / srcW;
    const dstH = Math.round(plate.height * scale); // 926px
    const dstY = h - dstH; // 154px，底部严丝合缝贴合 1080 底边
    ctx.drawImage(plate, srcX, 0, srcW, plate.height, 0, dstY, w, dstH);

    // 顶部夜空平滑衔接渐变（覆盖 y=0..240，确保大标题底色纯净且不压任何人物与砖洞）
    const topGrad = ctx.createLinearGradient(0, 0, 0, dstY + 110);
    topGrad.addColorStop(0, '#1D2533');
    topGrad.addColorStop(0.7, '#2B3444');
    topGrad.addColorStop(1, 'rgba(43, 52, 68, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, w, dstY + 110);

    // 左中上方主标题组（完全位于 Kimi 与主角头顶上方 y=42..330，右侧砖洞 y=398 毫发无遮挡）
    drawPill(ctx, 72, 46, 430, 52, 26, 'rgba(15, 23, 38, 0.82)', 'rgba(255, 224, 130, 0.62)', 2);
    drawCoverText(ctx, '我怀疑大禹治水 · 番外MV', 287, 82, 29, '#FFE7A3', {
      stroke: null,
      shadowBlur: 0,
      record,
    });

    drawCoverText(ctx, '我怀疑凿壁偷光', 74, 198, 92, '#F8FAFC', {
      align: 'left',
      record,
    });
    drawCoverText(ctx, '偷光了我的积蓄', 74, 316, 104, '#FFE082', {
      align: 'left',
      record,
    });

    // 底部深色地面梗点条（y=986..1048，落在地板暗区，零水印）
    drawPill(ctx, w / 2 - 285, 982, 570, 62, 31, 'rgba(15, 22, 36, 0.86)', 'rgba(255, 214, 102, 0.5)', 2);
    drawCoverText(ctx, '连白米饭都一粒一粒吸走啦', w / 2, 1025, 35, '#FFF6D6', {
      stroke: '#0F172A',
      strokeRatio: 0.10,
      shadowBlur: 6,
      record,
    });

    const outFile = path.join(OUT_DIR, '大禹治水MV_封面_4比3.png');
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
