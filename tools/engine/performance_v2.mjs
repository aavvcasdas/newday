// Fixed-PNG performance & articulated cutout puppet layer:
// Strictly zero mouth/eyelid/face pixel manipulation, while supporting continuous breathing,
// smooth pose transitions, expressive squash-stretch, locomotion styles, and stage rim-lighting.

import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { loadImage } from './room_base.mjs';
import { TRANSITION_TYPES } from './timeline_core.mjs';
import { bodyPerformance } from './character_motion.mjs';
export { bodyPerformance };

const images = new Map();

export const IMAGE_ACTORS = Object.freeze({
  doubao: { path: 'assets/ai-girls/doubao/doubao-cutout.png', manifest: 'assets/ai-girls/doubao/source.json' },
  claude: { path: 'assets/ai-girls/dance-v11/source/claude_stand_cutout.png', manifest: null },
  gemini: { path: 'assets/ai-girls/extra-guests/cutouts/gemini.png', manifest: null },
  gpt: { path: 'assets/ai-girls/extra-guests/cutouts/gpt.png', manifest: null },
  kimi: { path: 'assets/ai-girls/extra-guests/cutouts/kimi.png', manifest: null },
  qwen: { path: 'assets/ai-girls/extra-guests/cutouts/qwen.png', manifest: null },
  zai: { path: 'assets/ai-girls/reference-motion/source/zai_base.png', manifest: null },
});

export async function loadImageActors(plans) {
  for (const a of plans) {
    if (!a?.assetId || images.has(a.assetId)) continue;
    const source = IMAGE_ACTORS[a.assetId];
    if (!source) throw Error('Unregistered image actor ' + a.assetId);
    if (source.manifest && fs.existsSync(source.manifest)) {
      const m = JSON.parse(fs.readFileSync(source.manifest, 'utf8'));
      const digest = createHash('sha256').update(fs.readFileSync(source.path)).digest('hex');
      if (digest !== m.derived.sha256) throw Error('Image actor hash mismatch');
    }
    images.set(a.assetId, await loadImage(source.path));
  }
}

export function drawImageActor(g, a) {
  if ((a.opacity ?? 1) <= 0) return;
  const im = images.get(a.assetId);
  if (!im) throw Error('Image actor not loaded: ' + a.assetId);
  const h = a.height || 340;
  const w = (h * im.width) / im.height;
  const sx = (a.imageScale || 1) * (a.sx ?? 1);
  const sy = (a.imageScale || 1) * (a.sy ?? 1);
  const dir = a.flip ? -1 : 1;

  g.save();
  g.globalAlpha = a.opacity ?? 1;
  g.translate(a.x, a.y);
  g.rotate(a.lean || 0);
  g.scale(dir * sx, sy);
  g.drawImage(im, -w / 2, -h, w, h);

  if ((a.rimLight ?? 0) > 0.04) {
    g.globalAlpha *= Math.min(0.26, a.rimLight * 0.22);
    g.strokeStyle = a.rimColor || '#FFE5A3';
    g.lineWidth = 2.8;
    g.beginPath();
    g.ellipse(0, -h * 0.52, w * 0.34, h * 0.44, 0, -Math.PI * 0.85, -Math.PI * 0.15);
    g.stroke();
  }
  g.restore();
}

export function drawAmbient(g, t, tracks = []) {
  for (const a of tracks) {
    if (t < (a.from ?? 0) || t >= (a.to ?? Infinity)) continue;
    g.save();
    if (a.type === 'dust') {
      for (let i = 0; i < 6; i++) {
        const x = (a.x ?? 630) + (i - 2.5) * 108 + Math.sin(t * 0.42 + i) * 9;
        const y = (a.y ?? 290) + Math.sin(t * 0.55 + i * 1.8) * 24;
        g.globalAlpha = 0.15;
        g.fillStyle = '#B6D6D9';
        g.beginPath();
        g.arc(x, y, 1.6, 0, Math.PI * 2);
        g.fill();
      }
    } else if (a.type === 'cursor') {
      g.globalAlpha = 0.25 + 0.65 * (0.5 + 0.5 * Math.cos((t * Math.PI * 2) / 1.1));
      g.fillStyle = '#507C87';
      g.fillRect(a.x, a.y, 2, 15);
    }
    g.restore();
  }
}

export function validatePerformanceShot(s) {
  const intent = s.cameraIntent;
  if (!intent || !['static', 'push', 'pull', 'pan', 'follow'].includes(intent.type) || !intent.reason?.trim()) {
    throw Error(`${s.id} requires motivated cameraIntent`);
  }
  for (const key of ['ambient', 'bodyEvents', 'propTracks', 'insertEmphasis']) {
    if (!Array.isArray(s[key])) throw Error(`${s.id} missing ${key}`);
  }
  if (!s.transitions || !TRANSITION_TYPES.includes(s.transitions.type)) {
    throw Error(`${s.id} missing or invalid transition`);
  }
  if (!(s.bodyEvents.length || s.propTracks.length || (s.stageTriggers && s.stageTriggers.length))) {
    throw Error(`${s.id} missing executable body/prop/stage event`);
  }
  for (const a of s.actors) {
    if (!a.idleMotion && !s.idleException) throw Error(`${s.id} idleMotion=0 requires exception`);
    for (const p of a.bodyEvents || []) {
      if (!Number.isFinite(p.at) || p.duration <= 0 || Math.abs(p.dy ?? 0) > 160 || Math.abs(p.lean ?? 0) > 0.45) {
        throw Error('Invalid body-only pulse');
      }
      if ('mouth' in p || 'eyes' in p || 'eyelid' in p) {
        throw Error('Fixed-PNG actor forbids facial morph keys');
      }
    }
  }
  if (s.semanticTracks !== s.propTracks && JSON.stringify(s.semanticTracks) !== JSON.stringify(s.propTracks)) {
    throw Error('propTracks must be executed, not descriptive-only');
  }
}
