// Deterministic lyric-MV compositor. Every frame is a function of song time.
// Narrative-interface method reference: Nyankomintsu/world-execute-me-lyric-mv
// (MIT; no silhouettes, lyrics, or audio copied from that project).
import * as THREE from 'three';
import { createEngine, W, H } from './engine.js';
import { createDay2Subtitle } from '/shared/day2_style_sub.mjs';
import timeline from '../data/timeline.json' with { type: 'json' };
import shotPlan from '../data/shots.json' with { type: 'json' };
import castData from '../data/cast.json' with { type: 'json' };
import features from '../data/audio_features.json' with { type: 'json' };
import sprites from '../data/sprites.json' with { type: 'json' };

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const easeOut = (k) => 1 - Math.pow(1 - clamp(k), 3);
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const SHOTS = shotPlan.shots.map((s, i) => {
  const cue = timeline.cues[i];
  const start = i === 0 ? 0 : cue.start;
  const end = i === timeline.cues.length - 1 ? timeline.duration : timeline.cues[i + 1].start;
  return { ...s, index: i, start, end, cue };
});

const CAM = [
  { from: [10, 8.5, 16], to: [8.5, 7.4, 14], look: [0, 1.2, 0] },
  { from: [6.5, 5.2, 11], to: [5.6, 4.8, 10], look: [-0.8, 1.3, 0.6] },
  { from: [9, 6.2, 14], to: [6.8, 5.2, 11.5], look: [0.4, 1.3, 0.8] },
  { from: [8, 6.5, 13], to: [11, 8.5, 18], look: [0, 1.0, -1] },
  { from: [10, 6.8, 14], to: [8.2, 6.0, 12.5], look: [0, 1.2, 0.4] },
  { from: [7.5, 5.4, 12], to: [7.5, 5.4, 12], look: [0.2, 1.3, 1.0] },
  { from: [7.5, 5.4, 12], to: [6.2, 4.9, 10.5], look: [0.2, 1.5, 1.0] },
  { from: [9.5, 6.4, 13.5], to: [8.2, 5.8, 12], look: [0, 1.2, 0.6] },
  { from: [8, 5.8, 13], to: [8, 5.8, 13], look: [0.4, 1.4, 1.2] },
  { from: [9, 6.4, 15], to: [8.2, 7.2, 14], look: [0, 2.4, -1] },
  { from: [7.4, 5.4, 12], to: [7.4, 5.4, 12], look: [0.6, 1.6, 1.0] },
  { from: [6.4, 4.8, 10.5], to: [5.6, 4.4, 9.4], look: [-0.6, 1.4, 1.2] },
  { from: [10, 7.2, 16], to: [10, 7.2, 16], look: [0, 1.5, 0.4] },
  { from: [8.5, 6.0, 13.5], to: [7.2, 5.4, 12], look: [-0.6, 1.2, 0.8] },
  { from: [11, 7.6, 17], to: [12.5, 8.6, 19], look: [0.4, 1.2, 0.6] },
  { from: [12.5, 8.6, 19], to: [14, 9.6, 21], look: [0.4, 1.2, 0.4] },
];

export async function createFilm(glCanvas, outCanvas) {
  const engine = createEngine(glCanvas);
  const ctx = outCanvas.getContext('2d');
  outCanvas.width = W; outCanvas.height = H;
  const blurCanvas = document.createElement('canvas');
  blurCanvas.width = 480; blurCanvas.height = 270;
  const bctx = blurCanvas.getContext('2d');

  await Promise.all([
    document.fonts.load('800 28px "Noto Sans SC"'),
    document.fonts.load('700 52px "Noto Sans SC"'),
    document.fonts.load('400 96px "ZCOOL KuaiLe"'),
    document.fonts.load('400 22px "Silkscreen"'),
  ]);
  const SUB = createDay2Subtitle({
    fontOf: (size, weight) => `${weight} ${size}px "Noto Sans SC", sans-serif`,
    measureCtx: ctx,
  });

  const loader = new THREE.TextureLoader();
  const textures = {};
  const entries = Object.entries(sprites.sprites).filter(([k]) => k !== 'whale_walk');
  await Promise.all(entries.map(async ([id, meta]) => {
    const tex = await loader.loadAsync('/' + meta.file);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = id === 'doubao' ? THREE.LinearFilter : THREE.NearestFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.anisotropy = 4;
    textures[id] = { tex, w: meta.width, h: meta.height };
  }));
  const walkFrames = await Promise.all(sprites.sprites.whale_walk.map(async (meta) => {
    const tex = await loader.loadAsync('/' + meta.file);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return { tex, w: meta.width, h: meta.height };
  }));

  const actors = {};
  const shadowGeo = new THREE.CircleGeometry(0.5, 24);
  for (const c of castData.cast) {
    const meta = textures[c.id];
    const group = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({ map: meta.tex, transparent: true, alphaTest: 0.08, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    plane.castShadow = true;
    group.add(plane);
    const shadow = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.012;
    group.add(shadow);
    group.visible = false;
    engine.scene.add(group);
    actors[c.id] = { group, plane, shadow, meta, data: c, baseH: 2.25 };
  }

  function energyAt(t) {
    const i = clamp(Math.floor(t * features.featureFps), 0, features.rms.length - 1);
    return features.rms[i] || 0;
  }
  function onsetPulse(t) {
    let last = -10;
    for (const o of features.onsets) { if (o <= t) last = o; else break; }
    return Math.max(0, 1 - (t - last) / 0.22);
  }
  function shotAt(t) {
    for (const s of SHOTS) if (t >= s.start && t < s.end) return s;
    return SHOTS[SHOTS.length - 1];
  }
  function cueAt(t) {
    for (const c of timeline.cues) if (t >= c.start && t < c.end) return c;
    return null;
  }

  function updateActors(shot, t, energy) {
    const place = engine.placements[shot.set] || {};
    const lt = t - shot.start;
    const dur = shot.end - shot.start;
    for (const [id, a] of Object.entries(actors)) {
      const visible = shot.cast.includes(id);
      a.group.visible = visible;
      if (!visible) continue;
      let [x, z, h] = place[id] || [0, 0, 2.2];
      let tilt = 0, moving = false, flip = false;
      if (shot.index === 0 && id === 'whale') { x = lerp(-3.4, -1.2, smooth(lt / 1.6)); moving = lt < 1.6; }
      if (shot.index === 2 && id === 'claude') { x = lerp(4.8, 1.2, smooth(lt / 1.4)); moving = lt < 1.4; }
      if (shot.index === 3 && id === 'whale') { z = lerp(2.2, 1.8, smooth(lt / 1.2)); moving = lt < 1.2; }
      if (shot.index === 6 && id === 'doubao') { tilt = -0.04 * smooth(lt / 1.2); }
      if (shot.index === 12 && id === 'whale') { tilt = 0.05 * smooth(lt / 0.8); }
      if (shot.index === 12 && id === 'claude') { tilt = -0.05 * smooth(lt / 0.8); }
      if (shot.index === 13 && id === 'whale') { tilt = 0.06 * Math.sin(clamp(lt / dur) * Math.PI); }
      if (shot.index === 15 && ['whale', 'claude', 'gemini', 'doubao'].includes(id)) { tilt = Math.sin(lt * 0.8 + h) * 0.015; }
      const breath = id === 'doubao' ? Math.sin(t * 1.3 + h) * 0.008 : Math.sin(t * 1.7 + h * 2) * 0.014;
      const accent = id === 'doubao' ? 0 : energy * 0.018;
      a.group.position.set(x, breath, z);
      a.group.rotation.z = tilt;
      a.group.scale.set(1 - accent * 0.4, 1 + accent, 1);
      // yaw-only billboard keeps feet on the ground plane
      a.group.rotation.y = Math.atan2(engine.camera.position.x - x, engine.camera.position.z - z);
      let meta = a.meta;
      if (id === 'whale' && moving) {
        meta = walkFrames[Math.floor(t * 8) % walkFrames.length];
        a.plane.material.map = meta.tex;
      } else if (id === 'whale') {
        const key = (shot.index === 5 || shot.index === 12) ? 'whale_worry' : shot.index === 1 || shot.index === 13 ? 'whale_think' : 'whale';
        meta = textures[key];
        a.plane.material.map = meta.tex;
      }
      const height = h;
      const width = height * meta.w / meta.h;
      a.plane.scale.set(width, height, 1);
      a.plane.position.y = height / 2;
      a.shadow.scale.set(width * 0.9, height * 0.22, 1);
      a.plane.material.needsUpdate = true;
    }
  }

  function drawBackdrop(shot, t) {
    const s = engine.sets[shot.set];
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, s.bg);
    g.addColorStop(1, s.fog);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (['greyShore', 'lanternPier', 'fireworkRooftop', 'timeBridge'].includes(shot.set)) {
      for (let i = 0; i < 46; i++) {
        const x = hash(i) * W, y = hash(i + 90) * H * 0.45;
        const a = 0.18 + 0.22 * Math.sin(t * 1.5 + i);
        ctx.fillStyle = `rgba(246,236,216,${Math.max(0.05, a)})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }

  function drawPost(shot) {
    // soft miniature tilt-shift: blur only the top/bottom bands, keep faces sharp
    const bw = blurCanvas.width, bh = blurCanvas.height;
    bctx.clearRect(0, 0, bw, bh);
    bctx.filter = 'blur(1.4px)';
    bctx.drawImage(engine.renderer.domElement, 0, 0, bw, bh);
    bctx.filter = 'none';
    bctx.globalCompositeOperation = 'destination-in';
    const mask = bctx.createLinearGradient(0, 0, 0, bh);
    mask.addColorStop(0, 'rgba(0,0,0,0.7)');
    mask.addColorStop(0.2, 'rgba(0,0,0,0)');
    mask.addColorStop(0.78, 'rgba(0,0,0,0)');
    mask.addColorStop(1, 'rgba(0,0,0,0.6)');
    bctx.fillStyle = mask;
    bctx.fillRect(0, 0, bw, bh);
    bctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(blurCanvas, 0, 0, W, H);
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.9);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(8,10,20,0.32)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  function drawKeyword(shot, t) {
    const lt = t - shot.start;
    const dur = shot.end - shot.start;
    const a = smooth(lt / 0.3) * (1 - smooth((lt - dur + 0.25) / 0.25));
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    const message = shot.framing === 'message';
    if (message) {
      const x = 1120, y = 170, w = 660, h = 280;
      ctx.fillStyle = 'rgba(18,24,42,0.82)';
      ctx.strokeStyle = 'rgba(246,236,216,0.28)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(x, y, w, h, 18); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#9fb2cc'; ctx.font = '22px "Noto Sans SC"';
      ctx.fillText('她们的小世界', x + 28, y + 44);
      ctx.fillStyle = 'rgba(246,236,216,0.1)';
      ctx.beginPath(); ctx.roundRect(x + 28, y + 70, w - 56, 120, 14); ctx.fill();
      ctx.fillStyle = '#f6ecd8'; ctx.font = '54px "ZCOOL KuaiLe"';
      ctx.fillText(shot.keyword, x + 52, y + 146);
      ctx.fillStyle = '#9fb2cc'; ctx.font = '20px "Silkscreen", monospace';
      ctx.fillText(shot.motif, x + 28, y + 232);
      // cursor
      const cx = x + w - 70, cy = y + h - 44;
      ctx.fillStyle = '#f6ecd8';
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 16, cy + 22); ctx.lineTo(cx + 7, cy + 20); ctx.lineTo(cx + 2, cy + 30); ctx.closePath(); ctx.fill();
    } else {
      const center = ['openSea', 'timeBridge', 'dawnGarden'].includes(shot.set);
      const x = center ? W / 2 : 104;
      const y = shot.set === 'fireworkRooftop' ? 150 : 170;
      ctx.textAlign = center ? 'center' : 'left';
      ctx.font = '92px "ZCOOL KuaiLe"';
      ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(12,16,30,0.55)';
      ctx.strokeText(shot.keyword, x, y);
      ctx.fillStyle = shot.set === 'dawnGarden' ? '#ffd98a' : '#f6ecd8';
      ctx.fillText(shot.keyword, x, y);
      ctx.font = '22px "Silkscreen", monospace';
      ctx.fillStyle = 'rgba(246,236,216,0.72)';
      ctx.fillText(shot.motif, x, y + 42);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }

  function drawPolaroid(shot, t) {
    if (shot.index !== 10) return;
    const lt = t - shot.start;
    const k = smooth(lt / 0.5);
    ctx.save();
    ctx.globalAlpha = k;
    ctx.fillStyle = 'rgba(8,10,20,0.35)';
    ctx.fillRect(0, 0, W, H);
    const x = 380, y = 120, w = 1160, h = 740;
    ctx.strokeStyle = '#f6ecd8'; ctx.lineWidth = 26;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#f6ecd8';
    ctx.fillRect(x - 13, y + h - 13, w + 26, 92);
    ctx.fillStyle = '#2b2f42'; ctx.font = '42px "ZCOOL KuaiLe"'; ctx.textAlign = 'center';
    ctx.fillText('一刹那', W / 2, y + h + 48);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  function drawSubtitle(t) {
    const cue = cueAt(t);
    if (!cue) return;
    let text = cue.text, start = cue.start;
    if (cue.segments) {
      const seg = cue.segments.find(s => t >= s.start && t < s.end) || cue.segments[cue.segments.length - 1];
      text = seg.text; start = seg.start;
    }
    const vis = smooth((t - start) / 0.12);
    SUB.draw(ctx, { lines: SUB.wrap(text), speaker: '她们 · 心声', vis, W, H });
  }

  function drawBadge() {
    ctx.save();
    ctx.font = '18px "Noto Sans SC"';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(246,236,216,0.72)';
    ctx.fillText('非官方同人 · AI生成 · 剧情演绎', W - 36, 42);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(246,236,216,0.62)';
    ctx.font = '20px "Noto Sans SC"';
    ctx.fillText('番外 · 把回忆拼好给你', 36, 42);
    ctx.restore();
  }

  function updateScene(time) {
    const t = clamp(time, 0, timeline.duration - 1e-4);
    const shot = shotAt(t);
    shot.local = t - shot.start;
    const energy = energyAt(t);
    const cam = CAM[shot.index];
    const dur = shot.end - shot.start;
    const k = smooth(shot.local / Math.max(0.8, dur * 0.6));
    engine.camera.position.set(lerp(cam.from[0], cam.to[0], k), lerp(cam.from[1], cam.to[1], k), lerp(cam.from[2], cam.to[2], k));
    const look = cam.look;
    engine.camera.lookAt(look[0], look[1], look[2]);
    engine.showSet(shot.set, t, shot, energy);
    updateActors(shot, t, energy);
    engine.renderer.render(engine.scene, engine.camera);
    return { t, shot, cue: cueAt(t) };
  }

  function renderSceneOnly(time) {
    const info = updateScene(time);
    const s = engine.sets[info.shot.set];
    return { canvas: engine.renderer.domElement, ...info, colors: { bg: s.bg, fog: s.fog } };
  }

  function renderAt(time) {
    const { t, shot } = updateScene(time);
    ctx.clearRect(0, 0, W, H);
    drawBackdrop(shot, t);
    ctx.drawImage(engine.renderer.domElement, 0, 0);
    drawPost(shot);
    drawPolaroid(shot, t);
    drawKeyword(shot, t);
    drawSubtitle(t);
    drawBadge();
    return { t, shot: shot.id, set: shot.set, cue: cueAt(t)?.id || null };
  }

  return { renderAt, renderSceneOnly, setExportSize: (w, h) => engine.renderer.setSize(w, h, false), duration: timeline.duration, fps: timeline.fps, timeline, shots: SHOTS, engine, ready: true };
}
