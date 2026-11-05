// Four actual-source-time clips through the SAME shared renderer. Edited review, never a continuous episode.
import fs from'node:fs';import{spawn}from'node:child_process';import{once}from'node:events';
import spec,{alignment}from'./episode.production.spec.mjs';import{createEpisodeRenderer}from'../engine/render_episode.mjs';import{createCanvas,resolveFfmpeg,drawText}from'../engine/room_base.mjs';
const opening=process.argv.includes('--opening-only');
const clips=opening?[[0,2]]:[[0,4],[19,26],[66,75],[91.2,104.3]];
const out=opening?'/home/user/day12-v2-opening.mp4':'Day12/样片/Day12_v2_四段动态审看_有声.mp4';
const r=await createEpisodeRenderer({spec,alignment,subdata:JSON.parse(fs.readFileSync('tools/day12制作/subtitle_timing.json'))});
const c=createCanvas(1920,1080),g=c.getContext('2d');const filters=clips.map(([a,b],i)=>`[1:a]atrim=start=${a}:end=${b},asetpts=PTS-STARTPTS[a${i}]`).join(';')+';'+clips.map((_,i)=>`[a${i}]`).join('')+`concat=n=${clips.length}:v=0:a=1[a]`;
const ff=spawn(resolveFfmpeg(),['-v','error','-y','-f','rawvideo','-pix_fmt','rgba','-s','1920x1080','-r','30','-i','-','-i','鲸鱼摇人_克隆配音_最终版.wav','-filter_complex',filters,'-map','0:v','-map','[a]','-c:v','libx264','-preset','veryfast','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-ac','2','-ar','44100','-movflags','+faststart',out],{stdio:['pipe','ignore','inherit']});
for(let i=0;i<clips.length;i++){const[a,b]=clips[i];for(let f=0;f<Math.round((b-a)*30);f++){g.setTransform(1.5,0,0,1.5,0,0);g.clearRect(0,0,1280,720);r.renderFrame(g,a+f/30);if(!opening){g.fillStyle='#102139';g.fillRect(16,12,380,36);drawText(g,`v2动态审看 · 片段${i+1} · 非连续剧情`,206,30,18,'#F4E9C6');}const buf=c.data();if(!ff.stdin.write(Buffer.from(buf)))await once(ff.stdin,'drain');}console.log('clip',i+1,a,b);}
ff.stdin.end();const[code]=await once(ff,'close');if(code)throw Error('Review encode failed');
if(!opening)fs.writeFileSync('tools/day12制作/v2_review.json',JSON.stringify({video:out,source_sha256:alignment.source_sha256,clips,frames:993,duration:33.1,audio:'original voice source segments, dry preview',humanDynamicReview:'pending; automatic checks/stills are not human playback approval'},null,2)+'\n');
