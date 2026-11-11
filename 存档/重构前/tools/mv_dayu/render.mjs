// Independent 29s music video. Procedural backgrounds and existing v13 sprite atlases.
// Cue times are estimates from source video subtitle frames, NOT measured ASR.
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import path from 'node:path';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
const {createCanvas,loadImage,GlobalFonts}=require('../engine/node_modules/@napi-rs/canvas');
const root=path.resolve('.'), dir=path.join(root,'assets/ai-girls/lyric-action-v13');
if(!GlobalFonts.registerFromPath('tools/mv_extra/cache/NotoSansSC-Bold.ttf','Noto')) throw Error('Missing pinned CJK font');
const names=['whale_read_action','whale_gather_retry_action','whale_walk_retry_action','whale_rain_reach_blink_action','whale_selfkind_retry_action','whale_meet_action','whale_wipe_tear_action','whale_sit_blink_action','whale_bird','whale_point','gpt_push_final_action','claude_collect_action','doubao_step_action','qwen_reach_action'];
const img={}; for(const n of names) img[n]=await loadImage(path.join(dir,n+'.png'));
const shots=[
 {a:0,b:5.35,sub:['我怀疑大禹治水','治没了我的薪水'],pivot:3.65,lead:['whale_read_action','whale_gather_retry_action'],guest:'gpt_push_final_action'},
 {a:5.35,b:8.85,sub:['后羿射日','射没了我的周日'],pivot:7.65,lead:['whale_point','whale_wipe_tear_action'],guest:'claude_collect_action'},
 {a:8.85,b:12.55,sub:['愚公移山','移走了我的靠山'],pivot:10.75,lead:['whale_walk_retry_action','whale_meet_action'],guest:'gpt_push_final_action'},
 {a:12.55,b:15.45,sub:['女娲造人','给我造的小人'],pivot:13.65,lead:['whale_read_action','whale_rain_reach_blink_action'],guest:'doubao_step_action'},
 {a:15.45,b:19,sub:['我怀疑凿壁偷光','偷光了我的积蓄'],pivot:17.65,lead:['whale_read_action','whale_wipe_tear_action'],guest:'claude_collect_action'},
 {a:19,b:23.10,sub:['草船丞相','抢走了我的对象'],pivot:21.6,lead:['whale_bird','whale_rain_reach_blink_action'],guest:'qwen_reach_action'},
 {a:23.1,b:27.65,sub:['孔融让梨就是','让我离职'],pivot:24.75,lead:['whale_meet_action','whale_rain_reach_blink_action'],guest:'doubao_step_action'},
 {a:27.65,b:29.333333,sub:['孟母三迁我月薪','也是三千'],pivot:28.65,lead:['whale_walk_retry_action','whale_sit_blink_action'],guest:'claude_collect_action'}];
const W=1920,H=1080,FPS=30,N=880,cv=createCanvas(W,H),c=cv.getContext('2d');
const clamp=x=>Math.max(0,Math.min(1,x));const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
function box(x,y,w,h,color,r=0){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill()}
function stroke(x,y,w,h,color,r=0,width=2){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.roundRect(x,y,w,h,r);c.stroke()}
function circle(x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill()}
function ellipse(x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill()}
function line(points,color,width=3){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke()}
function poly(points,color){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill()}
function text(s,x,y,size=22,color='#fff',align='center'){c.font=`bold ${size}px Noto`;c.textAlign=align;c.textBaseline='middle';c.fillStyle=color;c.fillText(s,x,y)}
function room(t){
 const g=c.createLinearGradient(0,0,0,720);g.addColorStop(0,'#12374c');g.addColorStop(.63,'#2c6e7c');g.addColorStop(1,'#ba9873');c.fillStyle=g;c.fillRect(0,0,1280,720);
 // paneled wall, tall shelves, plants and changing ocean outside the porthole
 for(let x=0;x<1280;x+=180)box(x,0,4,474,'rgba(13,43,58,.18)');
 box(52,108,187,242,'#234459',12);for(let r=0;r<3;r++){box(58,167+r*59,175,8,'#c59a67',3);for(let j=0;j<7;j++)box(64+j*22,129+r*59+(j%2)*6,14,37-(j%2)*6,['#e8bd7e','#89aeb0','#d87e70','#b5c89b'][j%4],2)}
 circle(375,195,119,'#cba879');circle(375,195,107,'#163b57');circle(375,195,99,'#247e9d');
 c.save();c.beginPath();c.arc(375,195,98,0,Math.PI*2);c.clip();
 for(let i=0;i<9;i++){let y=300-((t*18+i*38)%230),x=300+i*19+Math.sin(t*.7+i)*7;circle(x,y,2+i%3,'rgba(218,249,246,.55)')}
 for(let i=0;i<3;i++){let x=280+((t*18+i*67)%190),y=155+i*28;ellipse(x,y,12,4,'rgba(188,229,224,.45)');poly([[x-10,y],[x-18,y-6],[x-18,y+6]],'rgba(188,229,224,.45)')};c.restore();
 for(let i=0;i<8;i++){let a=i*Math.PI/4;circle(375+110*Math.cos(a),195+110*Math.sin(a),3,'#f4dfb2')}
 box(1012,85,186,250,'#295160',12);box(1020,95,170,224,'#d5c5a0',5);for(let i=0;i<4;i++)box(1038+(i%2)*75,115+Math.floor(i/2)*84,60,63,['#efb88a','#b0d1ca','#f1dea9','#c4d3ae'][i],3);
 // Floor and foreground desk
 box(0,475,1280,245,'#6d8b87');for(let i=0;i<9;i++)line([[i*170,475],[i*185-70,720]],'rgba(246,228,185,.13)',2);
 ellipse(640,647,510,53,'rgba(27,48,53,.25)');box(74,498,1132,38,'#e5bf85',9);box(74,531,1132,90,'#9e684e',4);box(88,539,1102,6,'#bd8662');box(125,619,38,101,'#79533f');box(1115,619,38,101,'#79533f');
 // desk lamp / plant in back
 box(1080,430,100,13,'#d4a961',6);line([[1130,428],[1120,360],[1085,319]],'#efc878',10);poly([[1040,318],[1104,318],[1090,284],[1060,284]],'#e9bb63');circle(1070,320,6,'#ffeab6');
 box(86,446,52,49,'#b97059',5);for(let i=0;i<5;i++){line([[112,450],[90+i*12,401-Math.abs(i-2)*7]],'#a5d6b5',4);ellipse(90+i*12,407-Math.abs(i-2)*7,7,15,'#84bda9')}
}
function book(){box(668,475,430,23,'rgba(32,32,32,.2)',8);poly([[672,371],[878,390],[878,486],[672,467]],'#f3e7c8');poly([[878,390],[1079,371],[1079,467],[878,486]],'#fff2d4');line([[878,391],[878,485]],'#c3a27b',3);for(let i=0;i<3;i++){line([[690,400+i*18],[790,410+i*18]],'rgba(163,135,98,.27)',2);line([[930,409+i*18],[1040,400+i*18]],'rgba(163,135,98,.27)',2)}}
function envelope(x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);box(-47,-28,94,56,'#fff0d1',4);stroke(-47,-28,94,56,'#bd9670',4,2);line([[-43,-24],[0,6],[43,-24]],'#c69e78',2);c.restore()}
function crane(x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);poly([[-35,3],[-2,-7],[16,-27],[12,-1],[37,9],[3,12],[-17,25]],'#ffefcb');line([[-35,3],[3,12],[16,-27]],'#c2a585',1.5);c.restore()}
function house(x,y,col){poly([[x-40,y],[x,y-40],[x+40,y]],'#d3956f');box(x-32,y,64,51,col,3);box(x-7,y+20,14,31,'#927966',2);box(x+11,y+7,11,11,'#fff2c4',2)}
// Small jointed paper puppet: independently moving arm and legs, not a static silhouette.
function puppet(x,y,t,col='#d99870',mode='wave',sc=1){c.save();c.translate(x,y);c.scale(sc,sc);let a=Math.sin(t*5)*.65;line([[0,-44],[-17+a*10,-18],[-25+a*15,2]],col,8);line([[0,-44],[19-a*12,-20],[29-a*15,-3]],col,8);line([[-5,-20],[-13+a*8,10],[-19+a*11,24]],col,7);line([[5,-20],[15-a*8,10],[20-a*11,24]],col,7);poly([[-16,-48],[16,-48],[13,-20],[-13,-20]],col);circle(0,-64,13,col);box(-15,-79,30,7,'#6c5772',2);c.restore()}
function atlas(n,t,start,end,x,y,h){const im=img[n], f=Math.min(15,Math.floor(clamp((t-start)/Math.max(.1,end-start))*16));const w=h*384/416;c.drawImage(im,f*384,0,384,416,x-w/2,y-h,w,h)}
function scene(i,t,s){let u=clamp((t-s.a)/(s.b-s.a)),p=smooth((u-.38)/.35);book();
 if(i===0){ // Water pushes the envelope away in a paper flood.
  for(let j=0;j<4;j++){let yy=405+j*13;line([[690,yy],[740,yy-8],[790,yy+4],[840,yy-7],[910,yy]],`rgba(81,185,203,${.40+j*.08})`,6)}
  for(let j=0;j<4;j++)box(700+j*25,443,23,12,'#c99266',2);envelope(925+p*115,429+p*16,.63);puppet(1020,440,t,'#d99a6e','wave',.85);
 }else if(i===1){ // an arrow flies into a Sunday page; the page folds away
  box(762,284,208,166,'#f4e2bb',8);box(762,284,208,28,'#d68b76',7);circle(797,296,4,'#735c58');circle(933,296,4,'#735c58');
  text('周日',865,365,47,'#a36d60');if(p>.45){c.save();c.globalAlpha=p;poly([[762,310],[970,310],[970,447],[762,447]],'#e8d9b8');text('休息？',865,365,34,'#a2907b');c.restore()}
  circle(1063,260,44,'#f7c962');for(let k=0;k<8;k++){let a=k*Math.PI/4;line([[1063+52*Math.cos(a),260+52*Math.sin(a)],[1063+64*Math.cos(a),260+64*Math.sin(a)]],'#f7c962',4)}
  let ax=1080-p*230,ay=325+p*10;line([[ax+65,ay-4],[ax,ay]],'#8b6247',4);poly([[ax-12,ay],[ax+4,ay-7],[ax+4,ay+7]],'#8b6247');puppet(1090,447,t,'#d99870','wave',.8);
 }else if(i===2){ // moving mountain / support vanishes
  let mx=830+p*180;poly([[mx-150,472],[mx-48,291],[mx+6,364],[mx+60,320],[mx+165,472]],'#7aab9c');poly([[mx-80,347],[mx-48,291],[mx-13,343],[mx-45,332]],'#f3ebd1');poly([[mx-130,472],[mx-26,354],[mx+71,472]],'#587f78');puppet(mx+143,447,t,'#d8a376','walk',.78);ellipse(820,475,48,12,'#ddb091');
 }else if(i===3){ // small paper people and conflicting blank notes
  for(let j=0;j<3;j++){puppet(790+j*105,452,t+j*.43,['#e9a987','#c39eb7','#a2c2b6'][j],'wave',.65);c.save();c.translate(765+j*105,315+Math.sin(t*3+j)*9);c.rotate((j-1)*.12);box(0,0,76,52,['#f1d484','#e7a8a4','#aed9d0'][j],4);c.restore()}
  poly([[940,272],[1060,290],[1047,311],[932,300]],'#e5c4a0');circle(934,287,18,'#e5c4a0');
 }else if(i===4){ // light through wall, tokens disappear
  box(766,277,160,174,'#d5aa83',8);for(let k=0;k<3;k++)line([[770,320+k*37],[922,320+k*37]],'#b78970',2);circle(852,356,13,'#503e45');poly([[858,348],[1015,280],[1055,404],[858,364]],'rgba(255,230,153,.34)');
  box(970,365,81,93,'rgba(220,240,224,.42)',12);stroke(970,365,81,93,'#e0efdb',12,3);box(966,352,89,14,'#bb8f6c',3);for(let j=0;j<3;j++){let dx=p*130;circle(994+j*18+dx,435+j*3,8,'#e9c27d')}
 }else if(i===5){ // paired cranes, boat sails away
  crane(770,431,.8);crane(840+p*180,431-p*35,.75);let bx=862+p*175;poly([[bx-65,444],[bx+65,444],[bx+42,469],[bx-40,469]],'#bd8767');line([[bx,444],[bx,374]],'#986f56',4);poly([[bx,380],[bx,435],[bx+52,435]],'#f5e3bc');for(let j=0;j<3;j++)line([[690,472+j*7],[760,468+j*7],[835,472+j*7]],'#75cbd4',3);
 }else if(i===6){ // pear opens to blank letter, no claimed handoff
  let x=860;ellipse(x,414,47,54,'#e5c779');ellipse(x,389,30,36,'#e5c779');line([[x,355],[x+4,342]],'#856c52',4);ellipse(x+12,349,12,5,'#7cab7e');if(p>.3)envelope(x+130,414,.9);puppet(1030,453,t,'#d29a78','wave',.8);
 }else { // moving home paper markers, cup remains
  for(let j=0;j<3;j++){let dx=smooth((u-j*.18)/.32)*55;house(765+j*110+dx,408,['#e9c58d','#9bc9c1','#d99b87'][j])}box(1043,427,52,42,'#f8edd7',6);stroke(1094,434,17,23,'#f8edd7',8,4);ellipse(1068,427,24,5,'#d4b395')
 }
}
function render(t){let i=shots.findIndex(s=>t>=s.a&&t<s.b);if(i<0)i=7;let s=shots[i],part=t<s.pivot?0:1;c.save();c.setTransform(1.5,0,0,1.5,0,0);room(t);scene(i,t,s);
 // Existing atlas actions: stage presence and reaction are hard cuts; no fabricated contact.
 let segStart=part?s.pivot:s.a,segEnd=part?s.b:s.pivot;
 atlas(s.lead[part],t,segStart,segEnd,458,590,412);
 let guestX=1160,guestH=166;atlas(s.guest,t,s.a,s.b,guestX,505,guestH);
 // persistent attribution outside caption; no outro card.
 box(1007,18,247,28,'rgba(13,35,46,.76)',7);text('非官方同人 / AI生成',1130,32,14,'#eaf5ed');
 // Captions are planning only and follow the user's exact words.
 if(t>=1.15){let sub=s.sub[part];box(345,642,590,50,'rgba(16,38,50,.74)',14);text(sub,640,666,29,'#fff7dd')}
 c.restore();}
const out=path.join(root,'番外MV/我怀疑大禹治水/样片/一次生成_歌词MV_待审.mp4');fs.mkdirSync(path.dirname(out),{recursive:true});
const ff=process.env.FFMPEG;if(!ff)throw Error('Set FFMPEG to imageio-ffmpeg binary');
const args=['-y','-loglevel','error','-f','rawvideo','-pixel_format','rgba','-video_size',`${W}x${H}`,'-framerate',String(FPS),'-i','-','-i',path.join(root,'我怀疑大禹治水治没了我的薪水.mp3'),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','veryfast','-crf','20','-threads','2','-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart',out];
const proc=spawn(ff,args,{stdio:['pipe','inherit','inherit']});proc.stdin.on('error',e=>console.error(e));
for(let f=0;f<N;f++){render(f/FPS);if(!proc.stdin.write(cv.data()))await once(proc.stdin,'drain');if(f%12===0&&global.gc)global.gc();if((f+1)%120===0)console.log(`rendered ${f+1}/${N}`)}proc.stdin.end();let [code]=await once(proc,'close');if(code!==0)throw Error(`ffmpeg exited ${code}`);console.log(`Finished ${out}`);
