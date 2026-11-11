import { Player, type PlayerRef } from '@remotion/player';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CAST, ISSUES, LEARNED, NOT_DONE, ROADMAP, VERIFIED_OK, type Level } from './data/report';
import { ATLAS_META, ATLAS_URL, loadAtlas, type CharId } from './mv/actors';
import { MVEngine, SHOT_MAP } from './mv/engine';
import { MVComp, type MVProps } from './mv/MVComp';
import { FPS, LYRICS, SRT_ENDS, SRT_STARTS, VH, VW, fmtTime, makeTimeline, sectionOfCue, shotIndexAt, toSrt, type Timeline } from './mv/timeline';

const PORTRAIT: Record<CharId, string> = Object.fromEntries(CAST.map((c) => [c.id, c.portrait])) as Record<CharId, string>;
const NAME: Record<CharId, string> = Object.fromEntries(CAST.map((c) => [c.id, c.name])) as Record<CharId, string>;

function Px({ name, scale = 1, className = '' }: { name: string; scale?: number; className?: string }) {
  const r = ATLAS_META.s[name];
  if (!r) return null;
  return (
    <span
      role="img"
      aria-label={name}
      className={`px-atlas inline-block shrink-0 ${className}`}
      style={{ width: r[2] * scale, height: r[3] * scale, backgroundPosition: `-${r[0] * scale}px -${r[1] * scale}px`, backgroundSize: `${ATLAS_META.w * scale}px ${ATLAS_META.h * scale}px` }}
    />
  );
}

/** 用同一套引擎逐镜渲染缩略图（真实帧，不是示意图） */
function useThumbs(tl: Timeline) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  useEffect(() => {
    let dead = false;
    const timer = window.setTimeout(async () => {
      const cv = document.createElement('canvas');
      cv.width = 480; cv.height = 270;
      let eng: MVEngine | null = null;
      try {
        const atlas = await loadAtlas();
        if (dead) return;
        eng = new MVEngine(cv, 480, 270, atlas);
        for (const s of tl.shots) {
          if (dead) break;
          eng.render(Math.round((s.a + (s.b - s.a) * 0.62) * FPS), tl);
          const url = cv.toDataURL('image/jpeg', 0.72);
          setThumbs((p) => ({ ...p, [s.id]: url }));
          await new Promise((r) => window.setTimeout(r, 24));
        }
      } catch (e) {
        console.warn('缩略图生成失败', e);
      } finally {
        eng?.dispose(true);
      }
    }, 900);
    return () => { dead = true; window.clearTimeout(timer); };
  }, [tl]);
  return thumbs;
}

const LV: Record<Level, string> = { P0: 'bg-rose-500 text-white', P1: 'bg-amber-400 text-amber-950', P2: 'bg-sky-400 text-sky-950' };
const NAV = [['mv', '复刻 MV'], ['board', '分镜表'], ['cast', '选角'], ['diag', 'Remotion 诊断'], ['learn', '学到了什么']];

function Clock({ player, tl }: { player: React.RefObject<PlayerRef | null>; tl: Timeline }) {
  const [f, setF] = useState(0);
  useEffect(() => {
    const p = player.current;
    if (!p) return;
    const on = (e: { detail: { frame: number } }) => setF(e.detail.frame);
    p.addEventListener('frameupdate', on);
    return () => p.removeEventListener('frameupdate', on);
  }, [player]);
  return <span className="font-mono tabular-nums text-amber-200">{fmtTime(f / FPS)} <span className="text-indigo-300/60">/ {fmtTime(tl.duration)}</span></span>;
}

export default function App() {
  const playerRef = useRef<PlayerRef>(null);
  const [timing, setTiming] = useState({ starts: SRT_STARTS, ends: SRT_ENDS });
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [audioName, setAudioName] = useState('');
  const [audioOffset, setAudioOffset] = useState(0);
  const [showLyrics, setShowLyrics] = useState(true);
  const [shotIdx, setShotIdx] = useState(0);
  const [tap, setTap] = useState<number[] | null>(null);
  const [copied, setCopied] = useState(false);

  const tl = useMemo(() => makeTimeline(timing.starts, timing.ends), [timing]);
  const thumbs = useThumbs(tl);
  const inputProps: MVProps = useMemo(() => ({ starts: timing.starts, ends: timing.ends, audioSrc, audioOffset, showLyrics }), [timing, audioSrc, audioOffset, showLyrics]);
  const retimed = timing.starts !== SRT_STARTS;

  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = `.px-atlas{background-image:url(${ATLAS_URL});background-repeat:no-repeat;image-rendering:pixelated}`;
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, []);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    const on = (e: { detail: { frame: number } }) => { const i = shotIndexAt(tl, e.detail.frame / FPS); setShotIdx((prev) => (prev === i ? prev : i)); };
    p.addEventListener('frameupdate', on);
    return () => p.removeEventListener('frameupdate', on);
  }, [tl]);

  useEffect(() => { (window as unknown as { __mvSeek?: (f: number) => void }).__mvSeek = (f) => playerRef.current?.seekTo(f); }, []);

  const seek = useCallback((t: number, play = false) => {
    const p = playerRef.current;
    if (!p) return;
    p.seekTo(Math.max(0, Math.round(t * FPS)));
    if (play) p.play();
    document.getElementById('mv')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // 对拍：播放时每句开口按一次空格
  const tapping = tap !== null;
  useEffect(() => {
    if (!tapping) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      const p = playerRef.current;
      if (!p) return;
      const t = +(p.getCurrentFrame() / FPS).toFixed(2);
      setTap((prev) => (prev && prev.length < LYRICS.length ? [...prev, t] : prev));
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [tapping]);
  useEffect(() => {
    if (!tap || tap.length < LYRICS.length) return;
    const starts = tap.map((v, i) => (i ? Math.max(v, tap[i - 1] + 0.3) : v));
    const ends = starts.map((s, i) => Math.min(s + (SRT_ENDS[i] - SRT_STARTS[i]), (starts[i + 1] ?? Infinity) - 0.05));
    playerRef.current?.pause();
    setTiming({ starts, ends });
    setTap(null);
  }, [tap]);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (audioSrc) URL.revokeObjectURL(audioSrc);
    setAudioSrc(URL.createObjectURL(file));
    setAudioName(file.name);
  };
  const copySrt = async () => {
    try { await navigator.clipboard.writeText(toSrt(timing.starts, timing.ends)); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { /* 剪贴板不可用时忽略 */ }
  };

  const cur = tl.shots[shotIdx];
  const def = SHOT_MAP[cur.id];
  const counts = { P0: ISSUES.filter((i) => i.level === 'P0').length, P1: ISSUES.filter((i) => i.level === 'P1').length, P2: ISSUES.filter((i) => i.level === 'P2').length };

  return (
    <div className="min-h-screen bg-[#0d0b1e] text-indigo-50 antialiased">
      <header className="sticky top-0 z-30 border-b border-indigo-400/15 bg-[#0d0b1e]/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5 sm:px-6">
          <a href="#top" className="flex items-center gap-2 font-black tracking-widest text-amber-200">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-rose-400 via-amber-300 to-sky-400 text-sm text-[#0d0b1e]">童</span>
            童话镇
          </a>
          <nav className="ml-auto flex gap-1 overflow-x-auto text-sm">
            {NAV.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="whitespace-nowrap rounded-full px-3 py-1.5 text-indigo-200 transition hover:bg-indigo-400/15 hover:text-white">{label}</a>
            ))}
          </nav>
        </div>
      </header>

      <main id="top" className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        {/* Hero */}
        <section className="grid gap-8 py-10 lg:grid-cols-[1.25fr_1fr] lg:items-end">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-semibold tracking-wider text-amber-200">newday · arena/e3176c94 分支体检 + MV 重做</p>
            <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl xl:text-6xl">
              <span className="whitespace-nowrap">《童话镇》</span>
              <span className="whitespace-nowrap"><span className="bg-gradient-to-r from-rose-300 via-amber-200 to-sky-300 bg-clip-text text-transparent">立体童话书</span>复刻</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-indigo-200/90 sm:text-lg">
              项目自己的八位像素角色，放进 three.js 搭的 3D 童话镇里，用 Remotion 逐帧驱动。31 句歌词一句一镜，切点落在每句开口前 2 帧；
              下面同时给出这个分支 Remotion 引擎「看着怪」的 {ISSUES.length} 处原因和修法。
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-sm">
              {[[`${tl.shots.length} 个镜头`, '全部实时渲染'], [`${LYRICS.length} 句歌词`, '逐句卡点'], ['1920×1080 · 30fps', fmtTime(tl.duration)], [`${ISSUES.length} 处问题`, `P0×${counts.P0} P1×${counts.P1} P2×${counts.P2}`]].map(([a, b]) => (
                <span key={a} className="rounded-xl border border-indigo-300/15 bg-indigo-300/5 px-3 py-2"><b className="text-white">{a}</b><span className="ml-2 text-indigo-300/80">{b}</span></span>
              ))}
            </div>
          </div>
          <div className="grid w-fit grid-cols-4 gap-1.5 lg:ml-auto">
            {CAST.map((c) => (
              <a key={c.id} href="#cast" title={`${c.name} · ${c.now}`} className="group rounded-xl border border-indigo-300/15 bg-[#17142e] p-1.5 transition hover:-translate-y-1 hover:border-amber-300/50">
                <Px name={c.portrait} scale={1} className="rounded-md" />
                <div className="mt-1 text-center text-[11px] font-semibold text-indigo-200 group-hover:text-amber-200">{c.name.replace(' 大小姐', '').replace(' 龙娘', '')}</div>
              </a>
            ))}
          </div>
        </section>

        {/* Player */}
        <section id="mv" className="scroll-mt-16">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <div className="overflow-hidden rounded-2xl border border-indigo-300/20 bg-black shadow-2xl shadow-indigo-950/60">
                <Player
                  ref={playerRef}
                  component={MVComp}
                  inputProps={inputProps}
                  durationInFrames={tl.frames}
                  compositionWidth={VW}
                  compositionHeight={VH}
                  fps={FPS}
                  controls
                  clickToPlay
                  doubleClickToFullscreen
                  spaceKeyToPlayOrPause={!tapping}
                  showVolumeControls={!!audioSrc}
                  acknowledgeRemotionLicense
                  style={{ width: '100%', aspectRatio: '16 / 9' }}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-indigo-200">
                <Clock player={playerRef} tl={tl} />
                <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" className="accent-amber-300" checked={showLyrics} onChange={(e) => setShowLyrics(e.target.checked)} />歌词条</label>
                <span className="text-indigo-300/70">{audioSrc ? `音轨：${audioName}` : '当前无声：页面不含原曲，可在右侧载入你本地的音频'}</span>
              </div>
            </div>

            <aside className="flex flex-col gap-4">
              <div className="rounded-2xl border border-indigo-300/20 bg-[#17142e] p-4">
                <div className="flex items-center justify-between text-xs text-indigo-300">
                  <span className="rounded bg-indigo-300/15 px-2 py-0.5 font-mono text-indigo-100">{cur.id}</span>
                  <span>{cur.cue >= 0 ? sectionOfCue(cur.cue) : cur.id.startsWith('I') ? '序章' : cur.id === 'OUT' ? '尾声' : '间奏'} · {fmtTime(cur.a)}–{fmtTime(cur.b)}</span>
                </div>
                <h3 className="mt-2 text-lg font-bold leading-snug text-white">{def.title}</h3>
                {cur.cue >= 0 && <p className="mt-1 text-sm font-semibold text-amber-200">♪ {LYRICS[cur.cue]}</p>}
                <p className="mt-2 text-sm leading-relaxed text-indigo-200/90">{def.note}</p>
                {def.cast.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {def.cast.map((c) => (
                      <span key={c} className="flex items-center gap-1.5 rounded-lg bg-indigo-300/10 py-1 pl-1 pr-2 text-xs text-indigo-100"><Px name={PORTRAIT[c]} scale={0.4} className="rounded" />{NAME[c]}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-indigo-300/20 bg-[#17142e] p-4 text-sm">
                <h3 className="font-bold text-white">音频与对拍</h3>
                <p className="mt-1 text-xs leading-relaxed text-indigo-300/90">卡点取自仓库 <code className="text-amber-200">tonghuazhen.srt</code>，这里没有对着原曲实测过。载入音频后可以整体平移，或者自己逐句重打。</p>
                <label className="mt-3 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-indigo-300/40 px-3 py-2.5 text-indigo-100 transition hover:border-amber-300 hover:text-amber-200">
                  <input type="file" accept="audio/*,video/mp4" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
                  {audioSrc ? '更换音频文件' : '载入本地音频 / MP4'}
                </label>
                <label className="mt-3 block text-xs text-indigo-300">
                  音频整体偏移 <b className="font-mono text-amber-200">{audioOffset >= 0 ? '+' : ''}{audioOffset.toFixed(2)}s</b>
                  <input type="range" min={-5} max={5} step={0.05} value={audioOffset} onChange={(e) => setAudioOffset(+e.target.value)} className="mt-1 w-full accent-amber-300" />
                </label>
                {tapping ? (
                  <div className="mt-3 rounded-xl bg-rose-500/15 p-3">
                    <p className="text-xs text-rose-100">每句开口时按 <kbd className="rounded bg-white/20 px-1.5 py-0.5 font-mono">空格</kbd>　已打 {tap.length} / {LYRICS.length}</p>
                    <p className="mt-1.5 text-sm font-bold text-white">下一句：{LYRICS[Math.min(tap.length, LYRICS.length - 1)]}</p>
                    <button onClick={() => { setTap(null); playerRef.current?.pause(); }} className="mt-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20">取消</button>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => { setTap([]); playerRef.current?.seekTo(0); playerRef.current?.play(); }} className="rounded-lg bg-amber-300 px-3 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-200">开始逐句对拍</button>
                    <button onClick={copySrt} className="rounded-lg bg-indigo-300/15 px-3 py-1.5 text-xs hover:bg-indigo-300/25">{copied ? '已复制' : '复制 SRT'}</button>
                    {retimed && <button onClick={() => setTiming({ starts: SRT_STARTS, ends: SRT_ENDS })} className="rounded-lg bg-indigo-300/15 px-3 py-1.5 text-xs hover:bg-indigo-300/25">恢复仓库卡点</button>}
                  </div>
                )}
                {retimed && !tapping && <p className="mt-2 text-xs text-emerald-300">已应用你打的卡点，镜头切点已随之重排。</p>}
              </div>
            </aside>
          </div>
        </section>

        {/* Storyboard */}
        <section id="board" className="scroll-mt-16 pt-16">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black sm:text-3xl">分镜表 · 一句一镜</h2>
              <p className="mt-1 text-sm text-indigo-300">缩略图由同一套引擎现场渲染；点任意一格跳到该镜头播放。</p>
            </div>
            <span className="text-xs text-indigo-300/70">节拍网格按每句 8 拍等分估算（约 {(60 / tl.beat).toFixed(0)} BPM），未经音频实测</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {tl.shots.map((s, i) => {
              const d = SHOT_MAP[s.id];
              const on = i === shotIdx;
              return (
                <button key={s.id} onClick={() => seek(s.a + 0.04, true)} className={`group overflow-hidden rounded-xl border bg-[#17142e] text-left transition hover:-translate-y-0.5 hover:border-amber-300/60 ${on ? 'border-amber-300 ring-2 ring-amber-300/40' : 'border-indigo-300/15'}`}>
                  <div className="relative aspect-video bg-[#0a0818]">
                    {thumbs[s.id] ? <img src={thumbs[s.id]} alt={d.title} className="h-full w-full object-cover" loading="lazy" /> : <div className="grid h-full place-items-center text-xs text-indigo-300/50">渲染中…</div>}
                    <span className="absolute left-1.5 top-1.5 rounded bg-black/65 px-1.5 py-0.5 font-mono text-[10px] text-amber-200">{s.id}</span>
                    <span className="absolute right-1.5 top-1.5 rounded bg-black/65 px-1.5 py-0.5 font-mono text-[10px] text-indigo-100">{fmtTime(s.a)}</span>
                  </div>
                  <div className="p-2.5">
                    <div className="text-sm font-bold leading-snug text-white">{s.cue >= 0 ? LYRICS[s.cue] : d.title}</div>
                    {s.cue >= 0 && d.title !== LYRICS[s.cue] && <div className="mt-0.5 text-xs text-amber-200/80">{d.title}</div>}
                    <div className="mt-1.5 flex items-center gap-1">
                      {d.cast.map((c) => <Px key={c} name={PORTRAIT[c]} scale={0.3} className="rounded-sm" />)}
                      <span className="ml-auto text-[10px] text-indigo-300/70">{(s.b - s.a).toFixed(1)}s</span>
                    </div>
                    <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-indigo-300/90">{d.note}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Cast */}
        <section id="cast" className="scroll-mt-16 pt-16">
          <h2 className="text-2xl font-black sm:text-3xl">选角 · 按图鉴设定对位</h2>
          <p className="mt-1 max-w-3xl text-sm text-indigo-300">角色精灵直接取自仓库《达拉崩吧》MV 的 <code className="text-amber-200">sprites_data.js</code>（两部 MV 共用同一份）；对位规则沿用仓库《童话镇》的选角锁定，皇冠、红斗篷、礼帽、蝴蝶结、鱼尾是叠加的像素配件。</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {CAST.map((c) => (
              <div key={c.id} className="rounded-2xl border border-indigo-300/15 bg-[#17142e] p-4">
                <div className="flex items-center gap-3">
                  <Px name={c.portrait} scale={1} className="rounded-lg" />
                  <div>
                    <div className="text-base font-bold text-white">{c.name}</div>
                    <div className="mt-0.5 text-xs text-indigo-300/80">《达拉崩吧》：{c.before}</div>
                  </div>
                </div>
                <div className="mt-3 rounded-lg bg-amber-300/10 px-3 py-2 text-sm font-semibold text-amber-100">{c.now}</div>
                <p className="mt-2 text-xs leading-relaxed text-indigo-200/85">{c.why}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Diagnosis */}
        <section id="diag" className="scroll-mt-16 pt-16">
          <h2 className="text-2xl font-black sm:text-3xl">这个分支的 Remotion 为什么看着怪</h2>
          <div className="mt-3 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-relaxed text-amber-50">
            <b>结论：</b>不是 Remotion 本身的问题，是 <code>tools/remotion-engine</code> 把一套 Canvas 引擎用 DOM/SVG 又实现了一遍，这一遍里有三件事没处理——
            贴图的加载等待、不透明的姿势切换、缺素材时的硬失败；再叠加「1280×720 平面放大」带来的发糊和没有纵深。
            <span className="mt-2 block text-amber-200/90"><b>依据与边界：</b>以下 {ISSUES.length} 条全部来自逐文件阅读该分支源码，每条都给了文件位置。我没有在这里重新渲染你的成片，也没看到 mp4 画面本身：「原因」一栏是代码里能直接读到的事实，「看到的」一栏是按代码推出来的预期症状，哪一条对应你眼里的「怪」需要你对照确认；标「待渲染复核」的一条依赖 Chromium 的光栅化行为，把握最低。</span>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {ISSUES.map((it, i) => (
              <article key={it.id} className="rounded-2xl border border-indigo-300/15 bg-[#17142e] p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-2 py-0.5 text-xs font-black ${LV[it.level]}`}>{it.level}</span>
                  <span className="rounded-md border border-indigo-300/25 px-2 py-0.5 text-[11px] text-indigo-200">{it.proof}</span>
                  <span className="ml-auto font-mono text-xs text-indigo-300/60">#{i + 1}</span>
                </div>
                <h3 className="mt-2.5 text-lg font-bold leading-snug text-white">{it.title}</h3>
                <p className="mt-1.5 break-words font-mono text-[11px] leading-relaxed text-sky-200/90">{it.where}</p>
                <dl className="mt-3 space-y-2 text-sm leading-relaxed">
                  <div><dt className="inline font-semibold text-indigo-100">原因　</dt><dd className="inline text-indigo-200/90">{it.cause}</dd></div>
                  <div><dt className="inline font-semibold text-rose-200">看到的　</dt><dd className="inline text-indigo-200/90">{it.symptom}</dd></div>
                  <div><dt className="inline font-semibold text-emerald-200">修法　</dt><dd className="inline text-indigo-200/90">{it.fix}</dd></div>
                </dl>
                {it.code && <pre className="mt-3 overflow-x-auto rounded-xl bg-[#0a0818] p-3 text-[11.5px] leading-relaxed text-emerald-100"><code>{it.code}</code></pre>}
              </article>
            ))}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {ROADMAP.map((r, i) => (
              <div key={r.stage} className="rounded-2xl border border-indigo-300/15 bg-gradient-to-b from-indigo-400/10 to-transparent p-5">
                <div className="text-xs font-semibold text-amber-200">{r.when}</div>
                <h3 className="mt-1 text-lg font-bold text-white">{r.stage}</h3>
                <ol className="mt-3 space-y-1.5 text-sm text-indigo-200/90">
                  {r.items.map((x, j) => <li key={x} className="flex gap-2"><span className="font-mono text-indigo-300/60">{i + 1}.{j + 1}</span><span>{x}</span></li>)}
                </ol>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/5 p-5">
            <h3 className="font-bold text-emerald-200">核对过、没有问题的地方</h3>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-indigo-200/90">
              {VERIFIED_OK.map((v) => <li key={v} className="flex gap-2"><span className="text-emerald-300">✓</span><span>{v}</span></li>)}
            </ul>
          </div>
        </section>

        {/* Learned */}
        <section id="learn" className="scroll-mt-16 pt-16">
          <h2 className="text-2xl font-black sm:text-3xl">从 claude-animated-shorts 学到并落到这支 MV 里的</h2>
          <p className="mt-1 max-w-3xl text-sm text-indigo-300">那个项目的核心是「2D 角色活在一个上了色的 3D 世界里」，全部用 three.js 在 Remotion 内渲染。逐条读完它的 SKILL.md 后，这里实际用上的规则如下。</p>
          <div className="mt-5 overflow-hidden rounded-2xl border border-indigo-300/15">
            {LEARNED.map((l, i) => (
              <div key={l.rule} className={`grid gap-1 p-4 text-sm md:grid-cols-2 md:gap-6 ${i % 2 ? 'bg-[#141129]' : 'bg-[#17142e]'}`}>
                <div className="text-indigo-200/90"><span className="mr-2 font-mono text-xs text-indigo-300/60">{String(i + 1).padStart(2, '0')}</span>{l.rule}</div>
                <div className="text-white">{l.here}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-indigo-300/15 bg-[#17142e] p-5">
              <h3 className="font-bold text-white">这一版没做的</h3>
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-indigo-200/90">
                {NOT_DONE.map((v) => <li key={v} className="flex gap-2"><span className="text-indigo-300/60">–</span><span>{v}</span></li>)}
              </ul>
            </div>
            <div className="rounded-2xl border border-indigo-300/15 bg-[#17142e] p-5">
              <h3 className="font-bold text-white">搬回仓库出片</h3>
              <p className="mt-2 text-sm leading-relaxed text-indigo-200/90">播放器里跑的就是一个标准 Remotion 组件，注册成 Composition 即可用现有的 <code className="text-amber-200">render_cli.mjs</code>（已带 <code className="text-amber-200">gl: 'angle'</code>）出 mp4。</p>
              <pre className="mt-3 overflow-x-auto rounded-xl bg-[#0a0818] p-3 text-[11.5px] leading-relaxed text-emerald-100"><code>{`<Composition id="TonghuazhenMV" component={MVComp}
  width={1920} height={1080} fps={30}
  durationInFrames={makeTimeline().frames}
  defaultProps={{ starts: SRT_STARTS, ends: SRT_ENDS,
    audioSrc: staticFile('童话镇.mp3'), audioOffset: 0, showLyrics: true }} />`}</code></pre>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-indigo-300/15 py-8 text-center text-xs leading-relaxed text-indigo-300/70">
        同人复刻演示 · 角色素材来自 aavvcasdas/newday 仓库 · 歌曲《童话镇》版权归原作者所有，本页不含音频
      </footer>
    </div>
  );
}
