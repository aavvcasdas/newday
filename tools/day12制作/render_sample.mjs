// Explicit silent director preview, not a production/voice renderer. Never marks an estimated axis measured.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import spec from './episode.spec.mjs';
import { createPlanningPreview, shotActorPlans, resolveActor, propStateAt } from '../engine/render_episode.mjs';
import { createCanvas, GlobalFonts, W, H, FPS, resolveFfmpeg, drawText } from '../engine/room_base.mjs';
import { actorAnchors } from '../互动元素/actor_contacts.mjs';
import { createDay2Subtitle } from '../字幕/day2_style_sub.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'Day12/样片/Day12_四段导演样片_无声.mp4');
const EVIDENCE = path.join(ROOT, 'Day12/样片/review_preview_frames');
const sha = (s) => createHash('sha256').update(s).digest('hex');
export const SELECTED = ['C01', 'C03', 'C07', 'C09'];

export function buildSamplePlan(script, source = spec) {
  if (sha(script) !== source.sourceScriptSha256) throw new Error('当前稿哈希已变，样片不能沿用旧规划');
  let frame = 0;
  const cues = script.trim().split('\n').map((text, index) => {
    const start = frame / FPS;
    // Only a silent readability/timing hypothesis. No char timings, no audio source or ASR claims.
    frame += Math.ceil(Math.max(2.2, text.replace(/[，。！？：、]/g, '').length / 4.5 + 0.35) * FPS);
    return { line: index + 1, text, start, end: frame / FPS };
  });
  const sub = createDay2Subtitle({ fontOf: (n, w) => `${w} ${n}px NotoSansSC`, measureCtx: createCanvas(1, 1).getContext('2d') });
  const screens = cues.flatMap((c) => {
    const chunks = sub.clauses(c.text, [], c.start, c.end);
    for (let i = 0; i < chunks.length - 1; i++) {
      if (chunks[i].end - chunks[i].start < 1) {
        chunks[i + 1].text = chunks[i].text + chunks[i + 1].text;
        chunks[i + 1].start = chunks[i].start; chunks.splice(i, 1); i--;
      }
    }
    return chunks;
  });
  let outputFrame = 0;
  const clips = SELECTED.map((id) => {
    const shot = source.shots.find((s) => s.id === id);
    const sourceStartFrame = Math.round(cues[shot.fromLine - 1].start * FPS);
    const sourceEndFrame = Math.round(cues[shot.toLine - 1].end * FPS);
    const count = sourceEndFrame - sourceStartFrame;
    const clip = { id, fromLine: shot.fromLine, toLine: shot.toLine, sourceStartFrame, sourceEndFrame, outputStartFrame: outputFrame, outputEndFrame: outputFrame + count };
    outputFrame += count;
    return clip;
  });
  return { measured: false, audioSource: null, type: 'silent_director_excerpt', sourceScriptSha256: sha(script), fps: FPS, frames: outputFrame, duration: outputFrame / FPS, cues, screens, clips };
}

async function main() {
  if (!GlobalFonts.has('NotoSansSC')) throw new Error('缺原中文字体：先运行restore_sample_assets.py');
  const plan = buildSamplePlan(fs.readFileSync(path.join(ROOT, 'Day12/Day12配音台词.txt'), 'utf8'));
  const r = await createPlanningPreview({ spec, alignment: { measured: false, cues: plan.cues }, subdata: { measured: false, screens: plan.screens } });
  fs.mkdirSync(EVIDENCE, { recursive: true });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'tools/day12制作/sample_plan.json'), JSON.stringify(plan, null, 2) + '\n');
  const canvas = createCanvas(1920, 1080); const g = canvas.getContext('2d');
  const trace = [];
  function render(f) {
    const clip = plan.clips.find((c) => f >= c.outputStartFrame && f < c.outputEndFrame);
    const rawTime = (clip.sourceStartFrame + f - clip.outputStartFrame) / FPS;
    g.setTransform(1.5, 0, 0, 1.5, 0, 0); g.clearRect(0, 0, W, H);
    const info = r.renderFrame(g, rawTime);
    const shot = r.shotAt(rawTime);
    const actors = shotActorPlans(spec, shot, info.isOpener).map((a) => resolveActor(a, rawTime, info.line, plan.cues));
    const anchors = actors.map((a) => actorAnchors(a));
    const label = { C01: '回归', C03: '误答', C07: '纠偏 · 同落点前后切镜', C09: '收束' }[clip.id];
    g.save(); g.fillStyle = 'rgba(9,22,54,.9)';g.fillRect(1020, 62, 248, 35);g.restore();
    drawText(g, label, 1144, 80, 17, '#FFE8A3');
    if (info.shot !== clip.id) throw new Error('样片映射越过预定镜头');
    trace.push({ frame: f, sourceTime: rawTime, shot: info.shot, camera: info.camera,
      actors: actors.map((a, i) => ({ pose: a.pose, x: a.x, y: a.y, lean: a.lean, squash: a.squash, anim: a.anim, anchors: anchors[i] })),
      props: (shot.companionProps || []).filter((p) => rawTime >= (p.fromLine ? plan.cues[p.fromLine - 1].start : shot.start)).map((p) => ({ id: p.propId, x: p.x, y: p.y, state: propStateAt(p, rawTime, plan.cues) })),
      subtitle: plan.screens.find((s) => rawTime >= s.start && rawTime < s.end)?.text || '' });
  }
  if (process.argv.includes('--stills')) {
    for (const clip of plan.clips) {
      for (const age of [0.3, 1.7, (clip.outputEndFrame - clip.outputStartFrame) / FPS - 0.5]) {
        const f = clip.outputStartFrame + Math.floor(age * FPS);render(f);
        fs.writeFileSync(path.join(EVIDENCE, `${clip.id}_${age.toFixed(2)}.jpg`), canvas.toBuffer('image/jpeg'));
      }
    }
    console.log('STILLS', plan.duration, EVIDENCE); return;
  }
  const ff = spawn(resolveFfmpeg(), ['-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', '1920x1080', '-r', String(FPS), '-i', '-', '-an', '-c:v', 'libx264', '-crf', '20', '-preset', 'veryfast', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], { stdio: ['pipe', 'ignore', 'pipe'] });
  let stderr = '';ff.stderr.on('data', (d) => { stderr += d; });ff.stdin.on('error', () => {});
  const done = new Promise((resolve, reject) => { ff.on('error', reject);ff.on('close', (code) => code === 0 ? resolve() : reject(new Error(stderr.slice(-3000)))); });
  for (let f = 0; f < plan.frames; f++) {
    render(f);const b = canvas.data();
    if (!ff.stdin.write(Buffer.from(b.buffer, b.byteOffset, b.byteLength))) await Promise.race([once(ff.stdin, 'drain'), done]);
    if (f % 150 === 0) console.log(`RENDER ${f}/${plan.frames}`);
  }
  ff.stdin.end();await done;
  fs.writeFileSync(path.join(EVIDENCE, 'trace.json'), JSON.stringify(trace));
  console.log('DONE', OUT, plan.frames, 'frames', plan.duration, 'seconds');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error);process.exitCode = 1; });
