#!/usr/bin/env node
// 重建 site/src/mv/assets/cast_atlas.png
//
// 页面源码包（remotion-fix-and-mv-recreation.zip）只带了图集的坐标表 cast_atlas.json，没带 PNG 本体。
// 图集里的 108 格全部来自仓库已有的像素角色数据：
//   番外MV/童话镇/src/sprites_data.js     （立绘 / 头像，与《达拉崩吧》同一份）
//   番外MV/童话镇/src/walk_cycle_data.js  （8 帧步态）
// 调色板用 番外MV/童话镇/src/px.js 的 RGB 表（48 基础色 + CHAR_HEX 200 色，255 = 透明）。
// 本脚本按 cast_atlas.json 的坐标逐格贴回去，不缩放、不改色；任何一格缺失或尺寸不符都直接报错。
//
//   node bake_atlas.mjs            重建并写盘
//   node bake_atlas.mjs --check    只校验现有 PNG 与重建结果逐字节一致
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PIXEL_MV = path.resolve(HERE, '../童话镇/src');
const META_PATH = path.join(HERE, 'site/src/mv/assets/cast_atlas.json');
const OUT_PATH = path.join(HERE, 'site/src/mv/assets/cast_atlas.png');

const imp = (f) => import(pathToFileURL(path.join(PIXEL_MV, f)).href);
const { RGB, T } = await imp('px.js');
const { getBakedSprite } = await imp('sprites_data.js');
await imp('walk_cycle_data.js'); // 把 walk_* 注册进同一张精灵表

const meta = JSON.parse(fs.readFileSync(META_PATH, 'utf8'));
const { w: W, h: H, s: cells } = meta;
const rgba = Buffer.alloc(W * H * 4); // 透明处保持 (0,0,0,0)

for (const [key, [x0, y0, w, h]] of Object.entries(cells)) {
  const spr = getBakedSprite(key);
  if (!spr) throw new Error(`仓库精灵数据里没有「${key}」`);
  if (spr.w !== w || spr.h !== h) throw new Error(`「${key}」尺寸不符：精灵 ${spr.w}×${spr.h}，坐标表 ${w}×${h}`);
  if (x0 < 0 || y0 < 0 || x0 + w > W || y0 + h > H) throw new Error(`「${key}」超出图集边界`);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = spr.d[y * w + x];
      if (idx === T) continue;
      const c = RGB[idx];
      if (!c) throw new Error(`「${key}」用到了调色板外的索引 ${idx}`);
      const o = ((y0 + y) * W + x0 + x) * 4;
      rgba[o] = c[0]; rgba[o + 1] = c[1]; rgba[o + 2] = c[2]; rgba[o + 3] = 255;
    }
  }
}

// 最小 PNG 编码器（RGBA 8bit，无滤波）
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) rgba.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT_PATH) ? fs.readFileSync(OUT_PATH) : null;
  if (!cur || !cur.equals(png)) { console.error('cast_atlas.png 与重建结果不一致'); process.exit(1); }
  console.log(`cast_atlas.png 校验一致 ${W}×${H} · ${Object.keys(cells).length} 格 · sha256 ${sha(png)}`);
} else {
  fs.writeFileSync(OUT_PATH, png);
  console.log(`已写出 ${path.relative(process.cwd(), OUT_PATH)} ${W}×${H} · ${Object.keys(cells).length} 格 · ${png.length} 字节 · sha256 ${sha(png)}`);
}
