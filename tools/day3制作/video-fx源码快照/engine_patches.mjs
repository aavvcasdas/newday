// engine_patches.mjs — Day3 样片的 video-fx 引擎补丁（可复现，不改上游 checkout）
//
// 为什么要有这个文件：
//   video-fx 引擎（/tmp/video-fx）是外部 checkout，不进本仓库。Day3 v1 退回的两个硬伤
//   （脸上多余色块 / 像素质感发糊）根因都在引擎源码里，所以这里做**最小字符串补丁**：
//   读 `src/whale_girl.js` → 逐条精确替换（锚点找不到就报错，不静默）→ 写出
//   `src/whale_girl.day3.js`（同目录，相对 require 仍可解析）。
//   渲染器只 require 这份打好补丁的副本，上游文件保持原样。
//
// 补丁清单（每条都对应一个用户反馈项）：
//   1. 鳍耳蓝色蝴蝶结 → 可关（`noFinBows`）：v1 截图里"眼睛上方多余的青色标记"就是它，
//      原片形象（42868804351-1-192.mp4）没有这个装饰。
//   2. 五官锚点对齐到像素格：`eLx/eRx/eY` 吸附到 cell 整数倍，眼高光改成 1 个整格，
//      不再出现半格白点/半格色块。
//   3. 过渡眨眼肤色补丁 → 可关（`eyePatch:false`）：v1 截图里"眼睛上白色盖眼补丁"来自
//      `sqz > 0.45` 时铺 `C.skin` 矩形。关掉后表情切换不再糊脸。
//   4. 骨块填充的 `+0.45` 像素补边 → 去掉：补边落在半像素上，1.5× 输出时会在每个骨块
//      右侧留下一条半透明灰边，这是"整体发糊"的一部分。
//
// 用法（渲染器内部已自动调用）：
//   import { buildPatchedWhaleGirl } from './engine_patches.mjs';
//   const src = buildPatchedWhaleGirl('/tmp/video-fx');   // 返回可 require 的绝对路径

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PATCHES = [
  {
    id: 'fin-bows-optional',
    why: '鳍耳青蓝蝴蝶结在 v1 里被看成"眼睛上方的多余青色标记"，原文没有，做成可关',
    from: "      if (view === 'back') return;",
    to: "      if (view === 'back' || o.noFinBows) return;"
  },
  {
    id: 'face-anchor-on-grid',
    why: 'eLx/eRx/eY 落在半格上，五官补丁必然错位',
    from: '      const eLx = -0.60 * u, eRx = (view === \'side\' ? 0.46 : 0.56) * u, eY = -5.82 * u;',
    to: [
      '      const qC = (v) => Math.round(v * u / cell) * cell; // Day3: 五官锚点吸附到像素格',
      '      const eLx = qC(-0.60), eRx = qC(view === \'side\' ? 0.46 : 0.56), eY = qC(-5.82);'
    ].join('\n')
  },
  {
    id: 'eye-highlight-on-grid',
    why: '眼神高光 eLx-0.08u / 1.2cell 都不是整格，会糊成半透明灰点',
    from: [
      '        ctx.fillRect(eLx - 0.08 * u + sacX, eY - 0.14 * u + sacY, 1.2 * cell, 1.2 * cell);',
      '        ctx.fillRect(eRx - 0.08 * u + sacX, eY - 0.14 * u + sacY, 1.2 * cell, 1.2 * cell);'
    ].join('\n'),
    to: [
      '        ctx.fillRect(eLx - cell + sacX, eY - cell + sacY, cell, cell); // Day3: 整格高光',
      '        ctx.fillRect(eRx - cell + sacX, eY - cell + sacY, cell, cell);'
    ].join('\n')
  },
  {
    id: 'eye-patch-optional',
    why: '表情切换时 `sqz>0.45` 会铺两块肤色矩形盖住眼睛（v1 的白色补丁），做成可关',
    from: '      if (sqz > 0.45) {',
    to: '      if (sqz > 0.45 && o.eyePatch !== false) {'
  },
  {
    id: 'mouth-no-skin-block',
    why: '像素骨架的 o/waveO/pout/flat/cat/smirk 是「先铺一块肤色矩形再画红块」，在 1080p 近景里会看成"嘴上红方块 / 肤色补丁"（Day3 v1 用户点名项）。这里加一个 `vectorMouth` 开关：开启时改用引擎自带矢量嘴型并吸附整格，不再铺肤色块；**默认关闭**，Day1–Day3 的既有成片口径不受影响，Day4 起才开启。',
    from: [
      "      const mKey = o.talking ? ((Math.floor(t * 9) % 2 === 0) ? 'openSmile' : 'o') : (o.mouth || 'openSmile');",
      "      if (poseKey !== 'panic') {",
      "        if (mKey === 'o' || mKey === 'waveO') {",
      "          ctx.fillStyle = C.skin;",
      "          ctx.fillRect(-1.8 * cell, -54.2 * cell, 3.6 * cell, 2.8 * cell);",
      "          ctx.fillStyle = '#B84A52';",
      "          ctx.fillRect(-1.3 * cell, -53.8 * cell, 2.6 * cell, 2.2 * cell);",
      "          ctx.fillStyle = '#FF9690';",
      "          ctx.fillRect(-0.8 * cell, -53.2 * cell, 1.6 * cell, 1.2 * cell);",
      "        } else if (mKey === 'pout' || mKey === 'flat') {",
      "          ctx.fillStyle = C.skin;",
      "          ctx.fillRect(-2.0 * cell, -54.2 * cell, 4.0 * cell, 2.8 * cell);",
      "          ctx.fillStyle = '#B84A52';",
      "          ctx.fillRect(-1.5 * cell, -53.0 * cell, 3.0 * cell, 0.9 * cell);",
      "        } else if (mKey === 'cat' || mKey === 'smirk') {",
      "          ctx.fillStyle = C.skin;",
      "          ctx.fillRect(-2.0 * cell, -54.2 * cell, 4.0 * cell, 2.8 * cell);",
      "          ctx.fillStyle = '#B84A52';",
      "          ctx.fillRect(-1.8 * cell, -53.2 * cell, 1.4 * cell, 0.9 * cell);",
      "          ctx.fillRect(0.4 * cell, -53.2 * cell, 1.4 * cell, 0.9 * cell);",
      "          ctx.fillRect(-0.5 * cell, -53.8 * cell, 1.0 * cell, 0.9 * cell);",
      "        }",
      "      }"
    ].join('\n'),
    to: [
      "      const mKey = o.talking ? ((Math.floor(t * 9) % 2 === 0) ? 'openSmile' : 'o') : (o.mouth || 'openSmile');",
      "      if (o.vectorMouth) {",
      "        // Day4（按需开启）：不再铺肤色矩形，直接调引擎自带的矢量嘴型 MOUTHS，",
      "        // 锚点吸附到整格中心，避免 1080p 近景里那块「红方块 / 肤色补丁」。",
      "        const mFn = MOUTHS[mKey] || MOUTHS.openSmile;",
      "        mFn(ctx, 0, Math.round(-53) * cell, cell * 10);",
      "      } else if (poseKey !== 'panic') {",
      "        if (mKey === 'o' || mKey === 'waveO') {",
      "          ctx.fillStyle = C.skin;",
      "          ctx.fillRect(-1.8 * cell, -54.2 * cell, 3.6 * cell, 2.8 * cell);",
      "          ctx.fillStyle = '#B84A52';",
      "          ctx.fillRect(-1.3 * cell, -53.8 * cell, 2.6 * cell, 2.2 * cell);",
      "          ctx.fillStyle = '#FF9690';",
      "          ctx.fillRect(-0.8 * cell, -53.2 * cell, 1.6 * cell, 1.2 * cell);",
      "        } else if (mKey === 'pout' || mKey === 'flat') {",
      "          ctx.fillStyle = C.skin;",
      "          ctx.fillRect(-2.0 * cell, -54.2 * cell, 4.0 * cell, 2.8 * cell);",
      "          ctx.fillStyle = '#B84A52';",
      "          ctx.fillRect(-1.5 * cell, -53.0 * cell, 3.0 * cell, 0.9 * cell);",
      "        } else if (mKey === 'cat' || mKey === 'smirk') {",
      "          ctx.fillStyle = C.skin;",
      "          ctx.fillRect(-2.0 * cell, -54.2 * cell, 4.0 * cell, 2.8 * cell);",
      "          ctx.fillStyle = '#B84A52';",
      "          ctx.fillRect(-1.8 * cell, -53.2 * cell, 1.4 * cell, 0.9 * cell);",
      "          ctx.fillRect(0.4 * cell, -53.2 * cell, 1.4 * cell, 0.9 * cell);",
      "          ctx.fillRect(-0.5 * cell, -53.8 * cell, 1.0 * cell, 0.9 * cell);",
      "        }",
      "      }"
    ].join('\n')
  },
  {
    id: 'bone-run-no-halfpixel-pad',
    why: '骨块右侧/下侧 +0.45 的半像素补边在 1.5× 输出里是一条灰边',
    from: [
      '          ctx.fillRect(',
      '            (gx1 - 0.5) * cell,',
      '            (gy - 0.5) * cell,',
      '            (gx2 - gx1 + 1) * cell + 0.45,',
      '            cell + 0.45',
      '          );'
    ].join('\n'),
    to: [
      '          ctx.fillRect(',
      '            (gx1 - 0.5) * cell,',
      '            (gy - 0.5) * cell,',
      '            (gx2 - gx1 + 1) * cell, // Day3: 不再补半像素',
      '            cell',
      '          );'
    ].join('\n')
  }
];

export function buildPatchedWhaleGirl(vfx = process.env.VIDEO_FX_DIR || '/tmp/video-fx') {
  const srcFile = path.join(vfx, 'src/whale_girl.js');
  const outFile = path.join(vfx, 'src/whale_girl.day3.js');
  const src = fs.readFileSync(srcFile, 'utf8');
  let out = src;
  const applied = [];
  for (const p of PATCHES) {
    if (!out.includes(p.from)) {
      throw new Error(`[engine_patches] 锚点缺失：${p.id}（上游版本变了？）\n---\n${p.from}\n---`);
    }
    if (out.includes(p.to)) continue; // 已打过（幂等）
    out = out.replace(p.from, p.to);
    applied.push(p.id);
  }
  const banner = `// ⚠️ 自动生成：day3 样片补丁版（见 engine_patches.mjs）。不要手改，改补丁再重建。\n`;
  const body = banner + out;
  if (!fs.existsSync(outFile) || fs.readFileSync(outFile, 'utf8') !== body) {
    fs.writeFileSync(outFile, body);
  }
  return { file: outFile, applied };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = buildPatchedWhaleGirl(process.argv[2]);
  console.log('patched →', r.file);
  console.log('applied:', r.applied.length ? r.applied.join(', ') : '(already up to date)');
}
