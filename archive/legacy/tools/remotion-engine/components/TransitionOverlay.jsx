import React from 'react';

/**
 * TransitionOverlay — 动机转场视觉修饰层（卡拍甩镜速度线 / 虹膜聚焦遮罩 / 前景擦除幕布）
 */
export function TransitionOverlay({ transitionState, width = 1920, height = 1080 }) {
  if (!transitionState || !transitionState.active) return null;
  const { type, progress, streakAlpha, focus, irisRadius, direction } = transitionState;

  if (type === 'whip_left' || type === 'whip_right' || type === 'pan_through') {
    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 1280 720"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        {streakAlpha > 0.02 &&
          [0, 1, 2, 3, 4, 5].map((idx) => {
            const y = 92 + idx * 96;
            const shift = (progress - 0.5) * direction * 260;
            return (
              <rect
                key={idx}
                x={120 + shift}
                y={y}
                width={980}
                height={3.5}
                rx={2}
                fill="#F0FAFF"
                opacity={streakAlpha * 0.48}
              />
            );
          })}
      </svg>
    );
  }

  if (type === 'iris' && irisRadius != null) {
    const maskId = 'iris-reveal-mask';
    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 1280 720"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width="1280" height="720" fill="white" />
            <circle cx={focus?.[0] ?? 640} cy={focus?.[1] ?? 360} r={Math.max(4, irisRadius)} fill="black" />
          </mask>
        </defs>
        <rect x="0" y="0" width="1280" height="720" fill="#071526" mask={`url(#${maskId})`} />
      </svg>
    );
  }

  if (type === 'wipe') {
    const edgeX = 1280 * progress;
    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 1280 720"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        <rect x={edgeX - 18} y={0} width={36} height={720} fill="#F7D794" opacity={0.45 * (1 - progress)} />
      </svg>
    );
  }

  return null;
}
