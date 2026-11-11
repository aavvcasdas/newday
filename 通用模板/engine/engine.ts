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
  /** 会让角色在成片里消失、或让渲染中途报错的问题；空数组 = 通过 */
  problems: string[];
}

/**
 * 全片角色预检：不出图，只把每一帧的镜头逻辑照出片时的顺序走一遍，看每个角色这一帧画哪一格、会不会悄悄不见。
 * 对应旧引擎补丁里的 preflightRemotionAssets()——那边是「逐帧扫描全片，收集真正会画到的图集，逐个取回核对」；
 * 这边图集只有一张、加载时已经体检过（actors.ts 的 atlasProblems），所以要扫的是「镜头代码会不会点到不存在的格子、算出坏数」：
 *   · 镜头搭景 / 逐帧逻辑抛错（最常见：a.set('写错的格子名')）——出片时要渲到那一帧才炸，这里开渲前一次报全；
 *   · 看得见的角色，坐标 / 缩放 / 透明度等出现 NaN、Infinity——three.js 不报错，只是不画，成片里人就没了；
 *   · 机位出现 NaN——整帧什么都画不出来。
 * 一个镜头抛错之后，这个镜头后面的帧不再检查（它多半每一帧都会抛同一个错）。
 */
export function castPreflight(shots: ShotDef[], tl: Timeline, atlas: AtlasData): CastReport {
  const map = shotMap(shots);
  const pool = new Map<string, unknown>();
  const built = new Map<string, { kit: Kit; update: (f: Frame) => CamState }>();
  const dead = new Set<string>();
  const used = new Map<string, Set<string>>();
  const problems: string[] = [];
  const runs = new Map<string, { first: number; n: number }>(); // 「谁的哪个数坏了」→ 首帧与帧数：同一个问题连着几十帧只报一条
  const note = (what: string, f: number) => { const r = runs.get(what); if (r) r.n++; else runs.set(what, { first: f, n: 1 }); };
  const at = (f: number) => `第 ${f} 帧（${(f / FPS).toFixed(2)}s）`;
  for (let f = 0; f < tl.frames; f++) {
    const st = tl.shots[shotIndexAt(tl, f / FPS)];
    if (dead.has(st.id)) continue;
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
    } catch (e) {
      dead.add(st.id);
      problems.push(`镜头 ${st.id} ${at(f)}：${e instanceof Error ? e.message : String(e)}`);
    }
  }
  for (const [what, r] of runs) problems.push(`${what}。从${at(r.first)}起，共 ${r.n} 帧`);
  const sprites: Record<string, string[]> = {};
  for (const id of [...used.keys()].sort()) sprites[id] = [...used.get(id)!].sort();
  return { shots: tl.shots.length, frames: tl.frames, sprites, problems };
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
