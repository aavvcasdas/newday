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
  // every directed performance must exist in the upstream-sprite manifest
  const sprites = read('data/sprites.json').characters;
  for (const s of shots) {
    for (const [id, p] of Object.entries(s.perform || {})) {
      const ch = sprites[id];
      assert.ok(ch, `${s.id} perform ${id}`);
      if (p.art === 'galgame') {
        assert.ok(ch.galgame.expressions[p.expr], `${s.id} ${id} expr ${p.expr}`);
        if (p.then) assert.ok(ch.galgame.expressions[p.then], `${s.id} ${id} then ${p.then}`);
      } else if (ch.kind !== 'static') {
        for (const a of [p.action, p.then, p.walk ? 'walk_side' : null].filter(Boolean)) {
          assert.ok(ch.actions[a], `${s.id} ${id} action ${a}`);
        }
      }
    }
  }
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
