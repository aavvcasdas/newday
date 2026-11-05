// 新导演分镜的结构检查，不把文字字段当成视觉/审美验收。
import { cameraFor } from './camera_plan.mjs';
const REQUIRED = ['focus', 'entry', 'action', 'trigger', 'result', 'reaction', 'exit', 'transition'];
function text(value) { return typeof value === 'string' && value.trim().length > 0; }
function word(shot, line, char, cues, label) {
  if (!Number.isInteger(line) || line < shot.fromLine || line > shot.toLine || typeof char !== 'string' || [...char].length !== 1) throw new Error(`${shot.id} ${label} 须为本镜行号与单字词点`);
  if (cues && !cues[line - 1]?.text.includes(char)) throw new Error(`${shot.id} ${label} 不在对应台词中`);
}
export function validateDirection(shot, { cues, final = false, requireWordTimes = false } = {}) {
  const d = shot.direction;
  if (!shot.framing) throw new Error(`${shot.id} 缺景别 framing`);
  if (!d || REQUIRED.some((key) => !text(d[key]))) throw new Error(`${shot.id} 缺逐镜导演字段：${REQUIRED.join('/')}`);
  if (!text(d.continuity?.in) || !text(d.continuity?.out)) throw new Error(`${shot.id} 缺 continuity.in/out`);
  if (!['staging', 'prop', 'reaction', 'contact'].includes(d.kind)) throw new Error(`${shot.id} 缺可见事件类型`);
  word(shot, d.wordLine, d.wordChar, cues, '触发');
  word(shot, d.resultLine, d.resultChar, cues, '结果');
  if (d.resultLine < d.wordLine) throw new Error(`${shot.id} 结果不能先于触发`);
  const minHold = final ? 0.6 : 0.35;
  if (!Number.isFinite(d.holdSeconds) || d.holdSeconds < minHold) throw new Error(`${shot.id} 结果须停留至少 ${minHold}s`);
  if (!Number.isFinite(d.settleSeconds) || d.settleSeconds < 0) throw new Error(`${shot.id} 须声明结果成形耗时 settleSeconds`);
  if (d.kind === 'contact' && !(shot.interactions || []).length) throw new Error(`${shot.id} 接触事件不能只有文字，须 interactions`);
  // 不强迫反应/道具特写再塞一套人物晃动或接触；但不能只填“有事件”。
  if (d.kind === 'staging' && !(shot.actors || shot.actorsPlan || []).some((a) => a.walk || a.poses?.length || a.poseChanges?.length)) throw new Error(`${shot.id} 调度镜须显式走位/姿态变化`);
  if (d.kind === 'prop' && !(shot.interactions || []).length && !(shot.companionProps || []).some((p) => p.fromLine || Number.isFinite(p.enterAt))) throw new Error(`${shot.id} 道具镜须有显式入场或交互`);
  if (cues) {
    const trigger = cues[d.wordLine - 1].chars_timed?.find((c) => c.ch === d.wordChar);
    if (requireWordTimes && (!trigger || !Number.isFinite(trigger.start))) throw new Error(`${shot.id} 缺触发词级实测时间`);
    const cue = cues[d.resultLine - 1];
    const char = cue.chars_timed?.find((c) => c.ch === d.resultChar);
    // 无词级实测就只报结构通过，不把句首回退当成实测停留证据。
    if (requireWordTimes && (!char || !Number.isFinite(char.start))) throw new Error(`${shot.id} 缺结果词级实测时间，不能验证理解停留`);
    if (char) {
      if (trigger && char.start < trigger.start) throw new Error(`${shot.id} 实测结果早于触发`);
      const end = cues[shot.toLine - 1].end;
      if (!Number.isFinite(end)) throw new Error(`${shot.id} 缺实测镜头终点`);
      if (end - char.start - d.settleSeconds + 1e-9 < d.holdSeconds) throw new Error(`${shot.id} 实测结果没有足够理解停留时间`);
    }
  }
}
export function validateShotContrast(previous, shot) {
  const actors = (s) => JSON.stringify((s.actors || s.actorsPlan || []).map((a) => [a.x, a.y, !!a.flip]));
  if (previous.framing === shot.framing && JSON.stringify(cameraFor({ ...previous, push: null, pushes: undefined }, 0)) === JSON.stringify(cameraFor({ ...shot, push: null, pushes: undefined }, 0)) && actors(previous) === actors(shot)) throw new Error(`${shot.id} 连续镜头景别/中心/人物排列全相同，不能靠改镜号冒充切镜`);
}
