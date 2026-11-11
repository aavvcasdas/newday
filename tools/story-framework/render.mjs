#!/usr/bin/env node
// Renders any Remotion entry built on createMVComp, with optional local audio.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import chromium, {inflate} from '@sparticuz/chromium';
const dir=path.dirname(fileURLToPath(import.meta.url));
const args=process.argv.slice(2);
const get=(name, fallback)=>{const i=args.indexOf(name); if(i<0)return fallback; if(!args[i+1] || args[i+1].startsWith('--')) throw new Error(`缺少 ${name} 参数`); return args[i+1];};
if(args.includes('--help')) { console.log('node tools/mv-framework/render.mjs --out <mp4/png> [--entry <tsx>] [--audio <file>] [--offset <seconds>] [--frames <start-end>] [--still <frame>] [--browser <path>]'); process.exit(0); }
let server;
try {
 const out=get('--out'); if(!out) throw new Error('必须指定 --out');
 const audio=get('--audio'); const offset=Number(get('--offset','0')); if (!Number.isFinite(offset)) throw new Error('offset 必须是数字');
 let audioSrc=null;
 if(audio){
  const file=path.resolve(audio); const stat=fs.statSync(file); if(!stat.isFile()) throw new Error('音频路径不是文件');
  server=http.createServer((req,res)=>{
   if(req.url!=='/audio') {res.writeHead(404).end();return;}
   const type={'.mp3':'audio/mpeg','.wav':'audio/wav','.m4a':'audio/mp4','.mp4':'video/mp4','.aac':'audio/aac','.ogg':'audio/ogg'}[path.extname(file).toLowerCase()] || 'application/octet-stream';
   const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/); let start=0, end=stat.size-1;
   if(range){start=Number(range[1]); end=range[2]?Math.min(Number(range[2]),end):end; if(start>end){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`}).end();return;}}
   res.writeHead(range?206:200,{'Content-Type':type,'Accept-Ranges':'bytes','Content-Length':end-start+1,...(range?{'Content-Range':`bytes ${start}-${end}/${stat.size}`}:{})});
   fs.createReadStream(file,{start,end}).pipe(res);
  });
  await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve)); audioSrc=`http://127.0.0.1:${server.address().port}/audio`;
 }
 let browser=get('--browser', process.env.CHROME_EXECUTABLE);
 if(!browser && process.platform==='linux'){
  const libRoot=await inflate(path.join(dir,'node_modules/@sparticuz/chromium/bin/al2023.tar.br'));
  process.env.LD_LIBRARY_PATH=`${libRoot}/lib:${process.env.LD_LIBRARY_PATH||''}`;
  browser=await chromium.executablePath();
 }
 const inputProps={}; if(audio) inputProps.audioSrc=audioSrc; if(args.includes('--offset')) inputProps.audioOffset=offset;
 const serveUrl=await bundle({entryPoint:path.resolve(get('--entry',path.join(dir,'src/entry.tsx'))), publicDir:path.join(dir,'public')});
 const composition=await selectComposition({serveUrl,id:get('--id','MV'),inputProps,browserExecutable:browser,chromiumOptions:{gl:'swangle'}});
 if(args.includes('--still')){
  const frame=Number(get('--still')); if(!Number.isInteger(frame)||frame<0||frame>=composition.durationInFrames) throw new Error('无效帧号');
  await renderStill({composition,serveUrl,output:path.resolve(out),frame,inputProps,browserExecutable:browser,chromiumOptions:{gl:'swangle'}});
 } else {
  const range=get('--frames'); let frameRange;
  if(range){ const m=range.match(/^(\d+)-(\d+)$/); if(!m || +m[1]>+m[2] || +m[2]>=composition.durationInFrames) throw new Error('无效 --frames，格式 start-end'); frameRange=[+m[1],+m[2]]; }
  await renderMedia({composition,serveUrl,outputLocation:path.resolve(out),codec:'h264',inputProps,frameRange,browserExecutable:browser,chromiumOptions:{gl:'swangle'},concurrency:1,onProgress:({progress})=>process.stderr.write(`\r${Math.round(progress*100)}%`)});
  process.stderr.write('\n');
 }
 console.log(`已输出 ${path.resolve(out)}`);
} finally {server?.close();}
