// paper_contract.mjs — Day13+ 纸艺 Q 版分镜契约（通用引擎，与单集解耦）
//
// 用户 2026-11-06 口径：
//   · 人物全部 Q 版，动作参照 pets 格式真逐帧；
//   · 同屏最多 2 人（人物太多占画面）；
//   · 不许整图 bounce/hop/sway 冒充动画；
//   · 每镜要有可见事件与逐镜构造细节，不能只写剧情标题。
// 结构检查不等于视觉/听审验收。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
export const MAX_ON_SCREEN = 2;
export const PAPER_VERSION = 1;
export const BANNED_MOTION = /\b(bounce|hop|sway|squash|breathbob)\b|整图弹跳|整体晃动|整身弹跳/i;

const DIRECTION_REQUIRED = ['focus', 'entry', 'action', 'trigger', 'result', 'reaction', 'exit', 'transition'];
const text = (v) => typeof v === 'string' && v.trim().length > 0;

export function loadCastLibrary() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/角色Q版库/cast.json'), 'utf8'));
}

export function petJsonPath(id) {
  return path.join(ROOT, 'tools/角色Q版库/pets', id, 'pet.json');
}

export function availableStates(id) {
  const p = petJsonPath(id);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8')).animations.map((a) => a.state);
}

/** 同屏人数：静态镜 actors，加本镜内会入场的 enterAt 角色，一起算。 */
export function onScreenCount(shot) {
  return (shot.actors || []).length;
}

export function assertCastCap(shot, where = shot?.id || 'shot') {
  const n = onScreenCount(shot);
  if (n > MAX_ON_SCREEN) {
    throw new Error(`${where} 同屏 ${n} 人，超过上限 ${MAX_ON_SCREEN} 人；请拆镜或让角色退场，不得靠缩小塞满画面`);
  }
  const ids = (shot.actors || []).map((a) => a.id);
  if (new Set(ids).size !== ids.length) throw new Error(`${where} 同一角色重复上场：${ids.join(',')}`);
  return n;
}

export function validatePaperActor(actor, where, cast) {
  if (!actor?.id) throw new Error(`${where} 角色缺 id`);
  const known = cast.characters[actor.id] || (cast.guests?.ids || []).includes(actor.id);
  if (!known) throw new Error(`${where} 未登记角色 ${actor.id}`);
  if (!Number.isFinite(actor.x) || !Number.isFinite(actor.y)) throw new Error(`${where} ${actor.id} 坐标须为有限数`);
  if (!Number.isFinite(actor.h) || actor.h <= 0) throw new Error(`${where} ${actor.id} 须声明可见身高 h`);
  if (actor.idleMotion != null || actor.livingBody != null || actor.bodyEvents != null) {
    throw new Error(`${where} ${actor.id} 纸艺 Q 版不接受 idleMotion/livingBody/bodyEvents 整图微晃；动态用 states 真帧或走位`);
  }
  const states = actor.states || [];
  if (!Array.isArray(states) || !states.length) throw new Error(`${where} ${actor.id} 须声明 states 表演序列`);
  const avail = availableStates(actor.id);
  for (const s of states) {
    if (!text(s.state)) throw new Error(`${where} ${actor.id} states 缺 state 名`);
    if (BANNED_MOTION.test(s.state)) throw new Error(`${where} ${actor.id} 禁止弹跳类状态 ${s.state}`);
    if (s.dur != null && (!Number.isFinite(s.dur) || s.dur <= 0)) throw new Error(`${where} ${actor.id} states.dur 须为正数`);
    if (avail && !avail.includes(s.state)) {
      throw new Error(`${where} ${actor.id} 状态 ${s.state} 不在 pets 图集中（现有：${avail.join('/')}）；不得用未生成的动作冒充`);
    }
  }
  if (actor.walk) {
    const { from, to, dur } = actor.walk;
    if (![from, to, dur].every(Number.isFinite) || dur <= 0) throw new Error(`${where} ${actor.id} walk 须 from/to/dur 有限且 dur>0`);
    const gait = states.some((s) => /^walk-/.test(s.state));
    if (!gait) throw new Error(`${where} ${actor.id} 有走位却没有 walk-* 步态状态：禁止平移滑行`);
  }
  return true;
}

export function validatePaperShot(shot, { cast, cues = null, final = false } = {}) {
  if (!text(shot.id)) throw new Error('分镜缺 id');
  if (!Number.isInteger(shot.fromLine) || !Number.isInteger(shot.toLine) || shot.toLine < shot.fromLine) {
    throw new Error(`${shot.id} fromLine/toLine 无效`);
  }
  if (!text(shot.framing)) throw new Error(`${shot.id} 缺景别`);
  if (!text(shot.set)) throw new Error(`${shot.id} 缺纸艺场景 set`);
  assertCastCap(shot);
  for (const a of shot.actors || []) validatePaperActor(a, shot.id, cast);
  const d = shot.direction;
  if (!d || DIRECTION_REQUIRED.some((k) => !text(d[k]))) {
    throw new Error(`${shot.id} 缺逐镜构造字段：${DIRECTION_REQUIRED.join('/')}`);
  }
  if (!text(d.continuity?.in) || !text(d.continuity?.out)) throw new Error(`${shot.id} 缺 continuity.in/out`);
  if (!['staging', 'prop', 'reaction', 'contact'].includes(d.kind)) throw new Error(`${shot.id} 缺可见事件类型 kind`);
  if (!Number.isInteger(d.wordLine) || typeof d.wordChar !== 'string' || [...d.wordChar].length !== 1) {
    throw new Error(`${shot.id} 触发须 wordLine + 单字 wordChar`);
  }
  if (d.wordLine < shot.fromLine || d.wordLine > shot.toLine) throw new Error(`${shot.id} 触发词点不在本镜行范围`);
  const minHold = final ? 0.6 : 0.35;
  if (!Number.isFinite(d.holdSeconds) || d.holdSeconds < minHold) throw new Error(`${shot.id} 结果停留须 ≥ ${minHold}s`);
  if (BANNED_MOTION.test(JSON.stringify(shot))) {
    throw new Error(`${shot.id} 出现被否决的整图弹跳/晃动描述；改用真帧动作、走位或道具事件`);
  }
  const hasEvent = (shot.props || []).length || (shot.events || []).length
    || (shot.actors || []).some((a) => a.walk || (a.states || []).length > 1);
  if (!hasEvent) throw new Error(`${shot.id} 没有可见事件：至少一个道具/事件，或角色走位与多段真帧表演`);
  if (cues) {
    const line = cues[d.wordLine - 1];
    if (!line?.text?.includes(d.wordChar)) throw new Error(`${shot.id} 触发字不在对应台词中`);
  }
  return true;
}

export function validatePaperSpec(spec, { cues = null } = {}) {
  if (spec?.paperVersion !== PAPER_VERSION) throw new Error(`纸艺 spec 须 paperVersion=${PAPER_VERSION}`);
  if (!Number.isInteger(spec.day) || spec.day < 13) throw new Error('纸艺 Q 版口径自 Day13 起适用；Day12 及以前历史集不改不重渲');
  if (!['planning', 'ready'].includes(spec.status)) throw new Error('须显式 planning 或 ready');
  if (!/^[a-f0-9]{64}$/.test(spec.sourceScriptSha256 || '')) throw new Error('缺当前台词 SHA256');
  if (spec.maxOnScreen != null && spec.maxOnScreen !== MAX_ON_SCREEN) throw new Error(`maxOnScreen 只能是 ${MAX_ON_SCREEN}`);
  const cast = loadCastLibrary();
  if (cast.maxOnScreen !== MAX_ON_SCREEN) throw new Error('角色库 maxOnScreen 与契约不一致');
  if (!Array.isArray(spec.shots) || !spec.shots.length) throw new Error('shots 为空');
  if (spec.status === 'ready' && spec.measured !== true) throw new Error('ready 必须 measured=true 实测轴');
  spec.shots.forEach((s, i) => validatePaperShot(s, { cast, cues, final: i === spec.shots.length - 1 }));
  // 相邻镜不能景别/场景/人物排列全同
  for (let i = 1; i < spec.shots.length; i++) {
    const a = spec.shots[i - 1], b = spec.shots[i];
    const layout = (s) => JSON.stringify((s.actors || []).map((x) => [x.id, x.x, x.y, !!x.flip]));
    if (a.framing === b.framing && a.set === b.set && layout(a) === layout(b)) {
      throw new Error(`${b.id} 与 ${a.id} 景别/场景/人物排列全相同，不能靠改镜号冒充切镜`);
    }
  }
  const covered = new Set(spec.shots.flatMap((s) => (s.actors || []).map((a) => a.id)));
  return { ok: true, shots: spec.shots.length, maxOnScreen: MAX_ON_SCREEN, castUsed: [...covered].sort() };
}
