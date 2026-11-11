// 预览台：自动发现仓库里的作品（番外MV/*、Day/*、通用模板/样板/*），在浏览器里用 @remotion/player 播放，
// 右边是镜头表，点一下跳到那个镜头。画面由同一个引擎实时画出来——这里看到的和出片的是同一份代码。
// 有音源的作品会边看边放音（按 film.json 的 offset 对位）；出片时的音轨则是渲染后按采样混入的，两者对位方式一致。
import { Player, type PlayerRef } from '@remotion/player';
import { useEffect, useMemo, useRef, useState } from 'react';
import { makeFilm } from '@tpl/Film';
import type { ProjectDef } from '@tpl/project';
import { FPS, VH, VW, cueAt, fmtTime, shotIndexAt } from '@tpl/timeline';

interface FilmJson { id: string; kind: 'mv' | 'day'; title: string; audio?: { file?: string; offset?: number } }
interface CuesJson { measured: boolean }

const projectLoaders = import.meta.glob<{ default: ProjectDef }>(['../../../番外MV/*/project.tsx', '../../../Day/*/project.tsx', '../../样板/*/project.tsx']);
const filmJsons = import.meta.glob<FilmJson>(['../../../番外MV/*/film.json', '../../../Day/*/film.json', '../../样板/*/film.json'], { eager: true, import: 'default' });
const cuesJsons = import.meta.glob<CuesJson>(['../../../番外MV/*/cues.json', '../../../Day/*/cues.json', '../../样板/*/cues.json'], { eager: true, import: 'default' });
const mediaLoaders = import.meta.glob<string>(['../../../番外MV/*/素材/*', '../../../Day/*/素材/*', '../../样板/*/素材/*'], { query: '?url', import: 'default' });

const dirOf = (p: string) => p.slice(0, p.lastIndexOf('/'));
const labelOf = (dir: string) => dir.replace(/^(\.\.\/)+/, '');
const ENTRIES = Object.keys(projectLoaders).map((key) => {
  const dir = dirOf(key);
  return { key, dir, label: labelOf(dir), film: filmJsons[`${dir}/film.json`], cues: cuesJsons[`${dir}/cues.json`] };
}).filter((e) => e.film).sort((a, b) => a.label.localeCompare(b.label, 'zh'));

function useHashChoice(): [string, (k: string) => void] {
  const read = () => { const h = decodeURIComponent(location.hash.slice(1)); return ENTRIES.find((e) => e.film.id === h)?.key ?? ENTRIES[0]?.key ?? ''; };
  const [key, setKey] = useState(read);
  useEffect(() => { const on = () => setKey(read()); window.addEventListener('hashchange', on); return () => window.removeEventListener('hashchange', on); }, []);
  return [key, (k) => { const e = ENTRIES.find((x) => x.key === k); if (e) location.hash = e.film.id; }];
}

export function App() {
  const [key, choose] = useHashChoice();
  const entry = ENTRIES.find((e) => e.key === key);
  const [project, setProject] = useState<ProjectDef | null>(null);
  const [audio, setAudio] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [frame, setFrame] = useState(0);
  const [subs, setSubs] = useState(true);
  const playerRef = useRef<PlayerRef>(null);

  useEffect(() => {
    let dead = false;
    setProject(null); setAudio(null); setError(null); setFrame(0);
    if (!entry) return;
    (async () => {
      try {
        const mod = await projectLoaders[entry.key]();
        const file = entry.film.audio?.file;
        const load = file ? mediaLoaders[`${entry.dir}/${file}`] : undefined;
        const url = load ? await load() : null;
        if (!dead) { setProject(mod.default); setAudio(url); }
      } catch (e) { if (!dead) setError(e instanceof Error ? e.message : String(e)); }
    })();
    return () => { dead = true; };
  }, [entry]);

  const Film = useMemo(() => (project ? makeFilm(project) : null), [project]);
  const tl = useMemo(() => (project ? project.plan(project.starts, project.ends) : null), [project]);
  const defs = useMemo(() => (project ? Object.fromEntries(project.shots.map((s) => [s.id, s])) : {}), [project]);
  const inputProps = useMemo(() => (project ? { starts: project.starts, ends: project.ends, audioSrc: audio, audioOffset: entry?.film.audio?.offset ?? 0, showLyrics: subs } : null), [project, audio, entry, subs]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    const on = (e: { detail: { frame: number } }) => setFrame(e.detail.frame);
    p.addEventListener('frameupdate', on);
    return () => p.removeEventListener('frameupdate', on);
  }, [Film, tl]);

  if (!ENTRIES.length) return <div className="empty">仓库里还没有作品。用 <code>npm run new -- day Day/Day15 "标题"</code> 新建一个。</div>;
  const t = frame / FPS;
  const si = tl ? shotIndexAt(tl, t) : 0;
  const shot = tl?.shots[si];
  const def = shot ? defs[shot.id] : undefined;
  const cue = tl ? cueAt(tl, t) : null;
  const seek = (f: number) => { playerRef.current?.seekTo(f); setFrame(f); };
  const cutFrame = (a: number) => Math.ceil(a * FPS - 1e-9);

  return (
    <div className="app">
      <header className="top">
        <h1>预览台</h1>
        <nav className="tabs">
          {ENTRIES.map((e) => (
            <button key={e.key} className={`tab${e.key === key ? ' on' : ''}`} onClick={() => choose(e.key)}>
              {e.film.title}<small>{e.film.kind === 'mv' ? 'MV' : '口播'} · {e.label}</small>
            </button>
          ))}
        </nav>
      </header>
      {error ? <div className="err">这部作品加载失败：{'\n'}{error}</div> : !project || !tl || !Film || !inputProps ? <div className="empty">加载中…</div> : (
        <div className="main">
          <section className="stage">
            <div className="player">
              <Player ref={playerRef} component={Film} inputProps={inputProps} durationInFrames={tl.frames} compositionWidth={VW} compositionHeight={VH} fps={FPS}
                controls clickToPlay style={{ width: '100%', height: '100%' }} acknowledgeRemotionLicense />
            </div>
            <div className="meta">
              <span className="pill">{project.kind === 'mv' ? '歌词 MV' : '口播片'}</span>
              <span className="pill">{tl.frames} 帧 · {fmtTime(tl.duration)} · {tl.shots.length} 镜 / {project.lines.length} 句</span>
              {entry?.cues?.measured ? <span className="pill ok">卡点已按音源实测</span> : <span className="pill warn">卡点是估的：只能出无声样片</span>}
              {audio ? <span className="pill ok">有音源</span> : <span className="pill warn">没有音源</span>}
            </div>
            <div className="ctrl">
              <button onClick={() => seek(Math.max(0, frame - 1))}>◀ 上一帧</button>
              <button onClick={() => seek(Math.min(tl.frames - 1, frame + 1))}>下一帧 ▶</button>
              <button onClick={() => si > 0 && seek(cutFrame(tl.shots[si - 1].a))}>⏮ 上一镜</button>
              <button onClick={() => si + 1 < tl.shots.length && seek(cutFrame(tl.shots[si + 1].a))}>下一镜 ⏭</button>
              <button onClick={() => setSubs((v) => !v)}>{subs ? '隐藏字幕' : '显示字幕'}</button>
              <span>第 {frame} 帧 · {fmtTime(t)}</span>
            </div>
            {shot && def && (
              <div className="now">
                <h2>{shot.id} · {def.title}</h2>
                <p>{def.note}</p>
                <p>光照 {def.look} · 出场 {def.cast.join('、') || '无'} · {fmtTime(shot.a)} – {fmtTime(shot.b)}（{(shot.b - shot.a).toFixed(2)} 秒）{project.sectionOf && shot.cue >= 0 ? ` · ${project.sectionOf(shot.cue)}` : ''}</p>
                {cue && <div className="line">第 {cue.i + 1} 句：{project.lines[cue.i]}</div>}
              </div>
            )}
          </section>
          <aside className="side">
            <h3>镜头表（点击跳转）</h3>
            {tl.shots.map((s, i) => (
              <button key={`${s.id}-${i}`} className={`shot${i === si ? ' on' : ''}`} onClick={() => seek(cutFrame(s.a))}>
                <b>{s.id}</b><span>{defs[s.id]?.title}</span>
                <i>{fmtTime(s.a)} · 第 {cutFrame(s.a)} 帧 · {(s.b - s.a).toFixed(1)} 秒</i>
                {s.cue >= 0 && <em>第 {s.cue + 1} 句：{project.lines[s.cue]}</em>}
              </button>
            ))}
          </aside>
        </div>
      )}
    </div>
  );
}
