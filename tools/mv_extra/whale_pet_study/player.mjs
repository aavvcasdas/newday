import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const require=createRequire(import.meta.url);
export const {createCanvas,loadImage,GlobalFonts}=require('../../engine/node_modules/@napi-rs/canvas');
GlobalFonts.registerFromPath(path.join(ROOT,'assets/fonts/NotoSansSC-Bold.ttf'),'StudyCJK') || GlobalFonts.registerFromPath(path.join(ROOT,'tools/mv_extra/cache/NotoSansSC-Bold.ttf'),'StudyCJK');
const dir=path.join(ROOT,'assets/ai-girls/whale-pet-study');
export const atlas=await loadImage(path.join(dir,'whale.png'));
export const meta=JSON.parse(fs.readFileSync(path.join(dir,'whale.json'),'utf8'));
if(atlas.width!==meta.columns*meta.cell_width || atlas.height!==meta.rows*meta.cell_height) throw new Error('Invalid atlas dimensions');

export function frameAt(state,t) {
  const spec=meta.states[state]; if(!spec) throw new Error(`Unknown state: ${state}`);
  const total=spec.durations_ms.reduce((a,b)=>a+b,0);
  let ms=((t*1000%total)+total)%total;
  for(let col=0;col<spec.frames;col++) {
    if(ms<spec.durations_ms[col]) return {row:spec.row,column:col};
    ms-=spec.durations_ms[col];
  }
  throw new Error('Invalid animation');
}
export function drawWhale(c,state,t,{x,y,h}) {
  const f=frameAt(state,t), w=h*meta.cell_width/meta.cell_height;
  c.drawImage(atlas,f.column*meta.cell_width,f.row*meta.cell_height,meta.cell_width,meta.cell_height,x-w/2,y-h,w,h);
  return f;
}
