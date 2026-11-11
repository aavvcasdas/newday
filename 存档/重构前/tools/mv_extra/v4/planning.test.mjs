import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACTS, SHOTS, FPS, TOTAL_FRAMES, CUES, shotAtFrame } from './plan.mjs';
import { createCanvas, GUEST_NAMES, solveChoreography } from './actors.mjs';
import { drawDriftingParticles, computeCamera } from './diorama.mjs';

test('director plan covers every frame without gaps and features the protagonist', () => {
  assert.equal(FPS, 30);
  assert.equal(TOTAL_FRAMES, 1681);
  assert.equal(SHOTS.length, 32);
  assert.equal(ACTS.length, 5);
  assert.equal(SHOTS[0].f0, 0);
  for (let i = 0; i < SHOTS.length; i++) {
    const shot = SHOTS[i];
    assert.ok(shot.f1 > shot.f0);
    assert.ok(shot.cast.includes('whale'), shot.id);
    assert.ok(shot.cast.some(name => GUEST_NAMES.includes(name)), shot.id);
    if (i) assert.equal(shot.f0, SHOTS[i - 1].f1);
    assert.equal(shotAtFrame(shot.f0).id, shot.id);
    assert.equal(shotAtFrame(shot.f1 - 1).id, shot.id);
  }
  assert.equal(SHOTS.at(-1).f1, TOTAL_FRAMES);
});

test('lyrics remain bound from the locked source instead of copied into plan', () => {
  assert.equal(CUES.length, 16);
  const source = readFileSync(new URL('./plan.mjs', import.meta.url), 'utf8');
  for (const cue of CUES) assert.ok(!source.includes(cue.text));
});

test('particle drawing preserves the camera transform', () => {
  const c = createCanvas(200, 100).getContext('2d');
  c.scale(1.5, 1.5);
  c.translate(10, 20);
  const before = c.getTransform();
  drawDriftingParticles(c, 3.1);
  const after = c.getTransform();
  for (const key of ['a', 'b', 'c', 'd', 'e', 'f']) assert.equal(after[key], before[key]);
});

test('camera and choreography change with time', () => {
  const shot = SHOTS[5];
  assert.notDeepEqual(computeCamera(shot.start, shot, shot.cam), computeCamera(shot.end - 0.01, shot, shot.cam));
  assert.notDeepEqual(solveChoreography(3, { move: 'side_tap' }), solveChoreography(3.2, { move: 'side_tap' }));
});
