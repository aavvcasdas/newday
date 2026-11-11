// Remotion 入口：把一部作品注册成 <Composition>。
// film.mjs 出片时会生成一个只有三行的入口文件：import 作品 → registerProject(作品)。
//
// calculateMetadata 除了给出总帧数，还把「排好的时间轴 + 镜头说明」塞进 props.__info，
// 这样命令行那边拿到的镜头切点与浏览器里实际渲染用的是同一份，不会各算各的。
import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { loadAtlas } from './actors';
import { castPreflight, type CastReport } from './engine';
import { makeFilm, type FilmProps } from './Film';
import { loadFontCoverage } from './fonts';
import type { ProjectDef } from './project';
import { textPreflight, type TextReport } from './text';
import { FPS, VH, VW } from './timeline';

export interface FilmInfo {
  id: string; kind: 'mv' | 'day'; title: string; subtitle: string;
  fps: number; width: number; height: number; frames: number; duration: number;
  lines: string[]; starts: number[]; ends: number[]; speakers: (string | null)[] | null;
  shots: { id: string; a: number; b: number; cue: number; title: string; note: string; cast: string[]; look: string }[];
  beat: { estimated: number; grid: { period: number; first: number; bar?: number } | null };
}

export function filmInfo(p: ProjectDef, starts: number[], ends: number[]): FilmInfo {
  const tl = p.plan(starts, ends);
  const defs = Object.fromEntries(p.shots.map((s) => [s.id, s]));
  return {
    id: p.id, kind: p.kind, title: p.title, subtitle: p.subtitle,
    fps: FPS, width: VW, height: VH, frames: tl.frames, duration: tl.duration,
    lines: p.lines, starts: tl.starts, ends: tl.ends, speakers: p.speakers ?? null,
    shots: tl.shots.map((s) => ({ id: s.id, a: s.a, b: s.b, cue: s.cue, title: defs[s.id].title, note: defs[s.id].note, cast: defs[s.id].cast, look: defs[s.id].look })),
    beat: { estimated: tl.beat, grid: tl.grid ?? null },
  };
}

/** 角色预检合成的 id：<作品 id>-cast。它不画任何东西，只在 calculateMetadata 里把全片的角色状态走一遍 */
export const castCheckId = (filmId: string) => `${filmId}-cast`;
const CastCheck: React.FC<FilmProps> = () => null;

export function registerProject(p: ProjectDef) {
  const Film = makeFilm(p);
  const defaults: FilmProps = { starts: p.starts, ends: p.ends, audioSrc: null, audioOffset: 0, showLyrics: true };
  const Root: React.FC = () => (
    <>
      <Composition
        id={p.id}
        component={Film}
        width={VW}
        height={VH}
        fps={FPS}
        durationInFrames={p.plan(p.starts, p.ends).frames}
        defaultProps={defaults}
        calculateMetadata={({ props }) => {
          const info = filmInfo(p, props.starts, props.ends);
          return { durationInFrames: info.frames, props: { ...props, __info: info } };
        }}
      />
      {/* 单独一个合成，是为了让预检只在 film.mjs 点名要它的时候跑一次：出片的每个标签页只解析上面那个合成，不会跟着重跑 */}
      <Composition
        id={castCheckId(p.id)}
        component={CastCheck}
        width={VW}
        height={VH}
        fps={FPS}
        durationInFrames={1}
        defaultProps={defaults}
        calculateMetadata={async ({ props }) => {
          let report: CastReport;
          try { report = castPreflight(p.shots, p.plan(props.starts, props.ends), await loadAtlas()); }
          catch (e) { report = { shots: 0, frames: 0, sprites: {}, problems: [e instanceof Error ? e.message : String(e)], orderChecked: 0, drawn: [] }; }
          let text: TextReport;
          try { text = textPreflight(p, report.drawn, await loadFontCoverage()); }
          catch (e) { text = { uses: 0, glyphs: 0, fontGlyphs: 0, problems: [], fontError: e instanceof Error ? e.message : String(e) }; }
          return { props: { ...props, __cast: report, __text: text } };
        }}
      />
    </>
  );
  registerRoot(Root);
}
