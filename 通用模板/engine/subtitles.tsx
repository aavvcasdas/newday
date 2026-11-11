// 两种字幕条。都是纯函数式的 DOM 叠层：只读「当前是第几句、念到哪了」，不带任何 CSS 动画或过渡。
//   LyricBar   歌词条：整句出现，从左到右染成金色（MV 用）
//   DialogBar  对话条：头像 + 名牌 + 一屏一句，不逐字染色（Day 口播用）
import React, { useLayoutEffect, useRef } from 'react';
import { AbsoluteFill } from 'remotion';
import type { AtlasData, CharId } from './actors';
import { SPEAKER_NAME, SPEAKER_PORTRAIT } from './project';

export interface CueState { i: number; p: number; age: number }

/** 歌词条（与页面源码 MVComp 的写法逐项一致） */
export const LyricBar: React.FC<{ text: string; cue: CueState; fps: number; S: number }> = ({ text, cue, fps, S }) => (
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
      <span style={{ color: '#ffffff' }}>{text}</span>
      <span style={{ position: 'absolute', left: 40 * S, top: 12 * S, color: '#ffd84a', clipPath: `inset(0 ${(1 - cue.p) * 100}% 0 0)` }}>{text}</span>
    </div>
  </AbsoluteFill>
);

/**
 * 像素头像：直接从已经解码好的图集里同步画到一块小画布上。
 * 不用 CSS background / <img> 再加载一遍——那样会回到「贴图没进等待链、头一两帧空白」的老问题。
 */
const Portrait: React.FC<{ atlas: AtlasData; cell: string; size: number }> = ({ atlas, cell, size }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const r = atlas.rects[cell];
  useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv || !r) return;
    const c = cv.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, cv.width, cv.height);
    c.drawImage(atlas.tex.image as CanvasImageSource, r[0], r[1], r[2], r[3], 0, 0, cv.width, cv.height);
  }, [atlas, cell, r]);
  if (!r) throw new Error(`[字幕] 图集里没有头像「${cell}」`);
  // 画布按整数倍放大像素，CSS 尺寸与画布尺寸一致，不让浏览器再缩放一次
  const k = Math.max(1, Math.round(size / r[2]));
  return <canvas ref={ref} width={r[2] * k} height={r[3] * k} style={{ width: r[2] * k, height: r[3] * k, display: 'block', imageRendering: 'pixelated' }} />;
};

/** 对话条：左边头像，右边名牌 + 台词。一屏一句，整句同时出现。 */
export const DialogBar: React.FC<{ text: string; cue: CueState; fps: number; S: number; who: CharId | null; atlas: AtlasData | null }> = ({ text, cue, fps, S, who, atlas }) => {
  const a = Math.min(1, cue.age * fps / 4);
  const dy = (1 - Math.min(1, cue.age * fps / 5)) * 14 * S;
  const long = text.length > 22;
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 44 * S }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 22 * S, maxWidth: 1660 * S,
          padding: `${14 * S}px ${40 * S}px ${14 * S}px ${who && atlas ? 16 * S : 40 * S}px`,
          background: 'rgba(24,18,44,.88)', border: `${4 * S}px solid #ffd166`, borderRadius: 18 * S,
          boxShadow: `0 ${8 * S}px ${30 * S}px rgba(0,0,0,.35)`, opacity: a, transform: `translateY(${dy}px)`,
        }}
      >
        {who && atlas && (
          <div style={{ flex: 'none', padding: 4 * S, background: '#2c2350', border: `${3 * S}px solid #ffd166`, borderRadius: 12 * S, overflow: 'hidden' }}>
            <Portrait atlas={atlas} cell={SPEAKER_PORTRAIT[who]} size={128 * S} />
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 * S }}>
          {who && <div style={{ fontSize: 28 * S, fontWeight: 900, letterSpacing: 4 * S, lineHeight: 1.1, color: '#ffd84a' }}>{SPEAKER_NAME[who]}</div>}
          <div style={{ fontSize: (long ? 48 : 56) * S, fontWeight: 900, letterSpacing: 3 * S, lineHeight: 1.2, color: '#ffffff', whiteSpace: 'nowrap' }}>{text}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
