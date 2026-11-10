// Browser-driven paper-book renderer.
//   node render.mjs stills [seconds...]
//   node render.mjs review                 (one midpoint still for each L01-L50)
//   node render.mjs sample [from] [to]     (short H.264 + source audio)
//   node render.mjs full                  (full-length H.264 + source audio)
import { chromium } from 'playwright-core';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { CUES, DUR, FPS } from './src/timeline.js';
import { createServer, ROOT } from './server.mjs';

const PROJECT=path.dirname(fileURLToPath(import.meta.url));
const bundledLibs=[path.join(os.homedir(),'bin','libs'),path.join(os.homedir(),'bin','libs','lib')].filter(fs.existsSync);
if(bundledLibs.length)process.env.LD_LIBRARY_PATH=[...bundledLibs,process.env.LD_LIBRARY_PATH].filter(Boolean).join(path.delimiter);
process.chdir(PROJECT);
const OUT=path.resolve(PROJECT,'out');
const VIDEO=path.join(OUT,'video-only.mp4');
const FINAL=path.join(OUT,'童话镇-paper-popup.mp4');
const SRT=path.join(OUT,'童话镇-paper-popup.srt');
const PORT=Number(process.env.PREVIEW_PORT||0);
const TARGET=`/番外MV/童话镇-paper-popup/index.html`;
// The headless sandbox has no working WebGL context; render through the deterministic 2D fallback.
const RENDER_QUERY='render=1&canvas=1';
const FF=process.env.FFMPEG_BIN||'ffmpeg';
const FFPROBE=process.env.FFPROBE_BIN||'ffprobe';

function browserPath(){
  const candidates=[process.env.PLAYWRIGHT_CHROME,process.env.CHROME_BIN,path.join(os.homedir(),'bin','chrome-headless-shell'),chromium.executablePath()];
  const dirs=[path.join(os.homedir(),'.cache/ms-playwright'),'/ms-playwright','/usr/bin','/usr/local/bin'];
  for(const dir of dirs){
    try{for(const d of fs.readdirSync(dir,{withFileTypes:true})){
      const base=d.isDirectory()?path.join(dir,d.name):dir;
      candidates.push(...[
        path.join(base,'chrome-linux','chrome'),path.join(base,'chrome-linux64','chrome'),
        path.join(base,'chrome-win','chrome.exe'),path.join(base,'chrome-headless-shell-linux64','chrome-headless-shell'),
        path.join(base,'chrome-headless-shell','chrome-headless-shell'),path.join(base,'headless_shell'),
      ]);
    }}catch{}
  }
  return candidates.find(p=>p&&fs.existsSync(p));
}
function safeName(x){return String(x).replace(/[^a-z0-9_.-]+/gi,'_');}
function srtTime(t){const ms=Math.round(t*1000),h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000),s=Math.floor(ms%60000/1000),f=ms%1000;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(f).padStart(3,'0')}`;}
function writeFrame(stream,buffer){
  if(stream.write(buffer))return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const cleanup=()=>{stream.off('drain',onDrain);stream.off('error',onError);};
    const onDrain=()=>{cleanup();resolve();};
    const onError=e=>{cleanup();reject(e);};
    stream.once('drain',onDrain);stream.once('error',onError);
  });
}
function makeSrt(){return CUES.map((c,i)=>`${i+1}\n${srtTime(c.t0)} --> ${srtTime(c.t1)}\n${c.text}\n`).join('\n');}

const server=await createServer({port:PORT,host:'127.0.0.1',root:ROOT});
const base=`http://127.0.0.1:${server.address().port}`;
let browser;
async function open(){
  const exe=browserPath();if(!exe)throw new Error('找不到 Chromium。设置 PLAYWRIGHT_CHROME/CHROME_BIN，或安装 Playwright Chromium。');
  browser=await chromium.launch({executablePath:exe,headless:true,args:[
    '--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--ignore-gpu-blocklist',
    '--use-gl=angle','--use-angle=swiftshader','--font-render-hinting=none','--force-color-profile=srgb',
  ]});
  const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
  page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')console.error(`[browser:${m.type()}] ${m.text().slice(0,500)}`);});
  page.on('pageerror',e=>console.error(`[pageerror] ${e.stack||e.message}`));
await page.goto(`${base}${TARGET}?${RENDER_QUERY}`,{waitUntil:'load'});
  await page.waitForFunction(()=>window.READY===true,null,{timeout:180000});
  return page;
}
async function saveStill(page,t,file){
  await page.evaluate(v=>window.render(v),t);
  await page.screenshot({path:file,type:'jpeg',quality:92});
}
function runFfmpeg(args,label){
  return new Promise((resolve,reject)=>{
    const child=spawn(FF,args,{stdio:['pipe','ignore','pipe']});let err='';
    child.stderr.setEncoding('utf8');child.stderr.on('data',s=>{err+=s;if(err.length>12000)err=err.slice(-12000);});
    child.once('error',reject);child.once('close',code=>code===0?resolve():reject(new Error(`${label} failed (${code}): ${err.slice(-4000)}`)));
    child.stdin.on('error',e=>{if(e.code!=='EPIPE')reject(e);});
    child.writeFrame=buf=>new Promise((res,rej)=>{if(child.stdin.write(buf))res();else child.stdin.once('drain',res).once('error',rej);});
    child.finish=()=>child.stdin.end();
  });
}
async function renderVideo(from,to,fps,label,target=FINAL){
  fs.mkdirSync(OUT,{recursive:true});
  fs.writeFileSync(SRT,makeSrt(),'utf8');
  const total=Math.ceil((to-from)*fps),ff=spawn(FF,[
    '-y','-hide_banner','-loglevel','error','-f','image2pipe','-framerate',String(fps),'-vcodec','mjpeg','-i','-',
    '-an','-c:v','libx264','-preset',process.env.PRESET||'fast','-crf',process.env.CRF||'18','-pix_fmt','yuv420p','-movflags','+faststart',VIDEO,
  ],{stdio:['pipe','ignore','pipe']});
  let ffErr='';ff.stderr.setEncoding('utf8');ff.stderr.on('data',s=>{ffErr+=s;if(ffErr.length>12000)ffErr=ffErr.slice(-12000);});
  const exe=browserPath();if(!exe)throw new Error('找不到 Chromium。设置 PLAYWRIGHT_CHROME/CHROME_BIN，或安装 Playwright Chromium。');
  browser=await chromium.launch({executablePath:exe,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader','--font-render-hinting=none','--force-color-profile=srgb']});
  const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
  page.on('console',m=>{if(m.type()==='error')console.error(`[browser] ${m.text().slice(0,300)}`);});
  page.on('pageerror',e=>console.error(`[pageerror] ${e.message}`));
  await page.goto(`${base}${TARGET}?${RENDER_QUERY}`,{waitUntil:'load'});await page.waitForFunction(()=>window.READY===true,null,{timeout:180000});
  const start=Date.now();
  try{
    for(let i=0;i<total;i++){
      const t=from+i/fps;await page.evaluate(v=>window.render(v),t);
      const img=await page.screenshot({type:'jpeg',quality:91});
      await writeFrame(ff.stdin,img);
      if(i%120===0||i===total-1){const secs=(Date.now()-start)/1000;console.log(`${label}: ${i+1}/${total} frames (${(i/fps).toFixed(1)}s @ ${fps}fps; ${(i/Math.max(secs,.01)).toFixed(1)} render fps)`);}
    }
    ff.stdin.end();
  }catch(e){ff.stdin.destroy();throw e;}
  await new Promise((resolve,reject)=>ff.once('close',c=>c===0?resolve():reject(new Error(`ffmpeg encode failed (${c}): ${ffErr.slice(-4000)}`))));
  await browser.close();browser=null;
  const audio=path.join(ROOT,'童话镇.mp4');
  const duration=to-from;
  const muxArgs=['-y','-hide_banner','-loglevel','error','-i',VIDEO];
  if(from>0)muxArgs.push('-ss',String(from));
  muxArgs.push('-i',audio,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-t',String(duration),'-movflags','+faststart',target);
  execFileSync(FF,muxArgs,{stdio:'inherit'});
  const meta=execFileSync(FFPROBE,['-v','error','-show_entries','format=duration:stream=codec_type,width,height,avg_frame_rate','-of','json',target],{encoding:'utf8'});
  fs.writeFileSync(path.join(OUT,'render-info.json'),JSON.stringify({from,to,fps,frames:total,source:'../../童话镇.mp4',ffprobe:JSON.parse(meta)},null,2));
  console.log(`Wrote ${target}`);
}

try{
  const mode=process.argv[2]||'help';fs.mkdirSync(OUT,{recursive:true});
  if(mode==='stills'||mode==='review'){
    const page=await open();
    const items=mode==='review'?CUES.map(c=>({name:c.id,t:(c.t0+c.t1)/2})):process.argv.slice(3).length?process.argv.slice(3).map((v,i)=>({name:`t${safeName(v)}`,t:Number(v)})):CUES.map(c=>({name:c.id,t:(c.t0+c.t1)/2}));
    const dir=path.join(OUT,mode==='review'?'review':'stills');fs.mkdirSync(dir,{recursive:true});
    for(const item of items){const file=path.join(dir,`${item.name}_${item.t.toFixed(2)}.jpg`);await saveStill(page,item.t,file);console.log(file);}
    await browser.close();browser=null;
  }else if(mode==='sample'){
    const from=Number(process.argv[3]??'13.55'),to=Number(process.argv[4]??'23.75');await renderVideo(from,to,Number(process.env.FPS||24),'sample',path.join(OUT,'review','latest-sample.mp4'));
  }else if(mode==='full'){
    await renderVideo(0,DUR,Number(process.env.FPS||30),'full');
  }else if(mode==='srt'){
    fs.writeFileSync(SRT,makeSrt(),'utf8');console.log(SRT);
  }else{
    console.log('Usage: node render.mjs {stills [t...]|review|sample [from to]|full|srt}');
  }
}finally{
  if(browser)await browser.close().catch(()=>{});
  await new Promise(resolve=>server.close(resolve));
}
