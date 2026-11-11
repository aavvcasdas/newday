import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2',
  '.wav': 'audio/wav', '.mp4': 'video/mp4', '.srt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
};

function resolveRoute(urlPath) {
  const p = decodeURIComponent(urlPath.split('?')[0]);
  if (p === '/' || p === '/index.html') return path.join(HERE, 'index.html');
  if (p.startsWith('/src/')) return path.join(HERE, p);
  if (p.startsWith('/data/')) return path.join(HERE, p);
  if (p.startsWith('/projectassets/')) return path.join(ROOT, 'assets/', p.slice('/projectassets/'.length));
  if (p.startsWith('/assets/')) return path.join(HERE, p);
  if (p === '/vendor/three.module.js') return path.join(HERE, 'node_modules/three/build/three.module.js');
  if (p.startsWith('/vendor/addons/')) return path.join(HERE, 'node_modules/three/examples/jsm/', p.slice('/vendor/addons/'.length));
  if (p === '/shared/day2_style_sub.mjs') return path.join(ROOT, 'tools/字幕/day2_style_sub.mjs');
  if (p.startsWith('/fonts/')) return path.join(ROOT, 'tools/mv_extra/cache/', p.slice('/fonts/'.length));
  if (p === '/media/reference.wav') return path.join(HERE, 'assets/audio/reference.wav');
  if (p === '/media/source.mp4') return path.join(ROOT, '《把回忆拼好给你》.mp4');
  if (p === '/media/final.mp4') return path.join(ROOT, '番外MV/成片/把回忆拼好给你_AI娘全员番外.mp4');
  if (p === '/cast-gallery.png') return path.join(ROOT, '番外MV/角色图鉴.png');
  if (p === '/poster.png') return path.join(ROOT, '番外MV/海报.png');
  if (p === '/style.css') return path.join(HERE, 'style.css');
  if (p === '/main.js') return path.join(HERE, 'main.js');
  return null;
}

export function startServer({ port = 5173, host = '0.0.0.0', onFrame = null } = {}) {
  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/frame' && onFrame) {
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', async () => {
        try { await onFrame(Buffer.concat(chunks)); res.writeHead(200); res.end('ok'); }
        catch (e) { res.writeHead(500); res.end(String(e.message || e)); }
      });
      return;
    }
    const file = resolveRoute(req.url || '/');
    if (!file || !file.startsWith(ROOT) && !file.startsWith(HERE)) { res.writeHead(403); res.end('forbidden'); return; }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404); res.end('not found'); return; }
      const ext = path.extname(file).toLowerCase();
      const mime = MIME[ext] || 'application/octet-stream';
      const headers = { 'Content-Type': mime, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
      const range = req.headers.range;
      if (range && (ext === '.wav' || ext === '.mp4')) {
        const m = /bytes=(\d*)-(\d*)/.exec(range);
        let start = m && m[1] ? parseInt(m[1], 10) : 0;
        let end = m && m[2] ? parseInt(m[2], 10) : st.size - 1;
        if (!m || (!m[1] && m[2])) { start = Math.max(0, st.size - parseInt(m[2], 10)); end = st.size - 1; }
        if (start >= st.size || end >= st.size || start > end) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); res.end(); return; }
        res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
        fs.createReadStream(file, { start, end }).pipe(res);
      } else {
        res.writeHead(200, { ...headers, 'Content-Length': st.size });
        fs.createReadStream(file).pipe(res);
      }
    });
  });
  return new Promise((resolve) => {
    server.listen(port, host, () => {
      const actual = server.address().port;
      resolve({ server, url: `http://127.0.0.1:${actual}`, port: actual });
    });
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 5173);
  startServer({ port }).then(({ url, port }) => console.log(`MV preview listening on 0.0.0.0:${port} (${url})`));
}
