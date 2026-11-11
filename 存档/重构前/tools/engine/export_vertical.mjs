// export_vertical.mjs — 一源双端：原生重排导出竖屏满铺版
// 禁止对横屏成片做像素裁剪转码；同一场景状态在竖屏画布上分层重渲：
// 顶部钩子标题区 / 中部主舞台（相机倍率放大）/ 下部安全区原生字幕。
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createCanvas, resolveFfmpeg, FPS, drawText, drawOutlinedText } from './room_base.mjs';
import { loadSpec, createEpisodeRenderer, validateInputs } from './render_episode.mjs';

export const VERTICAL_LAYOUTS = Object.freeze({
  '9:16': Object.freeze({ width: 1080, height: 1920, title: { y0: 130, y1: 370 }, stage: { y0: 380, y1: 1380 }, subtitle: { x: 70, y: 1410, w: 890, h: 150 }, zoomMul: 1.38 }),
  '3:4': Object.freeze({ width: 1080, height: 1440, title: { y0: 90, y1: 270 }, stage: { y0: 280, y1: 1080 }, subtitle: { x: 70, y: 1110, w: 890, h: 140 }, zoomMul: 1.38 }),
});

function argOf(argv, k) { const i = argv.indexOf(k); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null; }

export function verticalTitleLines(spec) {
  if (Array.isArray(spec.verticalTitle) && spec.verticalTitle.length) return spec.verticalTitle.slice(0, 2);
  return [spec.opener.headlinePrefix || '', spec.opener.headlineHighlight || ''];
}

export function drawVerticalFrame(ctx, renderer, t, layout) {
  const { width, height } = layout;
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#0B2440');
  grad.addColorStop(1, '#123B59');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  // 顶部钩子标题（双行大字）
  const lines = verticalTitleLines(renderer.spec);
  ctx.textAlign = 'center';
  lines.forEach((ln, i) => {
    if (!ln) return;
    drawOutlinedText(ctx, ln, width / 2, layout.title.y0 + 78 + i * 108, i === 1 ? 100 : 92, i === 1 ? '#FFD166' : '#FFFFFF');
  });
  // 中部主舞台：逻辑场景按竖屏构图倍率原生重绘（裁切由画布裁剪区完成，非成片转码裁剪）
  const stageH = layout.stage.y1 - layout.stage.y0;
  const scale = stageH / 720;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, layout.stage.y0, width, stageH);
  ctx.clip();
  ctx.translate(width / 2 - 640 * scale, layout.stage.y0);
  ctx.scale(scale, scale);
  renderer.renderScene(ctx, t, { zoomMul: layout.zoomMul });
  ctx.restore();
  // 下部安全区原生字幕（避开右侧互动列与底部文案区）
  const s = renderer.cues && renderer.subdataScreens
    ? renderer.subdataScreens.find((x) => t >= x.start && t < x.end)
    : null;
  return { titleLines: lines, subtitle: s?.text || null };
}

export async function createVerticalRenderer({ spec, alignment, subdata }) {
  const r = await createEpisodeRenderer({ spec, alignment, subdata });
  return { ...r, subdataScreens: subdata.screens };
}

export async function main(argv = process.argv.slice(2)) {
  const specPath = argOf(argv, '--spec');
  const audio = argOf(argv, '--audio') || argOf(argv, '--voice');
  const alignmentPath = argOf(argv, '--alignment');
  const subsPath = argOf(argv, '--subtitle-file');
  const ratio = argOf(argv, '--ratio') || '9:16';
  if (!specPath || !audio || !alignmentPath || !subsPath) throw new Error('用法：--spec <spec> --audio <混音轨或干声> --alignment <json> --subtitle-file <json> [--ratio 9:16|3:4] [--out <mp4>|--test]');
  const layout = VERTICAL_LAYOUTS[ratio];
  if (!layout) throw new Error(`不支持的画幅：${ratio}`);
  const spec = await loadSpec(specPath);
  const alignment = JSON.parse(fs.readFileSync(alignmentPath, 'utf8'));
  const subdata = JSON.parse(fs.readFileSync(subsPath, 'utf8'));
  // 音轨可为最终混音 MP4/WAV；实测轴仍按干声 WAV 校验哈希时，--audio 允许与 --voice 不同。
  const voiceForCheck = argOf(argv, '--voice');
  if (voiceForCheck) validateInputs({ voice: voiceForCheck, alignment, subdata });
  else if (alignment.measured !== true || subdata.measured !== true) throw new Error('竖屏导出同样只接受 measured=true 实测轴');
  const renderer = await createVerticalRenderer({ spec, alignment, subdata });
  const { width, height } = layout;

  if (argv.includes('--test')) {
    const canvas = createCanvas(width, height);
    const g = canvas.getContext('2d');
    const samples = [0, 0.8, 1.8].filter((x) => x < renderer.duration).map((t) => ({ time: t, ...drawVerticalFrame(g, renderer, t, layout), width, height }));
    const sub = layout.subtitle;
    // 安全区断言：字幕框右缘不进入右侧互动列，下缘不进入底部文案区
    if (sub.x + sub.w > 960 && width === 1080) throw new Error('竖屏字幕侵入右侧互动列');
    if (sub.y + sub.h > 1620 && height === 1920) throw new Error('竖屏字幕侵入底部文案区');
    console.log('PASS vertical', ratio, width, 'x', height, JSON.stringify(samples.map((s) => s.subtitle)));
    return { width, height, samples };
  }

  const out = argOf(argv, '--out') || path.join(path.dirname(path.resolve(specPath)), `Day${spec.day}_抖音竖屏版_${ratio.replace(':', '比')}.mp4`);
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  const canvas = createCanvas(width, height);
  const g = canvas.getContext('2d');
  const sub = renderer.sub;
  const ff = spawn(resolveFfmpeg(), ['-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${width}x${height}`, '-r', String(FPS), '-i', '-', '-i', audio, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-crf', '19', '-preset', 'veryfast', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ac', '2', '-ar', '44100', '-b:a', '160k', '-af', 'apad', '-t', String(renderer.frames / FPS), '-movflags', '+faststart', out], { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  ff.stderr.on('data', (d) => { err += d; });
  ff.stdin.on('error', () => {});
  const done = new Promise((res, rej) => { ff.on('error', rej); ff.on('close', (c) => (c === 0 ? res() : rej(new Error(err.slice(-2000))))); });
  for (let f = 0; f < renderer.frames; f++) {
    const t = f / FPS;
    g.setTransform(1, 0, 0, 1, 0, 0);
    drawVerticalFrame(g, renderer, t, layout);
    // 下部字幕原生绘制（放大字号，安全区内）
    const s = subdata.screens.find((x) => t >= x.start && t < x.end);
    if (s) {
      const box = layout.subtitle;
      g.save();
      g.beginPath();
      g.roundRect(box.x, box.y, box.w, box.h, 18);
      g.fillStyle = 'rgba(9,22,54,0.92)';
      g.fill();
      g.lineWidth = 2.4;
      g.strokeStyle = '#48C8FF';
      g.stroke();
      const lines = sub.wrap(s.text, 760);
      lines.forEach((ln, i) => drawOutlinedText(g, ln, box.x + box.w / 2, box.y + box.h / 2 + (i - (lines.length - 1) / 2) * 52, 44, '#FFFFFF'));
      g.restore();
    }
    const b = canvas.data();
    if (!ff.stdin.write(Buffer.from(b.buffer, b.byteOffset, b.byteLength))) await Promise.race([new Promise((res) => ff.stdin.once('drain', res)), done]);
    if (f % 150 === 0) console.log(`${f}/${renderer.frames}`);
  }
  ff.stdin.end();
  await done;
  console.log('DONE', out);
  return { out, width, height };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
