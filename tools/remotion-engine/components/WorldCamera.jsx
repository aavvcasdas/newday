import React from 'react';

/**
 * WorldCamera — 统一单世界空间相机容器（对标 Win-Hao/music-mv 单画布世界相机规范）
 * 背景视差层、中景机关、角色、投影、道具全部处于同一个 1280x720 逻辑世界坐标系内，
 * 经由同一个相机 { cx, cy, z } 缩放平移至 1920x1080，杜绝人物与地面打滑脱节。
 */
export function WorldCamera({
  camera = { cx: 640, cy: 360, z: 1 },
  logicalWidth = 1280,
  logicalHeight = 720,
  outputScale = 1.5,
  shakeX = 0,
  shakeY = 0,
  children,
}) {
  const z = camera.z ?? 1;
  const cx = camera.cx ?? logicalWidth / 2;
  const cy = camera.cy ?? logicalHeight / 2;

  const transform = [
    `scale(${outputScale})`,
    `translate(${logicalWidth / 2 + shakeX}px, ${logicalHeight / 2 + shakeY}px)`,
    `scale(${z})`,
    `translate(${-cx}px, ${-cy}px)`,
  ].join(' ');

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        backgroundColor: '#071526',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: logicalWidth,
          height: logicalHeight,
          transformOrigin: '0 0',
          transform,
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  );
}
