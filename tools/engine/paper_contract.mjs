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

// Day13+ 细节表演硬门禁（2026-11-06 用户第 3 轮反馈：「分镜细节还是不够到位」）。
// 病根是单帧状态久持＝纸偶站桩。情绪/动作状态必须真多帧，且每镜要有表演节拍与画面细节层。
export const MIN_BEATS = 2;            // 每镜主演至少 2 段表演节拍
export const MAX_SINGLE_HOLD = 1.2;    // 单帧状态最长持有时长（秒）
export const DETAIL_KINDS = Object.freeze(['motes', 'grass', 'birds', 'ground', 'rain', 'windows']);
const STILL_KINDS = new Set(['hold', 'static']);

/** 读某角色某状态的真帧数与语义种类；无图集返回 null（静态纸偶另判）。 */
export function stateMeta(id, state) {
  const file = petJsonPath(id);
  if (!fs.existsSync(file)) return null;
  const pet = JSON.parse(fs.readFileSync(file, 'utf8'));
  const a = (pet.animations || []).find((x) => x.state === state);
  if (!a) return null;
  const cast = loadCastLibrary();
  const kind = cast.characters?.[id]?.states?.[state]?.kind || null;
  return { frames: a.frame_count, kind };
}
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
  // 单帧状态不得长时间久持：那是纸偶站桩，不是表演。
  for (const s of states) {
    const m = stateMeta(actor.id, s.state);
    if (!m || m.frames > 1) continue;
    if (STILL_KINDS.has(m.kind)) continue;   // back/sit 等静止语义允许单帧
    const hold = s.dur ?? 0;
    if (hold > MAX_SINGLE_HOLD) {
      throw new Error(`${where} ${actor.id} 状态 ${s.state} 只有 1 帧却持有 ${hold}s`
        + `（上限 ${MAX_SINGLE_HOLD}s）；请补真多帧表演或拆成多段节拍，不得单帧久持冒充动画`);
    }
  }
  if (actor.walk) {
    const { from, to, dur } = actor.walk;
    if (![from, to, dur].every(Number.isFinite) || dur <= 0) throw new Error(`${where} ${actor.id} walk 须 from/to/dur 有限且 dur>0`);
    const gaits = states.map((s) => s.state).filter((n) => /^walk-/.test(n));
    if (!gaits.length) throw new Error(`${where} ${actor.id} 有走位却没有 walk-* 步态状态：禁止平移滑行`);
    // 步态朝向必须与位移方向一致，否则就是"倒着走"（本轮用户实际发现的 bug）。
    // flip 会整体镜像，因此有效朝向 = 步态朝向 XOR flip。
    const dx = to - from;
    if (dx !== 0) {
      const want = dx > 0 ? 'walk-right' : 'walk-left';
      const gait = gaits[0];
      const facesRight = (gait === 'walk-right') !== !!actor.flip;
      if ((dx > 0) !== facesRight) {
        throw new Error(`${where} ${actor.id} 步态朝向与位移相反：位移 ${from}→${to} 需 ${want}`
          + `${actor.flip ? '（或 flip 配合反向步态）' : ''}，实为 ${gait}${actor.flip ? ' + flip' : ''}`);
      }
    }
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
  // 每镜必须有画面细节层，杜绝"纯色背景 + 站桩纸偶"。
  const details = shot.details || [];
  if (!Array.isArray(details) || !details.length) {
    throw new Error(`${shot.id} 缺画面细节层 details（至少一项：${DETAIL_KINDS.join('/')}）`);
  }
  for (const d of details) {
    const kind = typeof d === 'string' ? d : d?.kind;
    if (!DETAIL_KINDS.includes(kind)) throw new Error(`${shot.id} 未知细节层 ${kind}`);
  }
  // 主演要有表演节拍：多段真帧状态切换，或走位/入画调度。终帧 hold 例外。
  if (!final) {
    for (const a of shot.actors || []) {
      const beats = (a.states || []).length;
      const staged = !!(a.walk || a.enter || a.faceAt);
      const rich = (a.states || []).some((s) => (stateMeta(a.id, s.state)?.frames ?? 0) > 1);
      if (beats < MIN_BEATS && !staged && !rich) {
        throw new Error(`${shot.id} ${a.id} 表演过于单薄：需 ≥${MIN_BEATS} 段节拍、`
          + `或走位/入画/转身调度、或多帧真表演状态；不得整镜站着不动`);
      }
    }
  }
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
