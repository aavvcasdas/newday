// A limited test excerpt; never overwrite the v8 master.
import { frame, WIDTH, HEIGHT } from './film.mjs';
import { ROOT } from './actors.mjs';
import { execFileSync,spawn } from 'node:child_process';
import {once} from 'node:events';
import path from 'node:path';
const START=Number(process.env.SAMPLE_START || 1165), END=Number(process.env.SAMPLE_END || 1281), fps=30;
const out=path.join(ROOT,process.env.SAMPLE_OUT || '番外MV/把回忆拼好给你/样片/v13_v8背景_深海动作试片.mp4');
const ff=execFileSync(path.join(ROOT,'.venv/bin/python'),['-c','import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'],{encoding:'utf8'}).trim();
const a=['-y','-v','error','-f','rawvideo','-pix_fmt','rgba','-s',`${WIDTH}x${HEIGHT}`,'-r',String(fps),'-i','-','-ss',String(START/fps),'-t',String((END-START)/fps),'-i',path.join(ROOT,'tools/mv_extra/cache/source48.wav'),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-threads','2','-preset','veryfast','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',out];
const proc=spawn(ff,a,{stdio:['pipe','inherit','inherit']});
for(let f=START;f<END;f++){if(!proc.stdin.write(frame(f/fps).data()))await once(proc.stdin,'drain');if(f%12===0&&global.gc)global.gc();if((f-START+1)%30===0)console.log(`rendered ${f-START+1}/${END-START}`)}
proc.stdin.end();const [code]=await once(proc,'close');if(code)throw new Error(`ffmpeg ${code}`);console.log('saved',out);
