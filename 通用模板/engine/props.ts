// 口播短剧（Day 系列）常用的室内布景与道具。全部是几何体 + Canvas 贴图，不依赖任何外部素材。
// 约定：每个道具的原点在「放到桌面 / 地面上的那个点」，单位是世界单位（角色身高约 1.7）。
// 会动的道具返回 { g, set(…) }：set 只接受当前进度，不保存状态——同一帧永远画出同一个样子。
//
// 画面红线（从旧项目带过来的硬规矩，道具层面就守住）：
//   · 沙漏只画物理沙子，不画刻度、百分比；钟只画钟面与指针；
//   · 纸上能写字，但不画表格、进度条、余额条、数据曲线；
//   · 伞没有「握着伞柄的手」——角色是纸片，伞立在她身边即可，不伪造接触。
import * as THREE from 'three';
import { FONT } from './fonts';
import { ball, basic, box, canvasTex, clamp01, cone, cyl, faceted, glowMat, hash, mesh, put, toon } from './kit';

const PI = Math.PI;

// ---------- 房间 ----------
export interface RoomOpts { w?: number; d?: number; h?: number; wall?: number; floor?: number; trim?: number; rug?: number | null }
/** 房间：地板 + 后墙 + 两侧墙 + 踢脚线（朝相机的一面敞开）。原点在地板中心，后墙在 z = −d/2 */
export function room(o: RoomOpts = {}): THREE.Group {
  const w = o.w ?? 12, d = o.d ?? 9, h = o.h ?? 5.2;
  const wall = o.wall ?? 0xf3e2c6, floor = o.floor ?? 0xc79a6b, trim = o.trim ?? 0x8a5a3c;
  const g = new THREE.Group();
  put(g, box(w + 0.6, 0.2, d + 0.6, floor, 0), 0, -0.2, 0);
  for (let i = 0; i < 7; i++) put(g, box(w, 0.012, 0.03, trim, 0), 0, 0, -d / 2 + ((i + 0.5) * d) / 7); // 地板缝
  put(g, box(w + 0.6, h, 0.3, wall, 0), 0, 0, -d / 2 - 0.15);
  put(g, box(0.3, h, d + 0.6, wall, 0), -w / 2 - 0.15, 0, 0);
  put(g, box(0.3, h, d + 0.6, wall, 0), w / 2 + 0.15, 0, 0);
  put(g, box(w, 0.28, 0.08, trim, 0), 0, 0, -d / 2 + 0.04);
  put(g, box(0.08, 0.28, d, trim, 0), -w / 2 + 0.04, 0, 0);
  put(g, box(0.08, 0.28, d, trim, 0), w / 2 - 0.04, 0, 0);
  if (o.rug !== null) {
    const rug = new THREE.Mesh(new THREE.CircleGeometry(1, 40).rotateX(-PI / 2), toon(o.rug ?? 0xe9a6a0));
    rug.scale.set(3.2, 1, 2.1); put(g, rug, 0, 0.012, 0.4);
  }
  return g;
}

export interface Door { g: THREE.Group; set: (open: number) => void }
/** 门：门框 + 门外的亮光 + 可开合的门扇 + 落在地上的一束光。原点在门槛中心，门朝 +z；set(0–1) 设置开合 */
export function door(w = 1.5, h = 2.7, color = 0x8a5a3c): Door {
  const g = new THREE.Group();
  put(g, box(w + 0.36, h + 0.2, 0.16, 0x5f3d26, 0.04), 0, 0, -0.02);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(w, h), basic(0xfff3c4));
  put(g, sky, 0, h / 2, 0.07);
  const hinge = new THREE.Group(); put(g, hinge, -w / 2, 0, 0.1);
  const leaf = box(w, h, 0.09, color, 0.035); put(hinge, leaf, w / 2, 0, 0);
  put(leaf, box(w * 0.62, h * 0.3, 0.02, 0x6f4630, 0), 0, h * 0.56, 0.05);
  put(leaf, box(w * 0.62, h * 0.3, 0.02, 0x6f4630, 0), 0, h * 0.12, 0.05);
  put(leaf, ball(0.07, 0xffd166, false, 0.02), w * 0.36, h * 0.46, 0.1);
  const beamGeo = new THREE.PlaneGeometry(1, 1).rotateX(-PI / 2).translate(0, 0, 0.5);
  const beam = new THREE.Mesh(beamGeo, glowMat(0xfff0b0, 0.5, true));
  put(g, beam, 0, 0.02, 0.12);
  const set = (open: number) => {
    const o = clamp01(open);
    hinge.rotation.y = -o * 1.9;
    beam.visible = o > 0.01;
    beam.scale.set(0.12 + o * w * 1.5, 1, 1.2 + o * 3.4);
    beam.position.x = w / 2 - (0.12 + o * w * 1.5) / 2 - (1 - o) * 0.02;
    (beam.material as THREE.MeshBasicMaterial).opacity = 0.22 + 0.3 * o;
  };
  set(0);
  return { g, set };
}

/** 窗：窗框 + 发亮的玻璃 + 十字窗棂。原点在窗台中心，贴在墙面上（朝 +z） */
export function windowPane(w = 2.2, h = 1.6, glass = 0xcfeaff): THREE.Group {
  const g = new THREE.Group();
  put(g, box(w + 0.3, h + 0.3, 0.1, 0x8a5a3c, 0.035), 0, -0.15, 0);
  put(g, new THREE.Mesh(new THREE.PlaneGeometry(w, h), basic(glass)), 0, h / 2, 0.06);
  put(g, box(0.07, h, 0.04, 0x8a5a3c, 0), 0, 0, 0.07);
  put(g, box(w, 0.07, 0.04, 0x8a5a3c, 0), 0, h / 2 - 0.035, 0.07);
  put(g, box(w + 0.5, 0.1, 0.3, 0x6f4630, 0.03), 0, -0.22, 0.1);
  return g;
}

/** 桌子：原点在桌子正下方的地面，桌面高度 = h */
export function table(w = 2.6, d = 1.3, h = 0.8, color = 0xb9824f): THREE.Group {
  const g = new THREE.Group();
  put(g, box(w, 0.1, d, color, 0.04), 0, h - 0.1, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(g, box(0.12, h - 0.1, 0.12, 0x8a5a3c, 0.03), sx * (w / 2 - 0.16), 0, sz * (d / 2 - 0.16));
  return g;
}

/** 饭碗：一碗冒尖的白饭。原点在碗底 */
export function riceBowl(r = 0.2, color = 0x3d7fd9): THREE.Group {
  const g = new THREE.Group();
  put(g, cyl(r * 0.5, r * 0.42, r * 0.16, 0xf4f6ff, 16, 0.02));
  const bowl = mesh(new THREE.CylinderGeometry(r, r * 0.5, r * 0.72, 20).translate(0, r * 0.36, 0), toon(color), 0.025);
  put(g, bowl, 0, r * 0.14, 0);
  put(g, cyl(r * 1.02, r * 1.0, r * 0.07, 0xf4f6ff, 20, 0), 0, r * 0.83, 0);
  const rice = ball(r * 0.86, 0xffffff, true, 0.02); rice.scale.set(1, 0.55, 1); put(g, rice, 0, r * 0.9, 0);
  return g;
}

export interface Hourglass { g: THREE.Group; body: THREE.Group; set: (p: number, T?: number, flowing?: boolean) => void; flip: (e: number, pBefore: number, T?: number) => void }
/**
 * 沙漏（物理沙子，没有刻度）。原点在底座底面。
 *   set(p, T, flowing)  p=0 沙全在上、1 全在下；flowing=false 时不画下落的沙柱。沙漏同时回到立正：
 *                       set() 把沙漏的状态写全，镜头里「翻的时候用 flip()、翻完用 set()」不会留着 flip() 最后一帧的倾角
 *   flip(e, pBefore, T) 把沙漏倒过来：e 是翻转进度 0–1，pBefore 是翻之前的 p。翻完（e=1）之后沙量变成 1 − pBefore，
 *                       接着用 set(1 − pBefore + …) 让它继续漏。沙漏上下对称，所以翻到一半（横过来的那一帧）换成镜像状态，
 *                       沙子始终待在同一侧，看不出接缝。
 */
export function hourglass(h = 0.62, sand = 0xf2c14e, wood = 0x8a5a3c): Hourglass {
  const g = new THREE.Group();
  const body = new THREE.Group(); put(g, body, 0, h / 2, 0);
  const r = h * 0.3, plate = h * 0.07, bulb = h / 2 - plate;
  for (const s of [-1, 1]) put(body, cyl(r * 1.15, r * 1.15, plate, wood, 18, 0.02), 0, s > 0 ? h / 2 - plate : -h / 2, 0);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * PI * 2 + 0.5; put(body, cyl(h * 0.022, h * 0.022, h - plate * 2, wood, 6, 0), Math.cos(a) * r * 1.02, -h / 2 + plate, Math.sin(a) * r * 1.02); }
  const glassMat = new THREE.MeshBasicMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
  const up = new THREE.Mesh(new THREE.ConeGeometry(r * 0.92, bulb, 20, 1, true).rotateX(PI).translate(0, bulb / 2, 0), glassMat);
  const dn = new THREE.Mesh(new THREE.ConeGeometry(r * 0.92, bulb, 20, 1, true).translate(0, -bulb / 2, 0), glassMat);
  body.add(up, dn);
  const sandMat = toon(sand);
  // 上半：尖朝下的沙锥，从细颈往上长；下半：堆在底座上的沙堆
  const top = new THREE.Mesh(new THREE.ConeGeometry(r * 0.84, bulb * 0.92, 18).rotateX(PI).translate(0, (bulb * 0.92) / 2, 0), sandMat);
  const pile = new THREE.Mesh(new THREE.ConeGeometry(r * 0.84, bulb * 0.62, 18).translate(0, (bulb * 0.62) / 2, 0), sandMat);
  pile.position.y = -bulb;
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.012, h * 0.012, 1, 6).translate(0, -0.5, 0), sandMat);
  body.add(top, pile, stream);
  const fill = (p0: number, T = 0, flowing = true) => {
    const p = clamp01(p0);
    const a = Math.cbrt(1 - p), b = Math.cbrt(p); // 体积守恒：锥体体积 ∝ 边长³
    top.visible = p < 0.999; top.scale.setScalar(Math.max(0.001, a));
    pile.visible = p > 0.001; pile.scale.setScalar(Math.max(0.001, b));
    stream.visible = flowing && p > 0.001 && p < 0.999;
    stream.scale.set(1 + 0.25 * Math.sin(T * 31), bulb * (1 - 0.62 * b), 1 + 0.25 * Math.cos(T * 27));
  };
  // set() 不立正的话，倾角就取决于「这个页面上一次调 flip() 是哪一帧」：两个渲染页面各留各的角度，成片里沙漏隔帧来回跳
  const set = (p0: number, T = 0, flowing = true) => { body.rotation.z = 0; fill(p0, T, flowing); };
  const flip = (e0: number, pBefore: number, T = 0) => {
    const e = clamp01(e0);
    if (e <= 0) { set(pBefore, T); return; }
    if (e >= 1) { set(1 - pBefore, T); return; }
    if (e < 0.5) { body.rotation.z = e * PI; fill(pBefore, T, false); } else { body.rotation.z = (e - 1) * PI; fill(1 - pBefore, T, false); }
  };
  set(0);
  return { g, body, set, flip };
}

/** 一张纸 / 一页内页：draw 在上面写字（坐标系 0–W × 0–H 像素，已铺好纸色）。平放在桌上，原点在纸的中心 */
export function sheet(w: number, d: number, draw?: (c: CanvasRenderingContext2D, W: number, H: number) => void, paper = '#fffdf4'): THREE.Mesh {
  const W = 512, H = Math.max(64, Math.round((512 * d) / w));
  const tex = canvasTex(W, H, (c) => {
    c.fillStyle = paper; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(90,70,50,.55)'; c.lineWidth = 6; c.strokeRect(3, 3, W - 6, H - 6);
    if (draw) draw(c, W, H);
  });
  tex.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-PI / 2), new THREE.MeshBasicMaterial({ map: tex }));
  return m;
}
/** 把一张 sheet() 立起来当桌牌 / 价签：正面朝 +z（朝镜头），lean 是往后仰的弧度。d 是那张纸的进深（立起来以后就是高）。原点在牌子底边中心 */
export function standing(m: THREE.Mesh, d: number, lean = 0.14): THREE.Group {
  const g = new THREE.Group();
  m.rotation.x = PI / 2 - lean;
  m.position.set(0, (d / 2) * Math.cos(lean), -(d / 2) * Math.sin(lean));
  g.add(m);
  return g;
}
/** 在纸上写一行字：自动缩到不超出纸宽。y 是基线位置（0–1），size 是字高占纸高的比例 */
export function writeLine(c: CanvasRenderingContext2D, W: number, H: number, text: string, y = 0.5, size = 0.22, color = '#2b2233') {
  let px = Math.round(H * size);
  c.font = `900 ${px}px ${FONT}`;
  const max = W * 0.86, wd = c.measureText(text).width;
  if (wd > max) { px = Math.floor((px * max) / wd); c.font = `900 ${px}px ${FONT}`; }
  c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(text, W / 2, H * y);
}

/** 一摞纸：n 张，逐张略微错开（错位量由 hash 决定，可复现）。原点在最底下那张的底面中心 */
export function paperStack(n: number, w = 0.42, d = 0.3, color = 0xfffdf4): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const p = box(w, 0.014, d, i % 5 === 4 ? 0xf1e7cf : color, 0);
    put(g, p, (hash(i * 3 + 1) - 0.5) * 0.05, i * 0.014, (hash(i * 3 + 2) - 0.5) * 0.04, (hash(i * 3 + 3) - 0.5) * 0.24);
  }
  return g;
}

export interface Notebook { g: THREE.Group; cover: THREE.Group; page: THREE.Group }
/** 旧账本：封底 + 内页 + 可翻开的封面与一页纸。cover / page 的 rotation.z 从 0（合上）到 π（翻到左边）。原点在本子底面中心 */
export function notebook(w = 0.56, d = 0.4, color = 0x7a4a2c): Notebook {
  const g = new THREE.Group();
  put(g, box(w, 0.02, d, color, 0.02));
  put(g, box(w * 0.94, 0.04, d * 0.92, 0xfffdf4, 0), 0, 0.02, 0);
  const page = new THREE.Group(); put(g, page, -w / 2, 0.062, 0);
  put(page, box(w * 0.94, 0.004, d * 0.92, 0xfff6dc, 0), (w * 0.94) / 2, 0, 0);
  const cover = new THREE.Group(); put(g, cover, -w / 2, 0.068, 0);
  put(cover, box(w, 0.02, d, color, 0.02), w / 2, 0, 0);
  put(cover, box(w * 0.5, 0.004, d * 0.22, 0xf1e7cf, 0), w / 2, 0.02, 0);
  return { g, cover, page };
}

/** 伞：伞面 + 伞柄 + 伞尖（没有握伞的手）。原点在伞柄底端，伞面在上方 pole 处 */
export function umbrella(r = 1.15, color = 0xe85d75, pole = 1.55): THREE.Group {
  const g = new THREE.Group();
  put(g, cyl(0.028, 0.028, pole, 0x3a3340, 6, 0));
  const top = mesh(faceted(new THREE.ConeGeometry(r, r * 0.42, 8, 1, true)).translate(0, (r * 0.42) / 2, 0), new THREE.MeshToonMaterial({ color, side: THREE.DoubleSide, gradientMap: (toon(color) as THREE.MeshToonMaterial).gradientMap }), 0.03);
  put(g, top, 0, pole - r * 0.14, 0);
  put(g, cone(0.035, 0.16, 0x3a3340, 6, 0), 0, pole + r * 0.28, 0);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.024, 6, 10, PI), toon(0x3a3340));
  hook.rotation.z = PI; put(g, hook, 0.07, 0, 0);
  return g;
}

export interface Rain { g: THREE.Group; set: (T: number) => void }
/** 雨：n 条雨丝在 w × d 的范围内循环下落。位置只由时间 T 决定（可任意跳帧） */
export function rain(n = 140, w = 16, d = 10, top = 7, color = 0xcfe6ff): Rain {
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(0.018, 0.5, 0.018);
  const mat = glowMat(color, 0.55);
  const drops = Array.from({ length: n }, (_, i) => { const m = new THREE.Mesh(geo, mat); g.add(m); return { m, x: (hash(i * 5 + 1) - 0.5) * w, z: (hash(i * 5 + 2) - 0.5) * d, ph: hash(i * 5 + 3), sp: 7 + hash(i * 5 + 4) * 4 }; });
  const set = (T: number) => {
    for (const dr of drops) {
      const y = top - (((T * dr.sp) / top + dr.ph) % 1) * top;
      dr.m.position.set(dr.x + (top - y) * 0.06, y, dr.z);
    }
  };
  set(0);
  g.rotation.z = -0.05;
  return { g, set };
}

/** 一台小相机（Day 系列里「拍 MV 的那台」）。原点在机身底面中心，镜头朝 +z */
export function cameraProp(): THREE.Group {
  const g = new THREE.Group();
  put(g, box(0.5, 0.3, 0.22, 0x2f3440, 0.03));
  put(g, box(0.16, 0.08, 0.16, 0x444b5c, 0.02), -0.1, 0.3, 0);
  const lens = cyl(0.11, 0.12, 0.16, 0x1c1f29, 14, 0.02); lens.rotation.x = PI / 2; put(g, lens, 0.04, 0.15, 0.11);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.085, 16), basic(0x7fd4ff)); put(g, glass, 0.04, 0.15, 0.275);
  put(g, ball(0.03, 0xff5c5c, false, 0), 0.19, 0.25, 0.115);
  return g;
}

/** 盆栽：给空墙角一点生气。原点在花盆底面中心 */
export function plant(h = 1.1): THREE.Group {
  const g = new THREE.Group();
  put(g, cyl(0.26, 0.2, 0.34, 0xd9773b, 12, 0.03));
  for (let i = 0; i < 5; i++) { const a = (i / 5) * PI * 2; const leaf = ball(0.24, i % 2 ? 0x4fb85a : 0x3f9a4c, true, 0.025); leaf.scale.set(0.7, 1.5, 0.7); put(g, leaf, Math.cos(a) * 0.16, 0.34 + h * (0.35 + 0.1 * (i % 3)), Math.sin(a) * 0.16); }
  put(g, cyl(0.03, 0.04, h * 0.5, 0x6f4630, 6, 0), 0, 0.3, 0);
  return g;
}
