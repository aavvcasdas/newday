import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas, startMotionAudit, stopMotionAudit } from './actors.mjs';
import { render } from './film.mjs';
import { SHOTS } from './plan.mjs';

function sample(t) {
  const c = createCanvas(1920, 1080).getContext('2d');
  startMotionAudit();
  render(c, t);
  return stopMotionAudit();
}

test('actual shots draw protagonist and companions with changing rig motion or held sprite poses', () => {
  for (const shot of SHOTS) {
    const a = sample(shot.start + shot.duration * 0.35);
    const b = sample(shot.start + shot.duration * 0.65);
    for (const name of ['whale', ...shot.cast.filter(x => x !== 'whale')]) {
      const x = a.find(e => e.actor === name), y = b.find(e => e.actor === name);
      assert.ok(x && y, `${shot.id}: missing ${name}`);
      if (x.pose?.startsWith('pet:') && y.pose?.startsWith('pet:')) continue; // held frames are tested over the full timeline in pet.test.mjs
      assert.ok(Math.abs(x.armRot - y.armRot) + Math.abs(x.legRot - y.legRot) + Math.abs(x.x - y.x) + Math.abs(x.y - y.y) > 0.001, `${shot.id}: static ${name}`);
    }
  }
});

test('each second has protagonist and a moving companion at sampled times', () => {
  for (let second = 0; second < 56; second++) {
    // Sample twice within the longest shot portion of this second, so a cut
    // does not falsely compare two entirely different casts.
    const portions = SHOTS.map(shot => [Math.max(second, shot.start), Math.min(second + 1, shot.end)])
      .filter(([start, end]) => end > start)
      .sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
    const [lo, hi] = portions[0];
    const a = sample(lo + (hi - lo) * 0.25), b = sample(lo + (hi - lo) * 0.75);
    assert.ok(a.some(e => e.actor === 'whale') && b.some(e => e.actor === 'whale'), `second ${second}: protagonist`);
    const guests = a.filter(e => e.actor !== 'whale');
    assert.ok(guests.length && b.some(e => e.actor !== 'whale'), `second ${second}: companion`);
    assert.ok(guests.some(x => b.some(y => y.actor === x.actor && (Math.abs(x.armRot - y.armRot) + Math.abs(x.legRot - y.legRot) + Math.abs(x.x - y.x) + Math.abs(x.y - y.y) > 0.001))), `second ${second}: motion`);
    if (global.gc) global.gc();
  }
});
