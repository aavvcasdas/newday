import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIONS, actionForShot, actionFrame } from './actions.mjs';
import { createCanvas, guest } from './actors.mjs';

test('all action timelines loop deterministically with multiple held keys', () => {
  for (const [name, spec] of Object.entries(ACTIONS)) {
    const length = spec.ms.reduce((a, b) => a + b, 0) / 1000;
    assert.ok(spec.ms.length >= 4);
    assert.equal(spec.ms.length, spec.key.length);
    assert.deepEqual(actionFrame(0.017, name), actionFrame(length + 0.017, name));
    assert.ok(new Set(spec.key).size >= 3);
  }
});

test('different story beats select different actions', () => {
  assert.equal(actionForShot(2, 'whale'), 'walk');
  assert.equal(actionForShot(22, 'whale'), 'dance');
  assert.equal(actionForShot(25, 'whale'), 'float');
  assert.equal(actionForShot(20, 'whale'), 'wave');
});

test('supporting characters have visibly different waving and resting silhouettes', () => {
  for (const name of ['doubao', 'gemini', 'qwen', 'gpt', 'kimi']) {
    const draw = pose => {
      const c = createCanvas(360, 360);
      guest(c.getContext('2d'), name, {t: 1, x: 180, y: 330, h: 260, pose, move: 'perform_idle', noShadow: true});
      return c.data();
    };
    const a = draw('idle'), b = draw('wave');
    let changed = 0;
    for (let i = 0; i < a.length; i += 4) {
      if (Math.abs(a[i] - b[i]) + Math.abs(a[i+1] - b[i+1]) + Math.abs(a[i+2] - b[i+2]) + Math.abs(a[i+3] - b[i+3]) > 36) changed++;
    }
    assert.ok(changed > 2000, `${name}: missing distinct arm pose`);
  }
});
