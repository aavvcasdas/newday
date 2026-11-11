// Shared 30fps timeline contract. The beat grid is specified in seconds, not inferred from audio.
export const FPS = 30;
export interface ShotTime { id: string; a: number; b: number; cue: number }
export interface Timeline {
  starts: number[]; ends: number[]; shots: ShotTime[];
  duration: number; frames: number; beat: number; marks: number[]; counts: number[];
}

export function shotIndexAt(tl: Timeline, t: number): number {
  const sh = tl.shots;
  let lo = 0, hi = sh.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (sh[mid].a <= t) lo = mid; else hi = mid - 1; }
  return lo;
}

export interface Beat { idx: number; phase: number; pulse: number; down: boolean; len: number }
export function beatAt(tl: Timeline, t: number): Beat {
  const m = tl.marks;
  let i = 0;
  while (i + 2 < m.length && m[i + 1] <= t) i++;
  const n = tl.counts[i];
  const len = (m[i + 1] - m[i]) / n;
  const x = Math.max(0, (t - m[i]) / len);
  const k = Math.min(n - 1, Math.floor(x));
  const phase = Math.min(1, x - k);
  return { idx: k, phase, pulse: Math.exp(-phase * 4.5), down: k % 4 === 0, len };
}

export function cueAt(tl: Timeline, t: number): { i: number; p: number; age: number } | null {
  for (let i = tl.starts.length - 1; i >= 0; i--) {
    if (t >= tl.starts[i]) {
      const hold = i + 1 < tl.starts.length ? Math.min(tl.ends[i] + 0.35, tl.starts[i + 1]) : tl.ends[i] + 0.6;
      if (t > hold) return null;
      const p = Math.min(1, (t - tl.starts[i]) / Math.max(0.5, tl.ends[i] - tl.starts[i]));
      return { i, p, age: t - tl.starts[i] };
    }
  }
  return null;
}

/** Build a validated generic, contiguous shot timeline. Times are in seconds. */
export function createTimeline(input: {duration: number; shots: {id: string; a: number}[]; starts?: number[]; ends?: number[]; bpm: number}): Timeline {
  const {duration, shots, bpm} = input;
  const starts = input.starts ?? [], ends = input.ends ?? [];
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(bpm) || bpm <= 0) throw new Error('duration 和 bpm 必须为正数');
  if (!shots.length || shots[0].a !== 0) throw new Error('镜头必须从 0 秒开始');
  for (let i=0;i<shots.length;i++) {
    if (!shots[i].id || !Number.isFinite(shots[i].a) || shots[i].a < 0 || shots[i].a >= duration || (i>0 && shots[i].a <= shots[i-1].a)) throw new Error('镜头时间必须递增且在片长内');
  }
  if (starts.length !== ends.length) throw new Error('歌词起止数量不一致');
  for (let i=0;i<starts.length;i++) if (!Number.isFinite(starts[i]) || !Number.isFinite(ends[i]) || starts[i]<0 || ends[i]<=starts[i] || ends[i]>duration || (i>0 && starts[i]<ends[i-1])) throw new Error('歌词时间必须递增且不重叠');
  const beat=60/bpm;
  return {starts, ends, shots:shots.map((s,i)=>({id:s.id,a:s.a,b:shots[i+1]?.a ?? duration,cue:-1})), duration, frames:Math.ceil(duration*FPS), beat, marks:[0,duration], counts:[Math.max(1,Math.round(duration/beat))]};
}
