// scene_compositor.mjs — 动态多舞台五层合成器（接入 stage_sets 与双向世界交互总线）
// L0 动态可切换舞台（视差远景/建筑/可交互门窗灯闸） -> L1 光锥与后景承重
// -> L2 动态地面投影/脚步反馈 + 骨骼角色 -> L3 前景交互与冲击波（下沿 <=600）
// -> L4 固定屏幕 HUD（横幅/角标/字幕）。
// 彻底告别写死单一 drawBaseUnderwaterRoom！

import { W, H, drawText } from './room_base.mjs';
import { drawOpenerSpotlights, drawOpenerHookBanner } from './opener_director.mjs';
import { resolveStageSet, drawStageSetCanvas } from '../场景/stage_sets.mjs';
import { drawWorldFloorContactsCanvas } from '../互动元素/world_interactions.mjs';

export const LAYERS = Object.freeze(['L0_stage', 'L1_light_back', 'L2_actors', 'L3_foreground', 'L4_hud']);

/**
 * 在已设置基础变换（输出缩放）的 ctx 上合成一帧相机空间画面（L0-L3）。
 * 支持通过 setSpec 切换任意动态背景舞台，并通过 worldState 注入门/窗/灯/地面投影/脚步涟漪双向反馈。
 */
export function composeScene(ctx, {
  t = 0,
  cam = { z: 1, cx: W / 2, cy: H / 2 },
  mood = 'work_cool',
  setSpec = 'underwater_study',
  worldState = null,
  spotlights = false,
  focusX = 640,
  layers = {},
} = {}) {
  const setState = worldState?.setState || resolveStageSet(setSpec, t, { mood, focusX });

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(cam.z, cam.z);
  ctx.translate(-cam.cx, -cam.cy);
  if (setState.reactive?.deskShake) {
    ctx.translate(setState.reactive.deskShake * 0.28, Math.abs(setState.reactive.deskShake) * 0.16);
  }

  drawStageSetCanvas(ctx, setState, {
    t,
    cam,
    drawBackProps: (g) => {
      if (spotlights) drawOpenerSpotlights(g, t, focusX);
      layers.back?.(g, setState);
    },
    drawActorsLayer: (g) => {
      if (worldState) drawWorldFloorContactsCanvas(g, worldState);
      layers.actors?.(g, setState);
      layers.foreground?.(g, setState);
    },
  });

  ctx.restore();
  return { setState, anchors: setState.anchors };
}

/** L4 合规小角标（固定屏幕空间，不随相机推拉）。 */
export function drawComplianceCorner(ctx) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(902, 11, 316, 32, 5);
  ctx.fillStyle = 'rgba(12,25,46,.94)';
  ctx.fill();
  ctx.restore();
  drawText(ctx, '非官方同人 · AI生成 · 剧情演绎', 1060, 28, 14, '#B9CECB');
}

/** L4 顶部钩子横幅（仅开场窗口内出现）。 */
export function drawHudBanner(ctx, t, hook) {
  return drawOpenerHookBanner(ctx, t, hook);
}
