// Remotion 合成：<canvas>(three.js) + 歌词条 + 闪白/淡入淡出 + 可选音轨。
// 这个组件既能放进 @remotion/player 在浏览器里播，也能原样注册成 <Composition> 走 CLI 渲染。
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, Audio, Sequence, cancelRender, continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadAtlas } from './actors';
import { MVEngine } from './engine';
import type { ShotDef } from './core';
import { clamp01, seg } from './kit';
import { validateProject } from './project';
import { cueAt, shotIndexAt, type Timeline } from './timeline';

export type MVProps = {
  timeline: Timeline;
  lyrics: string[];
  title: string;
  subtitle: string;
  endTitle: string;
  endShot: string;
  audioSrc: string | null;
  audioOffset: number;
  showLyrics: boolean;
  karaoke?: boolean;
  strictCues?: boolean;
  pulseCamera?: boolean;
}

const CJK = '"ZCOOL KuaiLe","PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC","Source Han Sans SC",sans-serif';

export const createMVComp = (shotMap: Record<string, ShotDef>): React.FC<MVProps> => ({ timeline: tl, lyrics, title, subtitle, endTitle, endShot, audioSrc, audioOffset, showLyrics, karaoke = true, strictCues = false, pulseCamera = true }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  validateProject({timeline: tl, lyrics, title, subtitle, endTitle, endShot, audioSrc, audioOffset, showLyrics}, shotMap, fps);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<MVEngine | null>(null);
  const firstFrameRendered = useRef(false);
  const [ready, setReady] = useState(false);
  // 修复点：图集没解码完之前不允许 Remotion 截帧（newday 引擎里立绘走裸 <image>，没有这一步）
  const [handle] = useState(() => delayRender('等待角色图集解码'));

  useEffect(() => {
    let dead = false;
    Promise.all([loadAtlas(), document.fonts.load('900 58px "ZCOOL KuaiLe"')])
      .then(([atlas]) => {
        if (dead || !canvasRef.current) return;
        try { engineRef.current = new MVEngine(canvasRef.current, width, height, atlas, shotMap, pulseCamera); setReady(true); }
        catch (e) { cancelRender(e instanceof Error ? e : new Error(String(e))); return; }
      })
      .catch((e) => { cancelRender(e instanceof Error ? e : new Error(String(e))); });
    return () => { dead = true; engineRef.current?.dispose(); engineRef.current = null; setReady(false); };
  }, [width, height, handle, pulseCamera]);

  useLayoutEffect(() => {
    if (!ready || !engineRef.current) return;
    try {
      engineRef.current.render(frame, tl);
      if (!firstFrameRendered.current) { firstFrameRendered.current = true; continueRender(handle); }
    } catch (e) { cancelRender(e instanceof Error ? e : new Error(String(e))); }
  }, [frame, ready, tl, handle]);

  const t = frame / fps;
  const si = shotIndexAt(tl, t);
  const st = tl.shots[si];
  const fx = shotMap[st.id]?.fx;
  const u = clamp01((t - st.a) / (st.b - st.a));
  let white = 0, black = 0;
  if (fx?.flash) for (const f0 of fx.flash) { const dt = t - (st.a + f0 * (st.b - st.a)); if (dt >= 0 && dt < 0.22) white = Math.max(white, 0.85 * (1 - dt / 0.22)); }
  if (fx?.whiteOut) white = Math.max(white, seg(u, 0.8, 1));
  if (fx?.whiteIn) white = Math.max(white, 1 - seg(u, 0, 0.12));
  if (fx?.blackOut) black = seg(u, 0.68, 0.97);
  const titleA = fx?.title ? Math.min(seg(u, 0.04, 0.18), 1 - seg(u, 0.62, 0.78)) : 0;
  const endA = st.id === endShot ? Math.min(seg(u, 0.22, 0.42), 1 - seg(u, 0.7, 0.9)) : 0;

  const candidate = showLyrics ? cueAt(tl, t) : null;
  const cue = candidate && (!strictCues || t < tl.ends[candidate.i]) ? candidate : null;
  const offF = Math.round(audioOffset * fps);
  const S = height / 1080;

  return (
    <AbsoluteFill style={{ backgroundColor: '#05060f', fontFamily: CJK }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ width: '100%', height: '100%', display: 'block' }} />
      {audioSrc ? (offF >= 0 ? <Sequence from={offF} layout="none"><Audio src={audioSrc} /></Sequence> : <Audio src={audioSrc} trimBefore={-offF} />) : null}

      {titleA > 0.01 && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: 70 * S, opacity: titleA }}>
          <div style={{ fontSize: 150 * S, fontWeight: 900, letterSpacing: 24 * S, color: '#fff6d8', textShadow: `0 ${6 * S}px 0 #7a2b3a, 0 0 ${40 * S}px rgba(255,200,120,.8)`, transform: `scale(${0.94 + 0.06 * titleA})` }}>{title}</div>
          <div style={{ fontSize: 34 * S, fontWeight: 700, letterSpacing: 10 * S, color: '#ffe2a8', marginTop: 4 * S, textShadow: '0 2px 8px rgba(0,0,0,.6)' }}>{subtitle}</div>
        </AbsoluteFill>
      )}

      {cue && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 46 * S }}>
          <div
            style={{
              position: 'relative', padding: `${12 * S}px ${40 * S}px ${14 * S}px`, background: 'rgba(24,18,44,.86)',
              borderTop: `${4 * S}px solid #ffd166`, borderBottom: `${4 * S}px solid #ffd166`, borderRadius: 6 * S,
              fontSize: 58 * S, fontWeight: 900, letterSpacing: 5 * S, lineHeight: 1.15, whiteSpace: 'nowrap',
              opacity: Math.min(1, cue.age * fps / 4), transform: `translateY(${(1 - Math.min(1, cue.age * fps / 5)) * 16 * S}px)`,
              boxShadow: `0 ${8 * S}px ${30 * S}px rgba(0,0,0,.35)`,
            }}
          >
            <span style={{ color: '#ffffff' }}>{lyrics[cue.i]}</span>
            {karaoke && <span style={{ position: 'absolute', left: 40 * S, top: 12 * S, color: '#ffd84a', clipPath: `inset(0 ${(1 - cue.p) * 100}% 0 0)` }}>{lyrics[cue.i]}</span>}
          </div>
        </AbsoluteFill>
      )}

      {endA > 0.01 && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: endA }}>
          <div style={{ fontSize: 64 * S, fontWeight: 900, letterSpacing: 18 * S, color: '#fff6d8', textShadow: `0 0 ${30 * S}px rgba(120,160,255,.9), 0 3px 0 #1c2a66` }}>{endTitle}</div>
        </AbsoluteFill>
      )}
      {white > 0.004 && <AbsoluteFill style={{ backgroundColor: '#ffffff', opacity: white }} />}
      {black > 0.004 && <AbsoluteFill style={{ backgroundColor: '#000000', opacity: black }} />}
    </AbsoluteFill>
  );
};
