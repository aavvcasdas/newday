// 通用引擎单元测试：node --test tools/engine/engine.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openerCamera, openerBannerState, stampState, validateOpenerActors, TITLE_LEN as OT } from './opener_director.mjs';
import { validateSpec } from './schema_validator.mjs';
import { PROP_REGISTRY, propBottom, assertForegroundWithinStage } from './prop_registry.mjs';
import { TITLE_LEN, buildShots, buildEvents, livingBody, lifeAnim, ambientCamera, resolveActor } from './render_episode.mjs';
import { VERTICAL_LAYOUTS, verticalTitleLines } from './export_vertical.mjs';

const A = { pose: 'shock', poses: [{ at: 0.8, pose: 'point' }], x: 430, y: 600, u: 40 };
const B = { pose: 'confident_hips', x: 830, y: 600, u: 38 };
function goodSpec() {
  return {
    day: 11, title: '测试集', speaker: '本鲸',
    opener: {
      badge: '先看这里', headlinePrefix: '新来的学徒，', headlineHighlight: '把师父架空啦？',
      stampText: '就这样！', stampWord: { line: 2, char: '快' }, stampAt: [640, 520],
      actorA: structuredClone(A), actorB: structuredClone(B),
      rolePlates: ['本鲸 · 当事人', '笨鱼 · 对手戏'],
      foregroundProps: [{ propId: 'name_plate', x: 640, y: 520, scale: 1 }],
    },
    shots: [{
      id: 'C01', fromLine: 1, toLine: 2, mood: 'work_cool', actors: [structuredClone(A), structuredClone(B)],
      interactions: [{ verb: 'drop_bonk', propId: 'sesame_flatbread', wordLine: 1, wordChar: '诶', land: [565, 550], scale: 0.7 }],
      companionProps: [{ propId: 'empty_bowl', x: 760, y: 540, scale: 1, enterAt: 1.4 }],
    }],
  };
}

test('TITLE_LEN=0：第 0 帧直接正片，无独立片头', () => {
  assert.equal(TITLE_LEN, 0);
  assert.equal(OT, 0);
});

test('三拍运镜：近景起幅急拉后微推，单调分段正确', () => {
  const z = [0, 0.35, 0.7, 1.15, 1.6, 2.4, 3.2].map((t) => openerCamera(t).z);
  assert.ok(Math.abs(z[0] - 1.42) < 1e-9 && Math.abs(z[2] - 1.30) < 1e-9 && Math.abs(z[4] - 1.15) < 1e-9);
  assert.ok(z[1] < z[0] && z[3] < z[2] && z[5] > z[4], `z 序列异常：${z}`);
});

test('落章微震单次且 <=5px', () => {
  const s = openerCamera(1.02, { stampTime: 1.0 });
  assert.ok(s.shake <= 5.01);
  assert.equal(openerCamera(2.0, { stampTime: 1.0 }).shake, 0);
});

test('横幅只在 0-2.8s，印章词点后 backOut 砸落', () => {
  assert.equal(openerBannerState(0).visible, true);
  assert.equal(openerBannerState(2.79).visible, true);
  assert.equal(openerBannerState(2.8).visible, false);
  assert.equal(stampState(0.5, 1.0).visible, false);
  assert.ok(stampState(1.02, 1.0).scale > 1.5);
  assert.ok(Math.abs(stampState(3, 1.0).scale - 1.0) < 0.05);
});

test('双人同姿/双 idle 开场被拒，反差开场通过', () => {
  assert.throws(() => validateOpenerActors([{ pose: 'idle' }, { pose: 'idle' }]), /罚站|静立/);
  assert.throws(() => validateOpenerActors([{ pose: 'point' }, { pose: 'point' }]), /同姿/);
  assert.equal(validateOpenerActors([A, B]), true);
  const late = structuredClone(A); late.poses = [{ at: 2.2, pose: 'point' }];
  assert.throws(() => validateOpenerActors([late, B]), /0.65/);
});

test('合法 spec 通过；缺配套物/越界道具/数字横幅被拒', () => {
  assert.equal(validateSpec(goodSpec(), { cueCount: 2 }).day, 11);
  const noCompanion = goodSpec(); noCompanion.shots[0].companionProps = [];
  assert.throws(() => validateSpec(noCompanion, { cueCount: 2 }), /配套物/);
  const over = goodSpec(); over.opener.foregroundProps[0].y = 590;
  assert.throws(() => validateSpec(over, { cueCount: 2 }), /600/);
  const digits = goodSpec(); digits.opener.headlineHighlight = '涨了100呀';
  assert.throws(() => validateSpec(digits, { cueCount: 2 }), /阿拉伯数字/);
  const idleShot = goodSpec();
  idleShot.shots[0].actors = [{ pose: 'idle', x: 400, y: 600 }, { pose: 'idle', x: 800, y: 600 }];
  assert.throws(() => validateSpec(idleShot, { cueCount: 2 }), /静立|同姿|罚站/);
  const crowd = goodSpec();
  crowd.opener.foregroundProps.push({ propId: 'empty_bowl', x: 400, y: 470, scale: 1 });
  assert.throws(() => validateSpec(crowd, { cueCount: 2 }), /第 0 帧|同屏|道具/);
  const stacked = goodSpec();
  stacked.shots[0].companionProps = [{ propId: 'empty_bowl', x: 760, y: 540, scale: 1 }];
  assert.throws(() => validateSpec(stacked, { cueCount: 2 }), /同屏|分时|配套/);
  const earlyPlates = goodSpec();
  earlyPlates.opener.platesAt = 0.1;
  assert.throws(() => validateSpec(earlyPlates, { cueCount: 2 }), /铭牌/);
  const noMove = goodSpec();
  noMove.shots[0].actors = [{ pose: 'point', x: 400, y: 600 }, { pose: 'shock', x: 800, y: 600 }];
  assert.throws(() => validateSpec(noMove, { cueCount: 2 }), /站桩|姿态/);
  const noHit = goodSpec();
  noHit.shots[0].interactions = [];
  noHit.shots[0].allowNoCompanion = true;
  assert.throws(() => validateSpec(noHit, { cueCount: 2 }), /词点互动/);
});

test('前景道具下沿断言 y<=600', () => {
  for (const [id, p] of Object.entries(PROP_REGISTRY)) assert.ok(Number.isFinite(p.extent.bottom), id);
  assert.ok(propBottom('standee', 500, 1) <= 600);
  assert.throws(() => assertForegroundWithinStage('standee', 540, 1), /600/);
});

test('镜号/词点事件由实测轴帧号生成', () => {
  const cues = [
    { text: '诶？本鲸回来啦', start: 0, end: 1.2, chars_timed: [{ ch: '诶', start: 0, end: 0.3 }] },
    { text: '快看这边呀', start: 1.4, end: 2.4, chars_timed: [] },
  ];
  const shots = buildShots(goodSpec(), cues);
  assert.equal(shots[0].start, 0); assert.equal(shots[0].end, 2.4);
  const events = buildEvents(goodSpec(), shots, cues);
  assert.equal(events[0].contactFrame, 0);
  assert.equal(events[0].word_id, 'L01:诶');
});

test('人物不全程罚站：呼吸位移和镜头慢晃都会变', () => {
  const a = livingBody(0.2, 0.4);
  const b = livingBody(0.7, 0.4);
  assert.ok(Math.hypot(a.dx - b.dx, a.dy - b.dy) > 2, '半秒内身体要有可见位移');
  assert.notEqual(lifeAnim(0.1).bones.tail.rot, lifeAnim(0.5).bones.tail.rot);
  const c0 = ambientCamera(1, { z: 1.08, cx: 640, cy: 378 });
  const c1 = ambientCamera(2.2, { z: 1.08, cx: 640, cy: 378 });
  assert.ok(Math.abs(c0.cx - c1.cx) > 4, '镜头中心要跟着晃');
  const stood = resolveActor({ pose: 'point', x: 400, y: 600 }, 0.2, 1, []);
  const later = resolveActor({ pose: 'point', x: 400, y: 600 }, 0.9, 1, []);
  assert.ok(Math.abs(stood.x - later.x) + Math.abs(stood.y - later.y) > 2);
  const walked = resolveActor({ pose: 'point', x: 500, y: 600, walk: { from: 300, to: 500, start: 0, duration: 2 } }, 1, 1, []);
  assert.ok(walked.x > 350 && walked.x < 520);
});

test('竖屏布局：双画幅尺寸与安全区正确', () => {
  const v = VERTICAL_LAYOUTS['9:16'];
  assert.deepEqual([v.width, v.height], [1080, 1920]);
  assert.ok(v.subtitle.x + v.subtitle.w <= 960, '字幕不得进入右侧互动列');
  assert.ok(v.subtitle.y + v.subtitle.h <= 1620, '字幕不得进入底部文案区');
  assert.ok(v.stage.y1 > v.stage.y0 && v.title.y1 < v.stage.y0);
  const q = VERTICAL_LAYOUTS['3:4'];
  assert.deepEqual([q.width, q.height], [1080, 1440]);
  assert.deepEqual(verticalTitleLines(goodSpec()), ['新来的学徒，', '把师父架空啦？']);
});
