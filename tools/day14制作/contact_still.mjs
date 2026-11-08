// tools/day14制作/contact_still.mjs — 把 C04 的接触构图渲成一帧，供肉眼核对
//
// contact_check.mjs 只用坐标算重叠，证明不了「画出来真没缝」。
// 这个脚本渲染一帧带参考线的静帧，红线是伞沿、绿线是鲸娘头顶，
// 两条线之间的距离就是 contact_check.json 里那个 19.18px。
//
// 输出不进仓库：放在 /tmp，避免把验证产物当成成片提交。

import { bundle } from '../mv_dayu/remotion/node_modules/@remotion/bundler/dist/index.js';
import { selectComposition, renderStill } from '../mv_dayu/remotion/node_modules/@remotion/renderer/dist/index.js';
import chromium, { inflate } from '../mv_dayu/remotion/node_modules/@sparticuz/chromium/build/index.js';
import path from 'node:path';

const base = path.resolve('tools/mv_dayu/remotion');
const libRoot = await inflate(path.join(base, 'node_modules/@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = `${libRoot}/lib${process.env.LD_LIBRARY_PATH ? ':' + process.env.LD_LIBRARY_PATH : ''}`;
const browserExecutable = await chromium.executablePath();
const serveUrl = await bundle({
  entryPoint: path.join(base, 'index.day14-contact.jsx'),
  publicDir: path.join(base, 'public'),
});
const opts = {
  serveUrl,
  id: 'Day14Contact',
  browserExecutable,
  chromiumOptions: { gl: 'angle', disableWebSecurity: true },
};
const composition = await selectComposition(opts);
const output = process.argv[2] || '/tmp/day14-c04-contact.png';
await renderStill({ ...opts, composition, frame: 0, output, imageFormat: 'png' });
console.log(`C04 验证帧已渲染：${output}`);
