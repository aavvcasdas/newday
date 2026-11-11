import { startServer } from './server.mjs';
import { launchBrowser } from './browser.mjs';
import fs from 'node:fs';
import { createCanvas,loadImage } from '@napi-rs/canvas';
const {server,url}=await startServer({port:0});const browser=await launchBrowser();
try {
 const page=await browser.newPage({viewport:{width:1920,height:1080}});
 await page.goto(`${url}/?export=1`,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.__mv?.ready,null,{timeout:120000});
 await page.evaluate(()=>document.fonts.load('700 28px "Noto Sans SC"'));
 const times=[2.2,6.65,10.17,13.71,17.29,20.71,23.96,27.21,30.21,33.54,37.29,40.71,43.63,46.79,49.90,52.6];
 const canvas=createCanvas(1920,1080);const ctx=canvas.getContext('2d');
 for(let i=0;i<times.length;i++) {
  let data=await page.evaluate(t=>window.__mv.exportFrame(t),times[i]);let img=await loadImage(Buffer.from(data.split(',')[1],'base64'));
  ctx.drawImage(img,(i%4)*480,Math.floor(i/4)*270,480,270);console.log('shot',i+1,times[i]);
 }
 fs.writeFileSync('../../tools/mv_extra/cache/v9_stills.png',canvas.toBuffer('image/png'));
} finally {await browser.close();server.close();}
