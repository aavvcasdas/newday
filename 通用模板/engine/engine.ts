// 渲染引擎：给定「帧号 + 时间轴」，确定性地画出这一帧（无随机数、无累积状态，可任意跳帧 / 并发渲染）。
import * as THREE from 'three';
import type { AtlasData } from './actors';
import { Kit, type CamState, type Frame, type ShotDef } from './core';
import { clamp01, LOOKS, makeSky, makeStars, rgb, timeU, type LookName } from './kit';
import { beatAt, cueAt, FPS, shotIndexAt, type Timeline } from './timeline';

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
    const t = T - st.a, dur = st.b - st.a, bt = beatAt(tl, T);
    timeU.value = T;
    for (const a of rt.kit.actors) a.begin();
    const said = cueAt(tl, T, 0, 0);
    const cs = rt.update({ t, u: clamp01(t / dur), dur, T, bt, f: frame, line: said ? said.i : -1, lp: said ? said.p : 0 });
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
