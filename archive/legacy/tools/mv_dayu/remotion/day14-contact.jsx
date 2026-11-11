import React from 'react';
import { AbsoluteFill, useCurrentFrame, staticFile } from 'remotion';

// Day14 C04 构图验证：只渲染一帧，用来检查「伞是否真的罩住鲸娘」。
// 参数与 tools/day14制作/contact_check.mjs 完全一致（有测试对账）。
// 这不是成片组件，不加载字幕与配音，只回答一个几何问题。
const WHALE = { x: 620, groundY: 610, height: 395 };
const DOUBAO = { x: 870, groundY: 610, height: 370 };
const UMBRELLA = { cx: 620, rimY: 176, halfWidth: 170, tiltDeg: -8 };
const CANE_X = 790;
const HEAD_TOP_PADDING = 0.013;

// 逐帧图集是 16 格横排（6144x416），必须裁到单格再缩放，
// 否则整条胶卷会被压进画面，看起来像十几个人挤在一起。
function AtlasActor({ name, x, groundY, height, frame = 0 }) {
  const w = (height * 384) / 416;
  const col = frame % 16;
  return (
    <svg
      x={x - w / 2}
      y={groundY - height}
      width={w}
      height={height}
      viewBox={`${col * 384} 0 384 416`}
      overflow="hidden"
    >
      <image href={staticFile(name + '.png')} x="0" y="0" width="6144" height="416" />
    </svg>
  );
}

function Sky() {
  return (
    <>
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#7597ad" />
          <stop offset="1" stopColor="#c8d6d4" />
        </linearGradient>
      </defs>
      <rect width="1280" height="720" fill="url(#bg)" />
      <path d="M0 520 Q240 480 520 535 T1280 520 V720 H0Z" fill="#91acaa" />
    </>
  );
}

function Rain({ t }) {
  return (
    <g stroke="#e4f5f4" strokeWidth="3" opacity="0.65">
      {Array.from({ length: 48 }, (_, i) => {
        const x = (i * 89) % 1280;
        const y = (i * 53 + t * 160) % 560;
        return <path key={i} d={`M${x} ${y} l-13 30`} />;
      })}
    </g>
  );
}

export function Day14ContactStill() {
  const t = useCurrentFrame() / 30;
  const whaleW = (WHALE.height * 926) / 1024;
  const tilt = (UMBRELLA.tiltDeg * Math.PI) / 180;
  const rimLowY = UMBRELLA.rimY + UMBRELLA.halfWidth * Math.sin(Math.abs(tilt));
  const headTopY = WHALE.groundY - WHALE.height * (1 - HEAD_TOP_PADDING);
  // 伞顶比伞沿高 0.42 个半宽，画出来才像伞面而不是一片扁叶子。
  const canopyTipY = UMBRELLA.rimY - UMBRELLA.halfWidth * 0.42;
  return (
    <AbsoluteFill style={{ background: '#e8dec7' }}>
      <svg width="1920" height="1080" viewBox="0 0 1280 720">
        <Sky />
        <Rain t={t} />
        <image
          href={staticFile('day12-whale_think.png')}
          x={WHALE.x - whaleW / 2}
          y={WHALE.groundY - WHALE.height}
          width={whaleW}
          height={WHALE.height}
          preserveAspectRatio="xMidYMax meet"
        />
        <AtlasActor name="doubao_shared_umbrella_action" x={DOUBAO.x} groundY={DOUBAO.groundY} height={DOUBAO.height} frame={6} />
        {/* 伞：绕伞柄根部整片旋转，让伞沿向鲸娘一侧压下去 */}
        <g transform={`rotate(${UMBRELLA.tiltDeg} ${CANE_X} ${UMBRELLA.rimY + 300})`}>
          <path
            d={`M${UMBRELLA.cx - UMBRELLA.halfWidth} ${UMBRELLA.rimY} Q${UMBRELLA.cx} ${canopyTipY * 2 - UMBRELLA.rimY} ${UMBRELLA.cx + UMBRELLA.halfWidth} ${UMBRELLA.rimY}Z`}
            fill="#efd7a9"
            stroke="#a58779"
            strokeWidth="7"
          />
          <path d={`M${CANE_X} ${UMBRELLA.rimY - 8} V${UMBRELLA.rimY + 300}`} stroke="#8b6d60" strokeWidth="7" />
        </g>
        {/* 参考线：红线跟着倾斜的伞沿走，绿线是鲸娘头顶。仅用于这张验证帧。 */}
        <g transform={`rotate(${UMBRELLA.tiltDeg} ${CANE_X} ${UMBRELLA.rimY})`}>
          <path d={`M${UMBRELLA.cx - UMBRELLA.halfWidth} ${UMBRELLA.rimY} H${CANE_X + 40}`} stroke="#ff3b30" strokeWidth="2" strokeDasharray="10 8" />
        </g>
        <path d={`M60 ${headTopY} H1220`} stroke="#28c76f" strokeWidth="2" strokeDasharray="10 8" />
      </svg>
    </AbsoluteFill>
  );
}
