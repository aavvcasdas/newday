// Local/static preview server. Bind 0.0.0.0 so Arena's live-preview proxy can reach it.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PROJECT=path.dirname(fileURLToPath(import.meta.url));
export const ROOT=path.resolve(PROJECT,'../..');
const MIME={
  '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.srt':'text/plain; charset=utf-8',
  '.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml',
  '.ttf':'font/ttf','.woff2':'font/woff2','.mp4':'video/mp4','.m4a':'audio/mp4','.aac':'audio/aac','.mp3':'audio/mpeg',
  '.bin':'application/octet-stream','.hdr':'application/octet-stream',
};
const ENTRY=encodeURI('/番外MV/童话镇-paper-popup/index.html');

export function createServer({port=4173,host='0.0.0.0',root=ROOT}={}){
  const base=path.resolve(root);
  const server=http.createServer((req,res)=>{
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
    let pathname;
    try{pathname=decodeURIComponent(new URL(req.url,'http://arena.local').pathname);}catch{res.writeHead(400);res.end('Bad URL');return;}
    if(pathname==='/'){res.writeHead(302,{Location:ENTRY,'Cache-Control':'no-store'});res.end();return;}
    const file=path.resolve(base,`.${pathname}`);
    if(file!==base&&!file.startsWith(base+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
    fs.stat(file,(statErr,st)=>{
      if(statErr||!st.isFile()){res.writeHead(404,{'Cache-Control':'no-store'});res.end('Not found');return;}
      const type=MIME[path.extname(file).toLowerCase()]||'application/octet-stream';
      const common={'Content-Type':type,'Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'};
      const range=req.headers.range;
      if(range){
        const m=/^bytes=(\d*)-(\d*)$/.exec(range);
        if(!m){res.writeHead(416,{'Content-Range':`bytes */${st.size}`});res.end();return;}
        let start=m[1]?Number(m[1]):Math.max(0,st.size-Number(m[2]));
        let end=m[2]?Number(m[2]):st.size-1;
        if(!m[1]&&m[2])start=Math.max(0,st.size-Number(m[2]));
        if(start>=st.size||end<start){res.writeHead(416,{'Content-Range':`bytes */${st.size}`});res.end();return;}
        end=Math.min(end,st.size-1);
        res.writeHead(206,{...common,'Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${st.size}`});
        if(req.method==='HEAD'){res.end();return;}
        fs.createReadStream(file,{start,end}).on('error',()=>res.destroy()).pipe(res);return;
      }
      res.writeHead(200,{...common,'Content-Length':st.size});
      if(req.method==='HEAD'){res.end();return;}
      fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
    });
  });
  return new Promise((resolve,reject)=>{
    server.once('error',reject);server.listen(port,host,()=>resolve(server));
  });
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const port=Number(process.env.PORT||4173);const server=await createServer({port,host:'0.0.0.0'});
  const address=server.address();console.log(`Paper Pop-up preview: http://0.0.0.0:${address.port}${ENTRY}`);
  const stop=()=>server.close(()=>process.exit(0));process.on('SIGINT',stop);process.on('SIGTERM',stop);
}
