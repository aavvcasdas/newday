// atlas_metrics.mjs — 图集单元格内容度量（查询层；引擎级，Canvas 与 Remotion 共用）
//
// 背景：图集单元格固定尺寸（6144×416 → 16 格 × 384×416），角色并不是顶满单元格画的，
// 格顶/格底都有固定留白。`headTop` 这类按「声明身高」推算的锚点会偏高，
// 道具（灯笼/伞）就会浮在头顶上方。这里按实测内容顶部回缩，两个后端结果一致。
//
// 数据在 atlas_metrics_data.mjs（纯字面量，浏览器端可安全 import）；
// 重新量测：`node tools/engine/build_atlas_metrics.mjs --write`（Node 端，用 canvas 解码）。

import { ATLAS_CONTENT } from './atlas_metrics_data.mjs';

export { ATLAS_CONTENT };

/** 内容顶部相对格顶的比例（决定格顶留白有多少） */
export function atlasTopFrac(name) {
  const m = name ? ATLAS_CONTENT[name] : null;
  return m ? m.topFrac : 0.06;
}

/** 内容底部相对格顶的比例（约 0.97 = 脚底离格底很近） */
export function atlasBottomFrac(name) {
  const m = name ? ATLAS_CONTENT[name] : null;
  return m ? m.bottomFrac : 0.974;
}

/**
 * 图集角色可见头顶相对「脚底原点」的高度比例。
 * 绘制时图片从 y-h 画到 y，内容顶部在 y-h+topFrac*h，
 * 内容底部在 y-h+bottomFrac*h（≈ 脚底），故可见头顶距脚底 ≈ (bottomFrac-topFrac)。
 * 用声明身高归一后即得此比例。
 */
export function atlasVisibleTopFrac(name) {
  const m = name ? ATLAS_CONTENT[name] : null;
  if (!m) return 0.96;
  return +(m.bottomFrac - m.topFrac).toFixed(4);
}
