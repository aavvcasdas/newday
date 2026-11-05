import fs from 'node:fs';import { createCanvas, loadImage } from '../engine/node_modules/@napi-rs/canvas/index.js';
import {W,H,drawBaseUnderwaterRoom} from '../engine/room_base.mjs';
const out='Day12/封面';fs.mkdirSync(out,{recursive:true});
const images=await Promise.all(['whale_shock.png','whale_confident_hips.png'].map(n=>loadImage(`tools/day3制作/whale_girl_src/${n}`)));
const checks=[];
function text(g,t,x,y,size,color='#F8EFD3',align='left') {g.font=`900 ${size}px NotoSansSC`;g.textAlign=align;g.textBaseline='middle';g.lineJoin='round';g.lineWidth=10;g.strokeStyle='#12213D';g.strokeText(t,x,y);g.fillStyle=color;g.fillText(t,x,y);const w=g.measureText(t).width;const left=align==='center'?x-w/2:x;if(left<20||left+w>g.canvas.width-20)throw Error('cover title overflow');checks.push({text:t,width:w,x,y,size});}
function actor(g,i,x,bottom,height){const im=images[i];g.drawImage(im,x-im.width*height/im.height/2,bottom-height,im.width*height/im.height,height);}
function label(g,x,y,w,title){g.fillStyle='#E7DBBB';g.strokeStyle='#778294';g.lineWidth=3;g.beginPath();g.roundRect(x-w/2,y-44,w,88,12);g.fill();g.stroke();text(g,title,x,y,32,'#E7DBBB','center');}
for(const [name,width,height]of[['Day12_封面_3比4.png',1080,1440],['Day12_封面_横版.png',1440,1080]]){
 const canvas=createCanvas(width,height),g=canvas.getContext('2d');g.save();g.scale(width/W,height/H);drawBaseUnderwaterRoom(g,0);g.restore();
 const shade=g.createLinearGradient(0,0,0,height);shade.addColorStop(0,'rgba(13,25,52,.96)');shade.addColorStop(.44,'rgba(13,25,52,.25)');shade.addColorStop(1,'rgba(13,25,52,.85)');g.fillStyle=shade;g.fillRect(0,0,width,height);
 if(width===1080){text(g,'鲸鱼摇人 · 笨鱼回归',540,105,42,'#81D4DA','center');text(g,'招同事？',540,250,128,'#FFF0B3','center');text(g,'还是护食？',540,410,120,'#FFF0B3','center');actor(g,0,280,1220,690);actor(g,1,810,1220,690);label(g,540,1020,290,'豆包 · 帮手');text(g,'虽然不太聪明，但不吃米饭',540,1310,50,'#EDF1EE','center');text(g,'非官方同人 · AI生成 · 剧情演绎',540,1390,25,'#B2C6CC','center');}
 else{text(g,'鲸鱼摇人 · 笨鱼回归',80,75,35,'#81D4DA');text(g,'招同事？',720,185,114,'#FFF0B3','center');text(g,'还是护食？',720,320,110,'#FFF0B3','center');actor(g,0,360,965,590);actor(g,1,1080,965,590);label(g,720,800,300,'豆包 · 帮手');text(g,'虽然不太聪明，但不吃米饭',720,1000,44,'#EDF1EE','center');text(g,'非官方同人 · AI生成 · 剧情演绎',1200,60,22,'#B2C6CC','center');}
 fs.writeFileSync(`${out}/${name}`,canvas.toBuffer('image/png'));
}
fs.writeFileSync('tools/day12制作/cover_check.json',JSON.stringify({passed:true,method:'original verified character PNGs; text extent assertions; no generated character replacement',checks},null,2)+'\n');
