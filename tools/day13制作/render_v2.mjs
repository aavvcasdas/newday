import {bundle} from '../mv_dayu/remotion/node_modules/@remotion/bundler/dist/index.js';
import {selectComposition,renderMedia,renderStill} from '../mv_dayu/remotion/node_modules/@remotion/renderer/dist/index.js';
import chromium,{inflate} from '../mv_dayu/remotion/node_modules/@sparticuz/chromium/build/index.js';
import path from 'node:path';
const base=path.resolve('tools/mv_dayu/remotion');const libRoot=await inflate(path.join(base,'node_modules/@sparticuz/chromium/bin/al2023.tar.br'));process.env.LD_LIBRARY_PATH=`${libRoot}/lib${process.env.LD_LIBRARY_PATH?':'+process.env.LD_LIBRARY_PATH:''}`;const browserExecutable=await chromium.executablePath();const serveUrl=await bundle({entryPoint:path.join(base,'index.day13-v2.jsx'),publicDir:path.join(base,'public')});const opts={serveUrl,id:'Day13',browserExecutable,chromiumOptions:{gl:'angle',disableWebSecurity:true}};const composition=await selectComposition(opts);
if(process.argv.includes('--still')){for(const frame of [30,180,490,510,540,570,1000,1100,1330,1370,1410,1530,1575,1600,1630,1660,1830,2070,2300,2500,2630,2800,3050,3250]) await renderStill({...opts,composition,frame,output:`/home/user/day13-v2-pre-${frame}.png`,imageFormat:'png'});console.log('stills done')}
else {
 // One complete pass in sequential 600-frame ranges: restart Chromium between
 // ranges so decoded action sheets do not accumulate for the whole 110s film.
 for(let start=0;start<composition.durationInFrames;start+=600){
  const end=Math.min(start+599,composition.durationInFrames-1);let last=-1;
  console.log(`Rendering frames ${start}-${end}`);
  await renderMedia({...opts,composition,frameRange:[start,end],codec:'h264',pixelFormat:'yuv420p',outputLocation:path.join(base,`out/day13-v2-part-${start}.mp4`),concurrency:1,logLevel:'warn',onProgress:({progress})=>{const n=Math.floor(progress*4);if(n>last){last=n;console.log(`part ${start}: ${n*25}%`)}}});
 }
 console.log('All ranges rendered. Concatenate without re-encoding before mux.');
}
