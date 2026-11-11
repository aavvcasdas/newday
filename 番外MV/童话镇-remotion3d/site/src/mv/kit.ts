// three.js 工具包：二值卡通材质、墨线外壳、基础体块、天空 / 水面着色器、特效贴图、光照预设。
// 对应 claude-animated-shorts 的 shade.ts / ink.ts / lights.ts / paint.ts 的精简实现。
import * as THREE from 'three';

export const INK = 0x0b0a0c;
export const timeU = { value: 0 };

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const seg = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));
export const ease = (x: number) => { const t = clamp01(x); return t * t * t * (t * (t * 6 - 15) + 10); };
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const backOut = (x: number) => { const t = clamp01(x) - 1; return 1 + 2.7 * t * t * t + 1.7 * t * t; };
export const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const rgb = (hex: number) => new THREE.Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
const css = (hex: number) => `#${hex.toString(16).padStart(6, '0')}`;

// ---------- 材质 ----------
let grad: THREE.DataTexture | null = null;
function gradMap() {
  if (!grad) {
    grad = new THREE.DataTexture(new Uint8Array([92, 92, 180, 255]), 4, 1, THREE.RedFormat);
    grad.minFilter = grad.magFilter = THREE.NearestFilter;
    grad.needsUpdate = true;
  }
  return grad;
}
const toonCache = new Map<number, THREE.MeshToonMaterial>();
export function toon(color: number): THREE.MeshToonMaterial {
  let m = toonCache.get(color);
  if (!m) { m = new THREE.MeshToonMaterial({ color, gradientMap: gradMap() }); toonCache.set(color, m); }
  return m;
}
/** 低多边形切面：转非索引并重算面法线（MeshToonMaterial 没有 flatShading 开关） */
export function faceted<T extends THREE.BufferGeometry>(g: T): THREE.BufferGeometry {
  const n = g.index ? g.toNonIndexed() : g;
  n.computeVertexNormals();
  return n;
}
export const toonMap = (map: THREE.Texture) => new THREE.MeshToonMaterial({ map, gradientMap: gradMap() });
const basicCache = new Map<number, THREE.MeshBasicMaterial>();
export function basic(color: number): THREE.MeshBasicMaterial {
  let m = basicCache.get(color);
  if (!m) { m = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }); basicCache.set(color, m); }
  return m;
}
export const glowMat = (color: number, opacity = 1, additive = false) =>
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, fog: !additive, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });

// ---------- 墨线：按包围盒逐轴外扩的背面外壳（世界线宽近似恒定） ----------
const inkMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
export function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, ink = 0.045): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  if (ink > 0) {
    geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    const size = new THREE.Vector3(), c = new THREE.Vector3();
    bb.getSize(size); bb.getCenter(c);
    const hull = new THREE.Mesh(geo, inkMat);
    const sx = size.x > 1e-3 ? 1 + (2 * ink) / size.x : 1;
    const sy = size.y > 1e-3 ? 1 + (2 * ink) / size.y : 1;
    const sz = size.z > 1e-3 ? 1 + (2 * ink) / size.z : 1;
    hull.scale.set(sx, sy, sz);
    hull.position.set(c.x * (1 - sx), c.y * (1 - sy), c.z * (1 - sz));
    m.add(hull);
  }
  return m;
}

// ---------- 基础体块（原点在底面中心） ----------
export const box = (w: number, h: number, d: number, color: number, ink = 0.045) => {
  const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); return mesh(g, toon(color), ink);
};
export const cyl = (rt: number, rb: number, h: number, color: number, segs = 14, ink = 0.045) => {
  const g = new THREE.CylinderGeometry(rt, rb, h, segs); g.translate(0, h / 2, 0); return mesh(segs < 8 ? faceted(g) : g, toon(color), ink);
};
export const cone = (r: number, h: number, color: number, segs = 12, ink = 0.045) => {
  const g = new THREE.ConeGeometry(r, h, segs); if (segs === 4) g.rotateY(Math.PI / 4); g.translate(0, h / 2, 0); return mesh(segs < 8 ? faceted(g) : g, toon(color), ink);
};
export const ball = (r: number, color: number, flat = false, ink = 0.045) =>
  mesh(flat ? faceted(new THREE.IcosahedronGeometry(r, 1)) : new THREE.SphereGeometry(r, 18, 12), toon(color), ink);
export const roof = (w: number, d: number, h: number, color: number) => {
  const g = new THREE.ConeGeometry(1, h, 4); g.rotateY(Math.PI / 4); g.scale(w * 0.82, 1, d * 0.82); g.translate(0, h / 2, 0);
  return mesh(faceted(g), toon(color), 0.05);
};
export const disc = (r: number, color: number, y = 0) => {
  const g = new THREE.CircleGeometry(r, 48); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return new THREE.Mesh(g, toon(color));
};
export function put<T extends THREE.Object3D>(parent: THREE.Object3D, o: T, x = 0, y = 0, z = 0, ry = 0, s = 1): T {
  o.position.set(x, y, z); o.rotation.y = ry; if (s !== 1) o.scale.multiplyScalar(s); parent.add(o); return o;
}

// ---------- Canvas 贴图 ----------
export function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, srgb = true): THREE.CanvasTexture {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export type FxName = 'star' | 'glow' | 'heart' | 'note' | 'bubble' | 'butterfly' | 'zzz' | 'petal' | 'wolf' | 'smoke' | 'ring' | 'drop' | 'leaf';
const fxCache = new Map<string, THREE.Texture>();
export function fxTex(name: FxName): THREE.Texture {
  const hit = fxCache.get(name);
  if (hit) return hit;
  const S = name === 'wolf' ? 128 : 64;
  const t = canvasTex(S, S, (c) => {
    const radial = (stops: [number, string][], r = S / 2) => {
      const g = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, r);
      stops.forEach(([o, col]) => g.addColorStop(o, col)); c.fillStyle = g; c.fillRect(0, 0, S, S);
    };
    if (name === 'glow') radial([[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,.5)'], [1, 'rgba(255,255,255,0)']]);
    else if (name === 'smoke') radial([[0, 'rgba(255,255,255,.85)'], [0.6, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']]);
    else if (name === 'star') {
      radial([[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,244,190,.5)'], [1, 'rgba(255,220,120,0)']]);
      c.translate(32, 32); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, -30);
      c.quadraticCurveTo(3, -3, 30, 0); c.quadraticCurveTo(3, 3, 0, 30); c.quadraticCurveTo(-3, 3, -30, 0); c.quadraticCurveTo(-3, -3, 0, -30); c.fill();
    } else if (name === 'heart') {
      c.translate(32, 34); c.beginPath(); c.moveTo(0, 20); c.bezierCurveTo(-36, -4, -18, -32, 0, -10); c.bezierCurveTo(18, -32, 36, -4, 0, 20);
      c.fillStyle = '#ff5c8a'; c.fill(); c.lineWidth = 4; c.strokeStyle = '#3a1028'; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.ellipse(-10, -10, 5, 3, -0.6, 0, 7); c.fill();
    } else if (name === 'note') {
      c.strokeStyle = '#14213d'; c.fillStyle = '#7fe3ff'; c.lineWidth = 4; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(33, 44); c.lineTo(33, 10); c.lineTo(52, 18); c.lineTo(52, 30); c.lineTo(33, 22); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.ellipse(23, 46, 11, 8, -0.4, 0, 7); c.fill(); c.stroke();
    } else if (name === 'bubble') {
      c.beginPath(); c.arc(32, 32, 26, 0, 7); c.fillStyle = 'rgba(190,235,255,.2)'; c.fill(); c.lineWidth = 3.5; c.strokeStyle = 'rgba(235,250,255,.95)'; c.stroke();
      c.beginPath(); c.arc(32, 32, 18, 3.5, 4.6); c.lineWidth = 4.5; c.strokeStyle = '#fff'; c.stroke();
    } else if (name === 'ring') {
      c.beginPath(); c.arc(32, 32, 27, 0, 7); c.lineWidth = 4; c.strokeStyle = '#fff'; c.stroke();
    } else if (name === 'butterfly') {
      c.translate(32, 32); c.lineWidth = 3; c.strokeStyle = '#3a1f10';
      for (const s of [-1, 1]) {
        c.fillStyle = '#ffd166'; c.beginPath(); c.ellipse(s * 14, -7, 13, 10, s * 0.5, 0, 7); c.fill(); c.stroke();
        c.fillStyle = '#ff8fb3'; c.beginPath(); c.ellipse(s * 10, 11, 9, 7, -s * 0.5, 0, 7); c.fill(); c.stroke();
      }
      c.fillStyle = '#3a1f10'; c.fillRect(-2, -13, 4, 28);
    } else if (name === 'zzz') {
      c.font = '900 54px sans-serif'; c.lineWidth = 8; c.lineJoin = 'round'; c.strokeStyle = '#14213d'; c.fillStyle = '#bfe3ff';
      c.strokeText('Z', 13, 52); c.fillText('Z', 13, 52);
    } else if (name === 'petal') {
      c.translate(32, 32); c.rotate(0.6); c.fillStyle = '#ffb3cf'; c.beginPath(); c.ellipse(0, 0, 22, 11, 0, 0, 7); c.fill();
      c.fillStyle = '#ff7fae'; c.beginPath(); c.ellipse(8, 0, 9, 5, 0, 0, 7); c.fill();
    } else if (name === 'leaf') {
      c.translate(32, 32); c.rotate(-0.5); c.fillStyle = '#5fd06a'; c.beginPath(); c.ellipse(0, 0, 24, 11, 0, 0, 7); c.fill();
      c.strokeStyle = '#1f6b3a'; c.lineWidth = 3; c.stroke(); c.beginPath(); c.moveTo(-22, 0); c.lineTo(22, 0); c.stroke();
    } else if (name === 'drop') {
      radial([[0, 'rgba(255,255,255,1)'], [0.55, 'rgba(170,225,255,.95)'], [0.8, 'rgba(120,190,255,.6)'], [1, 'rgba(120,190,255,0)']], 28);
    } else if (name === 'wolf') {
      c.fillStyle = '#120e1f'; c.beginPath();
      const p: [number, number][] = [[18, 126], [22, 66], [12, 12], [42, 40], [58, 36], [72, 6], [84, 44], [124, 66], [120, 77], [98, 83], [114, 98], [86, 106], [76, 126]];
      p.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill();
      c.fillStyle = '#f4f0ff'; for (const x of [96, 104, 111]) { c.beginPath(); c.moveTo(x, 80); c.lineTo(x + 3, 89); c.lineTo(x + 6, 79); c.fill(); }
      c.fillStyle = '#ff2d4a'; c.beginPath(); c.ellipse(80, 58, 8, 4.5, 0.35, 0, 7); c.fill();
      c.fillStyle = '#ffd9df'; c.beginPath(); c.ellipse(82, 58, 2.5, 2, 0, 0, 7); c.fill();
    }
  });
  fxCache.set(name, t);
  return t;
}

export function sprite(name: FxName, size = 1, color = 0xffffff, additive = false, opacity = 1): THREE.Sprite {
  const m = new THREE.SpriteMaterial({ map: fxTex(name), color, transparent: true, opacity, depthWrite: false, fog: !additive, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
  const s = new THREE.Sprite(m);
  s.scale.set(size, size, 1);
  return s;
}
export const setOp = (s: THREE.Sprite | THREE.Mesh, o: number) => { (s.material as THREE.Material).opacity = clamp01(o); s.visible = o > 0.01; };

// ---------- 墙面手绘贴图（paint.ts 的做法：缝线直接画进贴图） ----------
const facadeCache = new Map<number, THREE.Texture>();
export function facadeTex(wall: number): THREE.Texture {
  let t = facadeCache.get(wall);
  if (t) return t;
  t = canvasTex(64, 64, (c) => {
    c.fillStyle = css(wall); c.fillRect(0, 0, 64, 64);
    c.fillStyle = 'rgba(40,20,30,.16)'; c.fillRect(0, 54, 64, 10); c.fillRect(0, 0, 64, 4);
    c.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 5; i++) c.fillRect(4 + ((i * 23) % 50), 8 + ((i * 17) % 38), 9, 2);
    for (const x of [8, 42]) {
      c.fillStyle = '#2a1c2e'; c.fillRect(x - 2, 12, 18, 20);
      c.fillStyle = '#ffe9a8'; c.fillRect(x, 14, 14, 16);
      c.fillStyle = '#2a1c2e'; c.fillRect(x + 6, 14, 2, 16); c.fillRect(x, 21, 14, 2);
    }
    c.fillStyle = '#2a1c2e'; c.fillRect(24, 34, 16, 30); c.fillStyle = '#8a5236'; c.fillRect(26, 36, 12, 28);
    c.fillStyle = '#ffd166'; c.fillRect(35, 50, 2, 3);
  });
  facadeCache.set(wall, t);
  return t;
}

// ---------- 水面：七彩河 / 蓝水，逐帧由 timeU 驱动（无随机、可任意跳帧） ----------
export function waterMat(rainbow = 1, base = 0x35a7e8, deep = 0x1f6fc4): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide, fog: true,
    uniforms: {
      uTime: timeU, uRainbow: { value: rainbow }, uBase: { value: rgb(base) }, uDeep: { value: rgb(deep) },
      fogColor: { value: new THREE.Color() }, fogNear: { value: 1 }, fogFar: { value: 1000 },
    },
    vertexShader: `varying vec2 vUv;
#include <fog_pars_vertex>
void main(){ vUv = uv; vec4 mvPosition = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`,
    fragmentShader: `uniform float uTime; uniform float uRainbow; uniform vec3 uBase; uniform vec3 uDeep; varying vec2 vUv;
#include <fog_pars_fragment>
vec3 band(float i){
  if(i<0.5) return vec3(0.96,0.30,0.36); if(i<1.5) return vec3(1.0,0.60,0.22); if(i<2.5) return vec3(1.0,0.87,0.32);
  if(i<3.5) return vec3(0.42,0.84,0.42); if(i<4.5) return vec3(0.26,0.80,0.94); if(i<5.5) return vec3(0.33,0.52,0.96); return vec3(0.68,0.45,0.92);
}
void main(){
  float u = vUv.x + 0.03*sin(vUv.y*0.9 - uTime*1.6);
  float i = floor(clamp(u,0.0,0.999)*7.0);
  float f = fract(clamp(u,0.0,0.999)*7.0);
  float dash = step(0.84, fract(vUv.y*0.2 - uTime*0.6 + i*0.37)) * step(0.3,f) * step(f,0.7);
  vec3 rb = band(i) + dash*0.32;
  vec3 water = mix(uBase, uDeep, smoothstep(0.0,0.5,abs(vUv.x-0.5)));
  water += 0.22*step(0.88, fract(vUv.y*0.28 - uTime*0.5 + floor(vUv.x*5.0)*0.41));
  vec3 col = mix(water, rb, uRainbow);
  float foam = step(vUv.x,0.03) + step(0.97,vUv.x);
  col = mix(col, vec3(1.0), clamp(foam,0.0,1.0)*0.92);
  gl_FragColor = vec4(col,1.0);
#include <fog_fragment>
}`,
  });
}

export function ribbon(curve: THREE.Curve<THREE.Vector3>, width: number, segs: number, mat: THREE.Material, y = 0.06): THREE.Mesh {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  let dist = 0; let prev: THREE.Vector3 | null = null;
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const p = curve.getPointAt(u), tan = curve.getTangentAt(u);
    const n = new THREE.Vector3(-tan.z, 0, tan.x).normalize().multiplyScalar(width / 2);
    if (prev) dist += p.distanceTo(prev);
    prev = p;
    pos.push(p.x + n.x, p.y + y, p.z + n.z, p.x - n.x, p.y + y, p.z - n.z);
    uv.push(0, dist, 1, dist);
    if (i < segs) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}

// ---------- 天空 ----------
export function makeSky(): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: { top: { value: new THREE.Vector3() }, hor: { value: new THREE.Vector3() }, low: { value: new THREE.Vector3() } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 hor; uniform vec3 low; varying vec3 vDir;
void main(){ float y = normalize(vDir).y; vec3 c = y > 0.0 ? mix(hor, top, pow(y, 0.55)) : mix(hor, low, pow(min(-y*5.0,1.0), 0.7)); gl_FragColor = vec4(c,1.0); }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(600, 24, 16), mat);
  m.renderOrder = -10; m.frustumCulled = false;
  return m;
}
export function makeStars(): THREE.Points {
  const pos: number[] = [];
  for (let i = 0; i < 520; i++) {
    const a = hash(i * 1.7) * Math.PI * 2, e = Math.asin(0.04 + hash(i * 3.1 + 5) * 0.94), r = 560;
    pos.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2.6, sizeAttenuation: false, depthTest: false, depthWrite: false, fog: false }));
  p.renderOrder = -9; p.frustumCulled = false;
  return p;
}

// ---------- 光照预设（lights.ts：冷色只进暗部；雾色 = 地平线色） ----------
export interface Look {
  top: number; hor: number; fog: [number, number]; sun: number; sunI: number; dir: [number, number, number];
  amb: number; ambI: number; card: number; stars: number;
}
export const LOOKS = {
  day: { top: 0x3e86de, hor: 0xbfe0f7, fog: [45, 340], sun: 0xfff2d2, sunI: 2.5, dir: [0.5, 0.8, 0.5], amb: 0xbcd0ff, ambI: 1.6, card: 0xffffff, stars: 0 },
  golden: { top: 0xf2915f, hor: 0xffd9a0, fog: [35, 280], sun: 0xffb36b, sunI: 2.8, dir: [-0.7, 0.36, 0.35], amb: 0x8f7fd0, ambI: 1.4, card: 0xffe8cf, stars: 0 },
  dusk: { top: 0x7d3a94, hor: 0xff8f6b, fog: [40, 300], sun: 0xffa27a, sunI: 2.4, dir: [0.6, 0.4, 0.5], amb: 0x8f6fd8, ambI: 1.5, card: 0xffe0d6, stars: 0.35 },
  forest: { top: 0x173f45, hor: 0x4f8a6a, fog: [9, 62], sun: 0xd8ffb0, sunI: 1.9, dir: [0.3, 0.9, 0.3], amb: 0x4f8a78, ambI: 1.35, card: 0xcfe8d4, stars: 0 },
  night: { top: 0x0a1036, hor: 0x39408f, fog: [30, 230], sun: 0xb4c8ff, sunI: 2.1, dir: [-0.4, 0.75, 0.5], amb: 0x5f6ac8, ambI: 1.7, card: 0xd4dcff, stars: 1 },
  magic: { top: 0x2c1763, hor: 0xb960d6, fog: [25, 200], sun: 0xf3b6ff, sunI: 2.0, dir: [0.4, 0.7, 0.6], amb: 0x7a5fd8, ambI: 1.5, card: 0xf0dcff, stars: 0.7 },
  sea: { top: 0x0d4f8f, hor: 0x2aa3c8, fog: [3, 46], sun: 0xb8f2ff, sunI: 1.9, dir: [0.1, 1, 0.2], amb: 0x3a9fd0, ambI: 1.7, card: 0xc4ecff, stars: 0 },
  cave: { top: 0x06050c, hor: 0x1c142b, fog: [7, 46], sun: 0xffc070, sunI: 2.1, dir: [0.2, 0.9, 0.6], amb: 0x4a3670, ambI: 1.0, card: 0xe6cdb8, stars: 0 },
  stage: { top: 0x160d1c, hor: 0x4a2233, fog: [18, 110], sun: 0xffe2b0, sunI: 2.6, dir: [0.2, 0.8, 0.8], amb: 0x7a5568, ambI: 1.3, card: 0xfff0dc, stars: 0 },
  savanna: { top: 0xf2a23c, hor: 0xffe7a8, fog: [40, 300], sun: 0xffd9a0, sunI: 2.7, dir: [-0.5, 0.5, 0.5], amb: 0xd0a070, ambI: 1.4, card: 0xffeccc, stars: 0 },
} satisfies Record<string, Look>;
export type LookName = keyof typeof LOOKS;

// ---------- 常用场景件 ----------
export function tree(h: number, color = 0x4fb85a, seed = 1): THREE.Group {
  const g = new THREE.Group();
  g.add(cyl(0.16, 0.26, h * 0.5, 0x7a4a2c, 6));
  const dark = (color & 0xfefefe) >> 1;
  put(g, ball(h * 0.3, color, true), 0, h * 0.62, 0);
  put(g, ball(h * 0.22, dark + 0x203020, true), h * 0.18 * (hash(seed) - 0.3), h * 0.5, h * 0.14);
  put(g, ball(h * 0.2, color, true), -h * 0.16, h * 0.82 - h * 0.1 * hash(seed + 2), 0);
  return g;
}
export function pine(h: number, color = 0x2f7a55): THREE.Group {
  const g = new THREE.Group();
  g.add(cyl(0.14, 0.22, h * 0.3, 0x5a3a26, 6));
  for (let i = 0; i < 3; i++) put(g, cone(h * (0.3 - i * 0.065), h * 0.36, i === 1 ? color + 0x0a1408 : color, 7), 0, h * (0.2 + i * 0.22), 0, i * 0.6);
  return g;
}
export function cloud(seed: number, s = 1, mat?: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const m = mat ?? basic(0xffffff);
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), m);
    b.position.set((i - 2) * 1.5 * s, hash(seed + i) * 0.7 * s, (hash(seed + i * 3) - 0.5) * 1.2 * s);
    b.scale.set((1.5 + hash(seed + i * 7) * 0.9) * s, (0.9 + hash(seed + i * 5) * 0.5) * s, 1.3 * s);
    g.add(b);
  }
  return g;
}
export function rock(r: number, color = 0x8f8a9c, seed = 0): THREE.Mesh {
  const m = mesh(faceted(new THREE.DodecahedronGeometry(r, 0)), toon(color), 0.05);
  m.rotation.set(hash(seed) * 3, hash(seed + 1) * 3, 0);
  return m;
}
export function house(w: number, h: number, d: number, wall: number, roofC: number, chimney = true): THREE.Group {
  const g = new THREE.Group();
  const bg = new THREE.BoxGeometry(w, h, d); bg.translate(0, h / 2, 0);
  g.add(mesh(bg, toonMap(facadeTex(wall)), 0.05));
  put(g, roof(w, d, h * 0.5 + 0.7, roofC), 0, h, 0);
  if (chimney) put(g, box(0.5, 1.2, 0.5, 0x8a5a44), w * 0.24, h + 0.25, 0);
  return g;
}
export function lantern(color = 0xffc85a, r = 0.16): THREE.Group {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), basic(color)));
  g.add(sprite('glow', r * 9, color, true, 0.7));
  return g;
}
export function flower(color: number, h = 0.5): THREE.Group {
  const g = new THREE.Group();
  g.add(cyl(0.025, 0.03, h, 0x3f8f4a, 5, 0));
  put(g, ball(0.11, color, true, 0.02), 0, h, 0);
  return g;
}
export function paperBoat(): THREE.Group {
  const g = new THREE.Group();
  const hg = new THREE.ConeGeometry(1, 0.6, 4); hg.rotateY(Math.PI / 4); hg.rotateX(Math.PI); hg.scale(1.7, 1, 0.8); hg.translate(0, 0.3, 0);
  g.add(mesh(faceted(hg), toon(0xfffaf0), 0.05));
  const sg = new THREE.ConeGeometry(0.62, 1.1, 4); sg.rotateY(Math.PI / 4); sg.scale(1, 1, 0.12); sg.translate(1.0, 1.0, 0);
  g.add(mesh(faceted(sg), toon(0xfff2dc), 0.04));
  return g;
}
export function clockTex(): THREE.Texture {
  const hit = fxCache.get('clock');
  if (hit) return hit;
  const t = canvasTex(128, 128, (c) => {
    c.fillStyle = '#fff7e2'; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill();
    c.lineWidth = 7; c.strokeStyle = '#c98a2b'; c.stroke();
    c.fillStyle = '#3a2418';
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.save(); c.translate(64 + Math.sin(a) * 48, 64 - Math.cos(a) * 48); c.rotate(a); c.fillRect(-2.5, -7, 5, i % 3 === 0 ? 15 : 9); c.restore(); }
  });
  fxCache.set('clock', t);
  return t;
}
/** 钟面：返回组与两根指针（指针沿自身 z 轴旋转） */
export function clock(r: number): { g: THREE.Group; hh: THREE.Mesh; mh: THREE.Mesh } {
  const g = new THREE.Group();
  const face = new THREE.Mesh(new THREE.CircleGeometry(r, 28), new THREE.MeshBasicMaterial({ map: clockTex(), side: THREE.DoubleSide }));
  g.add(face);
  const rim = mesh(new THREE.TorusGeometry(r, r * 0.09, 6, 24), toon(0xc98a2b), 0.03); g.add(rim);
  const hand = (len: number, w: number) => { const hg = new THREE.BoxGeometry(w, len, 0.02); hg.translate(0, len / 2, 0); const m = new THREE.Mesh(hg, basic(0x2a1c2e)); m.position.z = 0.03; g.add(m); return m; };
  return { g, hh: hand(r * 0.5, r * 0.09), mh: hand(r * 0.78, r * 0.06) };
}
