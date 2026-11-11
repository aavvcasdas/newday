// 时间轴：台词 / 歌词卡点 → 镜头 → 节拍网格。所有镜头时间都由「每句起点」派生，
// 所以对齐工具改动卡点之后，镜头切点与角色动作会一起跟着移动。
//
// 本文件不引用任何别的模块（Node 22 可以直接 import 这个 .ts 做单元测试）。
export const FPS = 30;
export const VW = 1920;
export const VH = 1080;
/** 画面反应比字早 2 帧落地 */
export const LEAD = 2 / FPS;

export interface ShotTime { id: string; a: number; b: number; cue: number }
/** 实测拍点网格：period=拍长（秒），first=任意一个重拍的时刻（秒），bar=每小节拍数 */
export interface BeatGrid { period: number; first: number; bar?: number }
export interface Timeline {
  starts: number[]; ends: number[]; shots: ShotTime[];
  duration: number; frames: number;
  /** 估算网格：beat=拍长；marks 把全片分段，counts 是每段的拍数。口播片没有节拍时 marks 为空数组 */
  beat: number; marks: number[]; counts: number[];
  /** 实测网格：有它就优先用它 */
  grid?: BeatGrid;
}
export interface RawShot { id: string; a: number; cue?: number }

const pad = (n: number) => String(n).padStart(2, '0');

/** 把「镜头起点清单」收成时间轴：后一镜至少比前一镜晚 minGap 秒，每镜的结束 = 下一镜的开始 */
export function finishTimeline(o: {
  starts: number[]; ends: number[]; raw: RawShot[]; duration: number;
  beat?: number; marks?: number[]; counts?: number[]; grid?: BeatGrid; minGap?: number;
}): Timeline {
  const raw = o.raw, duration = o.duration, minGap = o.minGap ?? 0.2;
  if (!raw.length) throw new Error('[timeline] 时间轴里一个镜头都没有');
  for (let i = 1; i < raw.length; i++) raw[i].a = Math.max(raw[i].a, raw[i - 1].a + minGap);
  const shots: ShotTime[] = raw.map((r, i) => ({ id: r.id, a: r.a, b: i + 1 < raw.length ? raw[i + 1].a : duration, cue: r.cue ?? -1 }));
  if (shots[shots.length - 1].a >= duration) throw new Error(`[timeline] 最后一个镜头 ${shots[shots.length - 1].id} 的起点不早于全片总长`);
  const tl: Timeline = { starts: o.starts, ends: o.ends, shots, duration, frames: Math.ceil(duration * FPS), beat: o.beat ?? 0, marks: o.marks ?? [], counts: o.counts ?? [] };
  if (o.grid) tl.grid = o.grid;
  return tl;
}

/** 没有实测拍点时的估算网格：取「相邻两句间隔」的中位数当一句的长度，按每句 beatsPerLine 拍等分 */
export function estimatedGrid(s: number[], end: number, duration: number, beatsPerLine = 8): { beat: number; marks: number[]; counts: number[] } {
  const gaps = s.slice(1).map((v, i) => v - s[i]).filter((d) => d > 2.4 && d < 4.6).sort((x, y) => x - y);
  const beat = (gaps.length ? gaps[Math.floor(gaps.length / 2)] : 3.4) / beatsPerLine;
  const marks = [0, ...s, end, duration];
  const counts = marks.slice(1).map((m, i) => Math.max(1, Math.round((m - marks[i]) / beat)));
  return { beat, marks, counts };
}

export interface PlanShot {
  /** 镜头 id，必须在作品的镜头表里注册过 */
  id: string;
  /** 这个镜头从第几句（0 起）开口前 lead 秒开始；与 at 二选一 */
  cue?: number;
  /** 写死的起点（秒）。同时给了 cue 时，cue 只用来标注「这镜对应哪一句」 */
  at?: number;
}
/**
 * 通用排镜（新作品默认用它）：
 *   · 第一个镜头从 0 秒开始；之后每个镜头从「第 cue 句起点 − lead」开始，或用 at 写死；
 *   · 全片总长 = 最后一句结束 + tail；
 *   · beat：'none'（口播片，没有节拍）、'estimate'（按每句 8 拍估算）、或实测网格 { period, first }。
 */
export function planByCues(
  starts: number[], ends: number[], shots: PlanShot[],
  o: { tail?: number; lead?: number; minGap?: number; beat?: 'none' | 'estimate' | BeatGrid; beatsPerLine?: number } = {},
): Timeline {
  const lead = o.lead ?? LEAD, tail = o.tail ?? 0.8;
  const raw: RawShot[] = shots.map((sh, i) => {
    if (sh.at == null && sh.cue == null) throw new Error(`[timeline] 镜头 ${sh.id} 既没有 cue 也没有 at`);
    if (sh.cue != null && (sh.cue < 0 || sh.cue >= starts.length)) throw new Error(`[timeline] 镜头 ${sh.id} 的 cue=${sh.cue} 超出台词范围（共 ${starts.length} 句）`);
    const a = i === 0 && sh.at == null ? 0 : sh.at != null ? sh.at : starts[sh.cue as number] - lead;
    return { id: sh.id, a: Math.max(0, a), cue: sh.cue ?? -1 };
  });
  const last = starts.length - 1;
  const end = Math.max(ends[last], starts[last] + 0.3);
  const duration = end + tail;
  const beat = o.beat ?? 'none';
  if (beat === 'none') return finishTimeline({ starts, ends, raw, duration, minGap: o.minGap });
  if (beat === 'estimate') return finishTimeline({ starts, ends, raw, duration, minGap: o.minGap, ...estimatedGrid(starts, end, duration, o.beatsPerLine ?? 8) });
  return finishTimeline({ starts, ends, raw, duration, minGap: o.minGap, beat: beat.period, grid: beat });
}

export function shotIndexAt(tl: Timeline, t: number): number {
  const sh = tl.shots;
  let lo = 0, hi = sh.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (sh[mid].a <= t) lo = mid; else hi = mid - 1; }
  return lo;
}

export interface Beat { idx: number; phase: number; pulse: number; down: boolean; len: number }
const NO_BEAT: Beat = { idx: 0, phase: 0, pulse: 0, down: false, len: 1 };
export function beatAt(tl: Timeline, t: number): Beat {
  if (tl.grid) {
    const g = tl.grid, bar = g.bar ?? 4;
    const x = (t - g.first) / g.period;
    const k = Math.floor(x), phase = x - k;
    const idx = ((k % (bar * 2)) + bar * 2) % (bar * 2);
    return { idx, phase, pulse: Math.exp(-phase * 4.5), down: idx % bar === 0, len: g.period };
  }
  const m = tl.marks;
  if (m.length < 2) return NO_BEAT;
  let i = 0;
  while (i + 2 < m.length && m[i + 1] <= t) i++;
  const n = tl.counts[i];
  const len = (m[i + 1] - m[i]) / n;
  const x = Math.max(0, (t - m[i]) / len);
  const k = Math.min(n - 1, Math.floor(x));
  const phase = Math.min(1, x - k);
  return { idx: k, phase, pulse: Math.exp(-phase * 4.5), down: k % 4 === 0, len };
}

/** 当前该显示哪一句：i=句序号，p=这一句念 / 唱到哪了（0–1），age=开口后过了几秒 */
export function cueAt(tl: Timeline, t: number, hold = 0.35, lastHold = 0.6): { i: number; p: number; age: number } | null {
  for (let i = tl.starts.length - 1; i >= 0; i--) {
    if (t >= tl.starts[i]) {
      const until = i + 1 < tl.starts.length ? Math.min(tl.ends[i] + hold, tl.starts[i + 1]) : tl.ends[i] + lastHold;
      if (t > until) return null;
      const p = Math.min(1, (t - tl.starts[i]) / Math.max(0.5, tl.ends[i] - tl.starts[i]));
      return { i, p, age: t - tl.starts[i] };
    }
  }
  return null;
}

export const fmtTime = (t: number) => {
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
};

export function toSrt(lines: string[], starts: number[], ends: number[]): string {
  const f = (t: number) => {
    const ms = Math.round(t * 1000);
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
    return `${pad(h)}:${pad(m)}:${pad(s)},${String(ms % 1000).padStart(3, '0')}`;
  };
  return lines.map((txt, i) => `${i + 1}\n${f(starts[i])} --> ${f(ends[i])}\n${txt}\n`).join('\n');
}
