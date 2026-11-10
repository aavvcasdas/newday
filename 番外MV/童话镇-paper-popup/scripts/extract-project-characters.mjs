// Extract only the project's existing character frames from the original sprite atlas.
// The pop-up stage/renderer remains independent; this script does not import old scene code.
import { CHAR_HEX, getBakedSprite } from '../../童话镇/src/sprites_data.js';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets/actors');
const SOURCES = {
  whale: { idle: 'whale_big_idle', wave: 'whale_big_wave', point: 'whale_big_point', blink: 'whale_big_blink' },
  gpt: { idle: 'gpt_boss_idle', reach: 'gpt_boss_cast0', point: 'gpt_boss_cast1', worried: 'gpt_boss_rage' },
  claude: { idle: 'claude_front_0', blink: 'claude_front_1', sleep: 'claude_front_1' },
  doubao: { idle: 'doubao_cage_0', blink: 'doubao_cage_1', reach: 'doubao_cage_1' },
  gemini: { idle: 'gemini_front_0', blink: 'gemini_front_1', reach: 'gemini_front_0' },
  qwen: { idle: 'qwen_front_0', blink: 'qwen_front_1', reach: 'qwen_front_0' },
  kimi: { idle: 'kimi_front_0', blink: 'kimi_front_1', reach: 'kimi_front_0' },
  zai: { idle: 'zai_front_0', blink: 'zai_front_1', reach: 'zai_front_0' },
};
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = CRC_TABLE[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const t = Buffer.from(type), len = Buffer.alloc(4), crc = Buffer.alloc(4);
  len.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function encodePng(w, h, rgba) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const rows = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(rows, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}
fs.mkdirSync(ROOT, { recursive: true });
for (const [role, poses] of Object.entries(SOURCES)) for (const [pose, source] of Object.entries(poses)) {
  const sprite = getBakedSprite(source);
  if (!sprite) throw new Error(`Missing source sprite: ${source}`);
  const scale = 4, w = sprite.w * scale, h = sprite.h * scale, rgba = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const colorIndex = sprite.d[Math.floor(y / scale) * sprite.w + Math.floor(x / scale)];
    if (colorIndex === 255 || !CHAR_HEX[colorIndex]) continue;
    const color = CHAR_HEX[colorIndex], i = (y * w + x) * 4;
    rgba[i] = parseInt(color.slice(1, 3), 16); rgba[i + 1] = parseInt(color.slice(3, 5), 16);
    rgba[i + 2] = parseInt(color.slice(5, 7), 16); rgba[i + 3] = 255;
  }
  fs.writeFileSync(path.join(ROOT, `${role}-${pose}.png`), encodePng(w, h, rgba));
}
console.log(`Extracted project character frames into ${ROOT}`);
