// 纸艺 Q 版契约与 pets 播放回归。结构检查不等于视觉/听审验收。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { frameAt, stateAt, loadCast } from './pets_actor.mjs';
import {
  validatePaperSpec, validatePaperShot, assertCastCap, MAX_ON_SCREEN,
  loadCastLibrary, availableStates, BANNED_MOTION,
} from './paper_contract.mjs';
import { loadPaperSpec, planningCues, createPaperFilm, FRAMINGS } from './render_paper_episode.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const DEMO = path.join(ROOT, 'tools/角色Q版库/样例/paper.demo.spec.mjs');
const SCRIPT = path.join(ROOT, 'tools/角色Q版库/样例/demo_script.txt');

const demoSpec = async () => {
  const spec = await loadPaperSpec(DEMO);
  const cues = planningCues(fs.readFileSync(SCRIPT, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean));
  return { spec, cues };
};

test('同屏上限硬约束为 2，超员必须报错', () => {
  assert.equal(MAX_ON_SCREEN, 2);
  assert.equal(loadCastLibrary().maxOnScreen, 2);
  const a = { id: 'whale', x: 1, y: 1, h: 1 };
  assert.equal(assertCastCap({ id: 'S', actors: [a, { ...a, id: 'doubao' }] }), 2);
  assert.throws(() => assertCastCap({ id: 'S', actors: [a, { ...a, id: 'doubao' }, { ...a, id: 'gpt' }] }), /超过上限 2/);
  assert.throws(() => assertCastCap({ id: 'S', actors: [a, { ...a }] }), /重复上场/);
});

test('pets 累计毫秒选帧：循环取模，非循环停末帧不回弹', () => {
  const anim = { row: 3, frame_count: 3, frame_durations_ms: [100, 100, 200], loop: true };
  assert.deepEqual(frameAt(anim, 0), { col: 0, row: 3 });
  assert.deepEqual(frameAt(anim, 0.15), { col: 1, row: 3 });
  assert.deepEqual(frameAt(anim, 0.25), { col: 2, row: 3 });
  assert.deepEqual(frameAt(anim, 0.45), { col: 0, row: 3 }); // 400ms 周期取模
  const once = { ...anim, loop: false };
  assert.deepEqual(frameAt(once, 5), { col: 2, row: 3 }); // 停末帧
});

test('states 序列按镜内本地时间推进，末段无限保持', () => {
  const seq = [{ state: 'walk-right', dur: 1 }, { state: 'point' }];
  assert.equal(stateAt(seq, 0.4).state, 'walk-right');
  assert.equal(stateAt(seq, 1.4).state, 'point');
  assert.ok(Math.abs(stateAt(seq, 1.4).local - 0.4) < 1e-9);
  assert.equal(stateAt(seq, 9).state, 'point');
});

test('图集与 cast 一致：帧数/时长对齐，公共脚底，整格尺寸', () => {
  const cast = loadCast();
  assert.equal(cast.appliesFrom, 'Day13');
  for (const [id, ch] of Object.entries(cast.characters)) {
    const p = path.join(ROOT, 'tools/角色Q版库/pets', id, 'pet.json');
    if (!fs.existsSync(p)) continue;
    const pet = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert.equal(pet.grid.cell_width, cast.cell.w);
    assert.equal(pet.grid.cell_height, cast.cell.h);
    assert.equal(pet.anchor.foot_y, cast.cell.footY);
    assert.equal(pet.anchor.stand_px, cast.cell.standPx);
    for (const a of pet.animations) {
      assert.equal(a.frame_count, a.frame_durations_ms.length, `${id}.${a.state}`);
      assert.ok(a.frame_count <= pet.grid.columns);
      assert.ok(a.frame_durations_ms.every((d) => d > 0));
      assert.ok(!BANNED_MOTION.test(a.state));
    }
    // 主角必须有真多帧步态，不能用单帧平移冒充走路
    if (ch.role === 'protagonist') {
      const cycle = pet.animations.find((a) => a.state === 'walk-right');
      assert.ok(cycle && cycle.frame_count >= 3, '主角须有 >=3 帧步态');
    }
  }
});

test('未生成的状态必须被拒绝，不得冒充已有动作', () => {
  const cast = loadCastLibrary();
  const avail = availableStates('whale');
  assert.ok(avail.includes('point'));
  assert.ok(!avail.includes('wave_a'));
  assert.throws(() => validatePaperShot({
    id: 'X', fromLine: 1, toLine: 1, framing: 'medium', set: 'sea_room',
    direction: { kind: 'reaction', focus: 'a', entry: 'b', action: 'c', trigger: 'd', result: 'e', reaction: 'f', exit: 'g', transition: 'h', continuity: { in: 'i', out: 'o' }, wordLine: 1, wordChar: '纸', holdSeconds: 0.4 },
    actors: [{ id: 'whale', x: 1, y: 1, h: 300, states: [{ state: 'wave_a' }] }],
  }, { cast }), /不在 pets 图集中/);
});

test('走位必须配 walk-* 步态；整图微晃参数被拒绝', () => {
  const cast = loadCastLibrary();
  const base = {
    id: 'X', fromLine: 1, toLine: 1, framing: 'medium', set: 'sea_room',
    direction: { kind: 'staging', focus: 'a', entry: 'b', action: 'c', trigger: 'd', result: 'e', reaction: 'f', exit: 'g', transition: 'h', continuity: { in: 'i', out: 'o' }, wordLine: 1, wordChar: '纸', holdSeconds: 0.4 },
  };
  assert.throws(() => validatePaperShot({ ...base, actors: [{ id: 'whale', x: 1, y: 1, h: 300, states: [{ state: 'idle' }], walk: { from: 0, to: 100, dur: 1 } }] }, { cast }), /禁止平移滑行/);
  assert.throws(() => validatePaperShot({ ...base, actors: [{ id: 'whale', x: 1, y: 1, h: 300, states: [{ state: 'idle' }, { state: 'point' }], idleMotion: 0.4 }] }, { cast }), /不接受 idleMotion/);
});

test('样例 spec 过契约，且每镜人数 <=2', async () => {
  const { spec, cues } = await demoSpec();
  const r = validatePaperSpec(spec, { cues });
  assert.equal(r.ok, true);
  assert.equal(r.maxOnScreen, 2);
  assert.ok(spec.shots.every((s) => s.actors.length <= 2));
  assert.ok(r.castUsed.includes('whale'));
});

test('Day12 及以前不适用纸艺口径（历史集不改不重渲）', async () => {
  const { spec, cues } = await demoSpec();
  assert.throws(() => validatePaperSpec({ ...spec, day: 12 }, { cues }), /自 Day13 起适用/);
});

test('景别真的改变构图，不是只改标签', () => {
  assert.ok(FRAMINGS.close.z > FRAMINGS.medium.z);
  assert.ok(FRAMINGS.medium.z > FRAMINGS.wide.z);
  assert.notEqual(FRAMINGS.close.cx, FRAMINGS.wide.cx);
});

test('渲染 deterministic：同一 t 两次像素一致；估时轴显式 measured=false', async () => {
  const { spec, cues } = await demoSpec();
  assert.ok(cues.every((c) => c.measured === false));
  const film = await createPaperFilm(spec, { cues });
  const a = film.renderAt(3.0).canvas.data();
  const b = film.renderAt(3.0).canvas.data();
  assert.equal(Buffer.compare(Buffer.from(a), Buffer.from(b)), 0);
  assert.ok(film.duration > 0);
});

test('步态朝向必须与位移同向：倒着走要被拒绝（本轮用户发现的 bug）', async () => {
  const { spec, cues } = await demoSpec();
  const cast = loadCastLibrary();
  const base = spec.shots[0];
  const mk = (walk, state, flip = false) => ({
    ...base,
    actors: [{ id: 'whale', x: walk.to, y: 920, h: 400, flip,
      states: [{ state, dur: 1.2 }, { state: 'idle' }], walk }],
  });
  // 向右位移 + 朝右步态 → 通过
  assert.equal(validatePaperShot(mk({ from: 300, to: 700, dur: 1.2 }, 'walk-right'), { cast, cues }), true);
  // 向左位移 + 朝左步态 → 通过
  assert.equal(validatePaperShot(mk({ from: 700, to: 300, dur: 1.2 }, 'walk-left'), { cast, cues }), true);
  // 向右位移却用朝左步态 → 必须报错（就是"倒着走"）
  assert.throws(() => validatePaperShot(mk({ from: 300, to: 700, dur: 1.2 }, 'walk-left'), { cast, cues }), /步态朝向与位移相反/);
  assert.throws(() => validatePaperShot(mk({ from: 700, to: 300, dur: 1.2 }, 'walk-right'), { cast, cues }), /步态朝向与位移相反/);
  // flip 镜像后有效朝向翻转：朝左步态 + flip 可以向右走
  assert.equal(validatePaperShot(mk({ from: 300, to: 700, dur: 1.2 }, 'walk-left', true), { cast, cues }), true);
});

test('walk-* 图集朝向登记正确：右向不镜像、左向镜像（防止再次登记反）', () => {
  const cast = loadCastLibrary();
  const st = cast.characters.whale.states;
  assert.ok(st['walk-right'].frames.length >= 4, '右向步态须真四帧');
  assert.ok(!st['walk-right'].mirror, 'walk-right 源姿势已朝右，不得再镜像');
  assert.equal(st['walk-left'].mirror, true, 'walk-left 必须由朝右源镜像');
  assert.deepEqual(st['walk-right'].frames, st['walk-left'].frames, '两向共用同一套源步态');
  // 旧的朝左素材必须已退出注册，否则又会被当成右向用
  const dep = (cast.characters.whale.deprecatedPoses?.files) || [];
  for (const old of ['walk_a', 'walk_b', 'walk_c']) {
    assert.ok(dep.includes(old), `${old} 应记为 deprecated`);
    assert.ok(!cast.characters.whale.poses.includes(old), `${old} 不得仍在 poses 注册中`);
    assert.ok(!st['walk-right'].frames.includes(old), `${old} 不得仍被 walk-right 引用`);
  }
});

test('sleep 已修复双腿：姿势文件已更新且仍在注册中', () => {
  const cast = loadCastLibrary();
  assert.ok(cast.characters.whale.poses.includes('sleep'));
  assert.ok(cast.characters.whale.states.sleep.frames.includes('sleep'));
  const f = path.join(ROOT, 'tools/角色Q版库/generations/whale/sleep.png');
  assert.ok(fs.existsSync(f));
  // 重生成后的修复图应比旧的双腿图更大/不同；此处校验 sha 已登记，避免静默回退旧图
  const pet = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/角色Q版库/pets/whale/pet.json'), 'utf8'));
  assert.ok(pet.generated_poses_sha256.sleep, 'sleep 源图 sha 须登记');
});
