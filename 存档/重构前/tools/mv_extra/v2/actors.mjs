// Existing pixel runs / existing image RGB only. No face repaint or facial animation.
import fs from 'node:fs';import path from 'node:path';import{fileURLToPath}from'node:url';import{createRequire}from'node:module';
const require=createRequire(import.meta.url);export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
export const {createCanvas,loadImage,GlobalFonts}=require('../../engine/node_modules/@napi-rs/canvas');
if(!GlobalFonts.registerFromPath(path.join(ROOT,'tools/mv_extra/cache/font.ttf'),'MvCJK'))throw Error('先运行tools/mv_extra/setup.py');
globalThis.window=globalThis;require('../../../video-fx/src/whale_girl_rig_data.js');const R=globalThis.WHALE_GIRL_PIXEL_RIG;const W=require('../../../video-fx/src/whale_girl.js');
const HEADS={};for(const view of ['front','q','side','qback','back']){const cv=createCanvas(960,960),g=cv.getContext('2d');g.setTransform(4,0,0,4,0,0);g.save();g.beginPath();g.rect(0,0,240,174);g.clip();W.whaleGirl(g,120,220,10,{t:.7,style:'pixel',view,poseMode:'wave',eyes:'open',mouth:'smile',squint:.01,tailScale:1,transitionBlend:1,walk:0,dy:0,emotion:'idle',noShadow:true});g.restore();HEADS[view]=cv;}

export const images={};for(const n of ['gemini','qwen','gpt','kimi'])images[n]=await loadImage(path.join(ROOT,`assets/ai-girls/extra-guests/cutouts/${n}.png`));images.claude=await loadImage(path.join(ROOT,'assets/ai-girls/extra-guests/claude.png'));images.doubao=await loadImage(path.join(ROOT,'assets/ai-girls/doubao/doubao-cutout.png'));
export const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x)},mix=(a,b,k)=>a+(b-a)*k;
export function rect(c,x,y,w,h,col,r=0){c.fillStyle=col;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
export function line(c,pts,col,w=2){c.strokeStyle=col;c.lineWidth=w;c.lineJoin='round';c.lineCap='round';c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
export function ellipse(c,x,y,rx,ry,col){c.fillStyle=col;c.beginPath();c.ellipse(x,y,Math.max(.001,rx),Math.max(.001,ry),0,0,Math.PI*2);c.fill();}
export function label(c,t,x,y,size=25,col='#e7d8b7'){c.font=`600 ${size}px MvCJK`;c.textAlign='center';c.textBaseline='middle';c.fillStyle=col;c.fillText(t,x,y);}
export function shadow(c,x,y,w=65,a=.3){ellipse(c,x,y+4,w,w*.14,`rgba(8,19,33,${a})`);}
function bone(c,runs){for(const[y,x,x2,k]of runs){c.fillStyle=R.palette[k];c.fillRect(x-.5,y-.5,x2-x+1.04,1.04);}}
function pivot(c,x,y,a,draw){c.save();c.translate(x,y);c.rotate(a);c.translate(-x,-y);draw();c.restore();}
export function motion(t,{start=0,end=1,x0=0,x1=0,steps=4}={}){const k=clamp((t-start)/(end-start)),q=ease(k);return{x:mix(x0,x1,q),phase:q*Math.PI*2*steps,stride:Math.sin(Math.PI*k),moving:t>start&&t<end};}
export function whale(c,{x=500,y=610,u=34,pose='wave',view='front',phase=0,stride=0,kneel=0,lean=0,jump=0,arm=0,headTilt=0,held=false}={}){
 shadow(c,x,y,2.1*u,.29*(1-jump/350));c.save();c.translate(x,y+kneel*u*.55-jump);c.rotate(lean);c.scale(u/10,u/10);
 const p=R.poses[pose]||R.poses.wave,v=view!=='front'?R.views[view]:null;const b=v||p;const torso=b.torso;
 pivot(c,-10,-18,Math.sin(phase)*.045*stride,()=>bone(c,b.tail));
 bone(c,b.backHair);
 for(const [id,px,sign]of [['legR',11,-1],['legL',-7,1]]){const a=Math.sin(phase)*stride*.42*sign+kneel*.36*sign;c.save();c.translate(0,-Math.max(0,Math.cos(phase)*sign)*stride*2.1);pivot(c,px,-20,a,()=>bone(c,b[id]||[]));c.restore();}
 bone(c,torso);if(held&&pose==='heart'&&!v){puzzle(c,.3,-37,10.5,'#d8b56f');bone(c,torso.filter(r=>r[0]>=-40&&r[0]<=-34&&[10,16,30].includes(r[3])));}
 if(b.armR?.length)pivot(c,15.5,-45.5,arm,()=>bone(c,b.armR));
 // Whole original wave head substitutes heart/wink closed-eye heads. No masks over either eye.
 const hy=pose==='laptop'?8:0;c.save();c.translate(0,hy);pivot(c,0,-47,headTilt,()=>c.drawImage(HEADS[view]||HEADS.front,-120,-220,240,240));c.restore();c.restore();
 return{x,y,pose,view,phase,stride,kneel,lean,jump,arm,headTilt};
}
const SOLES=new Map();
export function guest(c,name,{x=850,y=610,h=340,lean=0,opacity=1}={}){const im=images[name];if(!SOLES.has(name)){const tmp=createCanvas(im.width,im.height),g=tmp.getContext('2d');g.drawImage(im,0,0);const a=g.getImageData(0,0,im.width,im.height).data;let bottom=im.height-1;scan:for(;bottom>=0;bottom--)for(let xx=0;xx<im.width;xx++)if(a[(bottom*im.width+xx)*4+3]>127)break scan;SOLES.set(name,bottom);}const bottom=SOLES.get(name),offset=(im.height-1-bottom)*h/im.height;shadow(c,x,y,h*.13,.26);c.save();c.globalAlpha=opacity;c.translate(x,y);c.rotate(lean);c.imageSmoothingEnabled=true;c.drawImage(im,-h*im.width/im.height/2,-h+offset,h*im.width/im.height,h);c.restore();return{x,y,h,sourceLastOpaqueRow:bottom,imageVerticalOffset:offset,visibleFootEdgeY:y};}
export function puzzle(c,x,y,size=45,color='#d5b77f',angle=0){c.save();c.translate(x,y);c.rotate(angle);c.fillStyle=color;c.strokeStyle='#ead7b4';c.lineWidth=1.4;c.beginPath();c.moveTo(-size/2,-size/2);c.lineTo(-size*.12,-size/2);c.bezierCurveTo(-size*.24,-size*.8,size*.24,-size*.8,size*.12,-size/2);c.lineTo(size/2,-size/2);c.lineTo(size/2,-size*.12);c.bezierCurveTo(size*.78,-size*.24,size*.78,size*.24,size/2,size*.12);c.lineTo(size/2,size/2);c.lineTo(-size/2,size/2);c.closePath();c.fill();c.stroke();c.restore();}
export function renderPoseStudy(){const s=createCanvas(1500,520),c=s.getContext('2d');rect(c,0,0,1500,520,'#284654');for(const[i,pose]of ['wave','heart','laptop','panic','wave'].entries()){whale(c,{x:150+i*300,y:455,u:36,pose,kneel:i===4?.8:0,stride:i===0?.75:0,phase:1});label(c,pose,150+i*300,490,24);}return s;}
