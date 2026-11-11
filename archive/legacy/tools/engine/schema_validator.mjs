// schema_validator.mjs — episode.spec.mjs 声明式配置强校验（支持动态背景集、角色动作库与双向舞台机关）
// 在渲染前拦截：缺失交互、同姿罚站、越界坐标、未知道具/动词/背景/动作、违规文案。
import { CALIBRATION, VISUAL_POSES } from '../互动元素/actor_contacts.mjs';
import { PROP_REGISTRY, propBottom } from './prop_registry.mjs';
import { validateOpenerActors } from './opener_director.mjs';
import { validateCameraPlan } from './camera_plan.mjs';
import { IMAGE_ACTORS, validatePerformanceShot } from './performance_v2.mjs';
import { validateSemanticTracks } from './semantic_tracks.mjs';
import { validateDirection, validateShotContrast } from './director_contract.mjs';
import { createHash } from 'node:crypto';
import { assertOpenerUncrowded, assertShotDensity } from './crowd_and_density.mjs';
import {
  isKnownCharacterAction,
  isKnownMoveStyle,
  isKnownLocomotionPreset,
  isKnownAtlasRig,
} from './character_motion.mjs';
import { MV_CAST, MV_CAST_IDS, mvSignatureAction, mvSignaturePosture, isMvCastId, mvCastAtlasNames } from './mv_cast_registry.mjs';
import { isKnownStageSet } from '../场景/stage_sets.mjs';
import { STAGE_TRIGGER_KINDS } from '../互动元素/world_interactions.mjs';

export const CALIBRATED_POSES = Object.freeze(Object.keys(CALIBRATION));
export { assertOpenerUncrowded, assertShotDensity, frame0StaticProps } from './crowd_and_density.mjs';

const VERBS = new Set(['drop_bonk', 'slap_deflect', 'tug_grab', 'knock_bowl', 'unroll_scroll', 'sink_drop', 'mark_strike', 'handoff']);
const NEEDS_AT = new Set(['tug_grab', 'knock_bowl', 'mark_strike', 'handoff', 'unroll_scroll']);
const ARABIC = /\d/;

function checkHookText(label, s) {
  if (typeof s !== 'string' || !s.trim()) throw new Error(`${label} 不能为空`);
  if (ARABIC.test(s)) throw new Error(`${label} 不得含阿拉伯数字：${s}`);
  if (s.length > 22) throw new Error(`${label} 过长（>22 字）：${s}`);
}

function posesOf(actor) {
  const list = [actor.pose || 'idle', ...((actor.poses || []).map((p) => p.pose)), ...((actor.poseChanges || []).map((p) => p.pose))].filter(Boolean);
  return list;
}

export function validateActor(actor, where) {
  if (!actor || typeof actor !== 'object') throw new Error(`${where} 角色配置缺失`);
  const usesAtlasOnly = Boolean(actor.locomotion || actor.atlas || (Array.isArray(actor.atlases) && actor.atlases.length));
  if (!usesAtlasOnly || actor.pose || actor.poses?.length || actor.poseChanges?.length) {
    for (const pose of posesOf(actor)) {
      if (actor.assetId ? !IMAGE_ACTORS[actor.assetId] : !VISUAL_POSES.includes(pose)) throw new Error(`${where} 使用未注册视觉姿态 ${pose}`);
    }
  }
  if (actor.locomotion != null && !isKnownLocomotionPreset(actor.locomotion)) {
    throw new Error(`${where} 使用未注册步态预设 locomotion=${actor.locomotion}`);
  }
  if (actor.atlas != null && !isKnownAtlasRig(actor.atlas)) {
    throw new Error(`${where} 使用未注册动作图集 atlas=${actor.atlas}`);
  }
  for (const [idx, item] of (actor.atlases || []).entries()) {
    if (!item || !isKnownAtlasRig(item.atlas)) {
      throw new Error(`${where}.atlases[${idx}] 使用未注册动作图集 ${item?.atlas}`);
    }
  }
  // MV 八位角色与招牌动作（tools/engine/mv_cast_registry.mjs）：Day 正传可直接点名
  if (actor.characterId != null && !isMvCastId(actor.characterId)) {
    throw new Error(`${where} characterId=${actor.characterId} 不是已登记的 MV 角色（可用：${MV_CAST_IDS.join('/')}）`);
  }
  if (actor.action != null && !isKnownCharacterAction(actor.action) && !mvSignatureAction(actor.action)) {
    throw new Error(`${where} 使用未注册角色动作 ${actor.action}`);
  }
  if (actor.action != null && mvSignatureAction(actor.action)) {
    const sig = mvSignatureAction(actor.action);
    const actorId = actor.characterId || actor.assetId || null;
    if (actorId && sig.actor !== actorId) {
      throw new Error(`${where} 招牌动作 ${actor.action} 属于 ${MV_CAST[sig.actor].label}（${sig.actor}），不能跨角色套用`);
    }
    // 坐/蹲/游姿动作不得与步态混用：否则会出现「坐着走路」的浮空残腿
    const moving = Boolean(actor.walk || actor.track?.length || (actor.locomotion && actor.locomotion !== 'idle'));
    if (moving && mvSignaturePosture(actor.action) !== 'standing') {
      throw new Error(`${where} 招牌动作 ${actor.action} 是${mvSignaturePosture(actor.action)}姿态，不能与走位/步态同时声明`);
    }
  }
  for (const item of actor.actions || []) {
    const actName = item?.action || item?.id;
    if (!isKnownCharacterAction(actName) && !mvSignatureAction(actName)) throw new Error(`${where} actions 包含未注册角色动作 ${actName}`);
  }
  if (actor.move != null && !isKnownMoveStyle(actor.move)) {
    throw new Error(`${where} 使用未注册律动风格 ${actor.move}`);
  }
  if (actor.heldProp != null) {
    const pid = typeof actor.heldProp === 'string' ? actor.heldProp : (actor.heldProp?.propId || actor.heldProp?.kind);
    if (!pid || !PROP_REGISTRY[pid]) throw new Error(`${where} heldProp 引用未知道具 ${pid}`);
  }
  if (actor.idleMotion != null && (!Number.isFinite(actor.idleMotion) || actor.idleMotion < 0 || actor.idleMotion > 1)) throw new Error(`${where} idleMotion 必须在0..1`);
  if (actor.walk) {
    const hasFrom = Number.isFinite(actor.walk.from) || typeof actor.walk.fromAnchor === 'string';
    const hasTo = Number.isFinite(actor.walk.to) || typeof actor.walk.toAnchor === 'string';
    if (!hasFrom || !hasTo || !Number.isFinite(actor.walk.duration ?? 1) || (actor.walk.duration ?? 1) <= 0) {
      throw new Error(`${where} walk 位置须为有限数或锚点、duration须为正数`);
    }
  }
  const trackStartX = Array.isArray(actor.track) && actor.track.length >= 2
    ? (Array.isArray(actor.track[0]?.[1]) ? actor.track[0][1][0] : actor.track[0]?.[1])
    : null;
  const trackStartY = Array.isArray(actor.track) && actor.track.length >= 2
    ? (Array.isArray(actor.track[0]?.[1]) ? actor.track[0][1][1] : actor.track[0]?.[2])
    : null;
  const effectiveX = actor.x ?? actor.walk?.from ?? trackStartX;
  const effectiveY = actor.y ?? trackStartY ?? 600;
  if ((effectiveX == null && !actor.walk?.fromAnchor && !actor.anchor) || (effectiveX != null && !Number.isFinite(effectiveX)) || !Number.isFinite(effectiveY)) {
    throw new Error(`${where} 角色坐标 x/y 必须为有限数`);
  }
  if (effectiveY > 640 || effectiveY < 420) throw new Error(`${where} 角色脚位 y=${effectiveY} 越界（应在 420..640）`);
}

function validatePropRef(ref, where) {
  if (!ref || !PROP_REGISTRY[ref.propId]) throw new Error(`${where} 未知道具 ${ref?.propId}`);
  for (const change of ref.stateChanges || []) {
    if (!change.state || typeof change.state !== 'object') throw new Error(`${where} stateChanges须提供state对象`);
    if ((change.line != null) === (change.at != null)) throw new Error(`${where} stateChanges须选line或at之一`);
    if (change.line != null && (!Number.isInteger(change.line) || change.line < 1)) throw new Error(`${where} stateChanges.line无效`);
    if (change.at != null && (!Number.isFinite(change.at) || change.at < 0)) throw new Error(`${where} stateChanges.at无效`);
    if (change.delay != null && (!Number.isFinite(change.delay) || change.delay < 0)) throw new Error(`${where} stateChanges.delay无效`);
  }
  const scale = ref.scale ?? 1;
  if (!Number.isFinite(ref.x) || !Number.isFinite(ref.y)) throw new Error(`${where} 道具坐标必须为有限数`);
  const bottom = propBottom(ref.propId, ref.y, scale);
  if (bottom > 600) throw new Error(`${where} 道具 ${ref.propId} 下沿 ${bottom.toFixed(1)} 越界（必须 <= 600）`);
}

function validateStageTriggers(triggers, where) {
  for (const [idx, trig] of (triggers || []).entries()) {
    if (!trig || !STAGE_TRIGGER_KINDS.includes(trig.kind)) {
      throw new Error(`${where}.stageTriggers[${idx}] 未知舞台机关类型 ${trig?.kind}`);
    }
    if (trig.duration != null && (!Number.isFinite(trig.duration) || trig.duration <= 0)) {
      throw new Error(`${where}.stageTriggers[${idx}] duration 须为正数`);
    }
  }
}

/**
 * @param {object} spec episode.spec 内容
 * @param {object} [opts] { cueCount } 提供时校验行号范围
 */
export function validateSpec(spec, opts = {}) {
  const cueCount = opts.cueCount ?? null;
  if (spec?.directorVersion != null && spec.directorVersion !== 1) throw new Error('未知directorVersion');
  if (spec?.directorVersion === 1) {
    if (!['planning', 'ready'].includes(spec.status)) throw new Error('导演spec须显式声明planning或ready状态');
    if (!/^[a-f0-9]{64}$/.test(spec.sourceScriptSha256 || '')) throw new Error('导演spec缺当前台词SHA256');
  }
  if (spec?.sourceScriptSha256 && opts.cues) {
    const hash = createHash('sha256').update(opts.cues.map((c) => c.text).join('\n') + '\n').digest('hex');
    if (hash !== spec.sourceScriptSha256) throw new Error('分镜台词SHA256与当前口播不匹配，禁止套旧稿');
  }
  if (!spec || typeof spec !== 'object') throw new Error('spec 必须为对象');
  if (!Number.isInteger(spec.day) || spec.day < 1) throw new Error('spec.day 必须为正整数');
  if (spec.defaultSet && !isKnownStageSet(spec.defaultSet)) {
    throw new Error(`spec.defaultSet 引用未知舞台背景 ${JSON.stringify(spec.defaultSet)}`);
  }
  const opener = spec.opener;
  if (!opener) throw new Error('spec.opener 缺失：新集必须声明开场钩子');
  checkHookText('opener.headlinePrefix', opener.headlinePrefix || '');
  checkHookText('opener.headlineHighlight', opener.headlineHighlight || '');
  if (opener.badge) checkHookText('opener.badge', opener.badge);
  if (opener.stampText) checkHookText('opener.stampText', opener.stampText);
  if (!opener.actorA || !opener.actorB) throw new Error('opener.actorA / opener.actorB 缺失：开场须声明双人反差');
  validateActor(opener.actorA, 'opener.actorA');
  validateActor(opener.actorB, 'opener.actorB');
  validateOpenerActors([opener.actorA, opener.actorB], { requireChange: spec.directorVersion !== 1 });
  for (const [i, p] of (opener.foregroundProps || []).entries()) validatePropRef(p, `opener.foregroundProps[${i}]`);
  assertOpenerUncrowded(spec);
  if (opener.stampWord) {
    if (!Number.isInteger(opener.stampWord.line) || !opener.stampWord.char) throw new Error('opener.stampWord 须含 line（整数）与 char');
    if (cueCount != null && (opener.stampWord.line < 1 || opener.stampWord.line > cueCount)) throw new Error('opener.stampWord.line 超出台词行数');
  }
  if (!Array.isArray(spec.shots) || !spec.shots.length) throw new Error('spec.shots 不能为空');
  const ids = new Set();
  spec.shots.forEach((shot, i) => {
    const where = `shots[${i}]${shot?.id ? `(${shot.id})` : ''}`;
    if (!shot.id || ids.has(shot.id)) throw new Error(`${where} 镜号缺失或重复`);
    ids.add(shot.id);
    if (!Number.isInteger(shot.fromLine) || !Number.isInteger(shot.toLine) || shot.fromLine > shot.toLine) throw new Error(`${where} fromLine/toLine 无效`);
    if (cueCount != null && (shot.fromLine < 1 || shot.toLine > cueCount)) throw new Error(`${where} 行号超出台词范围`);
    if ((shot.set || shot.stageSet) && !isKnownStageSet(shot.set || shot.stageSet)) {
      throw new Error(`${where} 使用未注册舞台场景 ${JSON.stringify(shot.set || shot.stageSet)}`);
    }
    if (shot.stageTriggers) validateStageTriggers(shot.stageTriggers, where);
    validateCameraPlan(shot);
    if (spec.performanceVersion === 2) validatePerformanceShot(shot);
    if (shot.semanticTracks) validateSemanticTracks(shot.semanticTracks, where);
    if (spec.directorVersion === 1) {
      validateDirection(shot, { cues: opts.cues, final: i === spec.shots.length - 1, requireWordTimes: opts.requireWordTimes });
      if (i > 0) validateShotContrast(spec.shots[i - 1], shot);
    }
    if (shot.foregroundTable) {
      const { x, y, width } = shot.foregroundTable;
      if (![x, y, width].every(Number.isFinite) || width <= 0 || y + 58 > 600) throw new Error(`${where} 前景承托桌越界/尺寸无效`);
    }
    const actors = shot.actors || shot.actorsPlan;
    if (!Array.isArray(actors) || (!actors.length && !(spec.directorVersion === 1 && shot.direction?.kind === 'prop'))) throw new Error(`${where} 缺少 actors 声明（仅导演道具特写可显式actors=[]）`);
    actors.forEach((a, j) => validateActor(a, `${where}.actors[${j}]`));
    if (actors.length >= 2 && actors.every((a) => posesOf(a).every((p) => p === 'idle') && !a.action && !a.move && !a.walk && !a.track && (!a.locomotion || a.locomotion === 'idle') && !a.atlas && !(a.atlases?.length))) {
      throw new Error(`${where} 双人全镜静立被拒：至少一人须有语义姿态或动作`);
    }
    for (const [j, it] of (shot.interactions || []).entries()) {
      const contacts = new Set(['drop_bonk', 'slap_deflect', 'tug_grab', 'knock_bowl', 'unroll_scroll', 'handoff']);
      if (contacts.has(it.verb)) {
        const defaultActor = ['slap_deflect', 'tug_grab', 'unroll_scroll', 'handoff'].includes(it.verb) ? 1 : 0;
        const used = new Set([it.actor ?? defaultActor]);
        if (it.verb === 'tug_grab') { used.add(0); used.add(1); }
        if (it.verb === 'handoff') used.add(it.toActor);
        for (const index of used) {
          if (!Number.isInteger(index) || !actors[index]) throw new Error(`${where} 接触角色索引无效`);
          if (!posesOf(actors[index]).every((pose) => CALIBRATED_POSES.includes(pose))) throw new Error(`${where} 接触动作需要校准姿态，不能用未校准的视觉姿态`);
        }
      }
      if (!VERBS.has(it.verb)) throw new Error(`${where}.interactions[${j}] 未实现动词 ${it.verb}`);
      if (!PROP_REGISTRY[it.propId]) throw new Error(`${where}.interactions[${j}] 未知道具 ${it.propId}`);
      if (it.wordChar != null && (typeof it.wordChar !== 'string' || it.wordChar.length !== 1)) throw new Error(`${where}.interactions[${j}] wordChar 须为单字`);
      if (it.verb === 'drop_bonk' && !Array.isArray(it.land)) throw new Error(`${where}.interactions[${j}] drop_bonk 必须声明 land 落点`);
      if (it.verb === 'sink_drop' && !Array.isArray(it.land) && !Array.isArray(it.at)) throw new Error(`${where}.interactions[${j}] sink_drop 必须声明 land 落点`);
      if (NEEDS_AT.has(it.verb) && !Array.isArray(it.at) && !Array.isArray(it.land)) throw new Error(`${where}.interactions[${j}] ${it.verb} 必须声明 at 落点`);
      if (it.verb === 'handoff' && !Number.isInteger(it.toActor)) throw new Error(`${where}.interactions[${j}] handoff 必须声明 toActor`);
      if (it.text && ARABIC.test(it.text)) throw new Error(`${where}.interactions[${j}] 道具文案不得含阿拉伯数字`);
      if (cueCount != null && opts.cues) {
        const lineNo = it.wordLine ?? shot.fromLine;
        const text = opts.cues[lineNo - 1]?.text || '';
        if (it.wordChar && !text.includes(it.wordChar)) throw new Error(`${where}.interactions[${j}] 词点「${it.wordChar}」不在第 ${lineNo} 行`);
        if (opts.requireWordTimes && !resolveWordTime(opts.cues, lineNo, it.wordChar).measured) throw new Error(`${where} 缺交互词级实测时间，不能按句首伪造词点`);
      }
    }
    for (const [j, p] of (shot.companionProps || []).entries()) {
      validatePropRef(p, `${where}.companionProps[${j}]`);
      for (const change of p.stateChanges || []) if (change.line != null && (change.line < shot.fromLine || change.line > shot.toLine)) throw new Error(`${where} 道具stateChanges词行须在本镜`);
    }
    if ((shot.interactions || []).length && !(shot.companionProps || []).length && !shot.allowNoCompanion) {
      throw new Error(`${where} 有主交互时须至少一件配套物（companionProps），反应特写可声明 allowNoCompanion`);
    }
    if (spec.directorVersion !== 1) assertShotDensity(shot, where);
  });
  if (spec.shots[0].fromLine !== 1) throw new Error('首镜 fromLine 必须为 1（第 0 帧直接进入正片）');
  if (cueCount != null) {
    let expect = 1;
    for (const shot of spec.shots) {
      if (shot.fromLine !== expect) throw new Error(`镜 ${shot.id} 行号不连续，期望从第 ${expect} 行起`);
      expect = shot.toLine + 1;
    }
    if (expect !== cueCount + 1) throw new Error(`分镜未覆盖全部台词（停在 ${expect - 1}，共 ${cueCount} 行）`);
  }
  return spec;
}

/** 解析词点引用：{line, char} -> 秒（chars_timed 优先，缺失退回句首并标记估算）。 */
export function resolveWordTime(cues, line, char) {
  const cue = cues[line - 1];
  if (!cue) throw new Error(`词点行号越界：L${line}`);
  const hit = (cue.chars_timed || []).find((c) => c.ch === char);
  if (hit) return { time: hit.start, measured: true };
  return { time: cue.start, measured: false };
}
