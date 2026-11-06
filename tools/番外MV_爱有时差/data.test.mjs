import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDay2Subtitle, DAY2_SUB } from '../字幕/day2_style_sub.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(HERE, p), 'utf8'));

test('locked lyrics and timeline agree', () => {
  const lyrics = read('data/lyrics.json').lines;
  const timeline = read('data/timeline.json');
  assert.equal(lyrics.length, 16);
  assert.equal(timeline.cues.length, 16);
  assert.deepEqual(timeline.cues.map(c => c.text), lyrics);
  assert.equal(timeline.frames, 1346);
  assert.equal(timeline.fps, 24);
  assert.equal(timeline.wordLevel, false);
  for (const c of timeline.cues) {
    assert.ok(c.startFrame < c.endFrame);
    assert.ok(Math.abs(c.start - c.startFrame / 24) < 1e-4);
  }
});

test('all 8 upstream AI girls are directed into the MV, no supporting cast', () => {
  const data = read('data/cast.json');
  const cast = data.cast;
  const shots = read('data/shots.json').shots;
  const ids = new Set(cast.map(c => c.id));
  const covered = new Set(shots.flatMap(s => s.cast));
  assert.deepEqual([...covered].sort(), [...ids].sort());
  assert.deepEqual([...shots.at(-1).cast].sort(), [...ids].sort());
  assert.equal(cast.filter(c => c.aiGirl).length, 8);
  assert.equal(cast.length, 8);
  assert.equal(data.supportingCount, 0);
  assert.deepEqual([...ids].sort(), ['claude', 'doubao', 'gemini', 'gpt', 'kimi', 'qwen', 'whale', 'zai']);
  // v5: whale uses the day-series Q library atlas (AI-derived, user-authorized);
  // gpt keeps the upstream pets atlas. The other five use ai-girls chibi cutouts;
  // doubao is a Day12-cutout-derived Q layout. Upstream whale provenance is kept.
  const manifest = read('data/sprites.json');
  const sprites = manifest.characters;
  assert.equal(manifest.primaryForm, 'q-chibi-pets');

  const whalePet = sprites.whale.pet;
  assert.ok(whalePet, 'whale Q library atlas');
  assert.equal(whalePet.cellW, 192); assert.equal(whalePet.cellH, 208);
  assert.equal(whalePet.artOrigin, 'ai-derived');
  assert.ok(sprites.whale.petUpstream, 'upstream whale atlas provenance retained');
  for (const st of ['idle', 'walk-right', 'walk-left', 'wave', 'typing', 'point', 'think', 'shock', 'cry', 'cheer', 'confident_hips', 'bow', 'eat', 'sleep', 'handoff', 'peek']) {
    assert.ok(whalePet.animations[st], `whale Q state ${st}`);
    assert.equal(whalePet.animations[st].durationsMs.length, whalePet.animations[st].frames);
  }
  // The Q library has no 16-way look rows; shots must not ask whale for a look.
  assert.equal(whalePet.directions.length, 0);
  assert.ok(whalePet.animations.idle.frames >= 2, 'whale idle is a real breathing cycle, not a placeholder');
  for (const st of ['walk-right', 'walk-left', 'wave', 'typing']) {
    assert.ok(whalePet.animations[st].frames >= 2, `${st} is a real multi-frame cycle`);
    assert.equal(whalePet.animations[st].loop, true);
  }

  const gptPet = sprites.gpt.pet;
  assert.ok(gptPet, 'gpt upstream pet atlas');
  assert.equal(gptPet.cellW, 192); assert.equal(gptPet.cellH, 208);
  for (const st of ['idle', 'running-right', 'running-left', 'waving', 'failed', 'waiting', 'review']) {
    assert.ok(gptPet.animations[st], `gpt pet state ${st}`);
    assert.equal(gptPet.animations[st].durationsMs.length, gptPet.animations[st].frames);
  }
  assert.equal(gptPet.directions.length, 16);

  for (const id of ['claude', 'gemini', 'kimi', 'qwen', 'zai']) assert.ok(sprites[id].chibi, `${id} chibi`);
  assert.ok(sprites.doubao.sprite && sprites.doubao.qLayout, 'doubao derived Q layout');
  assert.ok(shots.every(s => s.stage === 'paper-diorama' && s.motion), 'paper stage + directed motion');
  assert.ok(!shots.some(s => /bounce|hop|sway/i.test(s.motion || '')), 'no whole-image bounce direction');
});

test('v5 caps on-screen cast at 2, with the finale hold as the only exception', () => {
  const data = read('data/shots.json');
  const shots = data.shots;
  assert.equal(data.castPolicy.maxOnScreen, 2);
  assert.equal(data.castPolicy.finaleException, 'S16');
  for (const s of shots) {
    assert.equal(new Set(s.cast).size, s.cast.length, `${s.id} repeats a character`);
    assert.equal(s.maxOnScreen, s.cast.length, `${s.id} declared count matches cast`);
    if (s.id === 'S16') assert.equal(s.cast.length, 8, 'finale keeps the full ensemble');
    else assert.ok(s.cast.length <= 2, `${s.id} has ${s.cast.length} on screen`);
  }
  // Every girl still appears somewhere in the film despite the cap.
  const ids = new Set(read('data/cast.json').cast.map(c => c.id));
  assert.deepEqual([...new Set(shots.flatMap(s => s.cast))].sort(), [...ids].sort());
});

test('shot sets have export palettes', () => {
  const shots = read('data/shots.json').shots;
  const palette = read('data/palette.json');
  for (const s of shots) assert.ok(palette[s.set], s.set);
});

test('SRT carries the locked cue text', () => {
  const timeline = read('data/timeline.json');
  const srt = fs.readFileSync(path.join(ROOT, '番外MV/歌词.srt'), 'utf8');
  for (const c of timeline.cues) {
    for (const seg of c.segments || [c]) assert.ok(srt.includes(seg.text), seg.text);
  }
});

test('shared Day2 subtitle component is the project default', () => {
  assert.equal(typeof createDay2Subtitle, 'function');
  assert.equal(DAY2_SUB.baseSize, 28);
  const measureCtx = { font: '', measureText: (t) => ({ width: t.length * 28 }) };
  const sub = createDay2Subtitle({ measureCtx, fontOf: (px, w) => `${w} ${px}px sans-serif` });
  assert.deepEqual(sub.wrap('短句'), ['短句']);
});
