// Own implementation of a matte voxel diorama stage. Method reference:
// xiaosia/voxel-mv (miniature scale, standees, soft light). No reference code,
// character frames, or unclear-license assets are copied into this module.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const W = 1920, H = 1080;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export function createEngine(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  // Software-WebGL friendly: contact shadows are drawn under each standee;
  // no expensive dynamic shadow map is required for the miniature look.
  renderer.shadowMap.enabled = false;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 160);
  const hemi = new THREE.HemisphereLight(0xdde6ff, 0x31364a, 1.25);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffe9c9, 2.3);
  key.position.set(-9, 15, 11);
  key.castShadow = false;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
  key.shadow.bias = -0.0006;
  key.shadow.radius = 5;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0x9db8ff, 0.55);
  fill.position.set(10, 6, -8);
  scene.add(fill);

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const roundGeo = new RoundedBoxGeometry(1, 1, 1, 2, 0.07);
  const matCache = new Map();
  function mat(color, o = {}) {
    const k = `${color}|${o.emissive || 0}|${o.ei ?? 0}|${o.opacity ?? 1}`;
    if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({
      color, roughness: 0.88, metalness: 0,
      emissive: o.emissive || 0x000000, emissiveIntensity: o.ei ?? 0,
      transparent: (o.opacity ?? 1) < 1, opacity: o.opacity ?? 1,
    }));
    return matCache.get(k);
  }
  function box(parent, w, h, d, color, x, y, z, o = {}) {
    const m = new THREE.Mesh(o.round ? roundGeo : boxGeo, mat(color, o));
    m.scale.set(w, h, d);
    m.position.set(x, y + h / 2, z);
    m.castShadow = o.cast ?? true;
    m.receiveShadow = true;
    if (o.ry) m.rotation.y = o.ry;
    if (o.rz) m.rotation.z = o.rz;
    parent.add(m);
    return m;
  }
  const dummy = new THREE.Object3D();
  function instances(parent, n, o = {}) {
    const m = new THREE.InstancedMesh(boxGeo, new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.9, metalness: 0,
      emissive: o.emissive || 0x000000, emissiveIntensity: o.ei ?? 0,
      transparent: (o.opacity ?? 1) < 1, opacity: o.opacity ?? 1,
    }), n);
    m.castShadow = o.cast ?? false;
    m.receiveShadow = true;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    parent.add(m);
    return m;
  }
  function setInst(im, i, x, y, z, sx, sy, sz, color, ry = 0, rz = 0) {
    dummy.position.set(x, y, z); dummy.scale.set(sx, sy, sz); dummy.rotation.set(0, ry, rz);
    dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
    if (color !== undefined) im.setColorAt(i, color instanceof THREE.Color ? color : new THREE.Color(color));
  }
  function tiles(parent, nx, nz, size, palette, o = {}) {
    const im = instances(parent, nx * nz, o);
    const cells = [];
    let i = 0;
    for (let ix = 0; ix < nx; ix++) for (let iz = 0; iz < nz; iz++) {
      const x = (ix - (nx - 1) / 2) * size, z = (iz - (nz - 1) / 2) * size;
      const h = (o.baseH ?? 0.16) + hash(i * 3.7) * (o.jitter ?? 0.035);
      const c = new THREE.Color(palette[Math.floor(hash(i * 9.1) * palette.length)]);
      setInst(im, i, x, (o.y ?? 0) - h / 2, z, size * 0.96, h, size * 0.96, c);
      cells.push({ x, z, h, c: c.clone() });
      i++;
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    return { im, cells, size };
  }
  function island(parent, color = 0x25304a) {
    box(parent, 21, 0.75, 15, color, 0, -0.78, 0, { round: true, cast: false });
  }
  function lamp(parent, x, z, color = 0xffd98a, h = 2.5) {
    const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
    box(g, 0.12, h, 0.12, 0x3a4058, 0, 0, 0);
    box(g, 0.55, 0.08, 0.12, 0x3a4058, 0.22, h - 0.05, 0);
    const bulb = box(g, 0.34, 0.34, 0.34, color, 0.44, h - 0.4, 0, { emissive: color, ei: 1.4, round: true });
    bulb.material = bulb.material.clone();
    return { g, bulb };
  }
  function bench(parent, x, z, color = 0xb98a5e) {
    const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
    box(g, 2.6, 0.14, 0.7, color, 0, 0.48, 0, { round: true });
    box(g, 2.6, 0.5, 0.12, color, 0, 0.66, -0.32, { round: true });
    for (const lx of [-1.05, 1.05]) box(g, 0.12, 0.48, 0.5, 0x4a4f63, lx, 0, 0);
    return g;
  }
  function tree(parent, x, z, leaf = 0x6fae7a, h = 1.5) {
    const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
    box(g, 0.22, h, 0.22, 0x7b5236, 0, 0, 0);
    box(g, 1.15, 0.8, 1.15, leaf, 0, h - 0.1, 0, { round: true });
    box(g, 0.8, 0.6, 0.8, new THREE.Color(leaf).multiplyScalar(1.12).getHex(), 0, h + 0.55, 0, { round: true });
    return g;
  }
  function clockTower(parent, x, z, body = 0xf1dfc2, roof = 0xc8664f, night = false) {
    const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
    box(g, 1.7, 4.2, 1.7, body, 0, 0, 0, { round: true });
    box(g, 2.1, 0.5, 2.1, roof, 0, 4.2, 0, { round: true });
    box(g, 1.4, 0.5, 1.4, roof, 0, 4.7, 0, { round: true });
    const face = box(g, 1.15, 1.15, 0.08, night ? 0x27324f : 0xfff4dc, 0, 2.7, 0.88, { emissive: night ? 0x6f86c8 : 0xffd98a, ei: night ? 0.35 : 0.6 });
    face.material = face.material.clone();
    const hand1 = box(g, 0.07, 0.42, 0.05, 0x2b2f42, 0, 3.0, 0.95);
    const hand2 = box(g, 0.07, 0.3, 0.05, 0x2b2f42, 0.12, 3.0, 0.95, { rz: -0.9 });
    return { g, face, hand1, hand2 };
  }
  function puzzleFrame(parent, x, y, z, w = 2.4, h = 1.6) {
    const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
    box(g, w, 0.12, 0.12, 0xf1dfc2, 0, 0, 0);
    box(g, w, 0.12, 0.12, 0xf1dfc2, 0, h, 0);
    box(g, 0.12, h, 0.12, 0xf1dfc2, -w / 2, 0, 0);
    box(g, 0.12, h, 0.12, 0xf1dfc2, w / 2, 0, 0);
    const panel = box(g, w - 0.2, h - 0.2, 0.04, 0x2c3654, 0, 0.1, -0.03, { opacity: 0.85 });
    panel.material = panel.material.clone();
    return { g, panel };
  }
  function table(parent, x, z, w = 3.2, d = 1.6) {
    const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
    box(g, w, 0.16, d, 0xc99a6a, 0, 0.82, 0, { round: true });
    for (const lx of [-w / 2 + 0.2, w / 2 - 0.2]) for (const lz of [-d / 2 + 0.2, d / 2 - 0.2]) box(g, 0.12, 0.82, 0.12, 0x7a5638, lx, 0, lz);
    return g;
  }
  function cloud(parent, x, y, z, s = 1, color = 0x8b93ad) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); parent.add(g);
    box(g, 2.4, 0.6, 1.1, color, 0, 0, 0, { round: true, cast: false });
    box(g, 1.2, 0.6, 1.0, color, -0.5, 0.45, 0, { round: true, cast: false });
    box(g, 1.0, 0.5, 0.9, color, 0.6, 0.35, 0, { round: true, cast: false });
    return g;
  }

  const sets = {};
  const placements = {};
  function makeSet(id, bg, fog, build, place) {
    const g = new THREE.Group(); g.visible = false; scene.add(g);
    const api = build(g) || {};
    sets[id] = { g, bg, fog, ...api };
    placements[id] = place;
  }

  makeSet('greyShore', '#232a3d', '#39415a', (g) => {
    island(g, 0x2b3247);
    const floor = tiles(g, 34, 22, 0.55, [0x6f7689, 0x7b8296, 0x646b80], { y: 0.02 });
    // missing puzzle corner
    const missing = [120, 121, 154, 155];
    for (const i of missing) setInst(floor.im, i, floor.cells[i].x, -0.4, floor.cells[i].z, 0.01, 0.01, 0.01, 0x232a3d);
    floor.im.instanceMatrix.needsUpdate = true;
    const wish = box(g, 0.45, 0.45, 0.45, 0xffd98a, -1.1, 0.25, 1.1, { emissive: 0xffc46b, ei: 0.8, round: true });
    wish.material = wish.material.clone();
    const tower = clockTower(g, -6.5, -4.5, 0x8b93ad, 0x5b6278, true);
    lamp(g, 5.5, -2.5, 0x6f7689, 2.2);
    for (let i = 0; i < 7; i++) box(g, 0.5, 0.25 + hash(i) * 0.3, 0.5, 0x59617a, -8 + i * 2.6, 0, -5.5 + hash(i + 4) * 1.5, { round: true });
    return { floor, wish, tower };
  }, { whale: [-1.2, 1.0, 2.25] });

  makeSet('lanternPier', '#2b2a44', '#5a4a63', (g) => {
    island(g, 0x3a3348);
    const water = tiles(g, 40, 26, 0.55, [0x31507e, 0x3b6a9a, 0x2c4670], { y: -0.12, baseH: 0.3 });
    for (let i = 0; i < 26; i++) box(g, 0.58, 0.2, 2.6, i % 2 ? 0xb98a5e : 0xc99a6a, -6.5 + i * 0.55, 0.18, 0.8);
    const lamps = [-5, -2, 1, 4].map(x => lamp(g, x, -0.7, 0xffd98a, 2.4));
    clockTower(g, -7.5, -5, 0xf1dfc2, 0xc8664f);
    return { water, lamps };
  }, { whale: [-1.6, 1.0, 2.25], claude: [4.8, 1.0, 2.25], miniWhale: [4.2, 2.6, 0.8] });

  makeSet('openSea', '#1d2b4c', '#3f5f8f', (g) => {
    island(g, 0x243452);
    const water = tiles(g, 52, 34, 0.55, [0x2f6396, 0x3f7fb5, 0x2a5588, 0x5a9bc8], { y: -0.18, baseH: 0.35 });
    for (let i = 0; i < 14; i++) box(g, 0.58, 0.2, 2.4, i % 2 ? 0xb98a5e : 0xc99a6a, -3.5 + i * 0.55, 0.18, 2.2);
    const sun = box(g, 3.4, 3.4, 0.4, 0xffd08a, 7, 3.5, -12, { emissive: 0xffb26b, ei: 1.2, cast: false });
    for (let i = 0; i < 6; i++) cloud(g, -10 + i * 4, 5 + hash(i) * 1.5, -10 - hash(i + 2) * 3, 0.8, 0x8fa8d0);
    return { water, sun };
  }, { whale: [-1.2, 2.2, 2.25], gemini: [1.4, 2.2, 2.25], agentReachBot: [4.5, 1.2, 0.9], miniWhale: [-4.5, 3.2, 0.8] });

  makeSet('memoryRoom', '#2a2438', '#5a4a63', (g) => {
    island(g, 0x3a3044);
    tiles(g, 30, 20, 0.55, [0x8a6a58, 0x9a7a64, 0x7a5e50], { y: 0.02 });
    box(g, 16, 4.5, 0.3, 0x4a3f5e, 0, 0, -5.5, { round: true });
    // round window with sea behind
    box(g, 3.4, 2.4, 0.1, 0x2f6396, 0, 1.6, -5.3, { emissive: 0x3f7fb5, ei: 0.35 });
    box(g, 3.6, 0.12, 0.2, 0xf1dfc2, 0, 1.55, -5.2);
    box(g, 0.12, 2.5, 0.2, 0xf1dfc2, 0, 1.6, -5.2);
    const t = table(g, 0, 0.4, 4.2, 1.8);
    const frame = puzzleFrame(g, 0, 1.0, 0.35, 2.2, 1.4);
    for (let i = 0; i < 5; i++) box(g, 0.35, 0.35, 0.12, [0xffd98a, 0x7fb3e8, 0xf49ab0, 0x9ad0a0, 0xc8a0e8][i], -0.8 + i * 0.4, 1.3, 0.42, { emissive: [0xffd98a, 0x7fb3e8, 0xf49ab0, 0x9ad0a0, 0xc8a0e8][i], ei: 0.35 });
    // bookshelf
    box(g, 2.4, 3, 0.5, 0x6a4e3e, -6, 0, -4.8, { round: true });
    for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) box(g, 0.22, 0.6, 0.3, [0xc8664f, 0x5b7fc0, 0x6fae7a, 0xf1dfc2][i % 4], -6.9 + i * 0.34, 0.35 + r * 0.9, -4.5);
    lamp(g, 5.8, -3.5, 0xffd98a, 2.6);
    tree(g, 6.5, -4.5, 0x6fae7a, 1.2);
    box(g, 3.4, 0.06, 2.2, 0x8a5a6a, 3.5, 0.02, 2.2, { round: true });
    // little TV shows a complete mini room, not an isolated face
    const tv = new THREE.Group(); tv.position.set(5, 0.9, -4.6); g.add(tv);
    box(tv, 1.4, 1.0, 0.5, 0x3a4058, 0, 0, 0, { round: true });
    box(tv, 1.1, 0.7, 0.05, 0x2f6396, 0, 0.15, 0.28, { emissive: 0x3f7fb5, ei: 0.4 });
    box(tv, 0.9, 0.12, 0.02, 0xc99a6a, 0, 0.18, 0.31);
    box(tv, 0.2, 0.3, 0.02, 0xf1dfc2, -0.25, 0.3, 0.31);
    return { t, frame, tv };
  }, { whale: [-2.2, 1.8, 2.2], claude: [-0.7, 1.9, 2.2], gemini: [0.9, 1.9, 2.2], doubao: [2.4, 1.8, 2.2], clawd: [-3.8, 0.8, 0.9], bionicPuppy: [3.8, 2.6, 0.8], biliTvMascot: [5, 0.2, 0.9] });

  makeSet('rainStop', '#252b3d', '#4a5268', (g) => {
    island(g, 0x2e3448);
    tiles(g, 32, 22, 0.55, [0x59617a, 0x646c85, 0x505870], { y: 0.02 });
    for (let i = 0; i < 9; i++) {
      const h = 2.5 + hash(i) * 3;
      box(g, 1.6, h, 1.4, [0x6f7689, 0x7b8296, 0x59617a][i % 3], -8 + i * 2, 0, -5.5, { round: true });
      for (let w = 0; w < 3; w++) box(g, 0.3, 0.35, 0.05, 0xffd98a, -8.4 + i * 2 + (w % 2) * 0.6, 0.8 + w * 0.8, -4.75, { emissive: 0xffc46b, ei: 0.35 });
    }
    const b = bench(g, 0, 1.2);
    const umbrella = new THREE.Group(); umbrella.position.set(0, 2.6, 1.2); g.add(umbrella);
    box(umbrella, 0.08, 2.2, 0.08, 0x3a4058, 0, -2.2, 0);
    for (let i = 0; i < 7; i++) box(umbrella, 0.62, 0.18, 2.4, i % 2 ? 0x6fae9a : 0x7fbcae, -1.86 + i * 0.62, 0, 0, { round: true, rz: (i - 3) * 0.06 });
    const clouds = [cloud(g, -3, 5.5, -2, 1.4, 0x6f7689), cloud(g, 2.5, 6, -3, 1.6, 0x646c85)];
    const rain = instances(g, 260, { opacity: 0.55 });
    const drops = Array.from({ length: 260 }, (_, i) => ({ x: -9 + hash(i) * 18, y: hash(i + 9) * 8, z: -4 + hash(i + 31) * 9 }));
    const stopLamp = lamp(g, 4.5, 0.5, 0xffd98a, 2.8);
    return { b, umbrella, clouds, rain, drops, stopLamp };
  }, { whale: [-0.7, 1.2, 2.1], doubao: [0.9, 1.2, 2.1], bionicPuppy: [0.1, 1.8, 0.65], gemini: [4.5, 0.5, 2.1] });

  makeSet('joyWorkshop', '#2c2a40', '#6a5a6a', (g) => {
    island(g, 0x3a3348);
    tiles(g, 30, 20, 0.55, [0x9a7a64, 0x8a6a58, 0xa88a72], { y: 0.02 });
    const t = table(g, 0, 0.6, 4.6, 2);
    const frame = puzzleFrame(g, 0, 1.05, 0.55, 2.6, 1.6);
    const bin = box(g, 1.1, 0.8, 0.9, 0x59617a, 4.2, 0, 1.8, { round: true });
    const lid = box(g, 1.15, 0.1, 0.95, 0x6f7689, 4.2, 0.8, 1.8, { round: true });
    const cubes = [];
    for (let i = 0; i < 10; i++) cubes.push(box(g, 0.3, 0.3, 0.3, [0xffd98a, 0x7fb3e8, 0xf49ab0, 0x9ad0a0, 0xc8a0e8][i % 5], -2 + i * 0.4, 1.1, 0.8, { emissive: [0xffd98a, 0x7fb3e8, 0xf49ab0, 0x9ad0a0, 0xc8a0e8][i % 5], ei: 0.5, round: true }));
    const grey = [];
    for (let i = 0; i < 5; i++) grey.push(box(g, 0.28, 0.28, 0.28, 0x6f7689, -1 + i * 0.5, 1.1, 1.2, { round: true }));
    lamp(g, -5.5, -2.5, 0xffd98a, 2.5);
    tree(g, 5.8, -3.5, 0x9ad0a0, 1.3);
    box(g, 12, 3.2, 0.3, 0x4a3f5e, 0, 0, -5, { round: true });
    return { t, frame, bin, lid, cubes, grey };
  }, { whale: [-2.4, 2, 2.2], claude: [-0.8, 2.1, 2.2], gemini: [0.9, 2.1, 2.2], doubao: [2.5, 2, 2.2], researcher: [-4.6, 0.8, 2.0], clawd: [3.9, 0.8, 0.9] });

  makeSet('fireworkRooftop', '#11182e', '#2c3654', (g) => {
    island(g, 0x232a40);
    tiles(g, 30, 20, 0.55, [0x3a4058, 0x444b66, 0x313852], { y: 0.02 });
    for (let i = 0; i < 14; i++) {
      const h = 2 + hash(i) * 5;
      box(g, 1.4, h, 1.4, [0x2c3654, 0x3a4058, 0x232a40][i % 3], -10 + i * 1.55, 0, -7 - hash(i + 5) * 2, { round: true });
      for (let w = 0; w < 4; w++) if (hash(i * 7 + w) > 0.35) box(g, 0.22, 0.28, 0.05, 0xffd98a, -10.3 + i * 1.55 + (w % 2) * 0.5, 0.6 + w * 0.7, -6.25 - hash(i + 5) * 2, { emissive: 0xffc46b, ei: 0.6 });
    }
    // safety rail
    for (let i = 0; i < 16; i++) box(g, 0.08, 0.9, 0.08, 0x6f7689, -7.5 + i, 0, 3.2);
    box(g, 16, 0.08, 0.08, 0x6f7689, 0, 0.9, 3.2);
    bench(g, -2.5, 1.4);
    const fw = instances(g, 240, { emissive: 0xffffff, ei: 1.2 });
    const fwSeed = Array.from({ length: 240 }, (_, i) => ({ a: hash(i) * Math.PI * 2, r: 0.5 + hash(i + 7) * 2.4, burst: Math.floor(i / 60), c: [0xffd98a, 0xf49ab0, 0x7fb3e8, 0xc8a0e8][Math.floor(i / 60)] }));
    return { fw, fwSeed };
  }, { whale: [-1.4, 1.4, 2.2], claude: [0.2, 1.5, 2.2], gemini: [1.8, 1.4, 2.2], doubao: [3.2, 1.3, 2.2] });

  makeSet('timeBridge', '#1c2440', '#4a5268', (g) => {
    island(g, 0x2e3448);
    const left = tiles(g, 14, 20, 0.55, [0x3a4058, 0x444b66, 0x313852], { y: 0.02 });
    left.im.position.x = -5.5;
    const right = tiles(g, 14, 20, 0.55, [0xf1dfc2, 0xe8d5b5, 0xffe9c9], { y: 0.02 });
    right.im.position.x = 5.5;
    const gap = [];
    for (let i = 0; i < 5; i++) gap.push(box(g, 0.5, 0.16, 1.6, i % 2 ? 0x8a93ad : 0x9aa3bd, -1.1 + i * 0.55, 0.05, 0.8, { round: true }));
    const nightTower = clockTower(g, -6.5, -3.5, 0x59617a, 0x3a4058, true);
    const dayTower = clockTower(g, 6.5, -3.5, 0xf1dfc2, 0xc8664f, false);
    const moon = box(g, 1.4, 1.4, 0.2, 0xdde6ff, -7, 5, -8, { emissive: 0x9db8ff, ei: 0.7, cast: false });
    const sun = box(g, 1.6, 1.6, 0.2, 0xffd08a, 7, 5, -8, { emissive: 0xffb26b, ei: 0.9, cast: false });
    const letter = box(g, 0.5, 0.06, 0.35, 0xfff4dc, -2.5, 0.3, 0.8, { emissive: 0xffd98a, ei: 0.25 });
    return { left, right, gap, nightTower, dayTower, moon, sun, letter };
  }, { whale: [-3.2, 0.9, 2.25], claude: [3.2, 0.9, 2.25], gemini: [5, 1.8, 2.1], doubao: [-5, 1.8, 2.1] });

  makeSet('dawnGarden', '#3a2f4e', '#c89a8a', (g) => {
    island(g, 0x4a3f5e);
    const floor = tiles(g, 34, 22, 0.55, [0xf1dfc2, 0xe8d5b5, 0xffe9c9, 0x9ad0a0], { y: 0.02 });
    const sun = box(g, 4, 4, 0.3, 0xffd08a, 0, 3.2, -12, { emissive: 0xffb26b, ei: 1.1, cast: false });
    for (let i = 0; i < 6; i++) tree(g, -8 + i * 3.2, -4.5, [0x6fae7a, 0x9ad0a0, 0xf49ab0][i % 3], 1.2 + hash(i) * 0.5);
    const lantern = box(g, 0.5, 0.5, 0.5, 0xffd98a, 0, 0.6, 2.5, { emissive: 0xffc46b, ei: 1.3, round: true });
    lantern.material = lantern.material.clone();
    const frame = puzzleFrame(g, 0, 0.08, -1.5, 5, 0.1);
    for (let i = 0; i < 8; i++) box(g, 0.4, 0.12, 0.4, [0xffd98a, 0x7fb3e8, 0xf49ab0, 0x9ad0a0][i % 4], -2 + i * 0.57, 0.08, -1.5, { emissive: [0xffd98a, 0x7fb3e8, 0xf49ab0, 0x9ad0a0][i % 4], ei: 0.3 });
    lamp(g, -6, 1.5, 0xffd98a, 2.4);
    lamp(g, 6, 1.5, 0xffd98a, 2.4);
    return { floor, sun, lantern, frame };
  }, { whale: [-1.6, 1.2, 2.25], claude: [-0.2, 1.3, 2.25], gemini: [1.2, 1.3, 2.25], doubao: [2.6, 1.2, 2.25], researcher: [-5.2, 0.2, 1.9], clawd: [-4, 2.4, 0.9], agentReachBot: [4.8, 0.2, 0.9], bionicPuppy: [4, 2.5, 0.8], miniWhale: [-3.2, 3, 0.8], biliTvMascot: [5.6, 2.2, 0.9] });

  function updateWater(water, t, amp = 0.12) {
    if (!water) return;
    const c = new THREE.Color();
    water.cells.forEach((cell, i) => {
      const w = Math.sin(cell.x * 0.5 + t * 1.4) * 0.5 + Math.sin(cell.z * 0.7 - t * 1.1) * 0.5;
      const h = cell.h + amp * w;
      setInst(water.im, i, cell.x, -0.18 + h / 2 - 0.1, cell.z, water.size * 0.96, h, water.size * 0.96, c.copy(cell.c).multiplyScalar(0.9 + 0.12 * w));
    });
    water.im.instanceMatrix.needsUpdate = true;
    water.im.instanceColor.needsUpdate = true;
  }

  function showSet(id, t, shot, energy) {
    for (const [k, s] of Object.entries(sets)) s.g.visible = k === id;
    const s = sets[id];
    scene.fog = new THREE.Fog(new THREE.Color(s.fog), 34, 95);
    hemi.color.set(id === 'dawnGarden' ? 0xffe9c9 : id === 'fireworkRooftop' ? 0x8fa8d0 : 0xdde6ff);
    key.color.set(id === 'rainStop' ? 0xc9d2e8 : id === 'dawnGarden' ? 0xffd98a : 0xffe9c9);
    key.intensity = id === 'fireworkRooftop' ? 1.5 : id === 'rainStop' ? 1.6 : 2.3;
    const lt = shot.local;
    if (id === 'greyShore') {
      s.wish.position.y = 0.25 + smooth(lt / 1.2) * 0.5 + Math.sin(t * 2) * 0.03;
      s.wish.material.emissiveIntensity = 0.5 + energy * 0.8;
      s.tower.face.material.emissiveIntensity = shot.index >= 1 ? 0.7 : 0.15;
    }
    if (id === 'lanternPier') {
      updateWater(s.water, t);
      s.lamps.forEach((l, i) => { l.bulb.material.emissiveIntensity = smooth((lt - i * 0.35) / 0.5) * 1.6; });
    }
    if (id === 'openSea') updateWater(s.water, t, 0.18);
    if (id === 'rainStop') {
      const clear = shot.index === 6 ? smooth((lt - 0.6) / 1.6) : 0;
      s.clouds[0].position.x = -3 - clear * 5;
      s.clouds[1].position.x = 2.5 + clear * 5;
      s.umbrella.rotation.z = clear * 0.18;
      s.stopLamp.bulb.material.emissiveIntensity = 0.3 + clear * 1.5;
      s.drops.forEach((d, i) => {
        const y = ((d.y - t * 4.5) % 8 + 8) % 8;
        const visible = clear < 0.85 || i % 5 === 0;
        setInst(s.rain, i, d.x, y, d.z, 0.035, visible ? 0.35 * (1 - clear * 0.7) : 0.001, 0.035, 0xc9d2e8);
      });
      s.rain.instanceMatrix.needsUpdate = true;
    }
    if (id === 'joyWorkshop') {
      const half = shot.index === 7 && lt > 1.5;
      s.cubes.forEach((c, i) => {
        const k = smooth((lt - i * 0.08) / 1.1);
        c.position.set(lerp(-2 + i * 0.4, -0.9 + (i % 5) * 0.45, k), lerp(1.1, 1.35 + Math.floor(i / 5) * 0.35, k) + Math.sin(k * Math.PI) * 0.6, lerp(0.8, 0.6, k));
      });
      s.grey.forEach((c, i) => {
        const k = smooth((lt - 1.5 - i * 0.1) / 0.9);
        c.position.set(lerp(-1 + i * 0.5, 4.2, k), lerp(1.1, 0.45, k) + Math.sin(k * Math.PI) * 0.4, lerp(1.2, 1.8, k));
        c.visible = k < 0.98;
      });
      s.lid.rotation.z = half ? -0.5 * smooth((lt - 2.4) / 0.4) : 0;
      s.frame.panel.material.emissive = new THREE.Color(0xffd98a);
      s.frame.panel.material.emissiveIntensity = smooth(lt / 2) * 0.35;
    }
    if (id === 'fireworkRooftop') {
      const burstT = shot.index === 9 ? lt : shot.index === 10 ? 0.8 : -1;
      s.fwSeed.forEach((p, i) => {
        const age = burstT - p.burst * 0.45;
        const k = clamp(age / 1.4);
        const r = p.r * smooth(k);
        const fade = age > 0 && age < 1.8 ? 1 - smooth((age - 1.0) / 0.8) : 0;
        setInst(s.fw, i, Math.cos(p.a) * r + (p.burst - 1.5) * 2.2, 5.5 + Math.sin(p.a) * r - k * k * 1.2, -6 + p.burst * 0.4, 0.09 * fade + 0.001, 0.09 * fade + 0.001, 0.09 * fade + 0.001, p.c);
      });
      s.fw.instanceMatrix.needsUpdate = true;
      if (s.fw.instanceColor) s.fw.instanceColor.needsUpdate = true;
    }
    if (id === 'timeBridge') {
      s.nightTower.hand1.rotation.z = t * 0.15;
      s.dayTower.hand1.rotation.z = t * 0.15 + 2.2;
      const k = shot.index === 13 ? smooth((lt - 0.4) / 2.2) : 0;
      s.letter.position.set(lerp(-2.5, 0, k), 0.3 + Math.sin(k * Math.PI) * 0.25, 0.8);
      s.letter.rotation.y = k * 0.4;
      s.gap.forEach((b, i) => { b.position.y = 0.05 + Math.sin(t * 1.2 + i) * 0.02; });
    }
    if (id === 'dawnGarden') {
      const k = shot.index === 15 ? smooth(lt / 1.6) : 0;
      s.lantern.position.set(0, 0.6 + Math.sin(t * 1.5) * 0.03, lerp(3.4, 1.9, k));
      s.lantern.material.emissiveIntensity = 1.1 + energy * 0.5;
    }
    return s;
  }

  return { renderer, scene, camera, box, instances, setInst, tiles, sets, placements, showSet, W, H };
}
