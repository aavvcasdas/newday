// Remotion 合成：<canvas>(three.js) + 字幕条 + 片名 / 片尾字 + 闪白 / 淡入淡出 + 可选音轨。
// makeFilm(作品) 得到的组件既能放进 @remotion/player 在浏览器里播（预览台），也能注册成 <Composition> 走命令行出片。
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AbsoluteFill, Audio, Sequence, cancelRender, continueRender, delayRender, getRemotionEnvironment, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadAtlas, type AtlasData } from './actors';
import { FilmEngine, shotMap } from './engine';
import { FONT, loadFonts } from './fonts';
import { clamp01, seg } from './kit';
import type { ProjectDef } from './project';
import { DialogBar, LyricBar } from './subtitles';
import { cueAt, shotIndexAt } from './timeline';

export interface FilmProps {
  /** 每句的起止（秒）。默认就是作品 cues.json 里的值；预览台的对拍工具会临时换掉它们 */
  starts: number[];
  ends: number[];
  /** 预览台里边看边听用；命令行出片时为 null，音轨在渲染后由 film.mjs 对齐混入 */
  audioSrc: string | null;
  audioOffset: number;
  showLyrics: boolean;
  [extra: string]: unknown;
}

export function makeFilm(project: ProjectDef): React.FC<FilmProps> {
  const SHOTS = shotMap(project.shots);
  const title = project.cards?.title, end = project.cards?.end;

  const Film: React.FC<FilmProps> = ({ starts, ends, audioSrc, audioOffset, showLyrics }) => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const tl = useMemo(() => project.plan(starts, ends), [starts, ends]);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<FilmEngine | null>(null);
    const released = useRef(false);
    const [atlas, setAtlas] = useState<AtlasData | null>(null);
    const [ready, setReady] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    // 等待链：角色图集解码 + 字体就绪 + 引擎画出第一帧，三样齐了才放行截帧。
    // （旧引擎的立绘走裸 <image>、不进等待链，是「人物一闪一闪」的头号原因。）
    const [handle] = useState(() => delayRender(`${project.title}：等待图集、字体与首帧`, { timeoutInMilliseconds: 120000 }));

    const fail = (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      // 出片时任何错误都让这次渲染失败，绝不把「渲染失败」的字卡录进成片；预览时才显示在画面上
      if (getRemotionEnvironment().isRendering) cancelRender(e instanceof Error ? e : new Error(msg));
      setErr(msg);
      if (!released.current) { released.current = true; continueRender(handle); }
    };

    useEffect(() => {
      let dead = false;
      Promise.all([loadAtlas(), loadFonts()])
        .then(([a]) => {
          if (dead || !canvasRef.current) return;
          try { engineRef.current = new FilmEngine(canvasRef.current, width, height, a, project.shots); setAtlas(a); setReady(true); }
          catch (e) { fail(e); }
        })
        .catch(fail);
      return () => { dead = true; engineRef.current?.dispose(); engineRef.current = null; setReady(false); };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [width, height, handle]);

    useLayoutEffect(() => {
      if (!ready || !engineRef.current) return;
      try {
        engineRef.current.render(frame, tl);
        if (!released.current) { released.current = true; continueRender(handle); }
      } catch (e) { fail(e); }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [frame, ready, tl]);

    const t = frame / fps;
    const si = shotIndexAt(tl, t);
    const st = tl.shots[si];
    const fx = SHOTS[st.id]?.fx;
    const u = clamp01((t - st.a) / (st.b - st.a));
    let white = 0, black = 0;
    if (fx?.flash) for (const f0 of fx.flash) { const dt = t - (st.a + f0 * (st.b - st.a)); if (dt >= 0 && dt < 0.22) white = Math.max(white, 0.85 * (1 - dt / 0.22)); }
    if (fx?.whiteOut) white = Math.max(white, seg(u, 0.8, 1));
    if (fx?.whiteIn) white = Math.max(white, 1 - seg(u, 0, 0.12));
    if (fx?.blackOut) black = seg(u, 0.68, 0.97);
    if (fx?.blackIn) black = Math.max(black, 1 - seg(u, 0, 0.12));
    const titleA = fx?.title && title ? Math.min(seg(u, 0.04, 0.18), 1 - seg(u, 0.62, 0.78)) : 0;
    const endA = end && st.id === end.shot ? Math.min(seg(u, 0.22, 0.42), 1 - seg(u, 0.7, 0.9)) : 0;

    const cue = showLyrics ? cueAt(tl, t) : null;
    const offF = Math.round(audioOffset * fps);
    const S = height / 1080;

    return (
      <AbsoluteFill style={{ backgroundColor: '#05060f', fontFamily: FONT }}>
        <canvas ref={canvasRef} width={width} height={height} style={{ width: '100%', height: '100%', display: 'block' }} />
        {audioSrc ? (offF >= 0 ? <Sequence from={offF} layout="none"><Audio src={audioSrc} /></Sequence> : <Audio src={audioSrc} trimBefore={-offF} />) : null}

        {titleA > 0.01 && title && (
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: 70 * S, opacity: titleA }}>
            <div style={{ fontSize: 150 * S, fontWeight: 900, letterSpacing: 24 * S, color: '#fff6d8', textShadow: `0 ${6 * S}px 0 #7a2b3a, 0 0 ${40 * S}px rgba(255,200,120,.8)`, transform: `scale(${0.94 + 0.06 * titleA})` }}>{title.main}</div>
            {title.sub && <div style={{ fontSize: 34 * S, fontWeight: 700, letterSpacing: 10 * S, color: '#ffe2a8', marginTop: 4 * S, textShadow: '0 2px 8px rgba(0,0,0,.6)' }}>{title.sub}</div>}
          </AbsoluteFill>
        )}

        {cue && project.subtitle === 'lyric' && <LyricBar text={project.lines[cue.i]} cue={cue} fps={fps} S={S} />}
        {cue && project.subtitle === 'dialog' && <DialogBar text={project.lines[cue.i]} cue={cue} fps={fps} S={S} who={project.speakers?.[cue.i] ?? null} face={project.faces?.[cue.i] ?? null} atlas={atlas} />}

        {endA > 0.01 && end && (
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: endA }}>
            <div style={{ fontSize: 64 * S, fontWeight: 900, letterSpacing: 18 * S, color: '#fff6d8', textShadow: `0 0 ${30 * S}px rgba(120,160,255,.9), 0 3px 0 #1c2a66` }}>{end.text}</div>
          </AbsoluteFill>
        )}
        {white > 0.004 && <AbsoluteFill style={{ backgroundColor: '#ffffff', opacity: white }} />}
        {black > 0.004 && <AbsoluteFill style={{ backgroundColor: '#000000', opacity: black }} />}
        {err && (
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: '#1a1030', color: '#ffd9df', fontSize: 34 * S, padding: 80 * S, textAlign: 'center' }}>
            渲染失败：{err}
          </AbsoluteFill>
        )}
      </AbsoluteFill>
    );
  };
  Film.displayName = `Film(${project.id})`;
  return Film;
}
