// Deterministic lyric-MV compositor. Every frame is a function of song time.
// Narrative-interface method reference: Nyankomintsu/world-execute-me-lyric-mv
// (MIT; no silhouettes, lyrics, or audio copied from that project).
import * as THREE from 'three';
import { createEngine, W, H } from './engine.js';
import { drawTransition } from './overlay.js';
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
  { from: [9, 7.2, 15], to: [6.8, 5.6, 12], look: [-0.8, 1.2, 0.8] },
  { from: [5.2, 4.2, 9.5], to: [4.6, 3.9, 8.8], look: [-1.1, 1.3, 1.0] },
  { from: [7.5, 5.0, 11.5], to: [5.8, 4.4, 10], look: [0, 1.2, 0.9] },
  { from: [6.5, 5.0, 11], to: [10, 7.5, 17], look: [0, 1.0, -1] },
  { from: [0, 6.5, 17], to: [1.5, 6.0, 15.5], look: [0, 1.2, 1.0] },
  { from: [3.8, 3.2, 8], to: [3.8, 3.2, 8], look: [0, 1.3, 1.9] },
  { from: [6.0, 4.5, 10.5], to: [4.8, 4.0, 9.2], look: [0.8, 1.4, 1.2] },
  { from: [0, 6.2, 16.5], to: [1.2, 5.8, 15], look: [0, 1.2, 1.0] },
  { from: [-0.5, 2.6, 6.5], to: [-1.2, 2.4, 5.8], look: [-2.4, 1.4, 1.3] },
  { from: [0, 6.8, 17.5], to: [0, 7.6, 16.5], look: [0, 2.6, 0] },
  { from: [0, 6.0, 15.5], to: [0, 6.0, 15.5], look: [0, 1.5, 1.0] },
  { from: [-0.8, 2.5, 6.2], to: [-1.4, 2.3, 5.6], look: [-2.4, 1.4, 1.3] },
  { from: [8.5, 6.0, 14], to: [8.5, 6.0, 14], look: [0, 1.5, 0.8] },
  { from: [6.0, 4.8, 11], to: [4.8, 4.2, 9.6], look: [-0.5, 1.2, 0.8] },
  { from: [0, 6.8, 17.5], to: [1.5, 7.4, 19], look: [0, 1.2, 1.0] },
  { from: [0, 7.4, 19], to: [0, 8.0, 20.5], look: [0, 1.2, 1.0] },
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

  // Upstream character art (user-directed sources, see NOTICE.md), v3:
  //   ai-girls Q版 chibi cutouts are the primary form; galgame whale expressions
  //   are emotional inserts; voxel-mv frames appear only in directed action shots;
  //   doubao remains the Day12 static cutout. One form per character per shot.
  const loader = new THREE.TextureLoader();
  async function loadTex(file) {
    const tex = await loader.loadAsync('/' + file);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.anisotropy = 4;
    return tex;
  }
  const neededVoxel = {};
  const neededExpr = new Set();
  for (const s of shotPlan.shots) {
    for (const [id, p] of Object.entries(s.perform || {})) {
      const ch = sprites.characters[id];
      if (!ch) continue;
      if (p.art === 'galgame') {
        neededExpr.add(p.expr);
        if (p.then) neededExpr.add(p.then);
      } else if (p.art === 'voxel') {
        (neededVoxel[id] ||= new Set()).add(p.action || 'idle');
        if (p.then) neededVoxel[id].add(p.then);
        if (p.walk) neededVoxel[id].add('walk_side');
      }
    }
  }
  const anims = {};   // id -> action -> {fps, loop, texs[]}
  const exprs = {};   // galgame whale expression -> {tex, meta}
  const statics = {}; // id -> {tex, meta}
  const chibis = {};  // id -> {tex, meta}
  await Promise.all(Object.entries(sprites.characters).map(async ([id, ch]) => {
    if (ch.chibi) chibis[id] = { tex: await loadTex(ch.chibi.file), meta: ch.chibi };
    if (ch.kind === 'static' || ch.sprite) statics[id] = { tex: await loadTex(ch.sprite.file), meta: ch.sprite };
    if (ch.actions && neededVoxel[id]) {
      anims[id] = {};
      const acts = new Set([...neededVoxel[id], 'idle']);
      for (const action of acts) {
        const a = ch.actions[action];
        if (!a) throw new Error(`missing action ${id}/${action}`);
        anims[id][action] = { fps: a.fps, loop: a.loop, texs: await Promise.all(a.frames.map(loadTex)) };
      }
    }
    if (ch.galgame) {
      for (const e of neededExpr) {
        const meta = ch.galgame.expressions[e];
        if (!meta) throw new Error(`missing whale expression ${e}`);
        exprs[e] = { tex: await loadTex(meta.file), meta };
      }
    }
  }));

  const actors = {};
  const shadowGeo = new THREE.CircleGeometry(0.5, 24);
  for (const c of castData.cast) {
    const group = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.08, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    plane.castShadow = true;
    group.add(plane);
    const shadow = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.012;
    group.add(shadow);
    group.visible = false;
    engine.scene.add(group);
    actors[c.id] = { group, plane, shadow, data: c };
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

  // Pick one texture + normalized sprite meta for an actor at local shot time.
  // v3 never mixes two forms of the same character in one shot.
  function spriteFor(id, shot, lt) {
    const ch = sprites.characters[id];
    const perf = (shot.perform || {})[id] || {};
    const art = perf.art || (ch.kind === 'static' ? 'static' : ch.chibi ? 'chibi' : 'voxel');
    if (art === 'galgame') {
      let e = perf.expr;
      if (perf.then && lt >= perf.at) e = perf.then;
      return { tex: exprs[e].tex, meta: exprs[e].meta, flip: false, dx: 0, art };
    }
    if (art === 'static') return { tex: statics[id].tex, meta: statics[id].meta, flip: false, dx: 0, art };
    if (art === 'chibi') return { tex: chibis[id].tex, meta: chibis[id].meta, flip: false, dx: 0, art };
    let aName = perf.action || 'idle';
    let localT = lt, flip = false, dx = 0;
    if (perf.walk && lt < perf.walk.dur) {
      aName = 'walk_side';
      dx = perf.walk.fromDX * (1 - smooth(lt / perf.walk.dur));
      flip = perf.walk.fromDX > 0; // walk_side frames face right; flip when moving left
    } else {
      if (perf.walk) localT = lt - perf.walk.dur;
      if (perf.then && localT >= perf.at) { aName = perf.then; localT -= perf.at; }
    }
    const anim = anims[id][aName] || anims[id].idle;
    const n = anim.texs.length;
    let fi = Math.floor(localT * anim.fps);
    fi = anim.loop ? ((fi % n) + n) % n : Math.max(0, Math.min(fi, n - 1));
    return { tex: anim.texs[fi], meta: ch, flip, dx, art };
  }

  function updateActors(shot, t, energy) {
    const place = engine.placements[shot.set] || {};
    const lt = t - shot.start;
    const dur = shot.end - shot.start;
    for (const [id, a] of Object.entries(actors)) {
      const visible = shot.cast.includes(id);
      a.group.visible = visible;
      if (!visible) continue;
      const [bx0, bz0, h, yOff = 0] = place[id] || [0, 0, 2.2];
      // Emotional close-ups step in front of the rooftop bench so the skirt/feet
      // are not hidden by the seat; ensemble shots keep the original blocking.
      const close = (shot.framing === 'close' || shot.framing === 'message') && id === 'whale';
      const bx = bx0 + (close ? -0.4 : 0), bz = bz0 + (close ? 1.0 : 0);
      const sp = spriteFor(id, shot, lt);
      const perf = (shot.perform || {})[id] || {};
      let dx = sp.dx, dy = 0, tilt = 0, sx = 1, sy = 1;
      const seed = [...id].reduce((s, c) => s + c.charCodeAt(0), 0) * 0.37;
      const pulse = onsetPulse(t);
      if (sp.art === 'chibi') {
        // PDoom-inspired whole-body performance: beat bounce, hop, squash/stretch,
        // anticipation/lean. No facial redraw, lip-sync or fake head turn.
        const move = perf.move || 'sway';
        if (move === 'bounce') {
          dy = pulse * 0.16; sy = 1 - pulse * 0.07; sx = 1 + pulse * 0.06;
          tilt = Math.sin(t * 2 + seed) * 0.02;
        } else if (move === 'hop') {
          const hp = Math.max(0, Math.sin(lt * 3.0 + seed));
          dy = hp * 0.22; sy = 1 - hp * 0.05; sx = 1 + hp * 0.04;
          tilt = Math.sin(lt * 3 + seed) * 0.03;
        } else {
          tilt = Math.sin(t * 1.4 + seed) * 0.05;
          dx += Math.sin(t * 0.9 + seed) * 0.05;
          dy = Math.abs(Math.sin(t * 1.4 + seed)) * 0.03;
        }
        if (perf.enter && lt < perf.enter.dur) {
          const k = smooth(lt / perf.enter.dur);
          dx += perf.enter.fromDX * (1 - k);
          dy += Math.sin(Math.PI * k) * 0.16;
        }
        const react = perf.react;
        if (react === 'look_up') tilt -= 0.06 * smooth(lt / 0.6);
        if (react === 'pray') tilt += 0.04 * smooth(lt / 0.6);
        if (react === 'happy') dy += pulse * 0.08;
        if (react === 'wave') tilt += Math.sin(lt * 6 + seed) * 0.06 * smooth(lt / 0.4);
        if (react === 'reach') tilt += (id === 'gemini' ? -0.05 : 0.05) * smooth(lt / 0.6);
        if (react === 'sad') { tilt += 0.04; dy -= 0.02; }
        if (react === 'heart') { dy += pulse * 0.1; sx = 1 + pulse * 0.04; }
      } else if (sp.art === 'static' || sp.art === 'galgame') {
        dy = Math.sin(t * 1.3 + h) * 0.01;
      } else {
        // S13: the two leads lean toward the gap they cannot close.
        if (shot.index === 12 && id === 'whale') tilt = 0.05 * smooth(lt / 0.8);
        if (shot.index === 12 && id === 'claude') tilt = -0.05 * smooth(lt / 0.8);
      }
      const x = bx + dx, z = bz;
      a.group.position.set(x, dy + yOff, z);
      a.group.rotation.z = tilt;
      a.group.scale.set(sx, sy, 1);
      // yaw-only billboard keeps feet on the ground plane
      a.group.rotation.y = Math.atan2(engine.camera.position.x - x, engine.camera.position.z - z);
      const m = sp.meta;
      const pxW = m.boxW ?? m.width, pxH = m.boxH ?? m.height;
      const worldH = h * pxH / m.standPx;
      const worldW = h * pxW / m.standPx;
      a.plane.material.map = sp.tex;
      a.plane.material.needsUpdate = true;
      a.plane.scale.set(sp.flip ? -worldW : worldW, worldH, 1);
      a.plane.position.y = worldH * (m.footY / pxH - 0.5);
      a.shadow.scale.set(h * 0.55 * (1 - dy * 0.4), h * 0.18 * (1 - dy * 0.4), 1);
      a.shadow.material.opacity = Math.max(0.08, 0.2 - dy * 0.25);
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
      const x = 104, y = 170, w = 660, h = 280;
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
    drawTransition(ctx, shot, t, W, H);
    drawPolaroid(shot, t);
    drawKeyword(shot, t);
    drawSubtitle(t);
    drawBadge();
    return { t, shot: shot.id, set: shot.set, cue: cueAt(t)?.id || null };
  }

  return { renderAt, renderSceneOnly, setExportSize: (w, h) => engine.renderer.setSize(w, h, false), duration: timeline.duration, fps: timeline.fps, timeline, shots: SHOTS, engine, ready: true };
}
