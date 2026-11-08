// mv_cast_day.test.mjs — 「MV 八位角色 + 招牌动作并入 Day 系列」的不变量回归
//
// 锁住四件容易回退的事：
//   1. 注册表里每个招牌动作的 atlas 都真实存在于 lyric-action-v13；
//   2. 图集度量表覆盖全部角色图集与步态图集，headTop 锚点按实测内容顶回缩；
//   3. 同一 spec 在 Canvas 与 Remotion 两个后端求出的手持道具坐标逐位一致；
//   4. 坐/蹲/游姿态不能被拿去走路（schema_validator 姿态护栏）。

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MV_CAST_IDS,
  MV_SIGNATURE_ACTIONS,
  mvCastAtlasNames,
  mvSignatureAction,
  mvSignaturePosture,
  mvStandingActions,
} from './mv_cast_registry.mjs';
import { ATLAS_CONTENT, atlasTopFrac, atlasVisibleTopFrac } from './atlas_metrics.mjs';
import { handAt, evaluateCharacterMotion } from './character_motion.mjs';
import { validateSpec } from './schema_validator.mjs';
import { WALK_RIG_BUILDERS } from '../remotion-engine/walk_rig_builder.mjs';
import { buildShots, shotActorPlans, resolveActor } from './render_episode.mjs';
import { computeWorldInteractionState } from '../互动元素/world_interactions.mjs';
import { evaluateRemotionFrameState } from '../remotion-engine/frame_evaluator.mjs';
import { adaptEpisodeToRemotionProps } from './remotion_episode_adapter.mjs';
import mvCastDaySpec, { buildMvCastDayAlignment, buildMvCastDaySubtitles } from './mv_cast_day_spec.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ATLAS_DIR = path.join(ROOT, 'assets/ai-girls/lyric-action-v13');

test('MV 注册表：八位角色齐全，招牌动作图集都真实存在', () => {
  assert.equal(MV_CAST_IDS.length, 8);
  const missing = [];
  const exists = (name) => fs.existsSync(path.join(ATLAS_DIR, `${name}.png`)) || Boolean(WALK_RIG_BUILDERS[name]);
  for (const [id, action] of Object.entries(MV_SIGNATURE_ACTIONS)) {
    if (!exists(action.atlas)) missing.push([id, action.atlas]);
    assert.ok(MV_CAST_IDS.includes(action.actor), `${id} 的 actor 不在 MV_CAST_IDS`);
  }
  assert.deepEqual(missing, [], '招牌动作图集缺文件');
  for (const id of MV_CAST_IDS) {
    // 步态/落座类图集由 walk_rig_builder 运行时生成，只有表演图集才要求源 PNG 存在
    const bad = mvCastAtlasNames(id).filter((name) => !exists(name));
    assert.deepEqual(bad, [], `${id} 的图集名有拼写错误`);
  }
});

test('招牌动作：道具跟手的只有声明了 heldProp 的两个，其余画在图里', () => {
  const withProp = Object.entries(MV_SIGNATURE_ACTIONS)
    .filter(([, a]) => a.heldProp)
    .map(([id]) => id)
    .sort();
  assert.deepEqual(withProp, ['doubao_hold_umbrella', 'doubao_lift_lantern']);
  assert.equal(mvSignatureAction('kimi_hold_lantern').heldProp, null);
});

test('图集度量：覆盖全部角色图集，headTop 按实测内容顶回缩', () => {
  const missing = [];
  for (const id of MV_CAST_IDS) {
    for (const name of mvCastAtlasNames(id)) {
      if (!ATLAS_CONTENT[name]) missing.push([id, name]);
    }
  }
  assert.deepEqual(missing, [], '有图集没进度量表（跑 build_atlas_metrics.mjs --write）');

  const visible = atlasVisibleTopFrac('doubao_lantern_action');
  assert.ok(visible > 0.6 && visible < 0.85, `实测可见头顶比例异常：${visible}`);
  assert.ok(atlasTopFrac('doubao_lantern_action') > 0.15, '格顶留白应被量出来');

  const fallback = atlasVisibleTopFrac('__not_measured__');
  assert.equal(fallback, 0.96, '未测图集必须退回保守值，不能变成 NaN');

  const top = handAt({ characterId: 'whale', atlas: 'whale_bird', x: 640, y: 600, height: 300 }, 'headTop');
  assert.ok(top.y < 600 && top.y > 300, 'headTop 应落在角色身上，而不是凭空高出');

  const waist = handAt({ characterId: 'whale', atlas: 'doubao_lantern_action', x: 640, y: 600, height: 300 }, 'headTop');
  assert.notEqual(top.y, waist.y, '不同图集的可见头顶不同，锚点必须跟着变');
});

test('姿态护栏：坐/蹲/游的招牌动作不能拿去走路', () => {
  const seated = mvStandingActions('whale');
  assert.ok(!seated.includes('whale_read_book'), '坐姿读册不该出现在站立动作里');
  assert.equal(mvSignaturePosture('whale_read_book'), 'sitting');

  const spec = {
    ...mvCastDaySpec,
    shots: [
      {
        ...mvCastDaySpec.shots[0],
        actors: [
          { name: '本鲸', characterId: 'whale', locomotion: 'walk', y: 600, height: 306, action: 'whale_read_book' },
        ],
      },
    ],
  };
  const alignment = buildMvCastDayAlignment();
  assert.throws(
    () => validateSpec(spec, { cueCount: alignment.cues.length, cues: alignment.cues, requireWordTimes: false }),
    /坐|站|walk|姿态|posture/i,
  );
});

test('双后端一致：同一 spec 的手持道具世界坐标逐位相同', () => {
  const alignment = buildMvCastDayAlignment();
  const subdata = buildMvCastDaySubtitles();
  const props = adaptEpisodeToRemotionProps({ spec: mvCastDaySpec, alignment, subdata, planningPreview: true });
  const shots = buildShots(mvCastDaySpec, alignment.cues);

  let checked = 0;
  for (const [shotIndex, shot] of shots.entries()) {
    for (const t of [shot.start + 0.4, (shot.start + shot.end) / 2, shot.end - 0.3]) {
      const line = shot.fromLine;
      const actors = shotActorPlans(mvCastDaySpec, shot, false).map((plan, idx) =>
        resolveActor(plan, t, line, alignment.cues, { shotStart: shot.start, actorIndex: idx }),
      );
      const canvasProps = computeWorldInteractionState({
        shot,
        spec: mvCastDaySpec,
        actors,
        calibratedAnchors: [],
        events: [],
        t,
      }).boundProps || [];
      const remotionProps = evaluateRemotionFrameState(props, t).worldState.boundProps || [];
      assert.equal(canvasProps.length, remotionProps.length, `t=${t} 道具数量不一致`);
      for (let i = 0; i < canvasProps.length; i++) {
        assert.equal(canvasProps[i].propId, remotionProps[i].propId);
        assert.ok(Math.abs(canvasProps[i].x - remotionProps[i].x) < 1e-9, `t=${t} x 不一致`);
        assert.ok(Math.abs(canvasProps[i].y - remotionProps[i].y) < 1e-9, `t=${t} y 不一致`);
      }
      checked += canvasProps.length;
      // 招牌动作名两端也必须一致
      const rmActors = evaluateRemotionFrameState(props, t).actors || [];
      rmActors.forEach((ra, i) => {
        if (actors[i]) assert.equal(ra.signatureAction, actors[i].signatureAction, `t=${t} 第 ${i} 位动作不一致`);
      });
      void shotIndex;
    }
  }
  assert.ok(checked > 0, '整份验收分镜里应该至少要出现一次手持道具');
});

test('走位与招牌动作并存：走着的人脚下位移连续，到站不跳', () => {
  const alignment = buildMvCastDayAlignment();
  const shots = buildShots(mvCastDaySpec, alignment.cues);
  const shot = shots[0];
  const plan = shotActorPlans(mvCastDaySpec, shot, false)[0];
  let prev = null;
  for (let t = shot.start; t < shot.end - 0.05; t += 1 / 30) {
    const a = evaluateCharacterMotion(plan, t, { line: shot.fromLine, cues: alignment.cues, shotStart: shot.start });
    if (prev) {
      assert.ok(Number.isFinite(a.x) && Number.isFinite(a.y), '走位坐标不能是 NaN');
      assert.ok(Math.abs(a.x - prev.x) < 24, `t=${t.toFixed(2)} 单帧横向位移过大（${(a.x - prev.x).toFixed(1)}px）`);
    }
    prev = a;
  }
});

test('零水印：验收样片渲染器不在画面里画任何角标', () => {
  const src = fs.readFileSync(path.join(ROOT, 'tools/engine/render_mv_cast_sample.mjs'), 'utf8');
  assert.ok(!/fillRect\([^)]*,\s*24\s*,\s*322/.test(src), '不得恢复角标底板');
  assert.ok(!/结构验收 · 无声/.test(src), '不得把角标文字画进画面');
});
