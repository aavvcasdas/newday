// Original procedural paper-book art for this film. Canvas artwork becomes flat cut-outs in the 3D book.
import { cv, paperFill, finishCut, sh, blob, smoothClosed, INK } from './paper.js';
import { mulberry, TAU } from './lib.js';
import { THEME_PALETTES } from './timeline.js';

export const PW = 1024, PH = 700;
export const ACTOR_W = 512, ACTOR_H = 820;
const PAPER = '#fffdf7';
const PALETTES = {
  day:['#91ccdc','#edf0df','#9bc783','#4d90a0'], forest:['#97c9c4','#e7e2cf','#83a574','#416c61'],
  water:['#8dbcc9','#dfe9df','#65a4b0','#3c7686'], night:['#58647c','#d9d0cc','#646c78','#3c4d62'],
  dusk:['#d4b5a9','#f0e1cf','#9b8b83','#4e6775'], cosmic:['#404866','#d9d0c7','#62647f','#d2ae6c'],
  city:['#9bb9c5','#e4e0d4','#7e9d9a','#647c86'], stage:['#a79cae','#eee0d2','#7c7286','#c76764'],
};
const BG = [
  ['castle','garden','river','swan','rainbow','heart','watermill','fleet','bridge-reunion','blessing','map','parchment'], 'day',
];
function bgKey(theme='day') {
  const s=theme.toLowerCase();
  if(/cosmic|galaxy|constellation|observatory|sunbird/.test(s)) return 'cosmic';
  if(/rose|cloak|night|gem-cave/.test(s)) return 'night';
  if(/pearl|underwater|deep-river|foam|sunlit/.test(s)) return 'water';
  if(/sunset|twilight|harbor|fleet/.test(s)) return 'dusk';
  if(/city|ideal-reality|mirror|mountain|floating|parchment|map/.test(s)) return 'city';
  if(/puppet|red-shoe|theater|music-box/.test(s)) return 'stage';
  if(/forest|candy|beanstalk|tiger|life-tree/.test(s)) return 'forest';
  return 'day';
}
const BG_CACHE = new Map();
function pathStroke(x, pts, w, col, edge=null) {
  x.beginPath(); x.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++) x.quadraticCurveTo(pts[i-1][0],pts[i-1][1],(pts[i-1][0]+pts[i][0])/2,(pts[i-1][1]+pts[i][1])/2);
  x.lineTo(pts.at(-1)[0],pts.at(-1)[1]); x.lineCap='round';x.lineJoin='round';
  if(edge){x.strokeStyle=edge;x.lineWidth=w+22;x.stroke();} x.strokeStyle=col;x.lineWidth=w;x.stroke();
}
function cloud(x,cx,cy,s,alpha=.6){x.save();x.globalAlpha=alpha;x.fillStyle='#fff7e7';for(let i=0;i<5;i++){x.beginPath();x.ellipse(cx+(i-2)*s*.24,cy-Math.sin(i/4*Math.PI)*s*.18,s*.23,s*.15,0,0,TAU);x.fill();}x.restore();}
function distantHills(x,base,seed,dark=false){
  const R=mulberry(seed); const cols=dark?['#6b7188','#747d91','#85899b']:['#bed9cf','#a8c9bd','#98bea9'];
  for(let layer=0;layer<3;layer++){
    x.beginPath();x.moveTo(0,PH*.56+layer*32);
    for(let px=0;px<=PW+24;px+=24){const yy=PH*(.43+layer*.075)+Math.sin(px*.006+seed+layer)*34+Math.sin(px*.017+layer*4)*18+R()*5;x.lineTo(px,yy);}
    x.lineTo(PW,PH);x.lineTo(0,PH);x.closePath();x.fillStyle=cols[layer];x.globalAlpha=.6+layer*.12;x.fill();
  } x.globalAlpha=1;
}
function drawCastle(x,atX=.75,baseY=.64,s=1,col='#667b88'){
  x.save();x.translate(PW*atX,PH*baseY);x.scale(s,s);x.fillStyle=col;x.strokeStyle=INK;x.lineWidth=4;
  const tower=(cx,w,h,roof)=>{x.fillRect(cx-w/2,-h,w,h);x.strokeRect(cx-w/2,-h,w,h);x.beginPath();x.moveTo(cx-w*.65,-h);x.lineTo(cx,-h-roof);x.lineTo(cx+w*.65,-h);x.closePath();x.fillStyle='#8c8296';x.fill();x.stroke();x.fillStyle=col;for(let yy=-h+24;yy<-12;yy+=27){x.fillStyle='#f6d88e';x.beginPath();x.roundRect(cx-5,yy,10,14,4);x.fill();x.fillStyle=col;}};
  x.fillRect(-105,-104,210,104);x.strokeRect(-105,-104,210,104);tower(-78,46,168,62);tower(78,46,168,62);tower(0,50,128,48);x.fillStyle='#f4d48b';x.beginPath();x.arc(0,-60,15,0,TAU);x.fill();x.restore();
}
function drawVillage(x,seed=3,dark=false){const R=mulberry(seed);for(let i=0;i<5;i++){const xx=PW*(.12+i*.17),yy=PH*(.59+R()*.06),w=75+R()*55,h=75+R()*75;x.fillStyle=dark?'#58647d':['#c68575','#d5a26e','#82979b'][i%3];x.strokeStyle=INK;x.lineWidth=5;x.beginPath();x.moveTo(xx-w/2,yy);x.lineTo(xx-w/2,yy-h);x.lineTo(xx,yy-h-42);x.lineTo(xx+w/2,yy-h);x.lineTo(xx+w/2,yy);x.closePath();x.fill();x.stroke();for(let q=-1;q<=1;q++){x.fillStyle=dark?'#efcf87':'#fff0b7';x.fillRect(xx+q*21-6,yy-h+25,12,17);}}}
export function backdrop(theme='day'){
  const cacheKey=theme.toLowerCase(),key=bgKey(theme); if(BG_CACHE.has(cacheKey))return BG_CACHE.get(cacheKey);
  const c=THEME_PALETTES[theme]||PALETTES[key]||PALETTES.day, sky=cv(PW,PH),sx=sky.getContext('2d');
  let seed=17;for(const ch of theme)seed=(seed*31+ch.charCodeAt(0))|0;
  const g=sx.createLinearGradient(0,0,0,PH);g.addColorStop(0,c[0]);g.addColorStop(.72,c[1]);g.addColorStop(1,'#f4ead7');sx.fillStyle=g;sx.fillRect(0,0,PW,PH);
  paperFill(sx,PW,PH,c[0],seed,.025);
  const R=mulberry(seed),dark=key==='night'||key==='cosmic';
  if(dark){for(let i=0;i<110;i++){sx.beginPath();sx.arc(R()*PW,R()*PH*.72,1+R()*2.3,0,TAU);sx.fillStyle=`rgba(255,244,211,${.25+R()*.55})`;sx.fill();}
    sx.fillStyle=key==='cosmic'?'#e5c777':'#ead6a0';sx.beginPath();sx.arc(PW*.77,PH*.19,42,0,TAU);sx.fill();}
  else {for(let i=0;i<6;i++)cloud(sx,PW*(.13+i*.16),PH*(.15+(i%3)*.085),95+(i%2)*22,.48);sx.fillStyle='#f8de91';sx.beginPath();sx.arc(PW*.82,PH*.2,48,0,TAU);sx.fill();}
  distantHills(sx,PH*.65,seed*13,dark);
  if(/castle|garden|harbor|blessing|day/.test(theme))drawCastle(sx,.78,.65,.55,dark?'#596477':'#748b92');
  if(/village|forest|candy|night|rose/.test(theme))drawVillage(sx,seed,dark);
  if(/rainbow|heart/.test(theme)){sx.save();sx.globalAlpha=.30;sx.lineWidth=18;for(let i=0;i<4;i++){sx.strokeStyle=['#d77e86','#e5be67','#7ea99b','#8b83ad'][i];sx.beginPath();sx.ellipse(PW*.48,PH*.57,250+i*22,115+i*18,0,Math.PI,TAU);sx.stroke();}sx.restore();}
  if(/underwater|pearl|deep-river|foam/.test(theme)){sx.save();sx.globalAlpha=.32;for(let i=0;i<18;i++){const px=R()*PW,py=R()*PH*.66;sx.strokeStyle='#f5f0dd';sx.lineWidth=3;sx.beginPath();sx.arc(px,py,4+(i%4)*3,0,TAU);sx.stroke();}sx.restore();}
  if(key==='city'||/city|ideal|mirror/.test(theme)){
    sx.fillStyle='#758a98';for(let i=0;i<9;i++){let xx=PW*(.12+i*.095),h=65+(i*37%110);sx.fillRect(xx,PH*.62-h,58,h);sx.strokeStyle='rgba(62,68,78,.65)';sx.lineWidth=3;sx.strokeRect(xx,PH*.62-h,58,h);for(let y=PH*.62-h+13;y<PH*.62-8;y+=21){sx.fillStyle='#f2d69a';sx.fillRect(xx+12,y,9,8);sx.fillRect(xx+35,y,9,8);sx.fillStyle='#758a98';}}
  }
  if(key==='cosmic'){
    sx.save();sx.globalAlpha=.35;pathStroke(sx,[[60,440],[250,335],[410,410],[610,300],[790,390],[980,245]],18,'#efcc80');sx.restore();
  }
  const ground=cv(PW,PH),gx=ground.getContext('2d');const gg=gx.createLinearGradient(0,0,0,PH);gg.addColorStop(0,c[2]);gg.addColorStop(1,key==='night'?'#7e7789':'#d8d0ad');gx.fillStyle=gg;gx.fillRect(0,0,PW,PH);paperFill(gx,PW,PH,c[2],seed*7,.035);
  // A winding river is the constant that stitches each spread together.
  const river=[[PW*.08,PH*.02],[PW*.38,PH*.12],[PW*.64,PH*.28],[PW*.45,PH*.42],[PW*.22,PH*.58],[PW*.48,PH*.78],[PW*.87,PH*.96]];
  pathStroke(gx,river,190,c[3],'#f0e5cf');pathStroke(gx,river,148,key==='night'?'#526f91':c[3],'rgba(255,255,255,.45)');pathStroke(gx,river,6,'rgba(255,255,255,.75)');
  // paper path, grass tufts and small seed marks
  pathStroke(gx,[[0,PH*.3],[PW*.24,PH*.36],[PW*.44,PH*.31],[PW*.68,PH*.4],[PW,PH*.35]],24,'#e8d5ae','#c7b995');
  for(let i=0;i<130;i++){const px=R()*PW,py=R()*PH;xGrass(gx,px,py,5+R()*7,R()>.5?'rgba(49,92,77,.32)':'rgba(255,248,221,.7)');}
  if(key==='water'||key==='night'){
    gx.save();gx.globalAlpha=.4;for(let i=0;i<42;i++){const xx=R()*PW,yy=R()*PH;gx.strokeStyle=i%2?'#edf4ea':'#4a7788';gx.lineWidth=3+R()*3;gx.beginPath();gx.moveTo(xx,yy);gx.quadraticCurveTo(xx+24,yy-10,xx+54,yy);gx.stroke();}gx.restore();
  }
  sx.save();sx.globalAlpha=.16;sx.fillStyle=sx.createPattern(ground,'repeat');sx.fillRect(0,0,PW,PH);sx.restore();
  const result={sky,ground,key:cacheKey,paletteKey:key};BG_CACHE.set(cacheKey,result);return result;
}
function xGrass(x,px,py,s,col){x.strokeStyle=col;x.lineWidth=3;x.lineCap='round';x.beginPath();x.moveTo(px,py);x.quadraticCurveTo(px-s*.2,py-s*.6,px-s*.18,py-s);x.moveTo(px,py);x.quadraticCurveTo(px+s*.2,py-s*.5,px+s*.45,py-s*.9);x.stroke();}

const ROLE = {
  whale:{skin:'#f4d9c6',hair:'#27384e',coat:'#6cb6c2',shade:'#398a9a',accent:'#e7c980',kind:'mermaid'},
  claude:{skin:'#f4d8c3',hair:'#27243b',coat:'#f1d17a',shade:'#647aa4',accent:'#c84c59',kind:'princess'},
  doubao:{skin:'#f1c9a8',hair:'#573b32',coat:'#b9434c',shade:'#8c2937',accent:'#e76855',kind:'hood'},
  gemini:{skin:'#f4d7b9',hair:'#8a503c',coat:'#b8d2c0',shade:'#71988e',accent:'#d9b86f',kind:'alice'},
  qwen:{skin:'#edc8a4',hair:'#453345',coat:'#8a6d94',shade:'#5f4d71',accent:'#55a6a3',kind:'hatter'},
  kimi:{skin:'#f3d7bc',hair:'#4f3944',coat:'#92a9c6',shade:'#65748f',accent:'#d9ca8f',kind:'cinderella'},
  zai:{skin:'#efc6a2',hair:'#493b32',coat:'#83a776',shade:'#4c7555',accent:'#d5a86d',kind:'traveler'},
  gpt:{skin:'#e8c4b4',hair:'#302f43',coat:'#586b78',shade:'#3a4e5d',accent:'#d05a55',kind:'dragon'},
};
function limb(x,a,b,w,col){x.lineCap='round';x.lineJoin='round';x.strokeStyle='#fffdf7';x.lineWidth=w+24;x.beginPath();x.moveTo(a[0],a[1]);x.lineTo(b[0],b[1]);x.stroke();x.strokeStyle=INK;x.lineWidth=w+9;x.stroke();x.strokeStyle=col;x.lineWidth=w;x.stroke();}
function dotEye(x,px,py,scale=1){x.fillStyle=INK;x.beginPath();x.ellipse(px,py,8*scale,12*scale,0,0,TAU);x.fill();x.fillStyle='#fffdf7';x.beginPath();x.arc(px-2,py-4,2.6*scale,0,TAU);x.fill();}
function drawHair(x,role,faceY){const r=ROLE[role];x.fillStyle=r.hair;x.strokeStyle=INK;x.lineWidth=10;
  x.beginPath();x.ellipse(256,faceY-28,84,92,0,Math.PI,TAU);x.lineTo(340,faceY+10);x.quadraticCurveTo(300,faceY-12,278,faceY+4);x.quadraticCurveTo(245,faceY-12,176,faceY+20);x.closePath();x.fill();x.stroke();
  if(role==='doubao'){x.fillStyle=r.coat;x.beginPath();x.moveTo(180,faceY-38);x.quadraticCurveTo(256,faceY-145,332,faceY-38);x.lineTo(318,faceY-5);x.quadraticCurveTo(255,faceY-40,194,faceY-5);x.closePath();x.fill();x.stroke();}
  if(role==='qwen'){x.fillStyle=r.accent;x.beginPath();x.moveTo(196,faceY-84);x.lineTo(215,faceY-174);x.lineTo(298,faceY-174);x.lineTo(318,faceY-84);x.closePath();x.fill();x.stroke();x.fillStyle='#f0d58b';x.fillRect(198,faceY-95,116,18);}
  if(role==='gpt'){x.fillStyle='#6a4f5e';for(const side of [-1,1]){x.beginPath();x.moveTo(256+side*45,faceY-80);x.quadraticCurveTo(256+side*110,faceY-160,256+side*92,faceY-38);x.closePath();x.fill();x.stroke();}}
  if(role==='claude'){x.fillStyle='#c84c59';for(const side of [-1,1]){x.beginPath();x.arc(256+side*60,faceY-76,15,0,TAU);x.fill();}}
}
function actorRaw(role,pose='idle',phase=0,expression=''){
  const c=cv(ACTOR_W,ACTOR_H),x=c.getContext('2d'),r=ROLE[role]||ROLE.whale;
  x.save();
  // Claude lies sideways in her rose bed; rotate the whole cut-out around its center,
  // then widen its card at display time so the sleeping silhouette reads horizontally.
  if(pose==='sleep'){x.translate(ACTOR_W/2,ACTOR_H/2);x.scale(.62,.62);x.rotate(-Math.PI/2);x.translate(-ACTOR_W/2,-ACTOR_H/2);}
  const swim=pose==='swim',dance=pose==='dance',jump=pose==='jump',wave=pose==='wave',reach=pose==='reach'||pose==='point'||pose==='hold'||pose==='row'||wave;
  const lean=swim?Math.sin(phase)*4:0;
  // Tail / wings / cape behind the body
  if(role==='whale'){
    x.fillStyle=r.shade;x.strokeStyle=INK;x.lineWidth=12;x.beginPath();x.moveTo(205,540);x.quadraticCurveTo(185,640,235+Math.sin(phase)*18,720);x.quadraticCurveTo(256,770,277,720);x.quadraticCurveTo(314+Math.sin(phase)*18,640,307,540);x.closePath();x.fill();x.stroke();
    x.fillStyle=r.coat;x.beginPath();x.moveTo(235,700);x.quadraticCurveTo(185,780,128,770);x.quadraticCurveTo(180,725,195,685);x.quadraticCurveTo(236,704,256,714);x.quadraticCurveTo(275,702,317,680);x.quadraticCurveTo(344,742,397,774);x.quadraticCurveTo(315,794,277,720);x.closePath();x.fill();x.stroke();
  } else if(role==='gpt'){
    for(const side of [-1,1]){x.fillStyle=r.shade;x.strokeStyle=INK;x.lineWidth=12;x.beginPath();x.moveTo(256+side*50,370);x.quadraticCurveTo(256+side*195,250,256+side*196,505);x.quadraticCurveTo(256+side*105,470,256+side*68,515);x.closePath();x.fill();x.stroke();}
    x.fillStyle=r.accent;x.beginPath();x.moveTo(300,535);x.quadraticCurveTo(390,590+Math.sin(phase)*20,340,720);x.lineTo(280,675);x.closePath();x.fill();x.stroke();
  } else if(role==='doubao'){
    x.fillStyle=r.coat;x.strokeStyle=INK;x.lineWidth=12;x.beginPath();x.moveTo(200,380);x.quadraticCurveTo(105,500,166,690);x.quadraticCurveTo(255,738,353,690);x.quadraticCurveTo(398,502,310,380);x.closePath();x.fill();x.stroke();
  }
  // Legs / tail-root. Draw legs in a clear action pose.
  if(role!=='whale'){
    const swing=swim?Math.sin(phase)*24:dance?Math.sin(phase)*42:jump?18:0;
    limb(x,[215,565],[194-swing,670],52,r.shade); limb(x,[194-swing,670],[184-swing*.7,754],45,r.skin);
    limb(x,[298,565],[317+swing,670],52,r.shade); limb(x,[317+swing,670],[332+swing*.7,754],45,r.skin);
    // shoes
    x.fillStyle=role==='claude'?'#b64b53':role==='kimi'?'#b89762':'#5a4c48';x.strokeStyle=INK;x.lineWidth=9;
    for(const [fx,fy] of [[184-swing*.7,754],[332+swing*.7,754]]){x.beginPath();x.ellipse(fx+17,fy+9,35,18,-.08,0,TAU);x.fill();x.stroke();}
  }
  // Torso / skirt / dress
  x.save();x.translate(lean,0);x.fillStyle=r.coat;x.strokeStyle=INK;x.lineWidth=14;x.beginPath();
  if(role==='claude'||role==='kimi'){
    x.moveTo(205,355);x.quadraticCurveTo(256,330,307,355);x.lineTo(360,565);x.quadraticCurveTo(256,620,152,565);x.closePath();
  }else if(role==='whale'){
    x.moveTo(205,355);x.quadraticCurveTo(256,330,307,355);x.lineTo(330,540);x.quadraticCurveTo(256,570,182,540);x.closePath();
  }else{x.moveTo(202,350);x.quadraticCurveTo(256,328,310,350);x.lineTo(326,560);x.quadraticCurveTo(256,600,186,560);x.closePath();}
  x.fill();x.stroke();
  // collar and a small contrasting seam
  x.fillStyle=r.accent;x.beginPath();x.moveTo(224,355);x.lineTo(256,400);x.lineTo(288,355);x.lineTo(272,343);x.lineTo(240,343);x.closePath();x.fill();
  x.strokeStyle='rgba(255,250,230,.8)';x.lineWidth=7;x.beginPath();x.moveTo(213,505);x.quadraticCurveTo(256,522,300,505);x.stroke();
  x.restore();
  // Arms with anticipatory bends and unmistakable open hands.
  const armSwing=swim?Math.sin(phase+Math.PI)*.3:0;
  const leftEnd=jump?[128,275]:pose==='row'?[148,425+Math.sin(phase)*32]:wave?[142,335+Math.sin(phase)*24]:reach?[126,350]:dance?[130,345+Math.sin(phase)*28]:[155,455+armSwing*62];
  const rightEnd=jump?[378,265]:pose==='row'?[365,425-Math.sin(phase)*32]:wave?[365,315-Math.sin(phase)*44]:reach?[390,350]:dance?[380,340-Math.sin(phase)*28]:[355,455-armSwing*62];
  limb(x,[205,380],[leftEnd[0]+22,leftEnd[1]+35],39,r.coat);limb(x,[leftEnd[0]+22,leftEnd[1]+35],leftEnd,32,r.skin);
  limb(x,[307,380],[rightEnd[0]-22,rightEnd[1]+35],39,r.coat);limb(x,[rightEnd[0]-22,rightEnd[1]+35],rightEnd,32,r.skin);
  for(const p of [leftEnd,rightEnd]){x.fillStyle=r.skin;x.strokeStyle=INK;x.lineWidth=7;x.beginPath();x.arc(p[0],p[1],18,0,TAU);x.fill();x.stroke();}
  // Head / hair / facial acting
  const faceY=236;x.fillStyle=r.skin;x.strokeStyle=INK;x.lineWidth=13;x.beginPath();x.ellipse(256,faceY,73,82,0,0,TAU);x.fill();x.stroke();drawHair(x,role,faceY);
  const sleepy=pose==='sleep'||expression==='sleep',eyeY=faceY+4;
  if(sleepy){x.strokeStyle=INK;x.lineWidth=8;x.lineCap='round';for(const px of [228,280]){x.beginPath();x.moveTo(px-12,eyeY);x.quadraticCurveTo(px,eyeY+10,px+12,eyeY);x.stroke();}}
  else{dotEye(x,228,eyeY);dotEye(x,280,eyeY);}
  x.strokeStyle=INK;x.lineWidth=8;x.lineCap='round';x.beginPath();if(expression==='worried'){x.moveTo(238,296);x.quadraticCurveTo(256,278,274,297);}else if(expression==='surprised'){x.ellipse(256,296,10,15,0,0,TAU);}else{x.moveTo(238,289);x.quadraticCurveTo(256,310,275,288);}x.stroke();
  x.fillStyle='rgba(227,126,130,.55)';for(const px of [205,307]){x.beginPath();x.ellipse(px,273,15,8,0,0,TAU);x.fill();}
  // Role-specific silhouette anchors
  if(role==='doubao'){x.fillStyle='#9b6a3b';x.strokeStyle=INK;x.lineWidth=7;x.beginPath();x.roundRect(128,502,50,42,10);x.fill();x.stroke();}
  if(role==='whale'){x.fillStyle='#efe2c7';x.beginPath();x.arc(256,555,9,0,TAU);x.fill();}
  x.restore();
  return c;
}
export function actorSprite(role,pose='idle',phase=0,expression=''){
  const c=actorRaw(role,pose,phase,expression);
  return finishCut(c,18,{edge:'#b7ad9f',paper:PAPER,grainA:.42});
}

function outlinedPath(x,fn,fill='#fff',lw=10){x.beginPath();fn();x.fillStyle=fill;x.fill();x.lineWidth=lw;x.lineJoin='round';x.lineCap='round';x.strokeStyle=INK;x.stroke();}
function drawBoat(x){x.save();outlinedPath(x,()=>{x.moveTo(-210,80);x.quadraticCurveTo(-20,160,210,80);x.lineTo(145,182);x.lineTo(-145,182);x.closePath();},'#9a6750',14);x.fillStyle='#efe6d5';x.beginPath();x.moveTo(-25,70);x.lineTo(-25,-185);x.lineTo(120,66);x.closePath();x.fill();x.strokeStyle=INK;x.lineWidth=12;x.stroke();x.fillStyle='#d56e63';x.beginPath();x.moveTo(-12,-145);x.lineTo(-12,55);x.lineTo(104,55);x.closePath();x.fill();x.stroke();x.strokeStyle='#f9e5b3';x.lineWidth=6;x.beginPath();x.moveTo(-170,135);x.lineTo(165,135);x.stroke();x.restore();}
function drawCastleProp(x){x.save();x.translate(0,25);x.fillStyle='#81979b';x.strokeStyle=INK;x.lineWidth=11;x.fillRect(-170,-45,340,225);x.strokeRect(-170,-45,340,225);for(const [cx,w,h] of [[-122,92,270],[0,100,220],[122,92,270]]){x.fillStyle='#879ca0';x.fillRect(cx-w/2,-h,w,h);x.strokeRect(cx-w/2,-h,w,h);x.beginPath();x.moveTo(cx-w*.7,-h);x.lineTo(cx,-h-95);x.lineTo(cx+w*.7,-h);x.closePath();x.fillStyle='#897a8f';x.fill();x.stroke();x.fillStyle='#f1d492';x.fillRect(cx-10,-h+38,20,33);}x.restore();}
function drawClocktower(x){x.save();x.fillStyle='#82979b';x.strokeStyle=INK;x.lineWidth=14;x.beginPath();x.moveTo(-92,205);x.lineTo(-92,-155);x.lineTo(0,-270);x.lineTo(92,-155);x.lineTo(92,205);x.closePath();x.fill();x.stroke();x.fillStyle='#f1dfb4';x.beginPath();x.arc(0,-92,51,0,TAU);x.fill();x.strokeStyle=INK;x.lineWidth=9;x.stroke();x.strokeStyle='#584e4c';x.lineWidth=8;x.beginPath();x.moveTo(0,-92);x.lineTo(0,-126);x.moveTo(0,-92);x.lineTo(28,-78);x.stroke();x.fillStyle='#f2d28a';for(const px of [-45,45]){x.fillRect(px-9,5,18,27);}x.fillStyle='#5b4a48';x.beginPath();x.roundRect(-31,150,62,55,18);x.fill();x.strokeStyle=INK;x.lineWidth=7;x.stroke();x.restore();}
function drawCrest(x){x.save();outlinedPath(x,()=>{x.moveTo(-150,-160);x.lineTo(150,-160);x.lineTo(132,20);x.quadraticCurveTo(110,128,0,195);x.quadraticCurveTo(-110,128,-132,20);x.closePath();},'#d8b766',15);x.strokeStyle='#fff2ca';x.lineWidth=7;x.beginPath();x.moveTo(-112,-124);x.lineTo(112,-124);x.lineTo(98,18);x.quadraticCurveTo(80,105,0,154);x.quadraticCurveTo(-80,105,-98,18);x.closePath();x.stroke();x.strokeStyle='#6cabb0';x.lineWidth=28;x.lineCap='round';x.beginPath();x.moveTo(-74,18);x.bezierCurveTo(-24,-32,28,66,74,5);x.stroke();x.strokeStyle='#fff4d7';x.lineWidth=5;x.beginPath();x.moveTo(-74,18);x.bezierCurveTo(-24,-32,28,66,74,5);x.stroke();x.fillStyle='#fff0b6';x.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?18:39;x.lineTo(Math.cos(a)*r,Math.sin(a)*r-72);}x.closePath();x.fill();x.strokeStyle=INK;x.lineWidth=5;x.stroke();x.restore();}
function drawCape(x){x.save();x.fillStyle='#ba4f57';x.strokeStyle=INK;x.lineWidth=15;x.lineJoin='round';x.beginPath();x.moveTo(-70,-160);x.quadraticCurveTo(0,-208,70,-160);x.lineTo(192,168);x.quadraticCurveTo(8,215,0,175);x.quadraticCurveTo(-14,214,-192,168);x.closePath();x.fill();x.stroke();x.strokeStyle='#f0d59a';x.lineWidth=9;x.beginPath();x.moveTo(-65,-136);x.quadraticCurveTo(-110,8,-162,145);x.moveTo(65,-136);x.quadraticCurveTo(112,8,162,145);x.stroke();x.fillStyle='#e8c36e';x.beginPath();x.arc(0,-150,21,0,TAU);x.fill();x.strokeStyle=INK;x.lineWidth=7;x.stroke();x.restore();}
function drawHeart(x){x.save();x.scale(1.2,1.2);outlinedPath(x,()=>{x.moveTo(0,225);x.bezierCurveTo(-330,25,-260,-140,-120,-125);x.bezierCurveTo(-40,-118,-4,-62,0,-22);x.bezierCurveTo(10,-80,75,-132,155,-120);x.bezierCurveTo(300,-92,320,70,0,225);},'#d8808d',14);x.restore();}
function drawLantern(x){x.save();x.strokeStyle='#ba8a52';x.lineWidth=14;x.beginPath();x.moveTo(0,-205);x.lineTo(0,-145);x.stroke();outlinedPath(x,()=>{x.moveTo(-105,-135);x.quadraticCurveTo(0,-190,105,-135);x.lineTo(82,98);x.quadraticCurveTo(0,145,-82,98);x.closePath();},'#e69c59',12);x.strokeStyle='#f6d995';x.lineWidth=8;for(let a=-1;a<=1;a++){x.beginPath();x.moveTo(a*43,-110);x.lineTo(a*36,92);x.stroke();}x.fillStyle='#b66c4d';x.fillRect(-18,118,36,18);x.beginPath();x.moveTo(0,136);x.lineTo(-15,214);x.lineTo(15,214);x.closePath();x.fill();x.restore();}
function drawWatch(x){x.save();x.strokeStyle='#b88b54';x.lineWidth=16;x.beginPath();x.moveTo(0,-225);x.quadraticCurveTo(110,-245,95,-150);x.stroke();outlinedPath(x,()=>x.arc(0,0,156,0,TAU),'#d8c58d',16);x.fillStyle=INK;for(let i=0;i<12;i++){const a=i/12*TAU-Math.PI/2;x.beginPath();x.arc(Math.cos(a)*118,Math.sin(a)*118,7,0,TAU);x.fill();}x.strokeStyle=INK;x.lineWidth=12;x.beginPath();x.moveTo(0,0);x.lineTo(0,-94);x.moveTo(0,0);x.lineTo(62,32);x.stroke();x.restore();}
function drawCup(x){x.save();outlinedPath(x,()=>{x.moveTo(-135,-90);x.lineTo(125,-90);x.lineTo(88,110);x.quadraticCurveTo(0,155,-88,110);x.closePath();},'#74b6c6',14);x.strokeStyle=INK;x.lineWidth=13;x.beginPath();x.ellipse(130,0,62,75,-.3,-1.5,1.5);x.stroke();x.strokeStyle='#e7d4a8';x.lineWidth=7;x.beginPath();x.moveTo(-130,-110);x.lineTo(128,-110);x.stroke();x.restore();}
function drawShoe(x,red=false){x.save();x.rotate(-.15);outlinedPath(x,()=>{x.moveTo(-185,80);x.quadraticCurveTo(-75,40,-20,-42);x.lineTo(68,-165);x.quadraticCurveTo(97,-186,106,-136);x.lineTo(88,-10);x.quadraticCurveTo(160,30,185,82);x.lineTo(170,113);x.lineTo(-165,113);x.closePath();},red?'#c95052':'#d9e0e1',14);x.fillStyle='#f3d995';x.beginPath();x.ellipse(34,-100,28,37,.25,0,TAU);x.fill();x.restore();}
function drawWater(x){x.save();for(let i=0;i<5;i++){ x.beginPath();x.moveTo(-230,20+i*48);x.bezierCurveTo(-120,-20+i*48,-30,65+i*48,50,25+i*48);x.bezierCurveTo(120,-15+i*48,190,66+i*48,235,26+i*48);x.strokeStyle=i%2?'#6eaebc':'#d3eef0';x.lineWidth=18;x.lineCap='round';x.stroke();}x.restore();}
function drawStar(x){x.save();x.fillStyle='#e7c76f';x.strokeStyle=INK;x.lineWidth=12;x.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?74:170;x.lineTo(Math.cos(a)*r,Math.sin(a)*r);}x.closePath();x.fill();x.stroke();x.restore();}
function drawTree(x,rose=false){x.save();x.fillStyle='#755845';x.fillRect(-28,-10,56,230);for(let j=0;j<4;j++){outlinedPath(x,()=>{x.moveTo(0,-340+j*84);x.lineTo(-160,-65+j*45);x.quadraticCurveTo(0,-30+j*45,160,-65+j*45);x.closePath();},rose?'#7c647e':['#76a86f','#80b679','#91bf7c','#a6c787'][j],10);}if(rose){for(let i=0;i<9;i++){x.fillStyle='#d36f86';x.beginPath();x.arc(-115+i*28,-250+(i%3)*38,16,0,TAU);x.fill();}}x.restore();}
function drawHouse(x,candy=false){x.save();outlinedPath(x,()=>{x.moveTo(-190,25);x.lineTo(-190,-155);x.lineTo(0,-300);x.lineTo(190,-155);x.lineTo(190,25);x.closePath();},candy?'#e8a6a2':'#d29c73',14);x.fillStyle='#f4e4c7';x.fillRect(-52,-50,104,75);x.strokeStyle=INK;x.lineWidth=8;x.strokeRect(-52,-50,104,75);if(candy){for(let i=0;i<5;i++){x.fillStyle=['#e66a72','#73b2aa','#f0c756'][i%3];x.beginPath();x.arc(-142+i*70,-160-(i%2)*25,22,0,TAU);x.fill();}}x.restore();}
function drawBird(x,white=false){x.save();x.fillStyle=white?'#f9f3df':'#858b85';x.strokeStyle=INK;x.lineWidth=12;x.beginPath();x.ellipse(0,25,180,72,-.08,0,TAU);x.fill();x.stroke();x.beginPath();x.moveTo(110,0);x.quadraticCurveTo(210,-95,235,-20);x.quadraticCurveTo(200,5,150,50);x.fill();x.stroke();x.beginPath();x.moveTo(170,20);x.lineTo(246,35);x.lineTo(173,53);x.closePath();x.fillStyle='#d59b53';x.fill();x.stroke();x.strokeStyle=INK;x.lineWidth=16;x.beginPath();x.moveTo(-30,45);x.quadraticCurveTo(20,-95,125,-38);x.stroke();x.restore();}
function drawApple(x){x.save();x.fillStyle='#c95052';x.strokeStyle=INK;x.lineWidth=13;x.beginPath();x.moveTo(0,-155);x.bezierCurveTo(-35,-190,-115,-162,-130,-70);x.bezierCurveTo(-155,35,-80,160,0,170);x.bezierCurveTo(82,160,155,35,130,-70);x.bezierCurveTo(115,-162,35,-190,0,-155);x.fill();x.stroke();x.strokeStyle='#74503c';x.lineWidth=15;x.beginPath();x.moveTo(0,-150);x.quadraticCurveTo(20,-205,7,-225);x.stroke();x.fillStyle='#82aa72';x.beginPath();x.ellipse(57,-190,48,22,.45,0,TAU);x.fill();x.stroke();x.restore();}
function drawCloudProp(x){x.save();x.fillStyle='#fff9eb';x.strokeStyle=INK;x.lineWidth=10;x.beginPath();x.moveTo(-185,55);x.quadraticCurveTo(-230,15,-198,-28);x.quadraticCurveTo(-170,-70,-112,-50);x.quadraticCurveTo(-90,-140,-18,-125);x.quadraticCurveTo(44,-120,55,-62);x.quadraticCurveTo(130,-104,178,-58);x.quadraticCurveTo(236,5,185,54);x.closePath();x.fill();x.stroke();x.restore();}
function drawCandy(x){x.save();x.fillStyle='#f0c75d';x.strokeStyle=INK;x.lineWidth=12;x.beginPath();x.moveTo(-80,-70);x.lineTo(-185,-145);x.lineTo(-155,-20);x.lineTo(-185,100);x.lineTo(-80,45);x.quadraticCurveTo(0,100,82,40);x.lineTo(185,100);x.lineTo(155,-20);x.lineTo(185,-145);x.lineTo(80,-70);x.quadraticCurveTo(0,-105,-80,-70);x.closePath();x.fill();x.stroke();x.fillStyle='#d86773';x.beginPath();x.ellipse(0,-15,78,83,.2,0,TAU);x.fill();x.stroke();x.restore();}
function drawBasket(x){x.save();x.fillStyle='#c18d54';x.strokeStyle=INK;x.lineWidth=12;x.beginPath();x.moveTo(-170,-55);x.lineTo(170,-55);x.lineTo(130,130);x.quadraticCurveTo(0,205,-130,130);x.closePath();x.fill();x.stroke();x.beginPath();x.ellipse(0,-55,170,48,0,0,TAU);x.stroke();x.lineWidth=9;for(let y=-25;y<115;y+=32){x.beginPath();x.moveTo(-145,y);x.quadraticCurveTo(0,y+25,145,y);x.stroke();}x.beginPath();x.arc(0,-45,122,Math.PI,TAU);x.stroke();x.restore();}
function drawButterfly(x){x.save();x.fillStyle='#db8393';x.strokeStyle=INK;x.lineWidth=10;for(const side of [-1,1]){x.beginPath();x.ellipse(side*73,-35,72,95,side*.36,0,TAU);x.fill();x.stroke();x.beginPath();x.ellipse(side*58,73,50,64,-side*.4,0,TAU);x.fillStyle='#edc66b';x.fill();x.stroke();}x.fillStyle='#75584c';x.beginPath();x.roundRect(-15,-62,30,155,14);x.fill();x.stroke();x.strokeStyle=INK;x.lineWidth=7;x.beginPath();x.moveTo(-4,-55);x.quadraticCurveTo(-55,-125,-70,-110);x.moveTo(4,-55);x.quadraticCurveTo(55,-125,70,-110);x.stroke();x.restore();}
function drawNotes(x){x.save();x.strokeStyle='#65556f';x.fillStyle='#d47778';x.lineWidth=13;for(const [px,py,s] of [[-115,15,1],[18,-55,.82],[120,55,.67]]){x.beginPath();x.ellipse(px,py,28*s,20*s,-.2,0,TAU);x.fill();x.stroke();x.beginPath();x.moveTo(px+22*s,py-5*s);x.lineTo(px+22*s,py-150*s);x.stroke();x.beginPath();x.moveTo(px+22*s,py-150*s);x.quadraticCurveTo(px+80*s,py-160*s,px+84*s,py-105*s);x.stroke();}x.restore();}
function drawRibbon(x){x.save();x.strokeStyle='#d9788b';x.lineWidth=24;x.lineCap='round';x.beginPath();x.moveTo(-205,25);x.bezierCurveTo(-105,-135,-5,155,90,-5);x.bezierCurveTo(140,-80,168,-90,202,-42);x.stroke();x.strokeStyle='#f3cf7b';x.lineWidth=6;x.stroke();x.restore();}
function drawPetals(x){x.save();for(let i=0;i<7;i++){const a=i/7*TAU;x.save();x.rotate(a);x.fillStyle=i%2?'#de91a0':'#e9a5aa';x.strokeStyle=INK;x.lineWidth=7;x.beginPath();x.ellipse(0,-93,42,87,0,0,TAU);x.fill();x.stroke();x.restore();}x.fillStyle='#e4c76f';x.beginPath();x.arc(0,0,43,0,TAU);x.fill();x.restore();}
function drawBed(x){x.save();x.fillStyle='#f0d9ce';x.strokeStyle=INK;x.lineWidth=12;x.beginPath();x.roundRect(-210,-55,420,175,30);x.fill();x.stroke();x.fillStyle='#fff7e9';x.beginPath();x.roundRect(-165,-35,155,75,24);x.fill();x.stroke();x.fillStyle='#c36f89';x.fillRect(-220,100,440,42);x.strokeRect(-220,100,440,42);x.fillRect(-192,142,27,70);x.fillRect(165,142,27,70);x.strokeRect(-192,142,27,70);x.strokeRect(165,142,27,70);x.strokeStyle='#8e6477';x.beginPath();x.moveTo(-220,-60);x.lineTo(-220,-205);x.quadraticCurveTo(0,-265,220,-205);x.lineTo(220,-60);x.stroke();x.restore();}
function drawSunbird(x){x.save();x.fillStyle='#e0ab4d';x.strokeStyle=INK;x.lineWidth=12;x.beginPath();x.ellipse(0,20,150,75,-.1,0,TAU);x.fill();x.stroke();x.fillStyle='#d67859';x.beginPath();x.moveTo(-20,20);x.quadraticCurveTo(-100,-155,75,-125);x.quadraticCurveTo(145,-55,42,30);x.closePath();x.fill();x.stroke();x.fillStyle='#e9c66a';x.beginPath();x.moveTo(130,10);x.lineTo(220,35);x.lineTo(134,58);x.closePath();x.fill();x.stroke();x.fillStyle='#bd6758';for(let i=0;i<3;i++){x.beginPath();x.moveTo(-125,45+i*18);x.quadraticCurveTo(-215,110+i*15,-205,160+i*14);x.quadraticCurveTo(-138,125+i*12,-86,75+i*11);x.closePath();x.fill();x.stroke();}x.fillStyle='#f0cf7b';x.beginPath();x.arc(78,-12,8,0,TAU);x.fill();x.restore();}
function drawTiger(x){x.save();x.fillStyle='#d68a48';x.strokeStyle=INK;x.lineWidth=12;x.beginPath();x.ellipse(-5,15,170,78,-.05,0,TAU);x.fill();x.stroke();x.beginPath();x.arc(144,-10,64,0,TAU);x.fill();x.stroke();for(const side of [-1,1]){x.beginPath();x.moveTo(105,-57);x.lineTo(116,-110);x.lineTo(149,-62);x.closePath();x.fill();x.stroke();}x.strokeStyle='#3d302e';x.lineWidth=15;for(let i=-2;i<=2;i++){x.beginPath();x.moveTo(i*48-12,-45);x.quadraticCurveTo(i*45,5,i*55+15,66);x.stroke();}for(const px of [-115,-42,42,105]){x.strokeStyle=INK;x.lineWidth=18;x.beginPath();x.moveTo(px,64);x.lineTo(px-8,138);x.stroke();}x.strokeStyle='#d68a48';x.lineWidth=18;x.beginPath();x.moveTo(-165,0);x.quadraticCurveTo(-235,-25,-220,-100);x.stroke();x.fillStyle='#6a4d3c';x.beginPath();x.arc(170,-22,8,0,TAU);x.fill();x.restore();}
function drawVillageProp(x){x.save();for(let i=0;i<3;i++){const px=-145+i*145,base=105,h=150+(i%2)*50;x.fillStyle=['#d18b70','#d5ad68','#829d99'][i];x.strokeStyle=INK;x.lineWidth=10;x.beginPath();x.moveTo(px-62,base);x.lineTo(px-62,base-h);x.lineTo(px,base-h-60);x.lineTo(px+62,base-h);x.lineTo(px+62,base);x.closePath();x.fill();x.stroke();x.fillStyle='#f3d995';x.fillRect(px-15,base-h+32,30,42);}x.restore();}
function drawBridge(x){x.save();x.fillStyle='#ddcda9';x.strokeStyle=INK;x.lineWidth=12;x.beginPath();x.moveTo(-220,95);x.lineTo(-220,10);x.quadraticCurveTo(0,-180,220,10);x.lineTo(220,95);x.quadraticCurveTo(0,-45,-220,95);x.closePath();x.fill();x.stroke();x.strokeStyle='#9c805f';x.lineWidth=9;for(let px=-160;px<=160;px+=40){x.beginPath();x.moveTo(px,10-Math.max(0,1-Math.abs(px)/220)*112);x.lineTo(px,85);x.stroke();}x.restore();}
function drawSunbeam(x){x.save();x.strokeStyle='#e5bd5e';x.lineWidth=15;for(let i=0;i<10;i++){const a=i/10*TAU;x.beginPath();x.moveTo(Math.cos(a)*105,Math.sin(a)*105);x.lineTo(Math.cos(a)*195,Math.sin(a)*195);x.stroke();}x.fillStyle='#f0cd74';x.strokeStyle=INK;x.lineWidth=12;x.beginPath();x.arc(0,0,100,0,TAU);x.fill();x.stroke();x.fillStyle='#8a667b';x.beginPath();x.ellipse(-35,2,27,12,0,0,TAU);x.ellipse(35,2,27,12,0,0,TAU);x.fill();x.restore();}
function drawPencil(x){x.save();x.rotate(-.55);x.fillStyle='#e6b64f';x.strokeStyle=INK;x.lineWidth=10;x.beginPath();x.roundRect(-36,-190,72,350,20);x.fill();x.stroke();x.fillStyle='#d8be96';x.beginPath();x.moveTo(-36,160);x.lineTo(36,160);x.lineTo(0,235);x.closePath();x.fill();x.stroke();x.fillStyle='#c87982';x.fillRect(-36,-220,72,38);x.strokeRect(-36,-220,72,38);x.restore();}
function drawBubbles(x){x.save();for(let i=0;i<8;i++){const px=-150+(i*83)%300,py=-155+(i*71)%300,r=23+(i%3)*9;x.fillStyle='rgba(207,239,239,.58)';x.strokeStyle=i%2?'#84c4ce':'#e8f4e9';x.lineWidth=9;x.beginPath();x.arc(px,py,r,0,TAU);x.fill();x.stroke();x.fillStyle='rgba(255,255,255,.75)';x.beginPath();x.arc(px-r*.35,py-r*.35,5,0,TAU);x.fill();}x.restore();}
function drawSpray(x){x.save();for(let i=0;i<13;i++){const px=-180+(i*59)%360,py=-145+(i*83)%280;x.fillStyle=i%2?'#91cbd2':'#e4f3ec';x.strokeStyle=INK;x.lineWidth=5;x.beginPath();x.ellipse(px,py,10+(i%3)*4,20+(i%4)*5,.3,0,TAU);x.fill();x.stroke();}x.restore();}
function drawPath(x){x.save();x.strokeStyle='#e8d7b7';x.lineWidth=66;x.lineCap='round';x.beginPath();x.moveTo(-230,130);x.bezierCurveTo(-100,10,-10,130,80,30);x.bezierCurveTo(140,-30,185,5,230,-75);x.stroke();x.strokeStyle='#a3c986';x.lineWidth=42;x.stroke();x.restore();}
function drawCave(x){x.save();x.fillStyle='#546373';x.strokeStyle=INK;x.lineWidth=14;x.beginPath();x.moveTo(-205,185);x.lineTo(-190,-85);x.quadraticCurveTo(-170,-235,0,-245);x.quadraticCurveTo(170,-235,190,-85);x.lineTo(205,185);x.closePath();x.fill();x.stroke();x.fillStyle='#e0bd69';for(const [px,py] of [[-96,50],[20,-80],[105,112]]){x.beginPath();x.moveTo(px,py-28);x.lineTo(px+25,py+8);x.lineTo(px,py+38);x.lineTo(px-25,py+8);x.closePath();x.fill();}x.restore();}
function drawGeneric(x,type){x.save();const name=type.toLowerCase();
  if(/apple/.test(name))drawApple(x);
  else if(/bubbles/.test(name))drawBubbles(x);
  else if(/foam/.test(name))drawCloudProp(x);
  else if(/spray/.test(name))drawSpray(x);
  else if(/path/.test(name))drawPath(x);
  else if(/cave/.test(name))drawCave(x);
  else if(/clocktower/.test(name))drawClocktower(x);
  else if(/theater/.test(name)){x.fillStyle='#875e62';x.strokeStyle=INK;x.lineWidth=12;x.beginPath();x.roundRect(-205,-180,410,330,24);x.fill();x.stroke();x.fillStyle='#d4777c';x.beginPath();x.moveTo(-205,-180);x.quadraticCurveTo(-115,-120,-92,-10);x.lineTo(-115,150);x.lineTo(-205,150);x.closePath();x.fill();x.stroke();x.beginPath();x.moveTo(205,-180);x.quadraticCurveTo(115,-120,92,-10);x.lineTo(115,150);x.lineTo(205,150);x.closePath();x.fill();x.stroke();x.fillStyle='#d5b16b';x.fillRect(-200,150,400,48);}
  else if(/strings/.test(name)){x.strokeStyle='#d7c69c';x.lineWidth=7;for(let i=-3;i<=3;i++){x.beginPath();x.moveTo(i*42,-200);x.lineTo(i*35,180);x.stroke();}}
  else if(/^nose$/.test(name)){x.fillStyle='#d5a25e';x.strokeStyle=INK;x.lineWidth=10;x.beginPath();x.moveTo(-30,110);x.lineTo(30,110);x.lineTo(8,-180);x.quadraticCurveTo(0,-225,-8,-180);x.closePath();x.fill();x.stroke();}
  else if(/^ring$/.test(name)){x.strokeStyle='#e4c46c';x.lineWidth=24;x.beginPath();x.ellipse(0,0,180,130,0,0,TAU);x.stroke();for(let i=0;i<6;i++){const a=i/6*TAU;x.fillStyle='#fff2ad';x.beginPath();x.arc(Math.cos(a)*180,Math.sin(a)*130,15,0,TAU);x.fill();}}
  else if(/crest|emblem/.test(name))drawCrest(x);
  else if(/tea-table/.test(name)){ x.fillStyle='#a97a56';x.strokeStyle=INK;x.lineWidth=12;x.beginPath();x.roundRect(-220,-80,440,72,24);x.fill();x.stroke();x.fillRect(-180,-8,28,180);x.fillRect(152,-8,28,180);x.strokeRect(-180,-8,28,180);x.strokeRect(152,-8,28,180);x.restore();drawCup(x);return;}
  else if(/cloud/.test(name))drawCloudProp(x);
  else if(/note|music-box/.test(name))drawNotes(x);
  else if(/light-ribbon/.test(name))drawRibbon(x);
  else if(/sunbeam/.test(name))drawSunbeam(x);
  else if(/petal/.test(name))drawPetals(x);
  else if(/bed/.test(name))drawBed(x);
  else if(/butterfly/.test(name))drawButterfly(x);
  else if(/basket/.test(name))drawBasket(x);
  else if(/pencil/.test(name))drawPencil(x);
  else if(/candy/.test(name)&&!/house/.test(name))drawCandy(x);
  else if(/sunbird|golden-wing/.test(name))drawSunbird(x);
  else if(/tiger/.test(name))drawTiger(x);
  else if(/village/.test(name))drawVillageProp(x);
  else if(/pier/.test(name)){x.save();x.fillStyle='#a9825d';x.strokeStyle=INK;x.lineWidth=10;x.beginPath();x.roundRect(-210,-40,420,140,20);x.fill();x.stroke();for(let i=0;i<7;i++){x.beginPath();x.moveTo(-180+i*60,-34);x.lineTo(-180+i*60,92);x.stroke();}for(const px of [-175,0,175]){x.fillRect(px-9,90,18,100);}x.restore();}
  else if(/mountain|ridge|island/.test(name)){x.fillStyle='#8da59b';x.strokeStyle=INK;x.lineWidth=12;x.beginPath();x.moveTo(-220,150);x.lineTo(-175,-5);x.lineTo(-100,-120);x.lineTo(-40,-15);x.lineTo(38,-200);x.lineTo(110,-45);x.lineTo(173,-118);x.lineTo(225,150);x.closePath();x.fill();x.stroke();x.fillStyle='#f3ead7';x.beginPath();x.moveTo(-9,-123);x.lineTo(38,-200);x.lineTo(72,-124);x.lineTo(44,-139);x.lineTo(28,-120);x.closePath();x.fill();}
  else if(/bridge|arch|stair/.test(name))drawBridge(x);
  else if(/castle|palace|tower|gate|house/.test(name)){if(/candy/.test(name))drawHouse(x,true);else if(/house/.test(name))drawHouse(x,false);else drawCastleProp(x);}
  else if(/boat|fleet|armada/.test(name))drawBoat(x);
  else if(/cape|cloak/.test(name))drawCape(x);
  else if(/heart/.test(name))drawHeart(x);
  else if(/lantern/.test(name))drawLantern(x);
  else if(/watch|clock|chain/.test(name))drawWatch(x);
  else if(/cup|tea/.test(name))drawCup(x);
  else if(/shoe/.test(name))drawShoe(x,/red/.test(name));
  else if(/waterfall/.test(name)){x.save();for(let i=0;i<6;i++){x.fillStyle=i%2?'#8cc7d2':'#d8edf0';x.strokeStyle=INK;x.lineWidth=6;x.beginPath();x.moveTo(-180+i*60,-225);x.bezierCurveTo(-210+i*60,-80,-145+i*60,45,-175+i*60,180);x.lineTo(-115+i*60,180);x.bezierCurveTo(-90+i*60,40,-140+i*60,-80,-115+i*60,-225);x.closePath();x.fill();x.stroke();}x.restore();}
  else if(/river|water|spray|foam|bubble|current|rapids|mirror/.test(name))drawWater(x);
  else if(/star|spark|emblem|firework|sun-wheel/.test(name))drawStar(x);
  else if(/tree|rose|blossom|bean|cliff|grass|forest/.test(name))drawTree(x,/rose/.test(name));
  else if(/duck|swan|bird/.test(name))drawBird(x,/swan|bird/.test(name));
  else if(/wolf|dragon|shadow/.test(name)){x.fillStyle='#36414b';x.strokeStyle=INK;x.lineWidth=14;x.beginPath();x.moveTo(-200,90);x.lineTo(-150,-80);x.lineTo(-70,-12);x.lineTo(0,-170);x.lineTo(75,-36);x.lineTo(195,-87);x.lineTo(150,98);x.closePath();x.fill();x.stroke();x.fillStyle='#e7c87d';x.beginPath();x.arc(106,-25,10,0,TAU);x.fill();}
  else if(/harp/.test(name)){x.strokeStyle='#d0a352';x.lineWidth=17;x.beginPath();x.moveTo(-130,170);x.quadraticCurveTo(-160,-170,120,-200);x.lineTo(148,175);x.stroke();x.lineWidth=6;for(let i=0;i<8;i++){x.beginPath();x.moveTo(-92+i*28,-110-i*12);x.lineTo(-90+i*29,160);x.stroke();}}
  else if(/chest|gem/.test(name)){outlinedPath(x,()=>{x.roundRect(-180,-20,360,180,25);},'#99664e',15);x.fillStyle='#e2bf68';x.fillRect(-180,-90,360,70);x.strokeStyle=INK;x.lineWidth=12;x.strokeRect(-180,-90,360,70);for(let i=0;i<5;i++){x.fillStyle=['#6ac3ce','#c96f91','#e7c76f'][i%3];x.beginPath();x.moveTo(-130+i*60,-160);x.lineTo(-102+i*60,-110);x.lineTo(-158+i*60,-110);x.closePath();x.fill();}}
  else if(/puppet|pinocchio|nose/.test(name)){x.fillStyle='#bd8a58';outlinedPath(x,()=>{x.roundRect(-90,-80,180,250,48);},'#d8a764',12);x.fillStyle='#f3d5b7';x.beginPath();x.arc(0,-160,76,0,TAU);x.fill();x.stroke();x.fillStyle=INK;x.beginPath();x.arc(-25,-178,10,0,TAU);x.arc(25,-178,10,0,TAU);x.fill();x.fillStyle='#d9a968';x.fillRect(-14,-158,185,15);}
  else if(/city|observatory/.test(name)){x.fillStyle='#85959a';x.strokeStyle=INK;for(let i=0;i<6;i++){x.fillRect(-200+i*70,-70-(i%3)*50,55,230);x.lineWidth=7;x.strokeRect(-200+i*70,-70-(i%3)*50,55,230);}}
  else if(/wheel|mill/.test(name)){x.strokeStyle='#9d7758';x.lineWidth=18;x.beginPath();x.arc(0,0,145,0,TAU);x.stroke();for(let i=0;i<8;i++){const a=i/8*TAU;x.beginPath();x.moveTo(0,0);x.lineTo(Math.cos(a)*145,Math.sin(a)*145);x.stroke();}x.fillStyle='#d7b577';x.beginPath();x.arc(0,0,34,0,TAU);x.fill();}
  else if(/page|map|book|parchment|curtain/.test(name)){outlinedPath(x,()=>{x.moveTo(-190,-200);x.quadraticCurveTo(0,-230,190,-200);x.lineTo(165,210);x.quadraticCurveTo(0,170,-165,210);x.closePath();},'#f3e8d3',12);x.strokeStyle='#74828a';x.lineWidth=5;x.beginPath();x.moveTo(-100,-90);x.quadraticCurveTo(0,-130,105,-80);x.lineTo(85,110);x.stroke();}
  else {drawStar(x);}
  x.restore();
}
export function propSprite(type,seed=1){const c=cv(600,700),x=c.getContext('2d');x.save();x.translate(300,350);drawGeneric(x,type);x.restore();return finishCut(c,15,{edge:'#b8ae9f',paper:PAPER,grainA:.5});}
export function isNightTheme(theme){return /night|rose|cloak|cosmic|gem-cave|deep/.test(theme);}
export function roleInfo(role){return ROLE[role]||ROLE.whale;}
