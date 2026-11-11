// 时间轴：歌词卡点 → 镜头 → 节拍网格。所有镜头时间都由「每句歌词起点」派生，
// 所以对拍工具改动 cue 之后，镜头切点与角色动作会一起跟着移动。
export const FPS = 30;
export const VW = 1920;
export const VH = 1080;

export const LYRICS: string[] = [
  '听说白雪公主在逃跑', '小红帽在担心大灰狼', '听说疯帽喜欢爱丽丝', '丑小鸭会变成白天鹅',
  '听说彼得潘总长不大', '杰克他有竖琴和魔法', '听说森林里有糖果屋', '灰姑娘丢了心爱的玻璃鞋',
  '只有睿智的河水知道', '白雪是因为贪玩跑出了城堡', '小红帽有件抑制自己', '变成狼的大红袍',
  '总有一条蜿蜒在童话镇里七彩的河', '沾染魔法的乖张气息', '却又在爱里曲折', '川流不息扬起水花',
  '又卷入一帘时光入水', '让所有很久很久以前', '都走到幸福结局的时刻',
  '听说睡美人被埋葬', '小人鱼在眺望金殿堂', '听说阿波罗变成金乌', '草原有奔跑的剑齿虎',
  '听说匹诺曹总说着谎', '侏儒怪拥有宝石满箱', '听说悬崖有棵长生树', '红鞋子不知疲倦地在跳舞',
  '只有睿智的河水知道', '睡美人逃避了生活的煎熬', '小人鱼把阳光抹成眼影', '投进泡沫的怀抱',
];

// 与仓库 番外MV/童话镇/tonghuazhen.srt 第 1–31 条同源（对应其根目录参考片 童话镇.mp4）
export const SRT_STARTS: number[] = [
  13.55, 17.0, 20.4, 23.8, 27.3, 30.6, 34.0, 37.3, 41.15, 44.3, 47.9, 51.2,
  54.95, 61.45, 64.95, 68.45, 71.75, 75.25, 78.75,
  97.45, 100.95, 104.45, 107.95, 111.45, 114.75, 118.15, 121.55, 125.15, 128.45, 131.95, 134.95,
];
export const SRT_ENDS: number[] = [
  16.95, 20.35, 23.75, 27.25, 30.55, 33.95, 37.25, 41.05, 44.25, 47.85, 51.15, 54.85,
  61.35, 64.85, 68.35, 71.65, 75.15, 78.65, 85.6,
  100.85, 104.35, 107.85, 111.35, 114.65, 118.05, 121.45, 125.05, 128.35, 131.85, 134.85, 137.85,
];

export type Section = '序章' | '主歌一' | '导歌一' | '副歌' | '间奏' | '主歌二' | '导歌二' | '尾声';
export const sectionOfCue = (c: number): Section =>
  c < 0 ? '间奏' : c < 8 ? '主歌一' : c < 12 ? '导歌一' : c < 19 ? '副歌' : c < 27 ? '主歌二' : '导歌二';

export interface ShotTime { id: string; a: number; b: number; cue: number }
export interface Timeline {
  starts: number[]; ends: number[]; shots: ShotTime[];
  duration: number; frames: number; beat: number; marks: number[]; counts: number[];
}

const pad = (n: number) => String(n).padStart(2, '0');
const LEAD = 2 / FPS; // 画面反应比字早 2 帧落地

export function makeTimeline(starts: number[] = SRT_STARTS, ends: number[] = SRT_ENDS): Timeline {
  const s = starts, e = ends;
  const raw: { id: string; a: number; cue: number }[] = [];
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
  for (let i = 1; i < raw.length; i++) raw[i].a = Math.max(raw[i].a, raw[i - 1].a + 0.2);
  const shots: ShotTime[] = raw.map((r, i) => ({ id: r.id, a: r.a, b: i + 1 < raw.length ? raw[i + 1].a : duration, cue: r.cue }));

  // 节拍网格：没有音频可测，按「每句 8 拍」把相邻歌词起点之间等分（标注为估算）
  const gaps = s.slice(1).map((v, i) => v - s[i]).filter((d) => d > 2.4 && d < 4.6).sort((x, y) => x - y);
  const beat = (gaps.length ? gaps[Math.floor(gaps.length / 2)] : 3.4) / 8;
  const marks = [0, ...s, end, duration];
  const counts = marks.slice(1).map((m, i) => Math.max(1, Math.round((m - marks[i]) / beat)));
  return { starts: s, ends: e, shots, duration, frames: Math.ceil(duration * FPS), beat, marks, counts };
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

export const fmtTime = (t: number) => {
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
};

export function toSrt(starts: number[], ends: number[]): string {
  const f = (t: number) => {
    const ms = Math.round(t * 1000);
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
    return `${pad(h)}:${pad(m)}:${pad(s)},${String(ms % 1000).padStart(3, '0')}`;
  };
  return LYRICS.map((txt, i) => `${i + 1}\n${f(starts[i])} --> ${f(ends[i])}\n${txt}\n`).join('\n');
}
