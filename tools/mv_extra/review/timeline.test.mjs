import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceTime, localTime, videoTime, canReview, stepTime, activeItem, timeLabel} from './timeline.mjs';
const model = {start: 571 / 30, end: 1165 / 30, duration: 19.8, fps: 30};

test('sample local zero maps to original 19.033s; no two different timelines', () => {
  assert.equal(sourceTime(0, model), model.start);
  assert.equal(videoTime(model.start, 'sample', model), 0);
  assert.equal(videoTime(model.start, 'source', model), model.start);
  for (let f = 0; f < 594; f++) {
    assert.ok(Math.abs(localTime(sourceTime(f / 30, model), model) - f / 30) < 1e-12);
  }
});
test('all seeks clamp to implemented source range', () => {
  assert.equal(videoTime(2, 'sample', model), 0);
  assert.equal(videoTime(2, 'source', model), model.start);
  assert.equal(videoTime(90, 'sample', model), model.duration);
  assert.equal(videoTime(90, 'source', model), model.end);
});
test('unrendered lyrics never seek into the rejected old full film', () => {
  assert.equal(canReview({start: 1, end: 4, implemented: false}, model), false);
  assert.equal(canReview({start: 1, end: 4, implemented: true}, model), false);
  assert.equal(canReview({start: model.start, end: model.end, implemented: true}, model), true);
});
test('frame stepping is 1/30 second and bounded in both video modes', () => {
  for (const mode of ['sample', 'source']) {
    const min = mode === 'sample' ? 0 : model.start;
    const max = mode === 'sample' ? model.duration : model.end;
    const first = stepTime(min, -1, mode, model);
    assert.ok(first > min && first < min + 1 / 30);
    const next = stepTime(first, 1, mode, model);
    assert.ok(Math.abs(next - first - 1 / 30) < 1e-12);
    assert.ok(stepTime(max, 1, mode, model) < max);
    assert.ok(Math.abs(stepTime(next, -1, mode, model) - first) < 1e-12);
  }
});
test('cuts assign a boundary to the next shot, never both', () => {
  const shots = [{start: 0, end: 1, id: 'a'}, {start: 1, end: 2, id: 'b'}];
  assert.equal(activeItem(shots, 1).id, 'b');
  assert.equal(activeItem(shots, 2), undefined);
});
test('time labels are safe and consistent', () => {
  assert.equal(timeLabel(571 / 30), '00:19.03');
  assert.equal(timeLabel(19.8), '00:19.80');
  assert.equal(timeLabel(NaN), '00:00.00');
});
