// Code-only Day10 publishing covers. No image generation; reuse the film's project assets.
// Run from the repository: node tools/day10制作/make_day10_cover.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createCanvas,loadImage,bg,reseedBoil} from '../day8制作/render_day8.mjs';
import {renderUnderwaterStage} from '../场景/sea_stage.mjs';
import {DAY10_PROPS} from '../互动元素/day10_cue_props.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const OUT=path.join(ROOT,'Day10/封面');
fs.mkdirSync(OUT,{recursive:true});
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sources=['tools/day3制作/whale_girl_src/whale_shock.png','tools/day3制作/whale_girl_src/whale_eat.png'];
const actors=await Promise.all(sources.map(file=>loadImage(path.join(ROOT,file))));
const reports=[];
function box(g,x,y,w,h,fill,r=14){g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=fill;g.fill();}
function text(g,s,x,y,size,color,{outline=true,align='center',track=true,record}={}){
  g.save();g.textAlign=align;g.textBaseline='alphabetic';g.font=`900 ${size}px NotoSansSC`;g.lineJoin='round';
  const m=g.measureText(s),left=align==='center'?x-m.width/2:x;
  const bounds={left:left-size*.06,top:y-m.actualBoundingBoxAscent-size*.06,right:left+m.width+size*.06,bottom:y+m.actualBoundingBoxDescent+size*.06};
  if(record&&track){
    if(bounds.left<24||bounds.right>record.width-24||bounds.top<20||bounds.bottom>record.height-14)throw Error(`Text outside safe area: ${s}`);
    record.text.push({text:s,size,bounds});
  }
  if(outline){g.strokeStyle='#071B2C';g.lineWidth=size*.12;g.strokeText(s,x,y);}
  g.fillStyle=color;g.fillText(s,x,y);g.restore();
}
function actor(g,image,x,bottom,height){
  const width=height*image.width/image.height;
  // Original PNG alpha, with no face paint-over, added jewellery, or artificial halo.
  g.drawImage(image,x-width/2,bottom-height,width,height);
}
function jar(g,x,tableY,scale){
  // Jar's physical base is y=42 in the shared prop; align it exactly to the tabletop.
  box(g,x-scale*57,tableY,scale*114,scale*6,'#937958',7);
  box(g,x-scale*48,tableY+scale*6,scale*8,scale*20,'#685844',3);
  box(g,x+scale*40,tableY+scale*6,scale*8,scale*20,'#685844',3);
  g.save();g.translate(x,tableY-42*scale);g.scale(scale,scale);DAY10_PROPS.rice_jar_guard.draw(g,0);g.restore();
}
function role(g,s,x,y,record){
  box(g,x-69,y-31,138,46,'#153C4B',12);
  text(g,s,x,y+1,30,'#E1F2EB',{outline:false,record});
}
for(const [ratio,w,h] of [['3比4',1080,1440],['4比3',1440,1080]]){
  const portrait=h>w,c=createCanvas(w,h),g=c.getContext('2d');
  const record={ratio,width:w,height:h,text:[],art:'Existing project PNG poses + shared underwater v2 stage + Day10 rice jar prop; no generative imagery'};
  // Preserve the room geometry rather than stretch the background to the cover ratio.
  const scale=Math.max(w/1280,h/720),offset=portrait?0:(w-1280*scale)/2;
  g.save();g.translate(offset,0);g.scale(scale,scale);reseedBoil(0);
  renderUnderwaterStage(g,0,{z:1,cx:640,cy:360},{mood:'work_cool',drawRoom:()=>bg(g,0,{animatePlants:true})});g.restore();
  const shade=g.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#071B2CF0');shade.addColorStop(.34,'#0C2B3CDB');shade.addColorStop(.66,'#123B4C70');shade.addColorStop(1,'#061B2CEB');
  g.fillStyle=shade;g.fillRect(0,0,w,h);
  // Subtle physical floor plane, not an on-screen data card or HUD.
  box(g,0,portrait?1260:950,w,portrait?88:69,'#274449',0);
  if(portrait){
    text(g,'本鲸快被',w/2,175,138,'#F4F2E8',{record});
    text(g,'架空啦？',w/2,353,167,'#FFD988',{record});
    text(g,'同款鱼脑，怎么它更会护碗？',w/2,444,43,'#D8F0EA',{record});
    role(g,'本鲸',315,536,record);role(g,'笨鱼',815,607,record);
    actor(g,actors[0],326,1263,705);actor(g,actors[1],792,1263,635);
    jar(g,807,1264,2.75);
    text(g,'非官方同人 · AI生成 · 剧情演绎',w/2,1392,27,'#C1D5D4',{outline:false,record});
  }else{
    text(g,'本鲸快被',389,153,107,'#F4F2E8',{record});
    text(g,'架空啦？',389,301,137,'#FFD988',{record});
    actor(g,actors[0],355,956,615);actor(g,actors[1],1094,956,773);
    role(g,'本鲸',350,963,record);role(g,'笨鱼',1050,177,record);
    jar(g,1114,949,2.5);
    text(g,'同款鱼脑，怎么它更会护碗？',w/2,1011,42,'#E2F1E7',{record});
    text(g,'非官方同人 · AI生成 · 剧情演绎',w/2,1058,24,'#C1D5D4',{outline:false,record});
  }
  const filename=`Day10封面_${ratio}.png`,file=path.join(OUT,filename);fs.writeFileSync(file,c.toBuffer('image/png'));
  const decoded=await loadImage(file);if(decoded.width!==w||decoded.height!==h)throw Error('PNG dimensions mismatch');
  reports.push({...record,file:`Day10/封面/${filename}`,sha256:hash(file),decoded:true});console.log(file);
}
fs.writeFileSync(path.join(ROOT,'tools/day10制作/封面_验收.json'),JSON.stringify({passed:true,source_assets:sources.map(file=>({file,sha256:hash(path.join(ROOT,file))})),covers:reports,limits:'Text bounds and image decoding are automated checks, not OCR or platform publishing approval.'},null,2)+'\n');
