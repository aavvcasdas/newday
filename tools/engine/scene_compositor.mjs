// scene_compositor.mjs — 严格五层舞台合成器
// L0 远景海底房（视差 .78/.45）-> L1 追光与后景承重 -> L2 校准角色
// -> L3 前景交互（下沿 <=600）-> L4 固定屏幕 HUD（横幅/角标/字幕）。
// 字幕是唯一允许进入 y 615..720 的组件，由调用方在 L4 绘制。
import { renderUnderwaterStage } from '../场景/sea_stage.mjs';
import { W, H, drawBaseUnderwaterRoom, drawText } from './room_base.mjs';
import { drawOpenerSpotlights, drawOpenerHookBanner } from './opener_director.mjs';

export const LAYERS = Object.freeze(['L0_stage', 'L1_light_back', 'L2_actors', 'L3_foreground', 'L4_hud']);

/**
 * 在已设置基础变换（输出缩放）的 ctx 上合成一帧相机空间画面（L0-L3）。
 * cam: {z, cx, cy}；layers: {back(ctx), actors(ctx), foreground(ctx)}
 */
export function composeScene(ctx, { t, cam, mood = 'work_cool', spotlights = true, focusX = 640, layers = {} } = {}) {
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(cam.z, cam.z);
  ctx.translate(-cam.cx, -cam.cy);
  renderUnderwaterStage(ctx, t, { z: 1, cx: W / 2, cy: H / 2 }, {
    mood,
    drawRoom: (tt) => drawBaseUnderwaterRoom(ctx, tt, { animatePlants: true }),
  }, () => {
    if (spotlights) drawOpenerSpotlights(ctx, t, focusX);
    layers.back?.(ctx);
    layers.actors?.(ctx);
    layers.foreground?.(ctx);
  });
  ctx.restore();
}

/** L4 合规小角标（固定屏幕空间，不随相机推拉）。 */
export function drawComplianceCorner(ctx) {
  drawText(ctx, '非官方同人 · AI生成 · 剧情演绎', 1060, 28, 14, '#B9CECB');
}

/** L4 顶部钩子横幅（仅开场窗口内出现）。 */
export function drawHudBanner(ctx, t, hook) {
  return drawOpenerHookBanner(ctx, t, hook);
}
