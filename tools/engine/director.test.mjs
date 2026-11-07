import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { cameraFor, CAMERA_PRESETS, validateCameraPlan } from './camera_plan.mjs';
import { livingBody, lifeAnim, gaitAnim, resolveActor, createEpisodeRenderer, createPlanningPreview, shotActorPlans, propStateAt, buildEvents, buildShots } from './render_episode.mjs';
import { validateSpec, CALIBRATED_POSES } from './schema_validator.mjs';
import { checkStoryboard } from './check_storyboard.mjs';
import { validateDirection } from './director_contract.mjs';
import { createCanvas } from './room_base.mjs';
import { actorAnchors, loadContactActors, drawContactActor, VISUAL_POSES } from '../互动元素/actor_contacts.mjs';
import plan from '../day12制作/episode.spec.mjs';
const script = fs.readFileSync(new URL('../../Day12/Day12配音台词.txt', import.meta.url), 'utf8');
const lines = script.trim().split('\n');
const cues = lines.map((text, i) => ({ text, start: i * 4, end: i * 4 + 3.5,
  chars_timed: [...text].map((ch, j) => ({ ch, start: i * 4 + j * 0.08, end: i * 4 + (j + 1) * 0.08 })) }));
const clone = () => structuredClone(plan);
const validate = (s, extra = {}) => validateSpec(s, { cueCount: lines.length, cues, ...extra });

test('全部七种景别数值接入；开场和普通镜头默认均固定', () => {
  assert.equal(Object.keys(CAMERA_PRESETS).length, 7);
  for (const framing of Object.keys(CAMERA_PRESETS)) {
    for (const t of [0, 0.35, 0.7, 1.6, 3.19, 3.2, 10, 300]) assert.deepEqual(cameraFor({ framing }, t), CAMERA_PRESETS[framing]);
  }
  const first = clone().shots[0];
  assert.deepEqual(cameraFor(first, 0, cues), cameraFor(first, 5, cues));
});

test('显式单次推拉使用小数坐标，开始前保持、结束后锁定且不改原对象', () => {
  const shot = { fromLine: 1, toLine: 2, framing: 'wide', push: { line: 2, duration: 1, z: 1.31, cx: 601.3, cy: 390.7 } };
  const before = structuredClone(shot);
  const base = cameraFor(shot, 0, cues);
  assert.deepEqual(base, CAMERA_PRESETS.wide);
  const mid = cameraFor(shot, 4.333, cues);
  assert.ok(mid.z > base.z && mid.z < 1.31);
  assert.notEqual(mid.cx, Math.round(mid.cx), '不按整像素取整');
  assert.deepEqual(cameraFor(shot, 5, cues), cameraFor(shot, 50, cues));
  assert.deepEqual(shot, before);
  const pan = { framing: 'wide', start: 0, push: { duration: 1, cx: 700 } };
  assert.equal(cameraFor(pan, 2).z, CAMERA_PRESETS.wide.z, '显式平移不偷偷叠缩放');
});

test('拒绝多次主运镜、重复字段、未知景别和无效duration/坐标', () => {
  for (const shot of [
    { framing: 'orbit_3d' }, { push: { duration: 1 } }, { push: { duration: 1, sway: 5 } }, { push: { duration: 0 } }, { camera: { z: -1 } }, { camera: { cx: NaN } },
    { pushes: [{ duration: 1 }, { duration: 1 }] }, { push: { duration: 1 }, pushes: [] },
  ]) assert.throws(() => validateCameraPlan(shot));
});

test('长时间采样双脚不打滑、呼吸与次级骨骼连续运动且无量化跳变', () => {
  for (let t = 0; t < 50; t += 0.031) {
    const body = livingBody(t, 0.4);
    assert.equal(body.dx, 0, '站立待机双脚水平锚定不打滑');
    assert.ok(Math.abs(body.dy) <= 3.0 && Math.abs(body.lean) <= 0.02 && Math.abs(body.squash) <= 0.08);
    const s0 = lifeAnim(t, 0.4);
    const s1 = lifeAnim(t + 0.001, 0.4);
    assert.ok(Math.abs(s0.bones.tail.rot - s1.bones.tail.rot) < 0.001, '次级骨骼连续可微，无跳变');
    assert.deepEqual(lifeAnim(t, 0.4, 0), { bones: {} });
    assert.deepEqual(livingBody(t, 0.4, 0), { dx: 0, dy: 0, lean: 0, squash: 0 });
  }
});

test('idleMotion=0不覆盖显式骨骼；显式走位与步态仍有效且连续', () => {
  const actor = { pose: 'point', x: 470, y: 600, idleMotion: 0, anim: { root: { sy: 1.02 }, bones: { head: { rot: 0.2 } } } };
  assert.deepEqual(resolveActor(actor, 0, 1), resolveActor(actor, 20, 1));
  assert.equal(resolveActor(actor, 0, 1).anim.bones.head.rot, 0.2);
  const walked = resolveActor({ ...actor, walk: { from: 300, to: 500, startLine: 2, duration: 2 } }, 5, 2, cues);
  assert.equal(walked.x, 400);
  assert.deepEqual(walked.anim.root, actor.anim.root);
  const a = gaitAnim(0.19999, 0, 2).bones.legL.rot;
  const b = gaitAnim(0.20001, 0, 2).bones.legL.rot;
  assert.ok(Math.abs(a - b) < 0.00001);
});

test('当前九镜规划覆盖25行并绑定现行口播，明确未实测/未视觉批准', () => {
  const report = checkStoryboard(plan, script);
  assert.equal(report.shots, 9);
  assert.equal(report.lines, 25);
  assert.equal(report.measured, false);
  assert.equal(report.visualApproved, false);
  assert.equal(report.productionReady, false);
  assert.ok(report.blockers.length > 0);
  assert.equal(report.framings.filter((s) => s.cameraMove !== 'locked').length, 1);
  assert.equal(plan.status, 'planning');
});

test('改一个台词字、漏行和覆盖不连续都会拒绝旧分镜', () => {
  assert.throws(() => checkStoryboard(plan, script.replace('找新朋友', '找老朋友')), /SHA256/);
  const s = clone(); s.shots[2].fromLine += 1;
  assert.throws(() => validate(s), /不连续/);
  const cut = clone(); cut.shots.pop(); cut.shots.at(-1).direction.holdSeconds = 0.75;
  assert.throws(() => validate(cut), /未覆盖/);
  const noHash = clone(); delete noHash.sourceScriptSha256; assert.throws(() => validate(noHash), /SHA256/);
  const noStatus = clone(); delete noStatus.status; assert.throws(() => validate(noStatus), /状态/);
});

test('导演字段/连续性/词点缺失都失败，不把相机运动当事件', () => {
  for (const field of ['focus', 'action', 'result', 'reaction', 'transition', 'continuity']) {
    const s = clone(); delete s.shots[3].direction[field]; assert.throws(() => validate(s));
  }
  const s = clone(); s.shots[3].direction.wordChar = '证';
  assert.throws(() => validate(s), /词点|台词/);
  const noWalk = clone(); delete noWalk.shots[0].actors[1].walk; delete noWalk.shots[0].actors[0].poses;
  assert.throws(() => validate(noWalk), /显式走位/);
});

test('反应与道具特写不被强迫添加无关手部接触', () => {
  const s = clone();
  assert.equal(s.shots[3].direction.kind, 'reaction');
  assert.equal(s.shots[3].interactions.length, 0);
  assert.equal(s.shots[2].direction.kind, 'prop');
  assert.doesNotThrow(() => validate(s));
});

test('连续镜头景别中心人物全相同时拒绝；改变观察方向可通过', () => {
  const s = clone(); const prev = s.shots[0]; const next = s.shots[1];
  next.framing = prev.framing; next.actors = structuredClone(prev.actors);
  assert.throws(() => validate(s), /全相同/);
  next.framing = 'close_left';
  assert.doesNotThrow(() => validate(s));
});

test('结果理解停留有下限，结尾不能用0.24秒尾部冒充0.6秒结果驻留', () => {
  const s = clone(); s.shots[0].direction.holdSeconds = 0.2;
  assert.throws(() => validate(s), /停留/);
  const end = clone(); end.shots.at(-1).direction.holdSeconds = 0.24;
  assert.throws(() => validate(end), /0.6/);
  assert.doesNotThrow(() => validate(plan, { requireWordTimes: true }));
  const backwards = clone(); backwards.shots[2].direction.resultChar = '通';
  assert.throws(() => validate(backwards, { requireWordTimes: true }), /结果早于触发/);
  const short = structuredClone(cues); const shot = plan.shots.at(-1); const d = shot.direction;
  const char = short[d.resultLine - 1].chars_timed.find((c) => c.ch === d.resultChar);
  short[shot.toLine - 1].end = char.start + 0.1;
  assert.throws(() => validateDirection(shot, { cues: short, final: true, requireWordTimes: true }), /停留/);
});

test('无词级时间只能作规划；正式结果/交互检查不能按句首伪造实测', () => {
  const noWords = cues.map(({ text, start, end }) => ({ text, start, end }));
  assert.throws(() => validateSpec(plan, { cueCount: lines.length, cues: noWords, requireWordTimes: true }), /词级实测/);
  const events = buildEvents(plan, buildShots(plan, noWords), noWords);
  assert.ok(events.every((e) => e.measured === false));
});

test('视觉姿态不再只限8种，接触校准仍只有8种，28旧动作与骨骼动作已真实接入且拒绝未知动作', () => {
  assert.ok(VISUAL_POSES.length > CALIBRATED_POSES.length);
  assert.equal(CALIBRATED_POSES.length, 8);
  const visual = clone(); visual.shots[3].actors[0].pose = 'wave';
  assert.doesNotThrow(() => validate(visual));
  const contact = clone(); contact.shots[5].actors[0].pose = 'wave';
  contact.shots[5].interactions = [{ verb: 'drop_bonk', propId: 'folded_page', actor: 0, wordLine: 15, wordChar: '划', land: [640, 500] }];
  assert.throws(() => validate(contact), /需要校准/);
  const wired = clone(); wired.shots[3].actors[0].action = 'jump_joy';
  assert.doesNotThrow(() => validate(wired));
  const jumped = resolveActor(wired.shots[3].actors[0], 0.85, 10, cues);
  assert.ok(jumped.lift > 0.2 && jumped.y < 590, 'jump_joy 真实产生起跳升空与骨骼动画');
  const unknown = clone(); unknown.shots[3].actors[0].action = 'nonexistent_fake_action';
  assert.throws(() => validate(unknown), /未注册角色动作/);
});

test('视觉加载路径可绘制非接触姿态，但不能取得伪造的手掌锚点（合成单测，不是素材验收）', async () => {
  const image = createCanvas(64, 64); image.getContext('2d').fillRect(16, 2, 32, 60);
  await loadContactActors({ createCanvas, loadImage: async () => image, poses: ['wave'] });
  const actor = { pose: 'wave', x: 470, y: 600, u: 38, anim: { bones: {} } };
  assert.throws(() => actorAnchors(actor), /Uncalibrated/);
  const g = createCanvas(1280, 720).getContext('2d');
  assert.equal(drawContactActor(g, actor), null);
  await assert.rejects(loadContactActors({ createCanvas, loadImage: async () => { throw new Error('missing'); }, poses: ['run'] }), /缺少既有角色素材/);
});

test('planning不能被生产renderer误当成完整成片', async () => {
  await assert.rejects(createEpisodeRenderer({ spec: plan, alignment: { cues }, subdata: {} }), /仍是 planning/);
  const ready = clone(); ready.status = 'ready';
  await assert.rejects(createEpisodeRenderer({ spec: ready, alignment: { cues }, subdata: {} }), /实测绑定/);
});

test('检查CLI从当前文件实际加载计划，非占位图渲染', () => {
  const result = spawnSync(process.execPath, ['tools/engine/check_storyboard.mjs', '--spec', 'tools/day12制作/episode.spec.mjs', '--script', 'Day12/Day12配音台词.txt'], { encoding: 'utf8', cwd: new URL('../..', import.meta.url) });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).check, 'planning_structure_only');
});


test('导演开场不被旧opener演员覆盖，走入从画外开始且在3.2秒内执行', () => {
  const s = clone(); const shot = s.shots[0];
  const plans = shotActorPlans(s, shot, true);
  assert.equal(plans, shot.actors);
  assert.ok(plans[1].walk.from > 1280);
  assert.notEqual(resolveActor(plans[1], 4.5, 2, cues).x, plans[1].walk.from);
  assert.equal(shotActorPlans({ ...s, directorVersion: undefined }, shot, true)[0], s.opener.actorA);
});

test('无声样片入口拒绝实测声明、音源哈希和伪造词轴，不放宽生产入口', async () => {
  await assert.rejects(createPlanningPreview({ spec: plan, alignment: { measured: true, cues }, subdata: { measured: false } }), /无声样片/);
  await assert.rejects(createPlanningPreview({ spec: plan, alignment: { measured: false, cues }, subdata: { measured: false } }), /伪词轴/);
  await assert.rejects(createPlanningPreview({ spec: { ...plan, status: 'ready' }, alignment: {}, subdata: {} }), /只接受planning/);
});

test('同落点正反面通过显式stateChanges切换，不把文字变化伪称手掌翻纸', () => {
  const shot = plan.shots[6]; const ref = shot.companionProps[0];
  const start = cues[shot.fromLine - 1].start;
  assert.equal(propStateAt(ref, start + 1.19, cues).title, '录取通知');
  assert.equal(propStateAt(ref, start + 1.2, cues).title, '筛岗位');
  assert.equal(ref.x, plan.shots[2].companionProps.find((p) => p.propId === 'folded_page').x);
  const bad = clone(); bad.shots[6].companionProps[0].stateChanges[0].line = 25;
  assert.throws(() => validate(bad), /须在本镜/);
});

test('道具插入镜可显式无演员以免裁头；其他镜头仍不可空演员，桌面承托不侵入字幕', () => {
  assert.equal(plan.shots[2].actors.length, 0);
  assert.doesNotThrow(() => validate(plan));
  const s = clone();s.shots[3].actors = []; assert.throws(() => validate(s), /actors/);
  const bad = clone();bad.shots[2].foregroundTable.y = 550; assert.throws(() => validate(bad), /承托桌/);
});
