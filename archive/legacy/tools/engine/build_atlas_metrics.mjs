// build_atlas_metrics.mjs — 量测图集单元格内容包围盒，生成 atlas_metrics_data.mjs
//
// 只在 Node 端跑（需要 @napi-rs/canvas 解码）：浏览器/Remotion 端只 import 生成好的
// 纯数据模块 atlas_metrics_data.mjs，绝不 import 本文件。
//
// 用法：
//   node tools/engine/build_atlas_metrics.mjs            # 打印到 stdout
//   node tools/engine/build_atlas_metrics.mjs --write    # 写回数据模块

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from './room_base.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ATLAS_DIR = path.join(ROOT, 'assets/ai-girls/lyric-action-v13');
const WALK_DIR = process.env.WALK_RIG_DIR || '/tmp/newday_walk_rigs_mesh_v2';
const DATA_PATH = path.join(ROOT, 'tools/engine/atlas_metrics_data.mjs');

/** 量一个图集：所有非空单元格的并集包围盒，按单元格比例返回 */
function measureAtlas(img, cols) {
  const cw = Math.round(img.width / cols);
  const ch = img.height;
  const c = createCanvas(cw, ch);
  const g = c.getContext('2d');
  let minY = ch;
  let maxY = 0;
  let minX = cw;
  let maxX = 0;
  for (let i = 0; i < cols; i++) {
    g.clearRect(0, 0, cw, ch);
    g.drawImage(img, i * cw, 0, cw, ch, 0, 0, cw, ch);
    const d = g.getImageData(0, 0, cw, ch).data;
    for (let y = 0; y < ch; y++) {
      const row = y * cw * 4;
      for (let x = 0; x < cw; x++) {
        if (d[row + x * 4 + 3] > 40) {
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    }
  }
  return {
    topFrac: +(minY / ch).toFixed(4),
    bottomFrac: +(maxY / ch).toFixed(4),
    leftFrac: +(minX / cw).toFixed(4),
    rightFrac: +(maxX / cw).toFixed(4),
    cols,
  };
}

async function measureDir(dir, cols, out) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.png')).sort()) {
    out[f.replace(/\.png$/, '')] = measureAtlas(await loadImage(path.join(dir, f)), cols);
  }
}

async function main() {
  const metrics = {};
  // 表演图集 16 格；双骨骼步态/配对待机 8 格
  await measureDir(ATLAS_DIR, 16, metrics);
  await measureDir(WALK_DIR, 8, metrics);
  // v14 预烘图集（assets/ai-girls/walk-v14）覆盖走位/待机最终素材
  await measureDir(path.join(ROOT, 'assets/ai-girls/walk-v14'), 8, metrics);

  if (!process.argv.includes('--write')) {
    console.log(JSON.stringify(metrics, null, 2));
    return;
  }
  const keys = Object.keys(metrics).sort();
  const body = keys.map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(metrics[k])},`).join('\n');
  const src = `// atlas_metrics_data.mjs — 图集单元格内容度量表（自动生成，勿手改）
//
// 每项：{ topFrac, bottomFrac, leftFrac, rightFrac, cols }，均为「相对单元格」的比例。
// 由 tools/engine/build_atlas_metrics.mjs 量测生成；此处只存数据，保持纯字面量，
// Remotion（webpack/browser）与 Node 两个后端都能安全 import，不能引入 node:fs。

export const ATLAS_CONTENT = Object.freeze({
${body}
});

export default ATLAS_CONTENT;
`;
  fs.writeFileSync(DATA_PATH, src);
  console.log('ATLAS_METRICS_WRITTEN', keys.length, path.relative(ROOT, DATA_PATH));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
