import test from 'node:test';
import assert from 'node:assert/strict';
import { FB } from './px.js';
import { CHAR_HEX, RAW_SPRITES } from './sprites_data.js';
import { drawCastSprite, drawMapWhaleHero, drawWhaleHero } from './cast.js';
import {
  WALK_CYCLE_FPS,
  WALK_CYCLE_FRAMES,
  getWalkCycleBob,
  getWalkCycleFrame,
  getWalkCycleSprite,
} from './walk_cycle_data.js';

const ACTORS = ['whale', 'map_whale', 'doubao', 'gemini', 'claude', 'kimi', 'qwen', 'zai'];
const PALETTE_SIZE = 48 + CHAR_HEX.length;

function captureSprite(draw) {
  const fb = new FB(320, 180);
  let sprite = null;
  fb.blitSpriteHi = (value) => { sprite = value; };
  draw(fb);
  return sprite;
}

test('walk-v14 cycles keep eight aligned, palette-indexed frames per actor', () => {
  assert.equal(WALK_CYCLE_FRAMES, 8);
  assert.equal(WALK_CYCLE_FPS, 1000 / 120);

  for (const actor of ACTORS) {
    const sprites = Array.from({ length: WALK_CYCLE_FRAMES }, (_, frame) => getWalkCycleSprite(actor, frame));
    assert.ok(sprites.every(Boolean), `${actor} has all eight frames`);
    assert.equal(new Set(sprites.map(({ w, h }) => `${w}x${h}`)).size, 1, `${actor} frame cells stay aligned`);
    assert.equal(new Set(sprites.map(({ d }) => Buffer.from(d).toString('base64'))).size, 8, `${actor} frames are not duplicated`);

    for (const sprite of sprites) {
      assert.equal(sprite.d.length, sprite.w * sprite.h);
      assert.ok(sprite.d.some((index) => index !== 255), `${actor} frame has visible pixels`);
      assert.ok(sprite.d.some((index) => index === 255), `${actor} frame retains transparency`);
      assert.ok(sprite.d.every((index) => index === 255 || index < PALETTE_SIZE), `${actor} frame uses the MV palette`);
    }
  }

  for (let frame = 0; frame < WALK_CYCLE_FRAMES; frame++) {
    assert.ok(RAW_SPRITES[`walk_whale_${frame}`], `Whale frame ${frame} is registered in the shared sprite bank`);
  }
});

test('8-frame gait timing and bob share one 120ms phase', () => {
  assert.equal(getWalkCycleFrame(0), 0);
  assert.equal(getWalkCycleFrame(0.119), 0);
  assert.equal(getWalkCycleFrame(0.12), 1);
  assert.equal(getWalkCycleFrame(0.96), 0);
  assert.deepEqual(Array.from({ length: 8 }, (_, frame) => getWalkCycleBob(frame)), [0, 0, -1, 0, 0, 0, -1, 0]);
});

test('all walking render paths select the matching cycle, including Red Hood close-up and map hero', () => {
  const time = 1.2;
  const frame = getWalkCycleFrame(time);

  for (const actor of ['doubao', 'gemini', 'claude', 'kimi', 'qwen', 'zai']) {
    const options = actor === 'doubao'
      ? { pose: 'panic', role: 'redhood', facing: -1 }
      : { pose: 'walk', facing: -1 };
    const captured = captureSprite((fb) => drawCastSprite(fb, 120, 140, actor, time, options));
    assert.strictEqual(captured, getWalkCycleSprite(actor, frame), `${actor} cast walk uses the shared phase`);
  }

  const largeDoubao = captureSprite((fb) => drawCastSprite(fb, 120, 140, 'doubao', time, {
    pose: 'walk', role: 'redhood', facing: 1, big: true,
  }));
  assert.strictEqual(largeDoubao, getWalkCycleSprite('doubao', frame, true), 'Red Hood close-up keeps her larger scale');

  const whale = captureSprite((fb) => drawWhaleHero(fb, 120, 140, time, { pose: 'run', facing: -1, scarfLen: 18 }));
  assert.strictEqual(whale, getWalkCycleSprite('whale', frame), 'main Whale run uses the eight-frame cycle');

  const mapWhale = captureSprite((fb) => drawMapWhaleHero(fb, 120, 140, time, { pose: 'run', facing: 1, scarfLen: 12 }));
  assert.strictEqual(mapWhale, getWalkCycleSprite('map_whale', frame), 'map avatar uses the small aligned eight-frame cycle');
});
