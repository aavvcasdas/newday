// 《童话镇》Paper Pop-up Book MV — deterministic 3D renderer with an affine 2D fallback.
import * as THREE from 'three';
import { makeBook, coverCanvases } from './book.js';
import { actorSprite, preloadProjectCharacters } from './art.js';
import { buildWorld } from './world.js';
import { CUES, DUR, FPS } from './timeline.js';
import { makePost } from './post.js';
import { clamp, eio, seg, lerp, TAU } from './lib.js';

const W=1920,H=1080;
const params=new URLSearchParams(location.search);
const renderMode=params.get('render')==='1';
const forceCanvas=params.get('canvas')==='1';
if(renderMode){document.getElementById('controls').style.display='none';document.getElementById('song').removeAttribute('src');}
const stageEl=document.getElementById('stage'),overlay=document.getElementById('ov'),ox=overlay.getContext('2d');
let renderer=null,post=null,canvasRenderer=null,gpuAvailable=false;
if(!forceCanvas){
  try{
    renderer=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(1);renderer.setSize(W,H,false);renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1.05;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute('aria-label','童话镇纸艺立体书动画画面');stageEl.appendChild(renderer.domElement);gpuAvailable=true;
  }catch(e){console.warn(`WebGL unavailable; using affine paper renderer: ${e.message}`);}
}
if(!gpuAvailable){
  canvasRenderer=document.createElement('canvas');canvasRenderer.width=W;canvasRenderer.height=H;canvasRenderer.setAttribute('aria-label','童话镇纸艺立体书画面');
  stageEl.appendChild(canvasRenderer);canvasRenderer=canvasRenderer.getContext('2d');
}
const scene=new THREE.Scene();scene.background=new THREE.Color('#d6cbbb');
const camera=new THREE.PerspectiveCamera(31,W/H,.004,12);

// The fallback still uses the same 3D book, timeline, cut-out artwork and world positions.
// It maps the pop-up planes onto a perspective page with Canvas2D when WebGL is blocked.
if(gpuAvailable){try{post=makePost(renderer,scene,camera,W,H);post.dof.aper=1.35;post.dof.maxCoc=6;post.bloom.strength=.12;post.vig.uniforms.amt.value=.20;}catch(e){console.warn(`Post-processing disabled: ${e.message}`);post=null;}}

// A warm matte tabletop grounds the book; all story art is original to this MV.
const tableMat=new THREE.MeshStandardMaterial({color:'#9f795e',roughness:.96});
const table=new THREE.Mesh(new THREE.BoxGeometry(1.55,.022,1.25),tableMat);table.position.set(0,-.014,.15);table.receiveShadow=true;scene.add(table);
const under=new THREE.Mesh(new THREE.PlaneGeometry(18,18),new THREE.MeshStandardMaterial({color:'#343946',roughness:1}));
under.rotation.x=-Math.PI/2;under.position.y=-.028;under.receiveShadow=true;scene.add(under);
const hemi=new THREE.HemisphereLight('#e6f1f1','#8f715d',1.05);scene.add(hemi);
const key=new THREE.DirectionalLight('#fff0d8',2.15);key.position.set(-.42,.72,.68);key.castShadow=true;
key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-.4,right:.4,top:.5,bottom:-.25,near:.1,far:2});
key.shadow.bias=-.00008;key.shadow.normalBias=.0004;scene.add(key);
const fill=new THREE.DirectionalLight('#d2e7f1',.55);fill.position.set(.5,.45,-.15);scene.add(fill);
const glow=new THREE.PointLight('#ffe0a3',.18,.7,2);glow.position.set(-.2,.35,.24);scene.add(glow);

await Promise.all([
  document.fonts.load('500 48px Fredoka','River stories'),
  document.fonts.load('italic 48px "IM Fell English"','paper stories'),
  document.fonts.load('48px "ZCOOL KuaiLe"','童话镇'),
]);
await preloadProjectCharacters();
const cover=coverCanvases((ctx,px,py,w,h)=>{
  const whale=actorSprite('whale','idle',0,'happy');ctx.drawImage(whale,px,py,w,h);
});
const book=makeBook(cover);scene.add(book.root);
const world=buildWorld(book);

function resize(){
  const s=Math.min(innerWidth/W,innerHeight/H),left=(innerWidth-W*s)/2,top=(innerHeight-H*s)/2;
  stageEl.style.transform=`translate(${left}px,${top}px) scale(${s})`;
  overlay.style.transform=`translate(${left}px,${top}px) scale(${s})`;
  const ui=document.getElementById('controls');if(ui)ui.style.transform=`translate(${left}px,${top}px) scale(${s})`;
}
addEventListener('resize',resize);resize();

function cameraFor(t,state){
  const cue=state.cue,u=cue?seg(t,cue.t0,cue.t1):0;
  const label=cue?.camera||state.section.camera||'';
  let p=new THREE.Vector3(0,.42,.96),target=new THREE.Vector3(0,.13,.14),fov=31;
  if(/top|high-crane|crane-to/.test(label)){p.set(.01,.82,.54);target.set(0,.04,.145);fov=37;}
  if(/waterline|underwater/.test(label)){p.set(0,.34,1.03);target.set(0,.12,.17);fov=30;}
  if(/tilt-up|rise-with/.test(label)){p.set(0,.36,.88);target.set(0,.20,.11);fov=29;}
  if(/push|close|nose|face|chest|bedside/.test(label)){p.set(0,.39,.79);target.set(0,.15,.17);fov=27;}
  if(/orbit/.test(label)){p.x=.045*Math.sin(u*TAU);p.z=.91;target.x=.015*Math.sin(u*TAU+.5);}
  if(/side-track|lateral-run|opposed-track|boat-dolly|bow-chase/.test(label)){p.x=.035*Math.sin(u*Math.PI*2);target.x=.018*(u-.5);}
  if(/continuous-page|pullback-to-page/.test(label)){p.z=lerp(.78,1.02,u);p.y=lerp(.37,.47,u);fov=lerp(27,34,u);}
  return {p,target,fov,u};
}
function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function affine(src,dst){
  const [p0,p1,p2]=src,[q0,q1,q2]=dst;
  const den=p0.x*(p1.y-p2.y)+p1.x*(p2.y-p0.y)+p2.x*(p0.y-p1.y);
  if(Math.abs(den)<1e-9)return [1,0,0,1,0,0];
  const a=(q0.x*(p1.y-p2.y)+q1.x*(p2.y-p0.y)+q2.x*(p0.y-p1.y))/den;
  const c=(q0.x*(p2.x-p1.x)+q1.x*(p0.x-p2.x)+q2.x*(p1.x-p0.x))/den;
  const e=(q0.x*(p1.x*p2.y-p2.x*p1.y)+q1.x*(p2.x*p0.y-p0.x*p2.y)+q2.x*(p0.x*p1.y-p1.x*p0.y))/den;
  const b=(q0.y*(p1.y-p2.y)+q1.y*(p2.y-p0.y)+q2.y*(p0.y-p1.y))/den;
  const d=(q0.y*(p2.x-p1.x)+q1.y*(p0.x-p2.x)+q2.y*(p1.x-p0.x))/den;
  const f=(q0.y*(p1.x*p2.y-p2.x*p1.y)+q1.y*(p2.x*p0.y-p0.x*p2.y)+q2.y*(p0.x*p1.y-p1.x*p0.y))/den;
  return [a,b,c,d,e,f];
}
function drawTriangle(ctx,img,src,dst){
  const [a,b,c,d,e,f]=affine(src,dst);ctx.save();ctx.beginPath();ctx.moveTo(dst[0].x,dst[0].y);ctx.lineTo(dst[1].x,dst[1].y);ctx.lineTo(dst[2].x,dst[2].y);ctx.closePath();ctx.clip();ctx.transform(a,b,c,d,e,f);ctx.drawImage(img,0,0);ctx.restore();
}
function drawQuad(ctx,img,quad){
  if(!img?.width)return;const w=img.width,h=img.height,p=[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}];
  drawTriangle(ctx,img,[p[0],p[1],p[3]],[quad[0],quad[1],quad[3]]);
  drawTriangle(ctx,img,[p[1],p[2],p[3]],[quad[1],quad[2],quad[3]]);
}
let storyCamX=0,storyCamY=0,storyZoom=1;
const stagePoint=(x,y,z)=>({x:960+(x*2690)*storyZoom+storyCamX,y:535+(z*995-y*2250)*storyZoom+storyCamY});
function drawPaperCanvas(t,state,open){
  const ctx=canvasRenderer;ctx.clearRect(0,0,W,H);
  const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#77717b');bg.addColorStop(.38,'#d0bc9f');bg.addColorStop(1,'#453e43');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  // Full-bleed story world: no tabletop, miniature book frame, or gray margins.
  const active=state.cue?world.scenes[CUES.indexOf(state.cue)]:null;
  const theme=state.cue?.theme||'castle-river';
  const sky=book.backMat.map?.image;
  if(sky)ctx.drawImage(sky,0,0,W,H);
  else {ctx.fillStyle='#9fc5d2';ctx.fillRect(0,0,W,H);}
  // Match the reference's panoramic fairytale blocking: low horizon, readable banks,
  // compact horizontal river, and several landmarks; avoid an empty screen-sized water plane.
  const night=/night|cosmic|galaxy|deep-river|rose/.test(theme);
  const land=ctx.createLinearGradient(0,H*.54,0,H);land.addColorStop(0,night?'#65766b':'#8eae74');land.addColorStop(1,night?'#425b57':'#668b67');
  ctx.fillStyle=land;ctx.fillRect(0,H*.54,W,H*.46);
  // Scenic rolling banks and a varied storybook skyline, not a repeated icon strip.
  for(let layer=0;layer<3;layer++){
    ctx.beginPath();ctx.moveTo(0,H*(.59+layer*.025));
    for(let x=0;x<=W+80;x+=80)ctx.quadraticCurveTo(x+30,H*(.50+layer*.035)+((x/80+layer)%2)*34,x+80,H*(.59+layer*.025));
    ctx.lineTo(W,H*.68);ctx.lineTo(0,H*.68);ctx.closePath();ctx.fillStyle=['#9cba83','#7fa273','#71936e'][layer];ctx.globalAlpha=.78;ctx.fill();
  }ctx.globalAlpha=1;
  // Distant clustered trees with rounded crowns and varied heights.
  for(let i=0;i<16;i++){
    const x=i*142-28,base=H*(.615+(i%3)*.012),r=31+(i*17%23);
    ctx.fillStyle='#725d4b';ctx.fillRect(x-5,base-8,10,28);
    for(let j=0;j<3;j++){ctx.beginPath();ctx.arc(x+(j-1)*r*.48,base-r*.68+(j===1?-r*.23:0),r*.56,0,TAU);ctx.fillStyle=['#4f765b','#60865f','#719469'][(i+j)%3];ctx.fill();ctx.strokeStyle='rgba(48,74,57,.5)';ctx.lineWidth=3;ctx.stroke();}
  }
  // Landmark castle at left, plus a handful of asymmetrical cottages.
  const castleX=245,castleBase=H*.59;ctx.fillStyle='#d4c6a4';ctx.strokeStyle='#62575b';ctx.lineWidth=6;
  ctx.fillRect(castleX-67,castleBase-138,134,138);ctx.strokeRect(castleX-67,castleBase-138,134,138);
  for(const dx of [-76,0,76]){const hh=dx===0?196:156,x=castleX+dx;ctx.fillRect(x-28,castleBase-hh,56,hh);ctx.strokeRect(x-28,castleBase-hh,56,hh);ctx.beginPath();ctx.moveTo(x-38,castleBase-hh);ctx.lineTo(x,castleBase-hh-42);ctx.lineTo(x+38,castleBase-hh);ctx.closePath();ctx.fillStyle='#916b78';ctx.fill();ctx.stroke();ctx.fillStyle='#f6df9a';ctx.fillRect(x-7,castleBase-hh+35,14,25);ctx.fillStyle='#d4c6a4';}
  for(let i=0;i<4;i++){
    const x=820+i*330,base=H*.625,h=64+(i*29%52),w=68+(i%2)*20;
    ctx.fillStyle=['#e4c9a0','#d49a80','#b7c49a'][i%3];ctx.strokeStyle='#634c46';ctx.lineWidth=5;
    ctx.fillRect(x-w/2,base-h,w,h);ctx.strokeRect(x-w/2,base-h,w,h);
    ctx.beginPath();ctx.moveTo(x-w*.65,base-h);ctx.lineTo(x,base-h-34);ctx.lineTo(x+w*.65,base-h);ctx.closePath();ctx.fillStyle='#8b6570';ctx.fill();ctx.stroke();
    ctx.fillStyle='#f6df9a';ctx.fillRect(x-7,base-42,14,20);
  }
  // flower clumps and little golden lights animate the banks with storybook detail
  for(let i=0;i<42;i++){const x=(i*97+19)%W,y=H*(.635+(i%4)*.018);ctx.fillStyle=['#f5d986','#ed9a9b','#f7eee0'][i%3];for(let j=0;j<5;j++){ctx.beginPath();ctx.arc(x+Math.cos(j*TAU/5)*4,y+Math.sin(j*TAU/5)*4,3.2,0,TAU);ctx.fill();}ctx.fillStyle='#b98354';ctx.beginPath();ctx.arc(x,y,2.3,0,TAU);ctx.fill();}
  const riverPath=()=>{ctx.beginPath();ctx.moveTo(-100,H*.76);ctx.bezierCurveTo(420,H*.72,560,H*.79,950,H*.76);ctx.bezierCurveTo(1290,H*.72,1540,H*.81,2020,H*.75);};
  riverPath();ctx.strokeStyle='#e9d8b7';ctx.lineWidth=178;ctx.lineCap='round';ctx.stroke();
  riverPath();ctx.strokeStyle=night?'#365f76':'#62aebe';ctx.lineWidth=142;ctx.stroke();
  riverPath();ctx.strokeStyle='rgba(236,247,234,.78)';ctx.lineWidth=5;ctx.stroke();
  // ripples and short reflection dashes keep water active without dominating the frame
  for(let i=0;i<26;i++){const x=(i*83+(t*90)%83)%W,y=H*(.70+(i%5)*.035);ctx.strokeStyle=i%2?'rgba(231,246,237,.62)':'rgba(43,104,119,.45)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+22,y-5,x+50,y);ctx.stroke();}
  // shore path gives standing cut-outs a stable stage above the moving water
  ctx.strokeStyle='#ead7b1';ctx.lineWidth=36;ctx.beginPath();ctx.moveTo(-20,H*.65);ctx.bezierCurveTo(480,H*.63,910,H*.67,1330,H*.64);ctx.bezierCurveTo(1600,H*.62,1810,H*.66,1940,H*.64);ctx.stroke();
  const veil=ctx.createLinearGradient(0,0,0,H);veil.addColorStop(0,'rgba(255,250,237,.05)');veil.addColorStop(.58,'rgba(255,248,228,0)');veil.addColorStop(1,'rgba(26,43,55,.08)');ctx.fillStyle=veil;ctx.fillRect(0,0,W,H);

  const drawables=[];
  for(const actor of world.actors.values())if(actor.root.visible){
    const p=actor.root.position.clone(),sc=actor.root.scale,cardSc=actor.card.scale;
    drawables.push({z:p.z+.001,kind:'actor',draw(){
      const q=stagePoint(p.x,p.y,p.z),heightPx=actor.height*sc.y*6200,widthPx=actor.height*(512/820)*sc.x*cardSc.x*6200;
      const alpha=actor.card.userData.front.material.opacity??1;
      ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='rgba(38,36,43,.23)';ctx.filter='blur(12px)';ctx.beginPath();ctx.ellipse(q.x,q.y+6,Math.max(18,widthPx*.38),11,0,0,TAU);ctx.fill();ctx.filter='none';
      const image=actor.card.userData.front.material.map?.image;if(image){ctx.shadowColor='rgba(50,35,28,.28)';ctx.shadowBlur=12;ctx.drawImage(image,q.x-widthPx/2,q.y-heightPx,widthPx,heightPx);}ctx.restore();
    }});
  }
  const props=active?[...active.props,world.whaleBoat]:world.instrumentalProps;
  for(const item of props)if(item.g.visible){
    const g=item.g,p=g.position.clone(),sc=g.scale,rot=g.rotation.z,flat=item.flat;
    drawables.push({z:p.z,kind:'prop',draw(){
      const q=stagePoint(p.x,p.y,p.z),widthPx=item.w*sc.x*3800,heightPx=item.h*sc.y*(flat?1500:3800);
      const ay=item.anchor??.75,top=q.y-heightPx*ay;const image=item.card.userData.front.material.map?.image;
      ctx.save();ctx.fillStyle='rgba(40,36,42,.20)';ctx.filter='blur(10px)';ctx.beginPath();ctx.ellipse(q.x,q.y+5,Math.max(14,widthPx*.30),9,0,0,TAU);ctx.fill();ctx.filter='none';
      if(image){ctx.translate(q.x,q.y);ctx.rotate(rot);ctx.shadowColor='rgba(51,39,31,.26)';ctx.shadowBlur=10;ctx.drawImage(image,-widthPx/2,-heightPx*ay,widthPx,heightPx);}
      ctx.restore();
    }});
  }
  for(const d of drawables.sort((a,b)=>a.z-b.z))d.draw();

  // Keep the story world full-bleed throughout; never shrink back to a framed tabletop book.
}
function drawOverlay(t,state){
  ox.clearRect(0,0,W,H);
  if(state.cue){
    const text=state.cue.text;ox.save();ox.font='64px "ZCOOL KuaiLe"';ox.textAlign='center';ox.textBaseline='middle';
    const width=Math.min(W-180,Math.max(490,ox.measureText(text).width+104)),x=(W-width)/2,y=H-148;
    ox.fillStyle='rgba(36,39,49,.78)';rr(ox,x,y,width,98,26);ox.fill();
    ox.strokeStyle='rgba(247,228,190,.46)';ox.lineWidth=2;rr(ox,x+2,y+2,width-4,94,24);ox.stroke();
    ox.lineJoin='round';ox.lineWidth=7;ox.strokeStyle='rgba(44,42,48,.88)';ox.fillStyle='#fff5de';ox.strokeText(text,W/2,y+50);ox.fillText(text,W/2,y+50);ox.restore();
  }
  const fadeIn=1-eio(seg(t,0,1.25)),fadeOut=eio(seg(t,DUR-1.3,DUR)),alpha=Math.max(fadeIn,fadeOut);
  if(alpha>.001){ox.fillStyle=`rgba(18,21,29,${alpha})`;ox.fillRect(0,0,W,H);}
}
function render(t){
  t=clamp(Number(t)||0,0,DUR);
  const open=eio(seg(t,.35,2.15));
  const flutter=t>1.65&&t<2.45?Math.sin(seg(t,1.65,2.45)*Math.PI)*-.025:0;
  book.setOpen(Math.PI/2*open+flutter);
  const state=world.render(t);
  // Long lyric lines receive a clear internal reframing about every three seconds.
  // Characters remain upright; the pop-up layer pans/zooms while the printed world stays full-bleed.
  if(state.cue){
    const local=Math.max(0,t-state.cue.t0),shot=Math.floor(local/3.0),within=local-shot*3.0;
    const direction=shot%2===0?1:-1,pan=60*direction*eio(seg(within,0,.42));
    storyCamX=pan;storyCamY=(/push|close|face|chest|bed/.test(state.cue.camera)?-18:0)*eio(seg(within,0,.42));
    storyZoom=1+((shot%2===0)?0:.035)*eio(seg(within,0,.42));
  }else{storyCamX=storyCamY=0;storyZoom=1;}
  if(gpuAvailable){
    const C=cameraFor(t,state);camera.position.copy(C.p);camera.fov=C.fov;camera.lookAt(C.target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
    const night=/night|cosmic|galaxy|deep-river/.test(state.theme);key.intensity=night?1.65:2.15;fill.intensity=night?.38:.55;glow.intensity=night?.28:.18;
    if(post){post.dof.focus=camera.position.distanceTo(C.target);post.dof.aper=1.35;post.dof.maxCoc=4.8;post.vig.uniforms.fade.value=1;post.vig.uniforms.warm.value=.11;post.bloom.strength=.10+(/firework|star|galaxy|cosmic/.test(state.cue?.action||'')?.14:0);scene.updateMatrixWorld(true);post.composer.render();}
    else{scene.updateMatrixWorld(true);renderer.render(scene,camera);}
  }else drawPaperCanvas(t,state,open);
  drawOverlay(t,state);return state;
}

window.render=render;window.DUR=DUR;window.FPS=FPS;window.CUES=CUES;window.RENDERER=gpuAvailable?'webgl':'canvas2d';window.READY=false;
const initial=params.has('t')?Number(params.get('t')):0;render(initial);window.READY=true;

if(!renderMode){
  const audio=document.getElementById('song'),play=document.getElementById('play'),seek=document.getElementById('seek'),clockEl=document.getElementById('clock');
  let scrubbing=false;if(params.has('t'))audio.currentTime=clamp(initial,0,DUR);
  function clock(t){const mm=Math.floor(t/60),ss=Math.floor(t%60);return `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;}
  function sync(){if(!scrubbing){seek.value=String(audio.currentTime);clockEl.textContent=`${clock(audio.currentTime)} / ${clock(DUR)}`;}}
  function tick(){if(!audio.paused){render(audio.currentTime);sync();requestAnimationFrame(tick);}}
  play.addEventListener('click',async()=>{
    if(audio.paused){try{await audio.play();play.textContent='Ⅱ 暂停';requestAnimationFrame(tick);}catch(e){console.error('音轨无法播放',e);play.textContent='▶ 重试播放';}}
    else{audio.pause();play.textContent='▶ 播放';render(audio.currentTime);}
  });
  audio.addEventListener('ended',()=>{play.textContent='▶ 播放';render(DUR);});
  seek.max=String(DUR);seek.addEventListener('input',()=>{scrubbing=true;clockEl.textContent=`${clock(Number(seek.value))} / ${clock(DUR)}`;});
  seek.addEventListener('change',()=>{audio.currentTime=Number(seek.value);render(audio.currentTime);sync();scrubbing=false;});
  addEventListener('keydown',e=>{if(e.code==='Space'&&!e.target.matches('input,button')){e.preventDefault();play.click();}if(e.code==='ArrowLeft')audio.currentTime=Math.max(0,audio.currentTime-5);if(e.code==='ArrowRight')audio.currentTime=Math.min(DUR,audio.currentTime+5);});
  setInterval(()=>{if(audio.paused)sync();},250);
}
