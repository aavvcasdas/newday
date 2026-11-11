// Rebuild the webpage atlas from the repository's indexed sprite assets.
import fs from 'node:fs';
import {PNG} from 'pngjs';
import '../src/assets/walk_cycle_data.js';
import {getBakedSprite, CHAR_HEX} from '../src/assets/sprites_data.js';
const here = new URL('../src/assets/', import.meta.url);
const meta = JSON.parse(fs.readFileSync(new URL('cast_atlas.json', here)));
const hex = ['be4a2f','d77643','ead4aa','e4a672','b86f50','733e39','3e2731','a22633','e43b44','f77622','feae34','fee761','63c74d','3e8948','265c42','193c3e','124e89','0099db','2ce8f5','ffffff','c0cbdc','8b9bb4','5a6988','3a4466','262b44','181425','ff0044','68386c','b55088','f6757a','e8b796','c28569','e63946','9e1b28','ff758f','ffd166','d9822b','fff3b0','ffffff','16386e','2762b3','5fa8f5','eef1ff','b8c0e8','7b4bc4','432375','9d8df2','f3e5c0',...CHAR_HEX.map(x=>x.slice(1))];
const png = new PNG({width:meta.w,height:meta.h});
for (const [key,[x,y,w,h]] of Object.entries(meta.s)) {
  const s=getBakedSprite(key);
  if (!s || s.w!==w || s.h!==h) throw new Error(`图集数据缺失或尺寸不符: ${key}`);
  for(let j=0;j<h;j++) for(let i=0;i<w;i++) {
    const v=s.d[j*w+i], idx=((y+j)*meta.w+x+i)*4;
    if(v===255) continue;
    if (!hex[v]) throw new Error(`无效颜色索引 ${v}: ${key}`);
    const n=parseInt(hex[v],16); png.data[idx]=n>>16; png.data[idx+1]=(n>>8)&255; png.data[idx+2]=n&255; png.data[idx+3]=255;
  }
}
fs.writeFileSync(new URL('cast_atlas.png',here),PNG.sync.write(png));
console.log(`built atlas: ${Object.keys(meta.s).length} sprites`);
