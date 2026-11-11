// 作品契约：一部片子 = 台词卡点（cues.json）+ 镜头表（shots）+ 排镜规则（plan）+ 字幕与字卡样式。
// 引擎（engine.ts / Film.tsx）不认识任何具体作品，一切都从这里传进去。
import type { CharId } from './actors';
import atlasJson from './assets/cast_atlas.json';
import type { ShotDef } from './core';
import { planByCues, type BeatGrid, type PlanShot, type Timeline } from './timeline';

/**
 * cues.json 里的一句：text=台词 / 歌词，start / end=秒。
 * 口播片的对话条还会读：who=说话人（头像 + 名牌），face=这一句换用的头像格（图集里 p_ 开头的格子名，如 p_whale_think）。
 */
export interface CueLine { text: string; start: number; end: number; who?: CharId; face?: string }
/**
 * cues.json 的最小结构。其余字段（对齐报告、原始卡点等）由对齐工具写入，引擎不读。
 *   measured=false 表示卡点是估出来的（还没有音频），只能出无声样片，不能当成片交付。
 */
export interface CueFile { measured: boolean; lines: CueLine[]; beat?: { period: number; first: number; bar?: number } | null }

export type SubtitleStyle = 'lyric' | 'dialog';

export interface ProjectDef {
  /** Composition id：只用字母、数字、连字符 */
  id: string;
  /** mv=歌词 MV（卡拍）；day=口播集（卡句） */
  kind: 'mv' | 'day';
  title: string;
  lines: string[];
  starts: number[];
  ends: number[];
  /** 每句的说话人（对话条左侧头像与名牌）；没有就不画头像 */
  speakers?: (CharId | null)[];
  /** 每句的头像格（没写 face 的句子用说话人的默认头像） */
  faces?: (string | null)[];
  shots: ShotDef[];
  /** 排镜：卡点 → 时间轴。卡点变了，镜头切点跟着变 */
  plan: (starts: number[], ends: number[]) => Timeline;
  /** lyric=歌词条（整句出现、从左到右染色）；dialog=对话条（头像 + 名牌 + 一屏一句，不逐字染色） */
  subtitle: SubtitleStyle;
  /** 片名卡（叠在 fx.title 的镜头上）与片尾字（叠在指定镜头上） */
  cards?: { title?: { main: string; sub?: string }; end?: { shot: string; text: string } };
  /** 预览台里显示「这一句属于哪一段」，可不填 */
  sectionOf?: (cue: number) => string;
}

export const SPEAKER_NAME: Record<CharId, string> = {
  whale: '鲸鱼娘', gpt: 'GPT 龙娘', claude: 'Claude 大小姐', doubao: '豆包', gemini: 'Gemini', kimi: 'Kimi', qwen: '千问', zai: '智谱',
};
/** 对话条默认头像（图集里的 64×64 头像格） */
export const SPEAKER_PORTRAIT: Record<CharId, string> = {
  whale: 'p_whale_neutral', gpt: 'p_gpt_neutral', claude: 'p_claude_neutral', doubao: 'p_doubao_neutral', gemini: 'p_gemini', kimi: 'p_kimi', qwen: 'p_qwen', zai: 'p_zai',
};

const ID_OK = /^[A-Za-z0-9-]+$/;
const CELLS = (atlasJson as unknown as { s: Record<string, unknown> }).s;

/** 校验并补全一部作品的定义；有问题直接抛错，不带病渲染 */
export function defineProject(p: {
  id: string; kind: 'mv' | 'day'; title: string;
  cues: CueFile;
  shots: ShotDef[];
  /** 二选一：plan（自己写排镜函数）或 planShots（交给 planByCues） */
  plan?: (starts: number[], ends: number[]) => Timeline;
  planShots?: PlanShot[];
  planOptions?: { tail?: number; lead?: number; minGap?: number; beat?: 'none' | 'estimate' | 'measured'; beatsPerLine?: number };
  subtitle?: SubtitleStyle;
  cards?: ProjectDef['cards'];
  sectionOf?: (cue: number) => string;
}): ProjectDef {
  if (!ID_OK.test(p.id)) throw new Error(`[project] id「${p.id}」只能用字母、数字和连字符`);
  const lines = p.cues.lines;
  if (!lines?.length) throw new Error(`[project] ${p.id}: cues.json 里没有台词`);
  lines.forEach((l, i) => {
    if (!l.text) throw new Error(`[project] ${p.id}: 第 ${i + 1} 句没有文字`);
    if (!(l.end > l.start)) throw new Error(`[project] ${p.id}: 第 ${i + 1} 句的结束不晚于开始`);
    if (i && l.start < lines[i - 1].start) throw new Error(`[project] ${p.id}: 第 ${i + 1} 句的起点早于上一句`);
    if (l.who != null && !(l.who in SPEAKER_NAME)) throw new Error(`[project] ${p.id}: 第 ${i + 1} 句的说话人「${l.who}」不在角色表里`);
    if (l.face != null && !CELLS[l.face]) throw new Error(`[project] ${p.id}: 第 ${i + 1} 句的头像「${l.face}」不在图集里`);
    if (l.face != null && l.who == null) throw new Error(`[project] ${p.id}: 第 ${i + 1} 句写了 face 却没写 who`);
  });
  const ids = new Set<string>();
  for (const s of p.shots) { if (ids.has(s.id)) throw new Error(`[project] ${p.id}: 镜头 id 重复 ${s.id}`); ids.add(s.id); }

  let plan = p.plan;
  if (!plan) {
    const shots = p.planShots;
    if (!shots?.length) throw new Error(`[project] ${p.id}: plan 与 planShots 至少给一个`);
    const o = p.planOptions ?? {};
    let beat: 'none' | 'estimate' | BeatGrid = p.kind === 'mv' ? 'estimate' : 'none';
    if (o.beat === 'none' || o.beat === 'estimate') beat = o.beat;
    if (o.beat === 'measured') {
      if (!p.cues.beat) throw new Error(`[project] ${p.id}: planOptions.beat='measured' 但 cues.json 里没有实测拍点（先跑 align）`);
      beat = p.cues.beat;
    }
    plan = (starts, ends) => planByCues(starts, ends, shots, { ...o, beat });
  }
  const starts = lines.map((l) => l.start), ends = lines.map((l) => l.end);
  // 现在就排一遍：时间轴引用了没注册的镜头、或注册了却没用上的镜头，都在这里报出来
  const tl = plan(starts, ends);
  for (const s of tl.shots) if (!ids.has(s.id)) throw new Error(`[project] ${p.id}: 时间轴引用了未注册的镜头 ${s.id}`);
  const used = new Set(tl.shots.map((s) => s.id));
  for (const id of ids) if (!used.has(id)) throw new Error(`[project] ${p.id}: 镜头 ${id} 注册了但时间轴没有用到`);
  if (p.cards?.end && !ids.has(p.cards.end.shot)) throw new Error(`[project] ${p.id}: 片尾字指向了不存在的镜头 ${p.cards.end.shot}`);
  const who = lines.map((l) => l.who ?? null);

  return {
    id: p.id, kind: p.kind, title: p.title, lines: lines.map((l) => l.text), starts, ends,
    speakers: who.some(Boolean) ? who : undefined,
    faces: who.some(Boolean) ? lines.map((l) => l.face ?? (l.who ? SPEAKER_PORTRAIT[l.who] : null)) : undefined,
    shots: p.shots, plan, subtitle: p.subtitle ?? (p.kind === 'mv' ? 'lyric' : 'dialog'), cards: p.cards, sectionOf: p.sectionOf,
  };
}
