// 渲染引擎：给定「帧号 + 时间轴」，确定性地画出这一帧（无随机数、无累积状态，可任意跳帧 / 并发渲染）。
import * as THREE from 'three';
import type { AtlasData } from './actors';
import { Kit, type CamState, type Frame, type ShotDef } from './core';
import { clamp01, LOOKS, makeSky, makeStars, rgb, timeU, type LookName } from './kit';
import { beatAt, cueAt, FPS, shotIndexAt, type ShotTime, type Timeline } from './timeline';

/** 镜头表 → 按 id 查表；id 重复直接报错（重复的 id 会让两个镜头共用同一份搭景与随机种子） */
export function shotMap(shots: ShotDef[]): Record<string, ShotDef> {
  const map: Record<string, ShotDef> = {};
  for (const s of shots) {
    if (map[s.id]) throw new Error(`[engine] 镜头 id 重复：${s.id}`);
    map[s.id] = s;
  }
  return map;
}

const hashStr = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

/** 第 frame 帧传给镜头 st 的时间信息。出片（FilmEngine.render）和开渲前的预检（castPreflight）用的是同一份，两边不会各算各的 */
export function frameOf(tl: Timeline, st: ShotTime, frame: number): Frame {
  const T = frame / FPS;
  const t = T - st.a, dur = st.b - st.a, bt = beatAt(tl, T);
  const now = cueAt(tl, T, 0, 0);
  let said = -1;
  while (said + 1 < tl.starts.length && tl.starts[said + 1] <= T) said++;
  const when = (n: number, p = 0) => {
    if (!Number.isInteger(n) || n < 0 || n >= tl.starts.length) throw new Error(`[engine] 镜头 ${st.id} 用 when(${n}) 引用了不存在的句子（全片 ${tl.starts.length} 句，序号从 0 数）`);
    return (tl.starts[n] + (tl.ends[n] - tl.starts[n]) * p - st.a) / dur;
  };
  return { t, u: clamp01(t / dur), dur, T, bt, f: frame, line: now ? now.i : -1, lp: now ? now.p : 0, said, when };
}

/** 全片角色预检的结果 */
export interface CastReport {
  shots: number; frames: number;
  /** 每个角色在全片里实际画到过哪些精灵格（只算看得见的那些帧） */
  sprites: Record<string, string[]>;
  /** 会让角色在成片里消失、隔帧乱跳，或让渲染中途报错的问题；空数组 = 通过 */
  problems: string[];
  /** 「同一帧，顺着走和倒着走结果一样」核对过多少帧（出错的镜头不核对） */
  orderChecked: number;
  /** 预检期间各镜头往 Canvas 上画的字（道具上的字、手写字卡）和当时用的字体串，去重。给文字预检核对字形用 */
  drawn: DrawnText[];
}

/** 镜头往 Canvas 上画的一段字 */
export interface DrawnText { shot: string; text: string; font: string }

/**
 * 在 fn 运行期间，记下所有 Canvas 2D 的 fillText / strokeText：画了什么字、用的什么字体。
 * 镜头里的字不都走 props.ts 的 writeLine()，有的直接 c.fillText——所以挂在 Canvas 自己身上（普通的和离屏的都挂），一个不漏。
 * 没有 Canvas 的环境（Node 里跑测试）什么都不记。
 */
function watchCanvasText<T>(on: (text: string, font: string) => void, fn: () => T): T {
  type Draw = (...a: unknown[]) => unknown;
  const g = globalThis as unknown as Record<string, { prototype: Record<string, Draw> } | undefined>;
  const undo: Array<() => void> = [];
  for (const name of ['CanvasRenderingContext2D', 'OffscreenCanvasRenderingContext2D']) {
    const proto = g[name]?.prototype;
    if (!proto) continue;
    for (const method of ['fillText', 'strokeText']) {
      const original = proto[method];
      proto[method] = function (this: { font: string }, ...a: unknown[]) { on(String(a[0]), this.font); return original.apply(this, a); };
      undo.push(() => { proto[method] = original; });
    }
  }
  try { return fn(); } finally { for (const u of undo) u(); }
}

// ── 「这一帧只取决于这一帧」 ─────────────────────────────────────────────────────────────
// 出片时一个渲染页面只渲一部分帧（300 帧一块、多个页面交替取帧），抽查静帧更是每帧一个新页面。
// 镜头里只要有一个状态「这几帧写了、那几帧没写」，没写的那些帧就停在这个页面上一次渲到的样子：
// 每个页面各留各的，成片里就是隔帧来回跳，单帧抽出来看又是另一个样子——渲染全程不报错。
// （实际出过：Day14 的沙漏翻完之后留着 flip() 最后一帧的倾角，两个页面留的角度不同，成片里抖了近 5 秒。）
// 核对办法：全片顺着走一遍；另起一套搭景倒着再走一遍；每一帧两边的状态必须一模一样。

const HB = new Float64Array(1), HW = new Uint32Array(HB.buffer);
const mixNum = (h: number, v: number) => { HB[0] = v + 0; return Math.imul(Math.imul(h ^ HW[0], 16777619) ^ HW[1], 16777619); };

function pushNums(v: unknown, out: (n: number) => void) {
  if (typeof v === 'number') out(v);
  else if (typeof v === 'boolean') out(v ? 1 : 0);
  else if (Array.isArray(v)) for (const x of v) pushNums(x, out);
  else if (v && typeof v === 'object') {
    const o = v as { isColor?: boolean; r?: number; g?: number; b?: number } & Record<string, unknown>;
    if (o.isColor) { out(o.r!); out(o.g!); out(o.b!); }
    else for (const k of ['x', 'y', 'z', 'w']) if (typeof o[k] === 'number') out(o[k] as number); // 向量 / 四元数；贴图、矩阵不看
  }
}

/** 一个物体（连同它下面看得见的所有东西）此刻的样子，压成一个数：显隐、位置、朝向、缩放、材质的颜色 / 透明度 / 数值 uniform、灯的强度与颜色 */
function objectDigest(root: THREE.Object3D, skip: Set<THREE.Object3D>): number {
  let h = 2166136261;
  const out = (n: number) => { h = mixNum(h, n); };
  const walk = (o: THREE.Object3D) => {
    if (skip.has(o)) return;
    out(o.visible ? 1 : 0);
    if (!o.visible) return; // 看不见的整棵子树反正不画，里面是什么都无所谓
    const p = o.position, q = o.quaternion, s = o.scale;
    out(p.x); out(p.y); out(p.z); out(q.x); out(q.y); out(q.z); out(q.w); out(s.x); out(s.y); out(s.z);
    const mat = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (mat) for (const m of Array.isArray(mat) ? mat : [mat]) {
      const a = m as unknown as { color?: unknown; emissive?: unknown; uniforms?: Record<string, { value: unknown }> };
      out(m.visible ? 1 : 0); out(m.opacity); pushNums(a.color, out); pushNums(a.emissive, out);
      if (a.uniforms) for (const k in a.uniforms) pushNums(a.uniforms[k].value, out);
    }
    const light = o as unknown as { isLight?: boolean; intensity?: number; color?: unknown };
    if (light.isLight) { out(light.intensity ?? 0); pushNums(light.color, out); }
    out(o.children.length);
    for (const c of o.children) walk(c);
  };
  walk(root);
  return h >>> 0;
}

/** 一帧里「会影响画面」的全部状态：机位、每个角色、搭景里每个顶层物体（k.add 进来的那些） */
interface FrameState { cam: number; actors: string[]; things: number[] }
function frameState(kit: Kit, cs: CamState): FrameState {
  const holders = new Set<THREE.Object3D>(kit.actors.map((a) => a.holder));
  let c = 2166136261;
  for (const v of [...cs.p, ...cs.l, cs.fov, cs.roll]) c = mixNum(c, v);
  return { cam: c >>> 0, actors: kit.actors.map((a) => a.stateLine()), things: kit.root.children.filter((o) => !holders.has(o)).map((o) => objectDigest(o, holders)) };
}

const spans = (frames: number[]) => {
  const out: [number, number][] = [];
  for (const f of [...frames].sort((a, b) => a - b)) { const last = out[out.length - 1]; if (last && f <= last[1] + 1) last[1] = f; else out.push([f, f]); }
  return out;
};

/**
 * 全片角色预检：不出图，只把每一帧的镜头逻辑照出片时的顺序走一遍，看每个角色这一帧画哪一格、会不会悄悄不见。
 * 对应旧引擎补丁里的 preflightRemotionAssets()——那边是「逐帧扫描全片，收集真正会画到的图集，逐个取回核对」；
 * 这边图集只有一张、加载时已经体检过（actors.ts 的 atlasProblems），所以要扫的是「镜头代码会不会点到不存在的格子、算出坏数」：
 *   · 镜头搭景 / 逐帧逻辑抛错（最常见：a.set('写错的格子名')）——出片时要渲到那一帧才炸，这里开渲前一次报全；
 *   · 看得见的角色，坐标 / 缩放 / 透明度等出现 NaN、Infinity——three.js 不报错，只是不画，成片里人就没了；
 *   · 机位出现 NaN——整帧什么都画不出来。
 *   · 同一帧的画面取决于之前渲过哪些帧（见上面「这一帧只取决于这一帧」）——成片里隔帧乱跳，同样全程不报错。
 * 一个镜头抛错之后，这个镜头后面的帧不再检查（它多半每一帧都会抛同一个错）。
 */
export function castPreflight(shots: ShotDef[], tl: Timeline, atlas: AtlasData): CastReport {
  const drawn = new Map<string, DrawnText>();
  let drawing = '';
  return watchCanvasText(
    (text, font) => { const key = `${drawing}\n${font}\n${text}`; if (!drawn.has(key)) drawn.set(key, { shot: drawing, text, font }); },
    () => ({ ...walkFilm(shots, tl, atlas, (id) => { drawing = id; }), drawn: [...drawn.values()] }),
  );
}

function walkFilm(shots: ShotDef[], tl: Timeline, atlas: AtlasData, enter: (shotId: string) => void): Omit<CastReport, 'drawn'> {
  const map = shotMap(shots);
  const pool = new Map<string, unknown>();
  const built = new Map<string, { kit: Kit; update: (f: Frame) => CamState }>();
  const dead = new Set<string>();
  const used = new Map<string, Set<string>>();
  const problems: string[] = [];
  const runs = new Map<string, { first: number; n: number }>(); // 「谁的哪个数坏了」→ 首帧与帧数：同一个问题连着几十帧只报一条
  const note = (what: string, f: number) => { const r = runs.get(what); if (r) r.n++; else runs.set(what, { first: f, n: 1 }); };
  const at = (f: number) => `第 ${f} 帧（${(f / FPS).toFixed(2)}s）`;
  const forward: (FrameState | undefined)[] = new Array(tl.frames); // 顺着走时每一帧的状态；出错的帧留空
  for (let f = 0; f < tl.frames; f++) {
    const st = tl.shots[shotIndexAt(tl, f / FPS)];
    if (dead.has(st.id)) continue;
    enter(st.id);
    try {
      const def = map[st.id];
      if (!def) throw new Error('时间轴引用了未注册的镜头');
      let rt = built.get(st.id);
      if (!rt) {
        const kit = new Kit(atlas, hashStr(st.id), pool);
        rt = { kit, update: def.build(kit) };
        built.set(st.id, rt);
      }
      const fr = frameOf(tl, st, f);
      timeU.value = fr.T;
      for (const a of rt.kit.actors) a.begin();
      const cs = rt.update(fr);
      if (![...cs.p, ...cs.l, cs.fov, cs.roll].every(Number.isFinite)) note(`镜头 ${st.id}：机位里有非有限数（位置 [${cs.p}]，看向 [${cs.l}]，视角 ${cs.fov}，侧倾 ${cs.roll}）——这一帧整个画面都出不来`, f);
      rt.kit.actors.forEach((a, i) => {
        const s = a.probe();
        if (s.bad) note(`镜头 ${st.id}：角色 ${s.id}（本镜第 ${i + 1} 个）的 ${s.bad}——渲染不会报错，只是这个角色不会被画出来`, f);
        else if (s.shown) { if (!used.has(s.id)) used.set(s.id, new Set()); used.get(s.id)!.add(s.key); }
      });
      forward[f] = frameState(rt.kit, cs);
    } catch (e) {
      dead.add(st.id);
      problems.push(`镜头 ${st.id} ${at(f)}：${e instanceof Error ? e.message : String(e)}`);
    }
  }
  for (const [what, r] of runs) problems.push(`${what}。从${at(r.first)}起，共 ${r.n} 帧`);

  // 第二遍：另起一套搭景（连跨镜头共用的大布景也另搭一份），从最后一帧倒着走到第 0 帧，逐帧和第一遍比
  const pool2 = new Map<string, unknown>();
  const built2 = new Map<string, { kit: Kit; update: (f: Frame) => CamState }>();
  const drift = new Map<string, number[]>(); // 「哪个镜头的什么东西」→ 两遍对不上的帧
  const differ = (what: string, f: number) => { const l = drift.get(what); if (l) l.push(f); else drift.set(what, [f]); };
  const labels = new Map<string, string>();
  let orderChecked = 0;
  for (let f = tl.frames - 1; f >= 0; f--) {
    const st = tl.shots[shotIndexAt(tl, f / FPS)], was = forward[f];
    if (dead.has(st.id) || !was) continue;
    enter(st.id);
    try {
      let rt = built2.get(st.id);
      if (!rt) {
        const kit = new Kit(atlas, hashStr(st.id), pool2);
        rt = { kit, update: map[st.id].build(kit) };
        built2.set(st.id, rt);
      }
      const fr = frameOf(tl, st, f);
      timeU.value = fr.T;
      for (const a of rt.kit.actors) a.begin();
      const now = frameState(rt.kit, rt.update(fr));
      orderChecked++;
      if (now.cam !== was.cam) differ(`镜头 ${st.id}：机位`, f);
      for (let i = 0; i < Math.max(now.actors.length, was.actors.length); i++) {
        if (now.actors[i] === was.actors[i]) continue;
        const a = (now.actors[i] ?? '').split(';'), b = (was.actors[i] ?? '').split(';');
        const names = a.length === b.length ? a.filter((x, j) => x !== b[j]).map((x) => x.split('=')[0]) : ['显隐'];
        differ(`镜头 ${st.id}：角色 ${rt.kit.actors[i]?.id ?? '?'}（本镜第 ${i + 1} 个）的${names.join('、')}`, f);
      }
      const things = rt.kit.root.children.filter((o) => !rt!.kit.actors.some((a) => a.holder === o));
      for (let i = 0; i < Math.max(now.things.length, was.things.length); i++) {
        if (now.things[i] === was.things[i]) continue;
        const key = `${st.id}#${i}`;
        if (!labels.has(key)) { const o = things[i]; labels.set(key, o ? `，这一帧位于 (${[o.position.x, o.position.y, o.position.z].map((v) => +v.toFixed(2)).join(', ')})` : ''); }
        differ(`镜头 ${st.id}：搭景里第 ${i + 1} 个物体（按 k.add 的先后数，不算角色${labels.get(key)}）`, f);
      }
    } catch (e) {
      dead.add(st.id);
      problems.push(`镜头 ${st.id} ${at(f)}：顺着走没事，倒着走到这一帧时报错（${e instanceof Error ? e.message : String(e)}）——它依赖前面的帧先跑过，分块渲染时会在某一块的开头炸`);
    }
  }
  const drifted = [...drift].map(([what, frames]) => ({ what, frames, sp: spans(frames) })).sort((a, b) => a.sp[0][0] - b.sp[0][0]); // 按在片子里出现的先后列
  for (const { what, frames, sp } of drifted) {
    problems.push(`${what}取决于之前渲过哪些帧：${sp.slice(0, 3).map(([a, b]) => (a === b ? `第 ${a} 帧` : `第 ${a}–${b} 帧`)).join('、')}${sp.length > 3 ? ` 等 ${sp.length} 段` : ''}（${(sp[0][0] / FPS).toFixed(2)}s 起，共 ${frames.length} 帧）顺着走和倒着走不一样——成片里会隔帧来回跳，单帧抽查也和成片对不上。它有状态只在一部分帧里写了，要每一帧都写全`);
  }
  const sprites: Record<string, string[]> = {};
  for (const id of [...used.keys()].sort()) sprites[id] = [...used.get(id)!].sort();
  return { shots: tl.shots.length, frames: tl.frames, sprites, problems, orderChecked };
}

export class FilmEngine {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  private sky = makeSky();
  private stars = makeStars();
  private sun = new THREE.DirectionalLight(0xffffff, 2.5);
  private hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1.5);
  private fog = new THREE.Fog(0xffffff, 10, 100);
  private built = new Map<string, { kit: Kit; update: (f: Frame) => CamState }>();
  private pool = new Map<string, unknown>();
  private active: string | null = null;
  private cardTint = new THREE.Vector3(1, 1, 1);
  private map: Record<string, ShotDef>;

  /** shots：这部作品的镜头表（引擎本身不认识任何具体作品） */
  constructor(canvas: HTMLCanvasElement, w: number, h: number, private atlas: AtlasData, shots: ShotDef[]) {
    this.map = shotMap(shots);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(w, h, false);
    // 绘制顺序必须只由「这一帧的场景」决定。three 默认：不透明物体先按 material.id 排、透明物体深度相同时按 object.id 排，
    // 而这两个 id 都是全局自增的——取决于这个页面之前搭过哪些镜头。远处两块相交 / 共面的几何体（相邻的远山、地平线）
    // 深度相等时「后画的赢」，于是同一帧在「刚打开的页面」和「已经渲染过别的镜头的页面」上会差出几十个边缘像素。
    // 这里改成只按 分组 → renderOrder → 深度 排；并列时比较函数返回 0，Array.sort 是稳定排序，
    // 保留的就是场景树的遍历顺序（搭景先后）。结果：任何页面、任何渲染顺序、任何分段方式，同一帧逐像素相同。
    this.renderer.setOpaqueSort((a, b) => a.groupOrder - b.groupOrder || a.renderOrder - b.renderOrder || a.z - b.z);
    this.renderer.setTransparentSort((a, b) => a.groupOrder - b.groupOrder || a.renderOrder - b.renderOrder || b.z - a.z);
    this.camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 1500);
    this.scene.fog = this.fog;
    this.scene.add(this.sky, this.stars, this.sun, this.sun.target, this.hemi);
  }

  private applyLook(name: LookName) {
    const L = LOOKS[name];
    const u = (this.sky.material as THREE.ShaderMaterial).uniforms;
    (u.top.value as THREE.Vector3).copy(rgb(L.top));
    (u.hor.value as THREE.Vector3).copy(rgb(L.hor));
    (u.low.value as THREE.Vector3).copy(rgb(L.hor)).multiplyScalar(0.8);
    this.fog.color.setHex(L.hor); this.fog.near = L.fog[0]; this.fog.far = L.fog[1];
    this.sun.color.setHex(L.sun); this.sun.intensity = L.sunI;
    this.sun.position.set(L.dir[0], L.dir[1], L.dir[2]).multiplyScalar(60);
    this.hemi.color.setHex(L.amb); this.hemi.groundColor.setHex(L.amb).multiplyScalar(0.5); this.hemi.intensity = L.ambI;
    this.cardTint.copy(rgb(L.card));
    this.stars.visible = L.stars > 0;
    (this.stars.material as THREE.PointsMaterial).color.setScalar(L.stars);
  }

  render(frame: number, tl: Timeline) {
    const T = frame / FPS;
    const st = tl.shots[shotIndexAt(tl, T)];
    const def = this.map[st.id];
    if (!def) throw new Error(`[engine] 时间轴引用了未注册的镜头 ${st.id}`);
    let rt = this.built.get(st.id);
    if (!rt) {
      const kit = new Kit(this.atlas, hashStr(st.id), this.pool);
      rt = { kit, update: def.build(kit) };
      this.built.set(st.id, rt);
    }
    if (this.active !== st.id) {
      if (this.active) this.scene.remove(this.built.get(this.active)!.kit.root);
      this.scene.add(rt.kit.root);
      this.active = st.id;
      this.applyLook(def.look);
    }
    const fr = frameOf(tl, st, frame), bt = fr.bt;
    timeU.value = T;
    for (const a of rt.kit.actors) a.begin();
    const cs = rt.update(fr);
    const cam = this.camera;
    cam.position.set(cs.p[0], cs.p[1], cs.p[2]);
    cam.up.set(0, 1, 0);
    cam.lookAt(cs.l[0], cs.l[1], cs.l[2]);
    if (cs.roll) cam.rotateZ(cs.roll);
    cam.fov = cs.fov - (bt.down ? 0.55 : 0.18) * bt.pulse; // 重拍轻推（punch-in）
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    this.sky.position.copy(cam.position);
    this.stars.position.copy(cam.position);
    for (const a of rt.kit.actors) a.commit(cam, this.cardTint);
    this.renderer.render(this.scene, cam);
  }

  dispose(loseContext = false) {
    this.renderer.dispose();
    if (loseContext) this.renderer.forceContextLoss();
  }
}
