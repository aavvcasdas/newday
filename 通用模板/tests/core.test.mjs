// 镜头契约里的纯函数：机位插值（cam / glide / track）和按句子定位（lineU）。
// 这些函数决定「同一帧永远画出同一个画面」和「时机跟着句子走」，所以单独测。
import test from 'node:test';
import assert from 'node:assert/strict';
import './tpl-loader.mjs';

const { cam, glide, track, lineU } = await import('../engine/core.ts');
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`);

const A = cam([0, 0, 10], [0, 0, 0], 30), B = cam([10, 2, 10], [1, 1, 0], 40), C = cam([10, 2, 4], [1, 1, 0], 44);
const frame = (o) => ({ t: 0, u: 0, dur: 1, T: 0, f: 0, bt: { idx: 0, phase: 0, pulse: 0, down: false }, line: -1, lp: 0, said: -1, when: () => 0, ...o });

test('cam：默认视角 38°、不侧倾', () => {
  const c = cam([1, 2, 3], [4, 5, 6]);
  assert.deepEqual([c.p, c.l, c.fov, c.roll], [[1, 2, 3], [4, 5, 6], 38, 0]);
});

test('lineU：还没轮到 = 0，正在说 = 这句的进度，说完以后（句间空档、后面的句子）一直 = 1', () => {
  near(lineU(frame({ said: -1, line: -1 }), 0), 0);            // 第一句开口之前
  near(lineU(frame({ said: 2, line: 2, lp: 0.4 }), 3), 0);     // 说到第 3 句，问第 4 句
  near(lineU(frame({ said: 2, line: 2, lp: 0.4 }), 2), 0.4);   // 正在说的这句
  near(lineU(frame({ said: 2, line: -1, lp: 0 }), 2), 1);      // 第 3 句说完后的空档：不能掉回 0
  near(lineU(frame({ said: 5, line: 5, lp: 0.1 }), 2), 1);     // 早就说完的句子
});

test('lineU：一句话从头到尾单调不减（道具动作不会倒放）', () => {
  // 第 3 句（序号 2）：之前 → 进行中 0…1 → 句间空档 → 下一句
  const states = [
    { said: 1, line: 1, lp: 0.9 }, { said: 1, line: -1, lp: 0 },
    ...[0, 0.25, 0.5, 0.75, 1].map((lp) => ({ said: 2, line: 2, lp })),
    { said: 2, line: -1, lp: 0 }, { said: 3, line: 3, lp: 0.2 },
  ];
  const vals = states.map((s) => lineU(frame(s), 2));
  for (let i = 1; i < vals.length; i++) assert.ok(vals[i] >= vals[i - 1], `第 ${i} 步倒退了：${vals}`);
  assert.deepEqual([vals[0], vals.at(-1)], [0, 1]);
});

test('glide：两端准确；中间任何一步都在往前走（没有静止段）', () => {
  assert.deepEqual(glide(A, B, 0), A);
  assert.deepEqual(glide(A, B, 1), B);
  let prev = -1;
  for (let i = 0; i <= 100; i++) {
    const x = glide(A, B, i / 100).p[0];
    assert.ok(x > prev, `u=${i / 100} 时没动：${x} ≤ ${prev}`);
    prev = x;
  }
  near(glide(A, B, 0.5).fov, 35);
});

test('track：落在哪一段就在哪一段里滑；关键帧上取到原样；两端夹住', () => {
  const keys = [[0, A], [0.5, B], [1, C]];
  assert.deepEqual(track(keys, 0), A);
  assert.deepEqual(track(keys, 0.5), B);
  assert.deepEqual(track(keys, 1), C);
  assert.deepEqual(track(keys, -3), A);
  assert.deepEqual(track(keys, 7), C);
  const m1 = track(keys, 0.25), m2 = track(keys, 0.75);
  assert.ok(m1.p[0] > 0 && m1.p[0] < 10 && m1.p[2] === 10, '前半段只在 A→B 之间');
  assert.ok(m2.p[0] === 10 && m2.p[2] < 10 && m2.p[2] > 4, '后半段只在 B→C 之间');
  assert.deepEqual(track(keys, 0.25), glide(A, B, 0.5));
});

test('track：关键帧可以落在镜头外（when() 指到别的镜头里的句子时会小于 0 或大于 1）', () => {
  const keys = [[-0.5, A], [0.5, B], [1.5, C]];
  assert.deepEqual(track(keys, 0), glide(A, B, 0.5));
  assert.deepEqual(track(keys, 1), glide(B, C, 0.5));
});

test('track：关键帧时间乱序、没有关键帧，都直接报错（不悄悄挑一段播）', () => {
  assert.throws(() => track([[0, A], [0.6, B], [0.4, C]], 0.5), /从小到大/);
  assert.throws(() => track([[0, A], [NaN, B]], 0.5), /从小到大/);
  assert.throws(() => track([], 0.5), /至少要一个关键帧/);
  assert.deepEqual(track([[0, A], [0.5, B], [0.5, C]], 0.5), B); // 同一时刻两个关键帧 = 硬切机位，允许
});
