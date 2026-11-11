// walk_preview.mjs — 走路图集审阅台（Node 静态服务 + 逐帧播放）
//
// 用法：node tools/remotion-engine/walk_preview.mjs [--port 8099]
// 打开 http://<host>:8099/ 即可看到 8 位角色的 walk / idle 图集按 120ms 播放，
// 可逐帧定格检查脚有没有踩实、身体有没有抖动、有没有第三条腿。

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WALK_RIG_ATLAS_NAMES, ensureWalkRigAtlases, DEFAULT_WALK_CACHE_DIR } from './walk_rig_builder.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../..');
const PORT = Number(process.argv.includes('--port') ? process.argv[process.argv.indexOf('--port') + 1] : 8099);

const built = await ensureWalkRigAtlases(DEFAULT_WALK_CACHE_DIR);
const atlasFiles = new Map();
for (const [name, p] of Object.entries(built)) atlasFiles.set(`/__walk__/${name}.png`, p);

const MIME = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.gif': 'image/gif', '.js': 'text/javascript', '.css': 'text/css' };

const page = () => `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>走路图集审阅台 · walk-v14</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; padding:18px; background:#0d1220; color:#e8eefc; font-family: system-ui, -apple-system, "Segoe UI", "Noto Sans CJK SC", sans-serif; }
  h1 { font-size:18px; margin:0 0 6px; }
  .sub { color:#8fa3c8; font-size:13px; margin-bottom:16px; line-height:1.6; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:14px; }
  .card { background:#151d31; border:1px solid #24314f; border-radius:12px; padding:10px 12px 12px; }
  .card h2 { font-size:14px; margin:2px 0 8px; font-weight:600; }
  .stage { height:220px; background:#1b2540 repeating-conic-gradient(#1e2a48 0% 25%, #1b2540 0% 50%) 50%/22px 22px;
           border-radius:8px; display:flex; align-items:flex-end; justify-content:center; overflow:hidden; position:relative; }
  canvas { display:block; }
  .ctl { display:flex; align-items:center; gap:8px; margin-top:8px; font-size:12px; color:#9fb3d8; }
  input[type=range] { flex:1; }
  .frames { display:flex; gap:4px; margin-top:8px; flex-wrap:wrap; }
  .frames canvas { width:44px; height:48px; background:#1b2540; border-radius:4px; border:1px solid #2a3a5e; }
  .frames canvas.on { border-color:#59c1ff; box-shadow:0 0 0 1px #59c1ff; }
  .hint { font-size:12px; color:#7f90b3; margin-top:10px; }
</style></head>
<body>
  <h1>走路图集审阅台 · walk-v14</h1>
  <div class="sub">每格 384×416，8 帧 / 每帧 120ms（一轮 0.96s 双步周期，对齐 tqlearning/ai-girl-chatgpt-pets 的 running-right）。
  下排缩略图可点选单帧定格，检查脚掌是否踩实、裙摆是否被切、有没有多余腿。</div>
  <div id="root" class="grid"></div>
  <div class="hint">whale / gpt 使用本轮重新生成的「腿可见」侧 3/4 立绘 + v14 八帧步态；其余角色仍为 v13 蒙皮（下一轮再按同规格重画）。</div>
<script>
const NAMES = ${JSON.stringify(WALK_RIG_ATLAS_NAMES)};
const root = document.getElementById('root');
const cards = [];
for (const name of NAMES) {
  const card = document.createElement('div'); card.className = 'card';
  card.innerHTML = '<h2>' + name + '</h2><div class="stage"><canvas width="192" height="208"></canvas></div>'
    + '<div class="ctl"><button>暂停</button><span>帧 <b>0</b>/8</span><input type="range" min="0" max="7" step="1" value="0"></div>'
    + '<div class="frames"></div>';
  root.appendChild(card);
  const canvas = card.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const btn = card.querySelector('button');
  const label = card.querySelector('b');
  const range = card.querySelector('input');
  const strip = new Image(); strip.src = '/__walk__/' + encodeURIComponent(name) + '.png';
  const st = { name, strip, ctx, label, range, playing: true, frame: 0, thumbs: [] };
  const holder = card.querySelector('.frames');
  for (let i = 0; i < 8; i++) {
    const t = document.createElement('canvas'); t.width = 88; t.height = 96;
    t.addEventListener('click', () => { st.playing = false; btn.textContent = '播放'; st.frame = i; st.draw(); st.sync(); });
    holder.appendChild(t);
    st.thumbs.push(t);
  }
  btn.addEventListener('click', () => { st.playing = !st.playing; btn.textContent = st.playing ? '暂停' : '播放'; });
  st.sync = () => {
    label.textContent = st.frame + 1;
    range.value = st.frame;
    st.thumbs.forEach((t, i) => t.classList.toggle('on', i === st.frame));
  };
  st.draw = async () => {
    if (!strip.complete) return;
    const cw = strip.width / 8, ch = strip.height;
    ctx.clearRect(0, 0, 192, 208);
    ctx.drawImage(strip, st.frame * cw, 0, cw, ch, 0, 0, 192, 208);
    const t = st.thumbs[st.frame].getContext('2d');
    t.clearRect(0, 0, 88, 96);
    t.drawImage(strip, st.frame * cw, 0, cw, ch, 0, 0, 88, 96);
  };
  strip.addEventListener('load', () => { st.draw(); st.sync(); });
  cards.push(st);
}
setInterval(() => {
  for (const st of cards) {
    if (!st.playing) continue;
    st.frame = (st.frame + 1) % 8;
    st.draw(); st.sync();
  }
}, 120);
</script>
</body></html>`;

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url === '/' || url === '/index.html') {
    res.writeHead(200, { 'Content-Type': MIME['.html'] });
    res.end(page());
    return;
  }
  const atlas = atlasFiles.get(url);
  if (atlas && fs.existsSync(atlas)) {
    res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
    fs.createReadStream(atlas).pipe(res);
    return;
  }
  const abs = path.resolve(REPO_ROOT, '.' + url);
  if (abs.startsWith(REPO_ROOT) && fs.existsSync(abs) && fs.statSync(abs).isFile()) {
    res.writeHead(200, { 'Content-Type': MIME[path.extname(abs)] || 'application/octet-stream' });
    fs.createReadStream(abs).pipe(res);
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`WALK_PREVIEW http://0.0.0.0:${PORT}/  (${Object.keys(built).length} atlases)`);
});
