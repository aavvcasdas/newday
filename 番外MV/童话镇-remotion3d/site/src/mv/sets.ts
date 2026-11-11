// 共用布景：童话镇全景（七彩河 + 民居 + 城堡 + 拱桥）、立体书、烟花等。
import * as THREE from 'three';
import {
  ball, box, clamp01, cloud, cone, cyl, disc, easeOut, glowMat, hash, house, lantern, mesh, mulberry, pine, put, ribbon,
  sprite, toon, tree, waterMat, setOp,
} from './kit';
import type { Kit } from './core';

export function hill(r: number, h: number, color: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 12), toon(color));
  m.scale.set(r, h, r);
  return m;
}

export function castle(): THREE.Group {
  const g = new THREE.Group();
  const stone = 0xece6f5, rc = 0x3f72e0, dark = 0x33456f;
  put(g, box(10, 6.5, 6, stone));
  put(g, box(4.2, 11.5, 4.2, 0xf6f1ff), 0, 0, -0.6);
  put(g, cone(3.4, 4.8, rc, 4), 0, 11.5, -0.6);
  for (const [x, z, hh] of [[-5.6, 2.6, 8.5], [5.6, 2.6, 8.5], [-5.6, -3, 10], [5.6, -3, 10]]) {
    put(g, cyl(1.5, 1.65, hh, stone, 12), x, 0, z);
    put(g, cone(2.1, 3.8, rc, 12), x, hh, z);
    put(g, box(0.5, 0.9, 0.12, dark, 0), x, hh * 0.62, z + 1.56);
    put(g, cyl(0.04, 0.04, 1.3, 0x3a2418, 5, 0), x, hh + 3.7, z);
    put(g, box(0.8, 0.45, 0.04, 0xe63946, 0.02), x + 0.42, hh + 4.45, z);
  }
  put(g, box(2.8, 3.6, 0.3, 0x6b3f2a), 0, 0, 3.0);
  put(g, box(1.0, 1.5, 0.14, dark, 0), 0, 8, 1.55);
  for (let i = -4; i <= 4; i += 2) put(g, box(0.9, 0.7, 0.9, stone), i, 6.5, 2.6);
  return g;
}

export const BRIDGE_RISE = 3.3;
export const bridgeY = (u: number) => Math.sin(clamp01(u) * Math.PI) * BRIDGE_RISE + 0.4;
export function bridge(len = 18, w = 3.6): THREE.Group {
  const g = new THREE.Group();
  const N = 12;
  for (let i = 0; i < N; i++) {
    const u0 = i / N, u1 = (i + 1) / N, um = (u0 + u1) / 2;
    const x = (um - 0.5) * len, y = bridgeY(um) - 0.4, dy = bridgeY(u1) - bridgeY(u0), dx = len / N;
    const s = box(Math.hypot(dx, dy) + 0.06, 0.42, w, 0xd9b48a);
    s.position.set(x, y, 0); s.rotation.z = Math.atan2(dy, dx); g.add(s);
    for (const zz of [-w / 2, w / 2]) put(g, box(0.16, 0.85, 0.16, 0x8a5a3c), x, y + 0.4, zz);
  }
  for (const xx of [-len * 0.5, len * 0.5]) put(g, box(1.4, 1.2, w + 0.5, 0xb8a49a), xx, -0.3, 0);
  return g;
}

export interface Town {
  g: THREE.Group; curve: THREE.CatmullRomCurve3; water: THREE.ShaderMaterial; lamps: THREE.Group; cloudMat: THREE.MeshBasicMaterial;
  zAt: (x: number) => number; at: (s: number) => { p: THREE.Vector3; ang: number; dx: number; dz: number };
}
export function buildTown(): Town {
  const rnd = mulberry(11);
  const g = new THREE.Group();
  g.add(disc(560, 0x7fcf66));
  const pts = [[-120, -4], [-86, 8], [-56, -8], [-28, 7], [-6, -6], [16, -3], [38, 6], [60, -2], [86, 6], [124, 0]].map(([x, z]) => new THREE.Vector3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  const water = waterMat(1);
  g.add(ribbon(curve, 13.4, 200, toon(0xf3e4b8), 0.03));
  g.add(ribbon(curve, 10.6, 260, water, 0.08));
  const table = Array.from({ length: 241 }, (_, i) => curve.getPointAt(i / 240));
  const zAt = (x: number) => { let best = table[0]; for (const p of table) if (Math.abs(p.x - x) < Math.abs(best.x - x)) best = p; return best.z; };
  const at = (s: number) => {
    const u = clamp01(s), p = curve.getPointAt(u), t = curve.getTangentAt(u);
    return { p, ang: Math.atan2(-t.z, t.x), dx: t.x, dz: t.z };
  };
  const lamps = new THREE.Group(); g.add(lamps);
  const walls = [0xf2d6b3, 0xe9a27a, 0xf6e6c4, 0xd98f6a, 0xcfe0ea, 0xf0c36d, 0xf2b8c6];
  const roofs = [0xb5473c, 0x3f6fb5, 0x8a4fa3, 0x2f8f83, 0xc96a2b];
  const pick = (a: number[]) => a[Math.floor(rnd() * a.length)];
  for (let x = -112; x <= 116; x += 7.2) for (const side of [-1, 1]) for (let row = 0; row < 2; row++) {
    const xx = x + (rnd() - 0.5) * 3;
    const zz = zAt(xx) + side * (11.5 + row * 9 + rnd() * 4);
    const kind = rnd(), w = 3.6 + rnd() * 1.8, h = 3 + rnd() * 2.8, d = 3.4 + rnd() * 1.6, wc = pick(walls), rc = pick(roofs), chim = rnd() > 0.4, ry = (rnd() - 0.5) * 0.5;
    if (Math.abs(xx - 8) < 6.5) continue;
    if (side > 0 && xx > 13 && xx < 55) continue;
    if (side < 0 && xx > 22 && xx < 62 && row === 1) continue;
    if (kind < 0.18) { put(g, tree(4 + rnd() * 2, 0x4fb85a, x), xx, 0, zz); continue; }
    put(g, house(w, h, d, wc, rc, chim), xx, 0, zz, ry);
    put(lamps, lantern(0xffc85a, 0.2), xx, h * 0.5, zz - side * (d / 2 + 0.6));
  }
  put(g, hill(28, 6.5, 0x6cc25e), 42, 0, -46);
  put(g, castle(), 42, 5.2, -46, 0, 1.3);
  put(g, disc(15, 0xeedfbe, 0.045), 33, 0, 17);
  const zb = zAt(8);
  put(g, bridge(19, 3.6), 8, 0, zb, Math.PI / 2);
  for (const s of [-1, 1]) put(lamps, lantern(0xffd27a, 0.22), 8, 2.2, zb + s * 9.6);
  for (let i = 0; i < 100; i++) {
    const x = -135 + rnd() * 280, side = rnd() > 0.5 ? 1 : -1, z = zAt(x) + side * (32 + rnd() * 75), kind = rnd(), hh = rnd();
    if (Math.hypot(x - 42, z + 46) < 31 || Math.hypot(x - 33, z - 17) < 17) continue;
    put(g, kind > 0.5 ? tree(4 + hh * 3, 0x4fb85a, i) : pine(5 + hh * 3), x, 0, z);
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + rnd() * 0.3, r = 200 + rnd() * 90;
    put(g, hill(40 + rnd() * 40, 16 + rnd() * 26, i % 2 ? 0x6aa9c9 : 0x79b98a), Math.cos(a) * r, 0, Math.sin(a) * r);
  }
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = 0; i < 18; i++) put(g, cloud(i * 9, 2.2 + rnd() * 2, cloudMat), -170 + rnd() * 340, 36 + rnd() * 26, -150 + rnd() * 210);
  return { g, curve, water, lamps, zAt, at, cloudMat };
}
export function useTown(k: Kit, town: Town, rainbow: number, night: boolean, cloudHex = night ? 0x5f69b0 : 0xffffff) {
  if (town.g.parent !== k.root) k.root.add(town.g);
  town.cloudMat.color.setHex(cloudHex);
  town.water.uniforms.uRainbow.value = rainbow;
  town.lamps.visible = night;
}

export interface Book { g: THREE.Group; cover: THREE.Group; glow: THREE.Mesh }
export function book(): Book {
  const g = new THREE.Group();
  put(g, box(6, 0.25, 8, 0x8e2b3a));
  put(g, box(5.6, 0.55, 7.6, 0xfff6e0), 0, 0.25, 0);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 7.4).rotateX(-Math.PI / 2), glowMat(0xfff2b0, 0));
  glow.position.y = 0.83; g.add(glow);
  const cover = new THREE.Group(); cover.position.set(-3, 0.8, 0); g.add(cover);
  put(cover, box(6, 0.25, 8, 0x9e2f40), 3, 0, 0);
  put(cover, box(4.8, 0.06, 6.6, 0xffd166, 0), 3, 0.25, 0);
  put(cover, box(4.4, 0.07, 6.2, 0x9e2f40, 0), 3, 0.25, 0);
  put(cover, box(1.7, 0.09, 1.7, 0xffd166, 0), 3, 0.25, 0, Math.PI / 4);
  return { g, cover, glow };
}

/** 直线水道 / 海面：用同一套水面着色器 */
export function straightRiver(len: number, width: number, rainbow: number, z = 0, y = 0.07, base = 0x35a7e8, deep = 0x1f6fc4) {
  const curve = new THREE.LineCurve3(new THREE.Vector3(-len / 2, 0, z), new THREE.Vector3(len / 2, 0, z));
  const mat = waterMat(rainbow, base, deep);
  return { mesh: ribbon(curve, width, 8, mat, y), mat };
}

/** 烟花：位置完全由时间函数决定，可任意跳帧 */
export class Fireworks {
  private bursts: { sp: THREE.Sprite[]; color: number }[] = [];
  constructor(parent: THREE.Object3D, n = 4, m = 22, private R = 6) {
    const cols = [0xff6b8a, 0xffd166, 0x7fe3ff, 0xb388ff, 0x8dffb0];
    for (let j = 0; j < n; j++) {
      const sp = Array.from({ length: m }, () => { const s = sprite('glow', 1, cols[j % cols.length], true); parent.add(s); return s; });
      this.bursts.push({ sp, color: cols[j % cols.length] });
    }
  }
  update(T: number, cx: number, cy: number, cz: number, spread = 26, period = 1.7) {
    this.bursts.forEach((b, j) => {
      const tt = T + j * (period / this.bursts.length) * 1.37;
      const n = Math.floor(tt / period), ph = (tt % period) / period;
      const ox = cx + (hash(n * 3.1 + j) - 0.5) * spread, oy = cy + (hash(n * 5.3 + j * 2) - 0.5) * spread * 0.35, oz = cz + (hash(n * 7.7 + j) - 0.5) * 8;
      const r = easeOut(ph) * this.R * (0.7 + hash(n + j) * 0.6);
      b.sp.forEach((s, i) => {
        const a = (i / b.sp.length) * Math.PI * 2, e = (hash(i * 1.9 + j) - 0.5) * 1.6;
        s.position.set(ox + Math.cos(a) * Math.cos(e) * r, oy + Math.sin(e) * r + Math.sin(a) * Math.cos(e) * r * 0.9 - ph * ph * 2.2, oz);
        s.scale.setScalar(1.5 * (1 - ph * 0.6));
        setOp(s, (1 - ph * ph) * 0.95);
      });
    });
  }
}

export function mushroom(h: number, cap: number, glow = false): THREE.Group {
  const g = new THREE.Group();
  g.add(cyl(h * 0.14, h * 0.2, h * 0.7, 0xfff4e6, 8));
  const capM = mesh(new THREE.SphereGeometry(h * 0.48, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(cap), 0.04);
  capM.position.y = h * 0.62; g.add(capM);
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26, r = h * 0.3;
    put(g, ball(h * 0.07, 0xffffff, false, 0), Math.cos(a) * r, h * 0.62 + h * 0.34, Math.sin(a) * r);
  }
  if (glow) put(g, sprite('glow', h * 2.4, cap, true, 0.55), 0, h * 0.8, 0);
  return g;
}

export function wheel(r: number, color = 0x8a5a3c, spokes = 8): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.TorusGeometry(r, r * 0.07, 6, 22), toon(color), 0.04));
  for (let i = 0; i < spokes; i++) {
    const s = box(r * 0.07, r, r * 0.07, color, 0.02); s.rotation.z = (i / spokes) * Math.PI * 2; g.add(s);
    const p = box(r * 0.42, r * 0.08, r * 0.5, color - 0x101010, 0.03);
    p.position.set(Math.cos((i / spokes) * Math.PI * 2) * r, Math.sin((i / spokes) * Math.PI * 2) * r, 0); p.rotation.z = (i / spokes) * Math.PI * 2 + Math.PI / 2; g.add(p);
  }
  return g;
}
