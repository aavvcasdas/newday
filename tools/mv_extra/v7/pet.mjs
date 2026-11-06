// Fixed-cell sprite playback for the two original v7 pet illustrations.
// Pose frames keep a shared registration; playback never re-crops them.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { loadImage } = require('../../engine/node_modules/@napi-rs/canvas');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const dir = path.join(ROOT, 'assets/ai-girls/pet-v7');
export const PETS = {};
for (const name of ['dragon', 'whale']) {
  const metadata = JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), 'utf8'));
  const image = await loadImage(path.join(dir, `${name}.png`));
  if (image.width !== metadata.columns * metadata.cell_width || image.height !== metadata.rows * metadata.cell_height) throw new Error(`Bad ${name} sprite dimensions`);
  PETS[name] = { metadata, image };
}

export function petFrame(name, state, seconds) {
  const pet = PETS[name], animation = pet?.metadata.states[state];
  if (!animation) throw new Error(`Unknown pet state: ${name}/${state}`);
  const total = animation.durations_ms.reduce((a,b) => a+b, 0);
  let elapsed = ((seconds * 1000 % total) + total) % total;
  for (let column = 0; column < animation.frames; column++) {
    if (elapsed < animation.durations_ms[column]) return { row: animation.row, column };
    elapsed -= animation.durations_ms[column];
  }
  throw new Error('Invalid animation durations');
}

export function drawPet(c, name, state, t, {x, y, h, flipX=false, alpha=1, noShadow=false}) {
  const {image, metadata: m} = PETS[name];
  const f = petFrame(name, state, t);
  if (!noShadow) {
    c.save(); c.fillStyle='rgba(18,28,40,0.20)'; c.beginPath();
    c.ellipse(x, y+2, h*0.23, h*0.035, 0, 0, Math.PI*2); c.fill(); c.restore();
  }
  const width = h * m.cell_width / m.cell_height;
  c.save(); c.globalAlpha *= alpha; c.translate(x,y); if (flipX) c.scale(-1,1);
  c.drawImage(image, f.column*m.cell_width, f.row*m.cell_height, m.cell_width, m.cell_height, -width/2, -h, width, h);
  c.restore();
  return f;
}
