// motion_library.test.mjs — 通用动作库自检
//
// 目标：让「分镜里能写哪些动作」变成可执行的事实，而不是散落在各 Day 的注释里。
//   1. 每个角色都必须有 walk + idle 两套图集，且文件真在库里；
//   2. 模板 spec 里登记的 motionCatalog 必须与动作库的 locomotion 词表一一对应；
//   3. resolveMotion 对每个登记的动词都能解析出素材，未知动作要报错。

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CHARACTER_MOTIONS, LOCOMOTION_ALIASES, RIG_MOTION_NAMES, LEGACY_MOTION_NAMES,
  describeMotions, resolveMotion, validateMotionLibrary, petStates,
} from './motion_library.mjs';
import { DAY_EPISODE_TEMPLATE_SPEC } from './day_episode.template.spec.mjs';

test('每个角色都有 walk + idle 图集，且素材在库里', () => {
  for (const [char, entry] of Object.entries(CHARACTER_MOTIONS)) {
    for (const kind of ['walk', 'idle']) {
      const name = entry[kind];
      assert.ok(name, `${char} 缺 ${kind}`);
      const motion = resolveMotion(char, kind);
      assert.ok(motion.path, `${char}/${kind} 图集 ${name} 不在 assets/ai-girls/walk-v14`);
    }
    for (const [variant, pair] of Object.entries(entry.variants || {})) {
      for (const kind of ['walk', 'idle']) {
        assert.ok(resolveMotion(char, `${variant}_${kind}`).path, `${char}/${variant}_${kind} 缺素材`);
      }
    }
  }
  assert.ok(Object.keys(CHARACTER_MOTIONS).length >= 9, '至少要覆盖 9 个角色');
});

test('模板 spec 的 motionCatalog 与动作库词表一致', () => {
  const catalog = [...DAY_EPISODE_TEMPLATE_SPEC.motionCatalog].sort();
  const library = Object.keys(LOCOMOTION_ALIASES).sort();
  assert.deepEqual(catalog, library);
  for (const word of catalog) {
    assert.ok(resolveMotion('whale', word).atlas, `模板登记的动作 ${word} 在鲸鱼娘身上解析不出图集`);
  }
});

test('骨骼动作与旧版动作都在动作库里登记过', () => {
  assert.ok(RIG_MOTION_NAMES.length >= 4, 'RIG_ACTIONS 少于 4 条，动作库没接上');
  assert.ok(LEGACY_MOTION_NAMES.length >= 20, 'LEGACY_ACTIONS 条数异常');
  const walkNatural = resolveMotion('whale', 'walk_natural');
  assert.equal(walkNatural.kind, 'rig');
});

test('宠物状态（含干饭）走 pet-v7 图集', () => {
  const pet = petStates('whale');
  assert.ok(pet, 'pet-v7 鲸鱼娘图集缺失');
  assert.ok(pet.states.eating, '鲸鱼娘没有 eating 状态');
  assert.equal(pet.states.eating.frames, 8, '干饭必须是 8 格专门动作');
  assert.equal(resolveMotion('whale', 'eating').kind, 'pet');
  assert.equal(resolveMotion('gpt', 'thinking').kind, 'pet');
});

test('未知动作要直接报错，不能静默回退', () => {
  assert.throws(() => resolveMotion('whale', 'moonwalk'), /没有动作/);
  assert.throws(() => resolveMotion('nobody', 'walk'), /未知角色/);
});

test('全库素材齐全', () => {
  const { ok, missing, total } = validateMotionLibrary();
  assert.deepEqual(missing, []);
  assert.ok(ok);
  assert.ok(total >= 40, `动作总数 ${total} 偏少`);
  assert.equal(describeMotions().length, total);
});
