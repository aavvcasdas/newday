import { createFilm } from './src/film.js';
import castData from './data/cast.json' with { type: 'json' };
import sprites from './data/sprites.json' with { type: 'json' };

const params = new URLSearchParams(location.search);
if (params.has('export')) document.body.classList.add('export');

const gl = document.getElementById('gl');
const out = document.getElementById('film');
const audio = document.getElementById('audio');
const loading = document.getElementById('loading');
const playBtn = document.getElementById('playBtn');
const bigPlay = document.getElementById('bigPlay');
const timecode = document.getElementById('timecode');
const shotLabel = document.getElementById('shotLabel');
const chapters = document.getElementById('chapters');

const fmt = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
let film, raf = 0, playing = false;

function render(t) {
  const info = film.renderAt(t);
  timecode.textContent = `${fmt(t)} / ${fmt(film.duration)}`;
  const shot = film.shots.find(s => s.id === info.shot);
  shotLabel.textContent = `${shot.id} · ${shot.keyword}`;
  document.querySelectorAll('.chapter').forEach((el, i) => el.classList.toggle('active', film.shots[i].id === info.shot));
  return info;
}
function loop() {
  if (!playing) return;
  render(Math.min(audio.currentTime, film.duration));
  if (audio.ended || audio.currentTime >= film.duration) { pause(); return; }
  raf = requestAnimationFrame(loop);
}
async function play() {
  if (!film) return;
  try { await audio.play(); } catch (e) { console.warn('audio play blocked', e); }
  playing = true; playBtn.textContent = '⏸'; bigPlay.style.display = 'none';
  cancelAnimationFrame(raf); loop();
}
function pause() {
  playing = false; audio.pause(); playBtn.textContent = '▶'; bigPlay.style.display = '';
  cancelAnimationFrame(raf);
}
function seek(t) {
  audio.currentTime = Math.max(0, Math.min(t, film.duration - 0.01));
  render(audio.currentTime);
}

try {
  film = await createFilm(gl, out);
  window.__mv = {
    ready: true,
    duration: film.duration,
    fps: film.fps,
    renderAt: (t) => render(t),
    exportFrame: (t) => { film.renderAt(t); return out.toDataURL('image/png'); },
    setExportSize: (w, h) => film.setExportSize(w, h),
    exportSceneRaw: async (t) => {
      const { canvas } = film.renderSceneOnly(t);
      const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      const r = await fetch('/frame', { method: 'POST', body: data.buffer });
      if (!r.ok) throw new Error('frame sink ' + r.status);
      return { w: canvas.width, h: canvas.height, bytes: data.length };
    },
    renderer: film.rendererName,
  };
  loading.style.display = 'none';
  render(0);
  film.shots.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'chapter';
    b.innerHTML = `<b>${s.id} · ${s.keyword}</b>${fmt(s.start)} · ${s.cue.text.slice(0, 10)}${s.cue.text.length > 10 ? '…' : ''}`;
    b.addEventListener('click', () => seek(s.start + 0.05));
    chapters.appendChild(b);
  });
  const grid = document.getElementById('castGrid');
  for (const c of castData.cast) {
    const meta = sprites.characters[c.id];
    const card = document.createElement('div');
    card.className = 'cast-card';
    card.innerHTML = `<img src="/${meta.preview}" alt="${c.name}"><div><h3>${c.name} · AI娘</h3><p>${c.role}</p><p class="cast-src">${c.sourceLabel}</p></div>`;
    grid.appendChild(card);
  }
} catch (e) {
  loading.innerHTML = `<p>加载失败：${String(e.message || e)}</p>`;
  console.error(e);
  window.__mv = { ready: false, error: String(e.stack || e) };
}

playBtn.addEventListener('click', () => playing ? pause() : play());
bigPlay.addEventListener('click', play);
document.getElementById('restartBtn').addEventListener('click', () => seek(0));
document.getElementById('muteBtn').addEventListener('click', (e) => { audio.muted = !audio.muted; e.currentTarget.textContent = audio.muted ? '🔇' : '♪'; });
document.getElementById('fullBtn').addEventListener('click', () => document.getElementById('stage').requestFullscreen?.());
audio.addEventListener('ended', pause);

function openDrawer(id) { document.getElementById(id).hidden = false; document.getElementById('scrim').hidden = false; }
function closeDrawers() { document.querySelectorAll('.drawer').forEach(d => d.hidden = true); document.getElementById('scrim').hidden = true; }
document.getElementById('castBtn').addEventListener('click', () => openDrawer('castDrawer'));
document.getElementById('infoBtn').addEventListener('click', () => openDrawer('infoDrawer'));
document.getElementById('scrim').addEventListener('click', closeDrawers);
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeDrawers));
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input,textarea')) return;
  if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
  if (e.code === 'ArrowRight') seek((audio.currentTime || 0) + 5);
  if (e.code === 'ArrowLeft') seek((audio.currentTime || 0) - 5);
  if (e.key === 'f') document.getElementById('stage').requestFullscreen?.();
  if (e.key === 'c') openDrawer('castDrawer');
  if (e.key === 'Escape') closeDrawers();
});
