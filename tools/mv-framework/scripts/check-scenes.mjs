// Smoke-render one midpoint per webpage shot; this is not a full-motion review.
import {bundle} from '@remotion/bundler';
import {renderStill,selectComposition,openBrowser} from '@remotion/renderer';
import chromium,{inflate} from '@sparticuz/chromium';
import {makeTimeline,FPS} from '../src/tonghuazhen.ts';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'mv-scenes-'));
let browser;
try {
 const lib=await inflate(path.join(dir,'node_modules/@sparticuz/chromium/bin/al2023.tar.br'));
 process.env.LD_LIBRARY_PATH=`${lib}/lib:${process.env.LD_LIBRARY_PATH||''}`;
 const exe=await chromium.executablePath();
 const serveUrl=await bundle({entryPoint:path.join(dir,'src/entry.tsx'),publicDir:path.join(dir,'public')});
 browser=await openBrowser('chrome',{browserExecutable:exe,chromiumOptions:{gl:'swangle'}});
 const composition=await selectComposition({serveUrl,id:'MV',puppeteerInstance:browser});
 for(const s of makeTimeline().shots){
  const frame=Math.floor((s.a+(s.b-s.a)*.5)*FPS);
  await renderStill({composition,serveUrl,frame,output:path.join(scratch,'frame.png'),puppeteerInstance:browser});
  console.log(`${s.id}: ${frame}`);
 }
} finally { if(browser) await browser.close({silent:true}); fs.rmSync(scratch,{recursive:true,force:true}); }
