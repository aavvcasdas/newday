import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

import { ROOT, GUEST_NAMES, images, measureSole, createCanvas } from './actors.mjs';
import { FPS, TOTAL_FRAMES, DURATION, ACTS, SHOTS, CUES, BOUND, SCRIPT_SHA } from './plan.mjs';
import { frame } from './film.mjs';

const EXPECTED_LYRICS = [
  '我们都是渺小真实存在',
  '祈愿小世界里不只有挫败',
  '直到遇见你我以为就光明起来',
  '眼睛里看到的都是广袤无垠的大海',
  '有你在的日子不可能被取代',
  '在最灰暗的日子你陪着我发呆',
  '你让我学会如何拨开阴霾',
  '将快乐全都收集将不开心全都淘汰',
  '你对我说的情话',
  '像转瞬即逝的烟花',
  '只停在绽放一刹那',
  '我却已无法自拔',
  '我们的爱总有时差',
  '也为你骗自己放下',
  '爱炙热的你',
  '却忘了爱自己',
];

test('locks exact 16-line user lyrics and expected SHA-256', () => {
  assert.equal(CUES.length, 16);
  assert.deepEqual(
    CUES.map((c) => c.text),
    EXPECTED_LYRICS
  );
  assert.equal(
    SCRIPT_SHA,
    'e330c1bb49c617a07f6e8bc95a6ea569827e9ed6445e7a2688bc8242a330b75f'
  );
});

test('keeps timing table and scene code free of hardcoded lyric strings', () => {
  const codeFiles = ['lyric_timing.json', 'scenes.mjs', 'plate.mjs', 'plan.mjs'];
  for (const rel of codeFiles) {
    const src = fs.readFileSync(path.join(ROOT, 'tools/mv_extra/v3', rel), 'utf8');
    for (const ln of EXPECTED_LYRICS) {
      assert.equal(
        src.includes(ln),
        false,
        `${rel} must not hardcode lyric line "${ln}"`
      );
    }
  }
});

test('partitions all 1681 frames (56.033s @ 30fps) contiguously across 5 acts and 32 shots', () => {
  assert.equal(FPS, 30);
  assert.equal(TOTAL_FRAMES, 1681);
  assert.ok(Math.abs(DURATION - 56.03333333333333) < 1e-9);
  assert.equal(ACTS.length, 5);
  assert.equal(SHOTS.length, 32);

  assert.equal(SHOTS[0].f0, 0);
  assert.equal(SHOTS[SHOTS.length - 1].f1, TOTAL_FRAMES);
  for (let i = 1; i < SHOTS.length; i++) {
    assert.equal(SHOTS[i].f0, SHOTS[i - 1].f1, `Gap/overlap before ${SHOTS[i].id}`);
  }
});

test('covers all 16 lyric lines and all 7 project characters across the 32 shots', () => {
  for (let lineNum = 1; lineNum <= 16; lineNum++) {
    const matched = SHOTS.filter((s) => s.lines.includes(lineNum));
    assert.ok(matched.length >= 1, `Missing shot coverage for lyric line ${lineNum}`);
  }

  const allCast = new Set(SHOTS.flatMap((s) => s.cast));
  for (const actor of ['whale', ...GUEST_NAMES]) {
    assert.ok(allCast.has(actor), `Missing project character in storyboard: ${actor}`);
  }
});

test('maintains >= 0.35s post-result visual hold on every shot', () => {
  for (const s of SHOTS) {
    assert.ok(
      s.direction.holdSeconds >= 0.349,
      `${s.id} post-result hold too short: ${s.direction.holdSeconds}s`
    );
  }
});

test('verifies transparent corners and valid sole contact row for all 6 guest cutouts', () => {
  for (const name of GUEST_NAMES) {
    const im = images[name];
    assert.ok(im.width >= 200 && im.height >= 200);
    const cv = createCanvas(im.width, im.height);
    const g = cv.getContext('2d');
    g.drawImage(im, 0, 0);
    const data = g.getImageData(0, 0, im.width, im.height).data;
    // Top-left & top-right corners must be transparent (no white background box!)
    assert.equal(data[3], 0, `${name} top-left pixel is not transparent`);
    assert.equal(data[(im.width - 1) * 4 + 3], 0, `${name} top-right pixel is not transparent`);

    const sole = measureSole(name);
    assert.ok(sole > im.height * 0.65 && sole < im.height, `Unexpected sole row for ${name}: ${sole}`);
  }
});

test('renders strictly deterministically regardless of random-access call order', () => {
  frame(4.2);
  const hashA = createHash('sha256').update(Buffer.from(frame(37.2).data())).digest('hex');

  frame(52.8);
  frame(19.9);
  const hashB = createHash('sha256').update(Buffer.from(frame(37.2).data())).digest('hex');

  assert.equal(hashA, hashB, 'render(ctx, t) must be 100% pure random-access deterministic');
});

test('renders non-empty high-detail frames across all 32 shots', () => {
  for (const s of SHOTS) {
    const midT = (s.start + s.end) * 0.5;
    const raw = frame(midT).data();
    let sum = 0;
    let sumSq = 0;
    const step = 4 * 97;
    let n = 0;
    for (let i = 0; i < raw.length; i += step) {
      const lum = 0.299 * raw[i] + 0.587 * raw[i + 1] + 0.114 * raw[i + 2];
      sum += lum;
      sumSq += lum * lum;
      n++;
    }
    const mean = sum / n;
    const std = Math.sqrt(Math.max(0, sumSq / n - mean * mean));
    assert.ok(std > 12, `${s.id} @ ${midT.toFixed(2)}s has unexpectedly flat contrast (std=${std.toFixed(2)})`);
  }
});
