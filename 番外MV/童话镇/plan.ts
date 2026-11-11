// 《童话镇》这首歌专属的排镜规则：40 个镜头的起点全部由 31 句歌词的起点派生。
// 算法与页面源码 timeline.ts 的 makeTimeline 逐行一致，只是把歌曲专属的部分从引擎里搬到了作品里。
//
//   序章 I1–I3        第一句开口之前，按 0 / 35% / 68% 三等分
//   L01–L12           一句一镜，切点 = 这一句起点 − 2 帧
//   L13a / L13b       第 13 句最长，中间再切一刀
//   L14–L18           一句一镜
//   L19a / L19b       副歌收尾句拖长，中间再切一刀
//   间奏 N1–N3        第 19 句结束到第 20 句开口之间三等分
//   L20–L31           一句一镜
//   OUT               最后一句结束后 0.15 秒起，片尾 4.4 秒
import { estimatedGrid, finishTimeline, LEAD, type RawShot, type Timeline } from '@tpl/timeline';

const pad = (n: number) => String(n).padStart(2, '0');

export function plan(s: number[], e: number[]): Timeline {
  if (s.length !== 31 || e.length !== 31) throw new Error(`[童话镇] 排镜规则按 31 句歌词写死，收到 ${s.length} 句`);
  const raw: RawShot[] = [];
  const push = (id: string, a: number, cue = -1) => raw.push({ id, a, cue });
  const t0 = Math.max(1.5, s[0] - LEAD);
  push('I1', 0); push('I2', t0 * 0.35); push('I3', t0 * 0.68);
  for (let c = 0; c < 12; c++) push(`L${pad(c + 1)}`, s[c] - LEAD, c);
  push('L13a', s[12] - LEAD, 12); push('L13b', s[12] + (s[13] - s[12]) * 0.5 - LEAD, 12);
  for (let c = 13; c < 18; c++) push(`L${pad(c + 1)}`, s[c] - LEAD, c);
  const e18 = Math.max(e[18], s[18] + 2);
  push('L19a', s[18] - LEAD, 18); push('L19b', s[18] + (e18 - s[18]) * 0.5, 18);
  const n0 = e18 + 0.05, n1 = Math.max(n0 + 3, s[19] - LEAD);
  push('N1', n0); push('N2', n0 + (n1 - n0) / 3); push('N3', n0 + ((n1 - n0) * 2) / 3);
  for (let c = 19; c < 31; c++) push(`L${pad(c + 1)}`, s[c] - LEAD, c);
  const end = Math.max(e[30], s[30] + 1.5) + 0.15;
  push('OUT', end);
  const duration = end + 4.4;
  // 节拍网格沿用页面的做法：按「每句 8 拍」把相邻歌词起点之间等分。
  // 歌词起点已经吸附在原曲实拍上（见 cues.json），所以唱词段落里这张网格与实拍重合；序章 / 间奏 / 片尾仍是等分估算。
  return finishTimeline({ starts: s, ends: e, raw, duration, ...estimatedGrid(s, end, duration) });
}

export type Section = '序章' | '主歌一' | '导歌一' | '副歌' | '间奏' | '主歌二' | '导歌二' | '尾声';
export const sectionOfCue = (c: number): Section =>
  c < 0 ? '间奏' : c < 8 ? '主歌一' : c < 12 ? '导歌一' : c < 19 ? '副歌' : c < 27 ? '主歌二' : '导歌二';
