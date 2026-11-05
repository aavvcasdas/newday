// Day8 covers: deterministic code layout using the same portrait and phone capture as the film.
// Run: node tools/day8制作/make_day8_cover.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let canvas;
try {canvas=require('@napi-rs/canvas');} catch {canvas=require('/tmp/node_render/node_modules/@napi-rs/canvas');}
const {createCanvas,loadImage,GlobalFonts}=canvas;
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
for(const [file,name] of [['NotoSansSC-Bold.ttf','NotoSansSC'],['ZCOOLKuaiLe-Regular.ttf','ZCOOLKuaiLe']]){
 GlobalFonts.registerFromPath(path.join(root,'video-fx/assets/fonts',file),name);
}
const actor=await loadImage(path.join(root,'tools/day3制作/whale_girl_src/whale_peek_curious.png'));
const screen=await loadImage(path.join(root,'Day8/素材/GIF/写码_合成.gif'));
const out=path.join(root,'Day8/封面');fs.mkdirSync(out,{recursive:true});
function box(g,x,y,w,h,r,fill,stroke=null){g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=3;g.stroke();}}
function text(g,txt,x,y,size,fill,outline=false){g.save();g.textAlign='center';g.textBaseline='alphabetic';g.font=`900 ${size}px NotoSansSC`;g.lineJoin='round';if(outline){g.lineWidth=size*.12;g.strokeStyle='#071629';g.strokeText(txt,x,y);}g.fillStyle=fill;g.fillText(txt,x,y);g.restore();}
function phone(g,x,y,h){
 const w=h*9/16;
 g.save();g.shadowColor='#020815AA';g.shadowBlur=24;g.shadowOffsetY=14;box(g,x-12,y-16,w+24,h+32,30,'#071522','#A2BDC8');g.restore();
 g.save();g.beginPath();g.roundRect(x,y,w,h,20);g.clip();
 g.drawImage(screen,x,y,w,h);
 // Same masking boundaries as the film; original capture remains untouched.
 const top=h*.135417,bottom=y+h*.75;
 box(g,x,y,w,top,0,'#12374D');
 text(g,'笨鱼的直播间',x+w/2,y+top*.72,Math.round(w*.067),'#D7F2EF');
 box(g,x,bottom,w,y+h-bottom,0,'#12374D');
 box(g,x+w*.13,bottom+28,w*.74,50,12,'#245561','#79B6BD');
 text(g,'已经在敲了',x+w/2,bottom+63,Math.round(w*.075),'#EFF9EF');
 g.restore();box(g,x+w*.35,y+8,w*.3,12,8,'#06111C');
}
for(const [name,w,h] of [['3比4',1080,1440],['4比3',1440,1080]]){
 const c=createCanvas(w,h),g=c.getContext('2d'),portrait=h>w;
 const grad=g.createLinearGradient(0,0,w,h);grad.addColorStop(0,'#08182C');grad.addColorStop(.6,'#17364A');grad.addColorStop(1,'#204A58');g.fillStyle=grad;g.fillRect(0,0,w,h);
 // A quiet room-like frame, not decorative badges or performance metrics.
 g.save();g.globalAlpha=.24;g.strokeStyle='#71A3AE';g.lineWidth=2;g.beginPath();g.moveTo(w*.06,h*.40);g.lineTo(w*.06,h*.88);g.lineTo(w*.94,h*.88);g.stroke();g.restore();
 box(g,w*.06,h*.86,w*.88,h*.035,7,'#7B6652');
 const ph=portrait?775:560,px=portrait?615:975,py=portrait?510:370;
 phone(g,px,py,ph);
 const ah=portrait?735:615,aw=ah*actor.width/actor.height;
 const ax=portrait?325:450,ay=portrait?1310:990;
 g.save();g.shadowColor='#030B19AA';g.shadowBlur=18;g.shadowOffsetY=10;g.drawImage(actor,ax-aw/2,ay-ah,aw,ah);g.restore();
 // Top two-line hook = the opening line of the actual film.
 text(g,'这岗到底',w/2,portrait?175:135,portrait?110:98,'#F7F5E8',true);
 text(g,'怎么查呀？',w/2,portrait?325:275,portrait?136:126,'#FFDC89',true);
 box(g,w*.18,portrait?375:310,w*.64,portrait?67:56,16,'#123B4C','#6BA5B1');
 text(g,'你们到底帮谁呀？',w/2,portrait?422:350,portrait?42:35,'#DFF5EE');
 // One small contextual line, no numbers or extra call to action.
 text(g,'喊它摸鱼，还帮它装忙',w/2,h*.96,portrait?39:37,'#F7EBCF',true);
 const f=path.join(out,`Day8封面_${name}.png`);fs.writeFileSync(f,c.toBuffer('image/png'));console.log(f);
}
