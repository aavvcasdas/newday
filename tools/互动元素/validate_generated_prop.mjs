// QA for REVIEWED local draw modules only. Importing arbitrary JS is code execution, not sandboxing.
// Pixel metrics are a regression aid, never an aesthetic/copyright/OCR approval.
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL,fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {createCanvas} from '../day8制作/render_day8.mjs';
export async function validateGeneratedProp(filename){
 const source=fs.readFileSync(filename,'utf8');const findings=[];
 if(/\b(?:ctx|g)\.fillRect\s*\(/.test(source))findings.push('bare rectangle painter rejected');
 const texts=[...source.matchAll(/fillText\(\s*(['"])(.*?)\1/g)].map(m=>m[2]);
 if(texts.some(t=>/\d/.test(t)))findings.push('numeric literal text rejected');
 const mod=await import(pathToFileURL(path.resolve(filename)));if(typeof mod.draw!=='function')throw Error('draw(ctx,t,state) required');
 if(!Array.isArray(mod.labels)||mod.labels.some(s=>/\d|%/.test(s)))findings.push('reviewed nonnumeric labels required');
 const states=[{open:1,hit:false,squash:0},{open:0,hit:false,squash:0},{open:1,hit:true,squash:0},{open:1,hit:false,squash:1}],samples=[];
 for(const state of states){const c=createCanvas(256,256),g=c.getContext('2d');g.translate(128,128);g.scale(1.05,1.05);mod.draw(g,0,state);const data=c.data(),colors=new Set();let visible=0,dark=0,edge=0;
  for(let i=0;i<data.length;i+=4){if(data[i+3]<30)continue;visible++;if(data[i]<105&&data[i+1]<105&&data[i+2]<130)dark++;colors.add(`${data[i]>>4},${data[i+1]>>4},${data[i+2]>>4}`);const p=i/4,x=p%256,y=Math.floor(p/256);if(x<2||x>253||y<2||y>253)edge++;}
  const occupancy=visible/(256*256),darkRatio=dark/Math.max(visible,1);samples.push({state,occupancy,dark_ratio:darkRatio,color_buckets:colors.size,clipped_edge_pixels:edge,sha256:createHash('sha256').update(data).digest('hex')});
  if(occupancy<.12||occupancy>.75)findings.push('footprint outside preview bounds');if(darkRatio<.01)findings.push('missing dark ink');if(colors.size<12)findings.push('insufficient tonal variation');if(edge)findings.push('preview clipped');
 }
 if(new Set(samples.map(s=>s.sha256)).size!==4)findings.push('state variants must change pixels');
 return {id:mod.id,passed:findings.length===0,findings,samples,limitations:['reviewed code only; not sandboxed','no automatic OCR, aesthetic or rights approval','test states do not validate arbitrary parameter ranges']};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const result=await validateGeneratedProp(process.argv[2]);const report=process.argv.indexOf('--report');if(report>=0)fs.writeFileSync(process.argv[report+1],JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;}
