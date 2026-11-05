// Day11 分镜契约：开场不拥挤、八镜都有词点接触、台词逐字对得上。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import spec from './episode.spec.mjs';
import { validateSpec } from '../engine/schema_validator.mjs';
import { frame0StaticProps } from '../engine/crowd_and_density.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const lines = fs.readFileSync(path.join(root, 'Day11/Day11配音台词.txt'), 'utf8').trim().split(/\n/).filter(Boolean);

test('Day11 八镜覆盖 25 行，第 0 帧至多一件静态道具', () => {
  const cues = lines.map((text) => ({ text }));
  const out = validateSpec(spec, { cueCount: lines.length, cues });
  assert.equal(out.shots.length, 8);
  assert.equal(lines.length, 25);
  assert.equal(frame0StaticProps(spec).total, 0);
  assert.ok((spec.opener.platesAt ?? 0) >= 0.55);
  assert.ok(spec.opener.stampWord.line > 1);
  for (const shot of spec.shots) {
    assert.ok(shot.interactions.length >= 1, shot.id);
    assert.ok(shot.companionProps.length >= 1, shot.id);
  }
});
