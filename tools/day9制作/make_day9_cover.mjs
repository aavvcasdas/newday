// Code-only Day9 covers. Uses actual final-film frame for the TV, not generated imagery.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createCanvas,loadImage,loadSpritePoses,WGF,bg,laptop6,day3RiceBowl,resolveFfmpeg,reseedBoil} from '../day8制作/render_day8.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const out=path.join(root,'Day9/封面');fs.mkdirSync(out,{recursive:true});
const timing=JSON.parse(fs.readFileSync(path.join(root,'tools/day9制作/voice_alignment.json')));
const cue=timing.cues[35],time=(cue.start+cue.end)/2;
const still=path.join('/tmp','day9-cover-tv.png');
const proc=spawnSync(resolveFfmpeg(),['-v','error','-y','-ss',String(time),'-i',path.join(root,'Day9/成片/Day9_笨鱼看同类_配音对齐版.mp4'),'-vf','crop=1044:696:798:135','-frames:v','1',still]);
if(proc.status!==0)throw Error(proc.stderr.toString());
const tv=await loadImage(still);await loadSpritePoses();
function text(g,s,x,y,size,color){g.save();g.textAlign='center';g.font=`900 ${size}px NotoSansSC`;g.lineJoin='round';g.strokeStyle='#07182B';g.lineWidth=size*.12;g.strokeText(s,x,y);g.fillStyle=color;g.fillText(s,x,y);g.restore();}
function box(g,x,y,w,h,r,color){g.fillStyle=color;g.beginPath();g.roundRect(x,y,w,h,r);g.fill();}
for(const [ratio,w,h] of [['3比4',1080,1440],['4比3',1440,1080]]){
 const portrait=h>w,c=createCanvas(w,h),g=c.getContext('2d');
 reseedBoil(0);g.save();g.scale(w/1280,h/720);bg(g,0);g.restore();
 const grad=g.createLinearGradient(0,0,0,h*.72);grad.addColorStop(0,'#08182CF2');grad.addColorStop(.68,'#0D2338EE');grad.addColorStop(1,'#102A3F55');g.fillStyle=grad;g.fillRect(0,0,w,h);
 text(g,'越修越坏',w/2,portrait?182:137,portrait?130:111,'#F6F3E7');
 text(g,'饭钱越少',w/2,portrait?346:283,portrait?145:132,'#FFDB85');
 box(g,w*.16,portrait?397:321,w*.68,portrait?69:60,15,'#1A4859');
 text(g,'先别修了，看视频去！',w/2,portrait?446:365,portrait?42:38,'#DFF5EB');
 const tw=portrait?575:642,tx=portrait?489:760,ty=portrait?608:448;
 g.save();g.shadowColor='#030A16BB';g.shadowBlur=23;g.shadowOffsetY=13;g.drawImage(tv,tx,ty,tw,tw*tv.height/tv.width);g.restore();
 const ax=portrait?330:420,ay=portrait?1291:979,u=portrait?66:55;
 WGF(g,ax,ay,u,{t:0,pose:'playful_fists',rot:-.025});
 laptop6(g,ax+8,portrait?1280:974,portrait?1.03:.91,0,true);
 day3RiceBowl(g,portrait?845:1176,portrait?1224:952,portrait?5.5:4.8,.12,0);
 text(g,'它吃本鲸的，还得陪它挨骂？',w/2,h*.969,portrait?40:38,'#F4E8CF');
 fs.writeFileSync(path.join(out,`Day9封面_${ratio}.png`),c.toBuffer('image/png'));
}
console.log('Day9 covers complete: 1080x1440 and 1440x1080');
