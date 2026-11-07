import {bundle} from '@remotion/bundler';
import {selectComposition,renderMedia,renderStill} from '@remotion/renderer';
import chromium, {inflate} from '@sparticuz/chromium';
import path from 'node:path';
const base=path.resolve('tools/mv_dayu/remotion');
const pet=process.argv.includes('--pet');
const libRoot=await inflate(path.join(base,'node_modules/@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH=`${libRoot}/lib${process.env.LD_LIBRARY_PATH ? ':'+process.env.LD_LIBRARY_PATH : ''}`;
const browserExecutable=await chromium.executablePath();
console.log('Chromium:',browserExecutable);
const serveUrl=await bundle({entryPoint:path.join(base,pet?'index.pet.jsx':'index.jsx'),publicDir:path.join(base,'public')});
const opts={serveUrl,id:'DayuMV',browserExecutable,chromiumOptions:{gl:'angle',disableWebSecurity:true}};
const composition=await selectComposition(opts);
if(process.argv.includes('--still')){
 for (const frame of (pet?[35,145,245,350,450,570,680,785]:[75,210,330,420,515,635,755,850])) await renderStill({...opts,composition,frame,output:`/home/user/audio-review/remotion-${pet?"pet":"pre"}-${frame}.png`,imageFormat:'png'});
 console.log('pre-render reference still ready');
}else{
 await renderMedia({...opts,composition,codec:'h264',pixelFormat:'yuv420p',outputLocation:path.join(base,pet?'out/video-pet.mp4':'out/video.mp4'),concurrency:1,logLevel:'info',onProgress:({progress})=>{if(Math.round(progress*100)%10===0)process.stdout.write(`\rRemotion ${Math.round(progress*100)}% `)}});
 console.log('\nRemotion video complete');
}
