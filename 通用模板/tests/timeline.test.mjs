// 时间轴的单元测试：node --test 通用模板/tests/
// timeline.ts 不引用别的模块，Node 22.18+ 可以直接 import 这个 .ts。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import './tpl-loader.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const tl = await import('../engine/timeline.ts');
const { FPS, LEAD, planByCues, finishTimeline, shotIndexAt, cueAt, beatAt, estimatedGrid, toSrt } = tl;
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`);

const S = [1.0, 4.0, 8.0], E = [3.5, 7.2, 10.0];

test('planByCues：第一镜从 0 秒起，之后每镜 = 该句起点 − 2 帧，总长 = 末句结束 + tail', () => {
  const t = planByCues(S, E, [{ id: 'A' }, { id: 'B', cue: 1 }, { id: 'C', cue: 2 }], { tail: 0.6 });
  assert.deepEqual(t.shots.map((s) => s.id), ['A', 'B', 'C']);
  near(t.shots[0].a, 0);
  near(t.shots[1].a, 4.0 - LEAD);
  near(t.shots[2].a, 8.0 - LEAD);
  near(t.shots[0].b, t.shots[1].a);
  near(t.duration, 10.6);
  assert.equal(t.frames, Math.ceil(10.6 * FPS));
  assert.deepEqual(t.shots.map((s) => s.cue), [-1, 1, 2]);
  assert.equal(t.marks.length, 0, '口播片默认没有节拍网格');
});

test('planByCues：after = 那一句结束后 0.15 秒；at = 写死的秒数', () => {
  const t = planByCues(S, E, [{ id: 'A' }, { id: 'MID', after: 0 }, { id: 'X', at: 6 }, { id: 'OUT', after: 2 }], { tail: 3 });
  near(t.shots[1].a, 3.65);
  near(t.shots[2].a, 6);
  near(t.shots[3].a, 10.15);
  near(t.duration, 13);
});

test('planByCues：镜头挤在一起时至少隔开 minGap，且顺序不乱', () => {
  const t = planByCues([1, 1.05, 1.1], [1.04, 1.09, 3], [{ id: 'A' }, { id: 'B', cue: 1 }, { id: 'C', cue: 2 }], { minGap: 0.2 });
  assert.ok(t.shots[2].a - t.shots[1].a >= 0.2 - 1e-9);
  for (let i = 1; i < t.shots.length; i++) assert.ok(t.shots[i].a > t.shots[i - 1].a);
});

test('planByCues：写错的镜头直接报错，不带病排镜', () => {
  assert.throws(() => planByCues(S, E, [{ id: 'A' }, { id: 'B', cue: 9 }]), /超出台词范围/);
  assert.throws(() => planByCues(S, E, [{ id: 'A' }, { id: 'B' }]), /没写从哪开始/);
  assert.throws(() => planByCues(S, E, [{ id: 'A' }, { id: 'B', after: -1 }]), /超出台词范围/);
  assert.throws(() => finishTimeline({ starts: S, ends: E, raw: [], duration: 5 }), /一个镜头都没有/);
  assert.throws(() => finishTimeline({ starts: S, ends: E, raw: [{ id: 'A', a: 0 }, { id: 'B', a: 9 }], duration: 5 }), /不早于全片总长/);
});

test('shotIndexAt：切点那一帧属于新镜头，切点前一帧属于旧镜头', () => {
  const t = planByCues(S, E, [{ id: 'A' }, { id: 'B', cue: 1 }, { id: 'C', cue: 2 }]);
  const cut = t.shots[1].a;
  assert.equal(shotIndexAt(t, cut), 1);
  assert.equal(shotIndexAt(t, cut - 1e-6), 0);
  assert.equal(shotIndexAt(t, 0), 0);
  assert.equal(shotIndexAt(t, 999), 2);
});

test('cueAt：开口前没有字幕；句间空档按 hold 保留；进度单调', () => {
  const t = planByCues(S, E, [{ id: 'A' }]);
  assert.equal(cueAt(t, 0.5), null);
  assert.equal(cueAt(t, 1.0).i, 0);
  assert.equal(cueAt(t, 3.7).i, 0, '说完后 0.35 秒内字幕还在');
  assert.equal(cueAt(t, 3.9), null, '超过 hold 就收起');
  assert.equal(cueAt(t, 3.9, 0, 0), null);
  assert.equal(cueAt(t, 4.0).i, 1);
  assert.equal(cueAt(t, 10.5).i, 2, '最后一句多留 0.6 秒');
  assert.equal(cueAt(t, 10.7), null);
  let last = -1;
  for (let x = 4.0; x < 7.2; x += 0.1) { const p = cueAt(t, x).p; assert.ok(p >= last); last = p; }
});

test('beatAt：实测网格上，重拍落在 first + k × bar × period', () => {
  const t = planByCues(S, E, [{ id: 'A' }], { beat: { period: 0.5, first: 2.0, bar: 4 } });
  assert.ok(beatAt(t, 2.0).down);
  near(beatAt(t, 2.0).pulse, 1);
  assert.ok(!beatAt(t, 2.5).down);
  assert.ok(beatAt(t, 4.0).down);
  assert.ok(beatAt(t, 0.0).down, '网格向前外推：first 之前的拍子也对得上');
  near(beatAt(t, 2.25).phase, 0.5);
  assert.equal(beatAt(planByCues(S, E, [{ id: 'A' }]), 2.0).pulse, 0, '没有节拍的口播片 pulse 恒为 0');
});

test('estimatedGrid：每句 8 拍', () => {
  const s = [10, 13.4, 16.8, 20.2];
  const g = estimatedGrid(s, 23.6, 28);
  near(g.beat, 3.4 / 8);
  assert.equal(g.counts[1], 8);
  assert.equal(g.marks[0], 0);
});

test('toSrt：时间格式与序号', () => {
  const srt = toSrt(['甲', '乙'], [1.5, 3661.25], [2, 3662]);
  assert.equal(srt, '1\n00:00:01,500 --> 00:00:02,000\n甲\n\n2\n01:01:01,250 --> 01:01:02,000\n乙\n');
});

test('参考作品《童话镇》：按仓库里的 cues.json 排出来的切点一帧不差', async () => {
  const dir = path.join(REPO, '番外MV/童话镇');
  const cues = JSON.parse(fs.readFileSync(path.join(dir, 'cues.json'), 'utf8'));
  const { plan } = await import(path.join(dir, 'plan.ts'));
  assert.equal(cues.measured, true);
  assert.equal(cues.lines.length, 31);
  const t = plan(cues.lines.map((l) => l.start), cues.lines.map((l) => l.end));
  assert.equal(t.frames, 4272);
  assert.equal(t.shots.length, 40);
  const startFrame = Object.fromEntries(t.shots.map((s) => [s.id, Math.ceil(s.a * FPS - 1e-9) + 0]));
  assert.deepEqual(
    Object.fromEntries(['I1', 'I2', 'I3', 'L01', 'L13a', 'L19a', 'N1', 'L20', 'L31', 'OUT'].map((id) => [id, startFrame[id]])),
    { I1: 0, I2: 143, I3: 277, L01: 407, L13a: 1642, L19a: 2362, N1: 2570, L20: 2928, L31: 4047, OUT: 4140 },
  );
  // 每句歌词对应的镜头都比开口早 2 帧切入
  for (let c = 0; c < 31; c++) {
    const first = t.shots.find((s) => s.cue === c);
    near(first.a, cues.lines[c].start - LEAD, 1e-9);
  }
  // 歌词起点都落在实测拍点上：误差不超过 5 毫秒（拍长存到 1e-5 秒、起点存到毫秒，两百多拍累计下来的舍入）——远小于一帧（33 毫秒）
  const { period, first } = cues.beat;
  for (const l of cues.lines) { const x = (l.start - first) / period; assert.ok(Math.abs(x - Math.round(x)) * period < 5e-3, `「${l.text}」离拍点 ${(x - Math.round(x)) * period}s`); }
});
