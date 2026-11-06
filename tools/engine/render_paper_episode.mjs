// render_paper_episode.mjs — Day13+ 纸艺 Q 版通用单集渲染器
//
// 与历史 render_episode.mjs 并存：Day12 及以前继续走旧引擎，不重渲历史片。
// 本渲染器只吃 paperVersion=1 的 spec，强制同屏 ≤2 人、pets 真帧表演。
//
//   node tools/engine/render_paper_episode.mjs --spec <episode.paper.spec.mjs> \
//        [--voice a.wav --alignment voice_alignment.json --subtitle-file subs.json] \
//        [--stills dir] [--storyboard dir] [--catalog out.png] [--out final.mp4]
//
// 无实测轴时只允许 planning：可出分镜静帧/目录/无声结构样片，产物显式标注 measured=false。
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import * as P from './paper_stage.mjs';
import { loadPetsActors, drawPetsActor, stateAt, drawCatalog, loadCast } from './pets_actor.mjs';
import { validatePaperSpec, MAX_ON_SCREEN } from './paper_contract.mjs';
import { createDay2Subtitle } from '../字幕/day2_style_sub.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const { W, H } = P;
export const FPS = 30;

for (const [file, family] of [['NotoSansSC-Bold.ttf', 'Noto Sans SC'], ['ZCOOLKuaiLe-Regular.ttf', 'ZCOOL KuaiLe']]) {
  const p = path.join(ROOT, 'video-fx/assets/fonts', file);
  if (fs.existsSync(p)) GlobalFonts.registerFromPath(p, family);
}

const argOf = (argv, k) => { const i = argv.indexOf(k); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null; };
const has = (argv, k) => argv.includes(k);

export async function loadPaperSpec(specPath) {
  const mod = await import(pathToFileURL(path.resolve(specPath)).href);
  const spec = mod.default || mod.SPEC || mod.spec;
  if (!spec) throw new Error('spec 必须 default 导出对象');
  return spec;
}

/** planning 估时轴：显式 measured=false，不得当正式字幕依据。 */
export function planningCues(lines, rate = 3.35) {
  let t = 0;
  return lines.map((text, i) => {
    const chars = [...text.replace(/[\s，。！？…—；：、]/g, '')].length;
    const dur = Math.max(1.2, chars / rate);
    const cue = { index: i + 1, text, start: t, end: t + dur, measured: false };
    t += dur;
    return cue;
  });
}

export function buildPaperShots(spec, cues) {
  return spec.shots.map((s, i) => ({
    ...s, index: i,
    start: cues[s.fromLine - 1].start,
    end: cues[s.toLine - 1].end,
  }));
}

function ffmpegBin() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  const py = process.env.PYTHON || '/home/user/.cache/mv-venv/bin/python';
  try {
    return execFileSync(py, ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { return 'ffmpeg'; }
}

// 景别预设：≤2 人后主角可以更大，近景真的推到位而不是只改标签。
export const FRAMINGS = {
  wide: { z: 1.0, cx: 960, cy: 540 },
  two_shot: { z: 1.06, cx: 960, cy: 560 },
  medium: { z: 1.2, cx: 900, cy: 600 },
  close: { z: 1.45, cx: 820, cy: 640 },
  insert: { z: 1.6, cx: 960, cy: 560 },
};

const SETS = {
  sea_room: (ctx, t) => { P.seaRoom(ctx, t); P.bubbles(ctx, t, 12); },
  shore: (ctx, t) => {
    ctx.fillStyle = '#cfe6f2'; ctx.fillRect(-200, -200, W + 400, H + 400);
    P.paper(ctx, P.circlePath(1560, 180, 90), '#ffe9a8');
    P.cloud(ctx, 260 + P.jitter(t, 1), 150, 1.6, '#ffffff');
    P.cloud(ctx, 1040 + P.jitter(t, 2), 120, 1.3, '#f4fbff');
    P.hill(ctx, 700, 18, '#8fc7d8', 2);
    P.hill(ctx, 860, 14, '#e9d9b8', 7);
  },
  dusk_hill: (ctx, t) => {
    ctx.fillStyle = '#f4c98a'; ctx.fillRect(-200, -200, W + 400, H + 400);
    P.paper(ctx, P.circlePath(1400, 300, 110), '#ff9a6a');
    P.cloud(ctx, 300 + P.jitter(t, 3), 160, 1.6, '#ffe0b8');
    P.hill(ctx, 720, 30, '#d9a86c', 3);
    P.hill(ctx, 860, 22, '#b98a5e', 8);
  },
};

function drawProps(ctx, shot, lt, t) {
  for (const p of shot.props || []) {
    const k = p.enterAt != null ? P.smooth(p.enterAt, p.enterAt + (p.enterDur ?? 0.4), lt) : 1;
    if (k <= 0) continue;
    ctx.save();
    ctx.globalAlpha = k;
    const y = (p.y ?? 620) + (1 - k) * 30;
    if (p.kind === 'desk') P.desk(ctx, p.x ?? 620, y, p.w ?? 620);
    else if (p.kind === 'bowl') P.bowl(ctx, p.x ?? 900, y, p.scale ?? 1.2);
    else if (p.kind === 'sheet') P.sheetCard(ctx, p.x ?? 700, y, p.w ?? 380, p.h ?? 200, { title: p.title, rows: p.rows, rot: (p.rot ?? 0) + P.jitter(t, p.x ?? 1, 0.004), marks: p.marks });
    else if (p.kind === 'sign') P.signCard(ctx, p.x ?? 300, y, p.w ?? 240, p.h ?? 70, p.text ?? '');
    else if (p.kind === 'plant') P.plant(ctx, p.x ?? 1700, y, p.scale ?? 1.2);
    else if (p.kind === 'puzzle') P.paper(ctx, P.puzzlePath(p.x ?? 800, y, p.w ?? 180, p.h ?? 150, [1, -1, 1, -1]), p.fill ?? '#ffd76a', { dy: 8 });
    else throw new Error(`未知道具 kind=${p.kind}`);
    ctx.restore();
  }
}

export async function createPaperFilm(spec, { cues }) {
  const validation = validatePaperSpec(spec, { cues });
  const shots = buildPaperShots(spec, cues);
  const ids = [...new Set(shots.flatMap((s) => (s.actors || []).map((a) => a.id)))];
  const actors = await loadPetsActors(ids);
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const measure = createCanvas(8, 8).getContext('2d');
  const SUB = createDay2Subtitle({ measureCtx: measure, fontOf: (px, w) => `${w} ${px}px "Noto Sans SC"` });
  const duration = cues[cues.length - 1].end + (spec.tailSeconds ?? 0.24);
  const shotAt = (t) => shots.find((s) => t >= s.start && t < s.end) || shots[shots.length - 1];
  const cueAt = (t) => cues.find((c) => t >= c.start && t < c.end) || null;

  function renderAt(t) {
    const shot = shotAt(t);
    const lt = t - shot.start;
    const dur = Math.max(0.001, shot.end - shot.start);
    // 景别真的改变构图：framing 决定基础缩放与观察中心，push 只做一次慢推。
    const framing = FRAMINGS[shot.framing];
    if (!framing) throw new Error(`${shot.id} 未知景别 ${shot.framing}`);
    const cx = shot.camera?.cx ?? framing.cx ?? W / 2;
    const cy = shot.camera?.cy ?? framing.cy ?? H / 2;
    const fz = (shot.camera?.z ?? framing.z) + (shot.camera?.push ?? 0.05) * P.ease(P.clamp(lt / dur, 0, 1));
    const cam = { zoom: fz, px: (shot.camera?.px ?? 0) * lt, py: 0 };
    const layer = P.makeLayer(ctx, cam);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const setFn = SETS[shot.set];
    if (!setFn) throw new Error(`未知纸艺场景 set=${shot.set}`);
    // 舞台整体按景别取景；字幕/角标不受影响（在 restore 之后画）
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.translate(W / 2 - cx, H / 2 - cy); ctx.translate(-W / 2, -H / 2);
    layer(0.25, (c) => setFn(c, t));
    layer(0.75, (c) => drawProps(c, shot, lt, t));
    layer(1, (c) => {
      if ((shot.actors || []).length > MAX_ON_SCREEN) throw new Error(`${shot.id} 渲染期同屏超员`);
      for (const a of shot.actors || []) {
        const st = stateAt(a.states, lt);
        let x = a.x;
        // 有 walk 时 x 必须等于 walk.to，位移只由步态驱动一次（禁止调用方再 lerp）。
        if (a.walk) {
          if (Math.abs(a.x - a.walk.to) > 0.5) {
            throw new Error(`${shot.id} ${a.id} walk 契约违反：x 必须等于 walk.to`);
          }
          x = P.lerp(a.walk.from, a.walk.to, P.smooth(0, a.walk.dur, lt));
        } else if (a.enter) {
          // 静态纸偶的入画调度：画外推入后锁死，不是整图弹跳。
          const d = a.enter.dur ?? 0.7;
          x = P.lerp(a.enter.from, a.x, P.smooth(0, d, lt));
        }
        let flip = !!a.flip;
        if (a.faceAt != null && lt >= a.faceAt) flip = !flip;
        drawPetsActor(c, actors[a.id], { x, y: a.y, h: a.h, state: st.state, local: st.local, flip });
      }
      // 画面细节层在角色之后、暖光之前，保证空气感但不盖住表演。
      P.drawDetails(c, t, shot.details || []);
    });
    ctx.restore();
    P.lightShaft(ctx, W * 0.3, 0, 260, 720, 0.10);
    P.warmLight(ctx, 0.16);
    P.finishPaper(ctx, createCanvas);
    // 字幕/角标固定屏幕坐标，不随舞台推近缩放
    const cue = cueAt(t);
    if (cue && spec.subtitles !== false) {
      SUB.draw(ctx, { lines: SUB.wrap(cue.text), speaker: spec.speaker || '本鲸', vis: P.smooth(cue.start, cue.start + 0.12, t), W, H });
    }
    ctx.save();
    ctx.font = '18px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(246,236,216,0.78)';
    ctx.fillText('非官方同人 · AI生成 · 剧情演绎', W - 36, 42);
    ctx.textAlign = 'left'; ctx.font = '20px "Noto Sans SC", sans-serif';
    ctx.fillStyle = 'rgba(246,236,216,0.66)';
    ctx.fillText(`Day${spec.day} · ${spec.title || ''}`, 36, 42);
    if (!cues[0]?.measured) {
      ctx.fillStyle = 'rgba(217,83,79,0.9)'; ctx.font = '700 20px "Noto Sans SC", sans-serif';
      ctx.fillText('无声规划样片 · measured=false', 36, 74);
    }
    ctx.restore();
    return { canvas, shot: shot.id, t };
  }
  return { canvas, ctx, renderAt, shots, cues, duration, validation, actors };
}

async function main() {
  const argv = process.argv.slice(2);
  const specPath = argOf(argv, '--spec');
  if (!specPath) throw new Error('需要 --spec');
  const spec = await loadPaperSpec(specPath);
  const alignmentPath = argOf(argv, '--alignment');
  let cues;
  if (alignmentPath) {
    const al = JSON.parse(fs.readFileSync(alignmentPath, 'utf8'));
    if (al.measured !== true) throw new Error('正式渲染只接受 measured=true 实测轴');
    const voice = argOf(argv, '--voice');
    if (!voice) throw new Error('实测轴渲染需要 --voice');
    const sha = createHash('sha256').update(fs.readFileSync(voice)).digest('hex');
    if (sha !== al.source_sha256) throw new Error('音源 SHA256 与实测轴不匹配');
    cues = al.cues.map((c) => ({ ...c, measured: true }));
    if (spec.status !== 'ready') throw new Error('有实测轴时 spec 须 status=ready');
  } else {
    const scriptPath = argOf(argv, '--script');
    if (!scriptPath) throw new Error('planning 需要 --script 以生成估时轴');
    if (spec.status !== 'planning') throw new Error('无实测轴只能 planning');
    const lines = fs.readFileSync(scriptPath, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
    cues = planningCues(lines, spec.estimatedRate ?? 3.35);
  }
  const film = await createPaperFilm(spec, { cues });
  console.log('paper contract:', JSON.stringify(film.validation));

  const catalogOut = argOf(argv, '--catalog');
  if (catalogOut) {
    const sheet = await drawCatalog(Object.keys(film.actors));
    fs.mkdirSync(path.dirname(path.resolve(catalogOut)), { recursive: true });
    fs.writeFileSync(catalogOut, sheet.toBuffer('image/png'));
    console.log('catalog', catalogOut);
  }

  const storyboardOut = argOf(argv, '--storyboard');
  if (storyboardOut) {
    fs.mkdirSync(storyboardOut, { recursive: true });
    const cols = 3, cw = 640, ch = 360, label = 40;
    const sheet = createCanvas(cols * cw, Math.ceil(film.shots.length / cols) * (ch + label));
    const s = sheet.getContext('2d');
    s.fillStyle = '#20415c'; s.fillRect(0, 0, sheet.width, sheet.height);
    for (let i = 0; i < film.shots.length; i++) {
      const sh = film.shots[i];
      const t = sh.start + (sh.end - sh.start) * 0.55;
      const { canvas } = film.renderAt(t);
      fs.writeFileSync(path.join(storyboardOut, `${sh.id}.png`), canvas.toBuffer('image/png'));
      const x = (i % cols) * cw, y = Math.floor(i / cols) * (ch + label);
      s.drawImage(canvas, x, y, cw, ch);
      s.fillStyle = '#f6ecd8'; s.font = '20px "Noto Sans SC", sans-serif';
      s.fillText(`${sh.id} · ${sh.framing} · ${sh.actors.length}人 · ${t.toFixed(2)}s`, x + 12, y + ch + 26);
    }
    fs.writeFileSync(path.join(storyboardOut, '分镜总览.png'), sheet.toBuffer('image/png'));
    console.log('storyboard', storyboardOut, film.shots.length, 'shots (max on screen', MAX_ON_SCREEN, ')');
  }

  const stillsOut = argOf(argv, '--stills');
  if (stillsOut) {
    fs.mkdirSync(stillsOut, { recursive: true });
    for (const sh of film.shots) {
      for (const frac of [0.15, 0.5, 0.85]) {
        const t = sh.start + (sh.end - sh.start) * frac;
        const { canvas } = film.renderAt(t);
        fs.writeFileSync(path.join(stillsOut, `${sh.id}_${frac.toFixed(2)}.png`), canvas.toBuffer('image/png'));
      }
    }
    console.log('stills', stillsOut);
  }

  const out = argOf(argv, '--out');
  if (out) {
    const measured = cues[0]?.measured === true;
    if (!measured && !has(argv, '--silent-planning')) {
      throw new Error('无实测轴只能出无声规划样片：显式加 --silent-planning');
    }
    const frames = Math.round(film.duration * FPS);
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    const args = ['-y', '-hide_banner', '-loglevel', 'error',
      '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-framerate', String(FPS), '-i', 'pipe:0'];
    if (measured) args.push('-i', argOf(argv, '--voice'));
    args.push('-map', '0:v:0');
    if (measured) args.push('-map', '1:a:0', '-c:a', 'copy');
    args.push('-vf', 'format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
      '-movflags', '+faststart', path.resolve(out));
    const ff = spawn(ffmpegBin(), args, { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((res, rej) => { ff.on('exit', (c) => c === 0 ? res() : rej(new Error('ffmpeg exit ' + c))); ff.on('error', rej); });
    ff.stdin.on('error', (e) => console.error('[ffmpeg stdin]', e.message));
    const t0 = Date.now();
    for (let f = 0; f < frames; f++) {
      const { canvas } = film.renderAt(f / FPS);
      const buf = canvas.data();
      await new Promise((res, rej) => ff.stdin.write(buf, (e) => e ? rej(e) : res()));
      if ((f + 1) % 150 === 0 || f === frames - 1) console.log(`frame ${f + 1}/${frames} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    }
    ff.stdin.end();
    await done;
    const report = {
      schema: 'newday-q-pets/render@1', day: spec.day, out: path.resolve(out),
      frames, fps: FPS, width: W, height: H, duration: film.duration,
      measured, silentPlanning: !measured, maxOnScreen: MAX_ON_SCREEN,
      castUsed: film.validation.castUsed,
      sha256: createHash('sha256').update(fs.readFileSync(out)).digest('hex'),
      bytes: fs.statSync(out).size,
      note: measured ? '实测轴有声渲染；仍需四阶段门禁与人工观影' : '无声结构样片，估时轴 measured=false，不是正式字幕依据',
    };
    fs.writeFileSync(path.resolve(out).replace(/\.mp4$/, '.render.json'), JSON.stringify(report, null, 2) + '\n');
    console.log('saved', out, JSON.stringify({ frames, measured, maxOnScreen: MAX_ON_SCREEN }));
  }
  if (!out && !storyboardOut && !stillsOut && !catalogOut) console.log('未指定产物；契约检查通过。用 --storyboard/--stills/--catalog/--out 出件。');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(String(e.message || e)); process.exit(1); });
}
