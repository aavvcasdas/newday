// Day11 发布封面：只用项目里已有的角色原图和海底房间，不调用生图。
// node tools/day11制作/make_day11_cover.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createCanvas, loadImage, bg, reseedBoil } from '../day8制作/render_day8.mjs';
import { renderUnderwaterStage } from '../场景/sea_stage.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'Day11/封面');
fs.mkdirSync(OUT, { recursive: true });
const hash = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sources = [
  'tools/day3制作/whale_girl_src/whale_shock.png',
  'tools/day3制作/whale_girl_src/whale_fatfish_working.png',
];
const actors = await Promise.all(sources.map((file) => loadImage(path.join(ROOT, file))));
const reports = [];

function box(g, x, y, w, h, fill, r = 14) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fillStyle = fill;
  g.fill();
}
function text(g, s, x, y, size, color, { outline = true, align = 'center', record } = {}) {
  g.save();
  g.textAlign = align;
  g.textBaseline = 'alphabetic';
  g.font = `900 ${size}px NotoSansSC`;
  g.lineJoin = 'round';
  const m = g.measureText(s);
  const left = align === 'center' ? x - m.width / 2 : x;
  const bounds = {
    left: left - size * 0.06,
    top: y - m.actualBoundingBoxAscent - size * 0.06,
    right: left + m.width + size * 0.06,
    bottom: y + m.actualBoundingBoxDescent + size * 0.06,
  };
  if (record) {
    if (bounds.left < 24 || bounds.right > record.width - 24 || bounds.top < 20 || bounds.bottom > record.height - 14) {
      throw new Error(`文字出安全区：${s}`);
    }
    record.text.push({ text: s, size, bounds });
  }
  if (outline) {
    g.strokeStyle = '#071B2C';
    g.lineWidth = size * 0.12;
    g.strokeText(s, x, y);
  }
  g.fillStyle = color;
  g.fillText(s, x, y);
  g.restore();
}
function actor(g, image, x, bottom, height) {
  const width = height * image.width / image.height;
  g.drawImage(image, x - width / 2, bottom - height, width, height);
}
function page(g, x, y, scale) {
  box(g, x - 70 * scale, y - 48 * scale, 140 * scale, 96 * scale, '#EFE2C0', 8);
  g.save();
  g.strokeStyle = '#424653';
  g.lineWidth = 3;
  g.strokeRect(x - 70 * scale, y - 48 * scale, 140 * scale, 96 * scale);
  g.restore();
  text(g, '岗位', x, y - 6 * scale, 28 * scale, '#47546A', { outline: false });
  text(g, '先翻开', x, y + 28 * scale, 24 * scale, '#805F51', { outline: false });
}

for (const [ratio, w, h] of [['3比4', 1080, 1440], ['4比3', 1440, 1080]]) {
  const portrait = h > w;
  const c = createCanvas(w, h);
  const g = c.getContext('2d');
  const record = {
    ratio, width: w, height: h, text: [],
    art: 'Existing project PNG poses + shared underwater stage + code job page; no generative imagery',
  };
  const scale = Math.max(w / 1280, h / 720);
  const offset = portrait ? 0 : (w - 1280 * scale) / 2;
  g.save();
  g.translate(offset, 0);
  g.scale(scale, scale);
  reseedBoil(0);
  renderUnderwaterStage(g, 0.4, { z: 1, cx: 640, cy: 360 }, {
    mood: 'work_cool',
    drawRoom: () => bg(g, 0.4, { animatePlants: true }),
  });
  g.restore();
  const shade = g.createLinearGradient(0, 0, 0, h);
  shade.addColorStop(0, '#071B2CF0');
  shade.addColorStop(0.34, '#0C2B3CDB');
  shade.addColorStop(0.66, '#123B4C70');
  shade.addColorStop(1, '#061B2CEB');
  g.fillStyle = shade;
  g.fillRect(0, 0, w, h);
  box(g, 0, portrait ? 1260 : 950, w, portrait ? 88 : 69, '#274449', 0);
  if (portrait) {
    text(g, '笨鱼鲸落过', w / 2, 168, 108, '#F4F2E8', { record });
    text(g, '它来帮老大', w / 2, 300, 108, '#FFD988', { record });
    text(g, '岗位先一条条扒', w / 2, 392, 42, '#D8F0EA', { record });
    actor(g, actors[0], 300, 1248, 640);
    actor(g, actors[1], 790, 1248, 560);
    page(g, 540, 980, 1.15);
    text(g, '非官方同人 · AI生成 · 剧情演绎', w / 2, 1392, 27, '#C1D5D4', { outline: false, record });
  } else {
    text(g, '笨鱼鲸落过', 390, 168, 92, '#F4F2E8', { record });
    text(g, '它来帮老大', 390, 292, 92, '#FFD988', { record });
    actor(g, actors[0], 330, 940, 560);
    actor(g, actors[1], 1088, 940, 620);
    page(g, 720, 760, 1.2);
    text(g, '岗位先一条条扒', w / 2, 1008, 40, '#E2F1E7', { record });
    text(g, '非官方同人 · AI生成 · 剧情演绎', w / 2, 1056, 24, '#C1D5D4', { outline: false, record });
  }
  const filename = `Day11封面_${ratio}.png`;
  const file = path.join(OUT, filename);
  fs.writeFileSync(file, c.toBuffer('image/png'));
  const decoded = await loadImage(file);
  if (decoded.width !== w || decoded.height !== h) throw new Error('PNG 尺寸不对');
  reports.push({ ...record, file: `Day11/封面/${filename}`, sha256: hash(file), decoded: true });
  console.log(file);
}
fs.writeFileSync(path.join(ROOT, 'tools/day11制作/封面_验收.json'), JSON.stringify({
  passed: true,
  source_assets: sources.map((file) => ({ file, sha256: hash(path.join(ROOT, file)) })),
  covers: reports,
  limits: '文字边界和 PNG 解码是自动检查，不是平台过审。',
}, null, 2) + '\n');
