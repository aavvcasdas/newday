// 角色卡片：项目自带的八位轻像素角色（源数据在 通用模板/cast/source/sprites_data.js，烘焙成 assets/cast_atlas.png）
// 作为「3D 世界里的 2D 纸片」。对应 claude-animated-shorts 的 cast.ts / cardshade.ts：
//   · 始终面向相机的 billboard，不进世界墨线
//   · 受场景光染色（card tint），不自发光
//   · 脚下接触阴影
// 同时落实对旧 Remotion 引擎的修复：缺素材直接抛错（不静默回退）、步态每格 3 个整帧、
// 换姿势一律硬切（没有「两层半透明交叉淡化」）、所有精灵同一条脚底基线（卡片底边 = 脚底）。
//
// remotion-engine-fix.patch（旧引擎「角色消失 / 被错切」的那份补丁）在这里的对应做法：
//   · 图集送没送到画面上        → loadAtlas() 先体检（atlasProblems）：PNG 与坐标表必须同一版、每一格都得有像素，否则拒绝加载
//   · 帧数按「每个序列」而不是按「每个角色」算 → framesIn()：一个序列有几格，以图集里实际有几格为准，不在代码里另写一个数
//   · 帧号不许落到序列之外      → cycleIndex()：任何有限输入都回绕进 0…n−1；非有限数直接报错
//   · 开渲前把全片过一遍        → engine.ts 的 castPreflight() 用 Actor.probe() 逐帧看每个角色画哪一格、会不会悄悄不见
import * as THREE from 'three';
import atlasUrl from './assets/cast_atlas.png';
import atlasJson from './assets/cast_atlas.json';
import { FPS } from './timeline';
import { rgb } from './kit';

export type CharId = 'whale' | 'gpt' | 'claude' | 'doubao' | 'gemini' | 'kimi' | 'qwen' | 'zai';
export type Wear = 'crown' | 'hood' | 'tophat' | 'bow' | 'tiara' | 'ears' | 'tail';
type Rect = [number, number, number, number];
interface Anchor { cx: number; top: number; hw: number }
export interface AtlasData { tex: THREE.Texture; w: number; h: number; rects: Record<string, Rect>; anchors: Record<string, Anchor>; url: string }

export interface AtlasMeta { w: number; h: number; s: Record<string, Rect> }
export const ATLAS_URL: string = atlasUrl;
export const ATLAS_META = atlasJson as unknown as AtlasMeta;

/**
 * 一个编号序列（walk_whale_0…7、gpt_fly_0…1）在图集里实际有几格：从 0 连着数，数到缺号为止。
 * 帧数只认这个数——旧引擎把「一条图集有几格」按角色写死成一个值，换一条图集就按错的格数去切。
 */
export function framesIn(prefix: string, cells: Record<string, unknown> = ATLAS_META.s): number {
  let n = 0;
  while (cells[`${prefix}${n}`]) n++;
  return n;
}

/**
 * 循环序列的帧号：任何有限输入都落在 0…n−1（负数、小数都回绕进来，不会拼出 walk_whale_-1 这种不存在的格子名）。
 * 非有限数（NaN / Infinity）说明传进来的时间或距离算坏了，直接报错，不悄悄挑一格播。
 */
export function cycleIndex(i: number, n: number, what = '帧号'): number {
  if (!Number.isFinite(i)) throw new Error(`[cast] ${what} 算出来的帧号不是有限数（${i}）——检查传进去的时间 / 距离 / 速率`);
  if (!(n >= 1)) throw new Error(`[cast] ${what} 用的序列在图集里一格都没有`);
  return ((Math.floor(i) % n) + n) % n;
}

let atlasPromise: Promise<AtlasData> | null = null;
export function loadAtlas(): Promise<AtlasData> {
  if (!atlasPromise) {
    atlasPromise = new Promise<AtlasData>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
        const c = cv.getContext('2d', { willReadFrequently: true })!;
        c.drawImage(img, 0, 0);
        const data = c.getImageData(0, 0, img.width, img.height).data;
        const bad = atlasProblems(ATLAS_META, img.width, img.height, (x, y) => data[(y * img.width + x) * 4 + 3]);
        if (bad.length) { reject(new Error(`角色图集没通过体检（${bad.length} 项），拒绝加载：\n  - ${bad.join('\n  - ')}`)); return; }
        const anchors: Record<string, Anchor> = {};
        for (const [key, r] of Object.entries(ATLAS_META.s)) {
          const [x0, y0, w, h] = r;
          let top = -1, minX = w, maxX = 0;
          for (let y = 0; y < h && (top < 0 || y < top + h * 0.3); y++) {
            for (let x = 0; x < w; x++) {
              if (data[((y0 + y) * img.width + x0 + x) * 4 + 3] > 128) { if (top < 0) top = y; if (x < minX) minX = x; if (x > maxX) maxX = x; }
            }
          }
          anchors[key] = { cx: (minX + maxX) / 2, top: Math.max(0, top), hw: Math.max(8, maxX - minX) };
        }
        const tex = new THREE.Texture(img);
        tex.flipY = false; tex.generateMipmaps = false; tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.needsUpdate = true;
        resolve({ tex, w: img.width, h: img.height, rects: ATLAS_META.s, anchors, url: atlasUrl });
      };
      img.onerror = () => reject(new Error(`角色图集加载失败（取不到或文件损坏）：${atlasUrl}`));
      img.src = atlasUrl;
    });
  }
  return atlasPromise;
}

// 抗锯齿像素采样：任意缩放下像素边缘保持锐利且不闪烁（纹理本身用线性过滤）
export function pixelMat(tex: THREE.Texture, tw: number, th: number): THREE.ShaderMaterial {
  const m = new THREE.ShaderMaterial({
    fog: true, side: THREE.DoubleSide,
    uniforms: {
      map: { value: tex }, texSize: { value: new THREE.Vector2(tw, th) }, rect: { value: new THREE.Vector4(0, 0, tw, th) },
      flip: { value: 0 }, tint: { value: new THREE.Vector3(1, 1, 1) }, sil: { value: 0 }, silColor: { value: rgb(0x120e1f) },
      flash: { value: 0 }, alpha: { value: 1 }, cut: { value: 2 },
      fogColor: { value: new THREE.Color() }, fogNear: { value: 1 }, fogFar: { value: 1000 },
    },
    vertexShader: `varying vec2 vUv;
#include <fog_pars_vertex>
void main(){ vUv = uv; vec4 mvPosition = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`,
    fragmentShader: `uniform sampler2D map; uniform vec2 texSize; uniform vec4 rect; uniform float flip; uniform vec3 tint;
uniform float sil; uniform vec3 silColor; uniform float flash; uniform float alpha; uniform float cut; varying vec2 vUv;
#include <fog_pars_fragment>
void main(){
  if (1.0 - vUv.y > cut) discard;
  vec2 uv = vUv; if (flip > 0.5) uv.x = 1.0 - uv.x;
  vec2 pix = rect.xy + vec2(uv.x, 1.0 - uv.y) * rect.zw;
  vec2 seam = floor(pix + 0.5);
  vec2 d = max(fwidth(pix), vec2(0.0001));
  pix = seam + clamp((pix - seam) / d, -0.5, 0.5);
  pix = clamp(pix, rect.xy + 0.5, rect.xy + rect.zw - 0.5);
  vec4 c = texture2D(map, pix / texSize);
  if (c.a < 0.5) discard;
  if (alpha < 0.999) { float n = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453); if (n > alpha) discard; }
  vec3 col = c.rgb / max(c.a, 0.001);
  float eye = step(0.62, col.r) * step(col.g, 0.4) * step(col.b, 0.5);
  col *= tint;
  col = mix(col, mix(silColor, vec3(1.0, 0.16, 0.22), eye), sil);
  col = mix(col, vec3(1.0), flash);
  gl_FragColor = vec4(col, 1.0);
#include <fog_fragment>
}`,
  });
  return m;
}

const PX = 0.0195; // 每个精灵像素对应的世界单位
const M = 48;      // 服饰叠层在精灵四周的留白（像素）
const scaleFor = (key: string) => (key.startsWith('whale_big') ? 0.6 : key.startsWith('gpt_boss') ? 0.58 : 1);

/** 每个角色的步态序列（前缀）与正面待机 / 眨眼两格。步态有几格不写在这里——以图集为准，见 framesIn() */
export const CAST_SETS: Record<CharId, { walk: string; front: [string, string] }> = {
  whale: { walk: 'walk_whale_', front: ['whale_idle', 'whale_blink'] },
  claude: { walk: 'walk_claude_', front: ['claude_front_0', 'claude_front_1'] },
  kimi: { walk: 'walk_kimi_', front: ['kimi_front_0', 'kimi_front_1'] },
  gemini: { walk: 'walk_gemini_', front: ['gemini_front_0', 'gemini_front_1'] },
  qwen: { walk: 'walk_qwen_', front: ['qwen_front_0', 'qwen_front_1'] },
  zai: { walk: 'walk_zai_', front: ['zai_front_0', 'zai_front_1'] },
  doubao: { walk: 'walk_doubao_big_', front: ['doubao_cage_0', 'doubao_cage_1'] },
  gpt: { walk: 'gpt_fly_', front: ['gpt_boss_idle', 'gpt_boss_blink'] },
};
const SETS = CAST_SETS;
/** 每个角色的步态格数：模块加载时照着图集数一次 */
const WALK_N = Object.fromEntries(Object.entries(SETS).map(([id, s]) => [id, framesIn(s.walk)])) as Record<CharId, number>;

/** 角色表与坐标表对不对得上（只看坐标表，不用解码图片）：编号序列必须从 0 连着编；每个角色的步态与正面两格都得在 */
export function setProblems(cells: Record<string, unknown> = ATLAS_META.s): string[] {
  const out: string[] = [];
  const fam = new Map<string, number[]>();
  for (const key of Object.keys(cells)) {
    const m = /^(.*?)(\d+)$/.exec(key);
    if (m) fam.set(m[1], [...(fam.get(m[1]) ?? []), Number(m[2])]);
  }
  for (const [prefix, idx] of fam) {
    idx.sort((a, b) => a - b);
    if (idx.some((v, i) => v !== i)) out.push(`序列「${prefix}*」的编号不是从 0 连着编的（现有 ${idx.join('、')}）：缺号之后的格子永远播不到`);
  }
  for (const [id, s] of Object.entries(SETS)) {
    if (framesIn(s.walk, cells) < 1) out.push(`角色 ${id} 的步态序列「${s.walk}0…」在图集里一格都没有`);
    for (const k of s.front) if (!cells[k]) out.push(`角色 ${id} 的正面精灵「${k}」不在图集里`);
  }
  return out;
}

/**
 * 图集体检：PNG 与坐标表必须是同一版，每一格都得真的有像素。任何一条不满足，loadAtlas() 就拒绝加载——
 * 出片时这会让渲染直接失败，而不是「渲染成功、角色不见了 / 切到别人身上」。
 * alphaAt(x, y) 返回该像素的不透明度（0–255）。纯函数：浏览器里喂 getImageData，测试里喂解码后的 PNG。
 */
export function atlasProblems(meta: AtlasMeta, imgW: number, imgH: number, alphaAt: (x: number, y: number) => number): string[] {
  const out: string[] = [];
  if (imgW !== meta.w || imgH !== meta.h) out.push(`图集 PNG 是 ${imgW}×${imgH}，坐标表写的是 ${meta.w}×${meta.h}：两个文件不是同一版，按坐标表切会切到别的格子上`);
  for (const [key, r] of Object.entries(meta.s)) {
    const [x0, y0, w, h] = r;
    if ((r as number[]).length !== 4 || !r.every(Number.isInteger) || w <= 0 || h <= 0) { out.push(`「${key}」的坐标不是正整数矩形：[${r.join(', ')}]`); continue; }
    if (x0 < 0 || y0 < 0 || x0 + w > imgW || y0 + h > imgH) { out.push(`「${key}」[${r.join(', ')}] 超出图集 ${imgW}×${imgH}`); continue; }
    let solid = false;
    for (let y = 0; y < h && !solid; y++) for (let x = 0; x < w; x++) if (alphaAt(x0 + x, y0 + y) > 128) { solid = true; break; }
    if (!solid) out.push(`「${key}」这一格是空的（没有任何不透明像素）：用到它的角色会整个不见`);
  }
  return [...out, ...setProblems(meta.s)];
}

// ---------- 服饰叠层（像素画，按精灵头顶锚点对位） ----------
type Ctx = CanvasRenderingContext2D;
const R = (c: Ctx, col: string, x: number, y: number, w: number, h: number) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const WEAR: Record<Wear, { back: boolean; draw: (c: Ctx, a: Anchor, w: number, h: number) => void }> = {
  crown: { back: false, draw: (c, a) => {
    const x = Math.round(a.cx) + M, y = a.top + M + 3;
    R(c, '#7a4a12', x - 7, y - 9, 15, 10); R(c, '#ffd166', x - 6, y - 4, 13, 4);
    R(c, '#ffd166', x - 6, y - 7, 3, 3); R(c, '#fff3b0', x - 1, y - 8, 3, 4); R(c, '#ffd166', x + 4, y - 7, 3, 3);
    R(c, '#e63946', x - 1, y - 3, 3, 2); R(c, '#d9822b', x - 6, y - 1, 13, 1);
  } },
  tiara: { back: false, draw: (c, a) => {
    const x = Math.round(a.cx) + M, y = a.top + M + 4;
    R(c, '#5a6988', x - 6, y - 3, 13, 4); R(c, '#eef6ff', x - 5, y - 2, 11, 2); R(c, '#2ce8f5', x - 1, y - 5, 3, 4); R(c, '#ffffff', x, y - 4, 1, 1);
  } },
  tophat: { back: false, draw: (c, a) => {
    const x = Math.round(a.cx) + M, y = a.top + M + 5;
    R(c, '#1c0f2e', x - 12, y - 4, 25, 5); R(c, '#1c0f2e', x - 8, y - 18, 17, 15);
    R(c, '#6a35a8', x - 7, y - 17, 15, 13); R(c, '#8a55c8', x - 6, y - 16, 3, 11); R(c, '#ffd166', x - 7, y - 7, 15, 3);
    R(c, '#4a2380', x - 11, y - 3, 23, 3); R(c, '#fff3b0', x + 3, y - 15, 3, 4);
  } },
  bow: { back: false, draw: (c, a) => {
    const x = Math.round(a.cx) + M, y = a.top + M + 1;
    for (let i = 0; i < 7; i++) { R(c, '#0a5f8f', x - 2 - i, y - 4 - i, 1, 2 * i + 3); R(c, '#0a5f8f', x + 2 + i, y - 4 - i, 1, 2 * i + 3); }
    for (let i = 0; i < 6; i++) { R(c, '#2ce8f5', x - 2 - i, y - 3 - i, 1, 2 * i + 1); R(c, '#2ce8f5', x + 2 + i, y - 3 - i, 1, 2 * i + 1); }
    R(c, '#0099db', x - 2, y - 5, 5, 5); R(c, '#bff8ff', x - 6, y - 5, 2, 2); R(c, '#bff8ff', x + 4, y - 5, 2, 2);
  } },
  ears: { back: false, draw: (c, a) => {
    const y = a.top + M + 8;
    for (const s of [-1, 1]) {
      const x = Math.round(a.cx + s * a.hw * 0.26) + M;
      for (let i = 0; i < 13; i++) R(c, '#241c36', x - Math.floor((13 - i) / 2), y - i, 13 - i, 1);
      for (let i = 2; i < 9; i++) R(c, '#6a557f', x - Math.floor((8 - i) / 2), y - i, 8 - i, 1);
    }
  } },
  hood: { back: true, draw: (c, a, _w, h) => {
    const r = Math.round(a.hw / 2) + 4, cx = Math.round(a.cx) + M, cy = a.top + M + r - 3;
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = x * x + y * y;
      if (d <= r * r) R(c, d > (r - 1.6) * (r - 1.6) ? '#8f1423' : '#e63946', cx + x, cy + y, 1, 1);
    }
    const y1 = M + h - 13;
    for (let y = cy; y <= y1; y++) {
      const half = Math.round(r - 3 + (y - cy) * 0.3), x0 = cx - 3 - half;
      R(c, '#e63946', x0, y, half * 2, 1); R(c, '#8f1423', x0 - 1, y, 2, 1); R(c, '#8f1423', x0 + half * 2 - 1, y, 2, 1);
      if ((y - cy) % 6 === 5) R(c, '#c22a3a', x0 + 3, y, half * 2 - 6, 1);
    }
    R(c, '#8f1423', cx - 3 - Math.round(r - 3 + (y1 - cy) * 0.3), y1 + 1, Math.round(r - 3 + (y1 - cy) * 0.3) * 2, 1);
  } },
  tail: { back: false, draw: (c, _a, w, h) => {
    // 弯向一侧、末端分叉的鱼尾；配合着色器里的 cut 裁掉裙摆以下的双腿
    const fs = Math.max(0.5, h / 148);
    const x0 = M + w * 0.5 - 2 * fs, y0 = M + h * 0.855, L = Math.round(54 * fs);
    const at = (u: number): [number, number, number] => [x0 + 36 * fs * Math.pow(u, 1.7), y0 + 50 * fs * u * (1 - 0.3 * u), (13.5 - 9.5 * u) * fs];
    const dot = (cx: number, cy: number, r: number, col: string) => { const n = Math.ceil(r); for (let y = -n; y <= n; y++) for (let x = -n; x <= n; x++) if (x * x + y * y <= r * r) R(c, col, cx + x, cy + y, 1, 1); };
    const [ex, ey] = at(1);
    const lobe = (k: number) => Array.from({ length: Math.round(15 * fs) }, (_, i): [number, number, number] => [ex + i * (k ? 0.45 : 1.0), ey + i * (k ? 1.0 : -0.5), Math.max(1.4, 4.2 * fs - i * 0.18)]);
    const pts: [number, number, number][] = [...Array.from({ length: L + 1 }, (_, i) => at(i / L)), ...lobe(0), ...lobe(1)];
    for (const [x, y, r] of pts) dot(x, y, r + 1.3, '#0f4f6e');
    for (const [x, y, r] of pts) dot(x, y, r, '#2bb6c9');
    for (let i = 0; i <= L; i++) {
      const [x, y, r] = at(i / L);
      if (i % 2 === 0) dot(x - r * 0.45, y - r * 0.2, Math.max(1, r * 0.28), '#8ff0f6');
      if (i % 5 === 2) R(c, '#1d8fa8', x + r * 0.15, y, Math.max(2, r * 0.55), 1);
    }
  } },
};

const overlayCache = new Map<string, THREE.CanvasTexture>();
function overlayTex(atlas: AtlasData, wear: Wear, key: string): THREE.CanvasTexture {
  const id = `${wear}:${key}`;
  let t = overlayCache.get(id);
  if (!t) {
    const r = atlas.rects[key];
    const cv = document.createElement('canvas'); cv.width = r[2] + 2 * M; cv.height = r[3] + 2 * M;
    WEAR[wear].draw(cv.getContext('2d')!, atlas.anchors[key], r[2], r[3]);
    t = new THREE.CanvasTexture(cv);
    t.flipY = false; t.generateMipmaps = false; t.minFilter = t.magFilter = THREE.LinearFilter;
    overlayCache.set(id, t);
  }
  return t;
}

const cardGeo = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
const shadowGeo = new THREE.CircleGeometry(0.5, 20).rotateX(-Math.PI / 2);

export class Actor {
  holder = new THREE.Group();
  private bill = new THREE.Group();
  private inner = new THREE.Group();
  private card: THREE.Mesh;
  private mat: THREE.ShaderMaterial;
  private shadow: THREE.Mesh;
  private layers: { wear: Wear; mesh: THREE.Mesh; mat: THREE.ShaderMaterial }[] = [];
  private key = '';
  private seed: number;
  private k = 1;
  // 每帧可写状态（begin() 复位）
  private _size = 1; private _sq = 0; private _tilt = 0; private _lift = 0; private _alpha = 1; private _flash = 0; private _sil = 0;
  private _flip = false; private _tint: THREE.Vector3 | null = null; private _shadow = true;
  height = 1.6;

  constructor(private atlas: AtlasData, public id: CharId, private baseSize = 1) {
    this.mat = pixelMat(atlas.tex, atlas.w, atlas.h);
    this.card = new THREE.Mesh(cardGeo, this.mat);
    this.shadow = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ color: 0x0b0a16, transparent: true, opacity: 0.3, depthWrite: false }));
    this.shadow.position.y = 0.025;
    this.inner.add(this.card); this.bill.add(this.inner); this.holder.add(this.bill, this.shadow);
    this.seed = id.charCodeAt(0) * 0.37 + id.length;
    this.set(SETS[id].front[0]);
  }

  wear(w: Wear): this {
    const tex = overlayTex(this.atlas, w, this.key);
    const mat = pixelMat(tex, tex.image.width, tex.image.height);
    const mesh = new THREE.Mesh(cardGeo, mat);
    mesh.position.z = WEAR[w].back ? -0.012 : 0.012;
    this.inner.add(mesh);
    this.layers.push({ wear: w, mesh, mat });
    this.syncLayers();
    return this;
  }

  set(key: string): this {
    if (key === this.key) return this;
    const r = this.atlas.rects[key];
    if (!r) throw new Error(`[cast] 缺少角色精灵「${key}」——按项目规则禁止静默回退到替代造型`);
    this.key = key; this.k = scaleFor(key);
    (this.mat.uniforms.rect.value as THREE.Vector4).set(r[0], r[1], r[2], r[3]);
    this.card.scale.set(r[2] * PX * this.k, r[3] * PX * this.k, 1);
    this.height = r[3] * PX * this.k * this.baseSize;
    this.syncLayers();
    return this;
  }
  private syncLayers() {
    const r = this.atlas.rects[this.key];
    for (const l of this.layers) {
      const tex = overlayTex(this.atlas, l.wear, this.key);
      l.mat.uniforms.map.value = tex;
      (l.mat.uniforms.texSize.value as THREE.Vector2).set(tex.image.width, tex.image.height);
      (l.mat.uniforms.rect.value as THREE.Vector4).set(0, 0, tex.image.width, tex.image.height);
      l.mesh.scale.set((r[2] + 2 * M) * PX * this.k, (r[3] + 2 * M) * PX * this.k, 1);
      l.mesh.position.y = -M * PX * this.k;
    }
  }

  /** 步态：每格固定 3 个视频帧（30fps 下 100ms），帧号只取整数，杜绝 3/4 帧交替的抖动 */
  walk(T: number, rate = 1): this {
    const s = SETS[this.id], n = WALK_N[this.id];
    const step = n === 2 ? 6 : 3;
    const f = cycleIndex((Math.round(T * FPS) * rate) / step, n, `${this.id}.walk(${T}, ${rate})`);
    return this.set(`${s.walk}${f}`);
  }
  /**
   * 位移驱动的步态：走了多远就播到哪一格，脚底不打滑。
   * dist=这个镜头里累计走过的世界距离（时间的纯函数），stride=播完一轮步态走多远（默认约一个身高）
   */
  walkBy(dist: number, stride = 1.7): this {
    const s = SETS[this.id], n = WALK_N[this.id];
    const f = cycleIndex((dist / stride) * n, n, `${this.id}.walkBy(${dist}, ${stride})`);
    return this.set(`${s.walk}${f}`);
  }
  /** 正面待机 + 眨眼（确定性时间表） */
  front(T: number): this {
    const s = SETS[this.id];
    const ph = (T + this.seed * 1.3) % 2.6;
    return this.set(ph < 0.13 ? s.front[1] : s.front[0]);
  }
  /** 说话时的小动作：轻轻一颠一颠（每秒约 4 下）。on=false 时什么都不做，方便写成 a.talk(T, f.line === 3) */
  talk(T: number, on = true): this {
    if (on) { const w = Math.abs(Math.sin(T * 13)); this._lift += w * 0.035; this._sq += 0.025 * (w - 0.5); }
    return this;
  }
  at(x: number, y: number, z: number): this { this.holder.position.set(x, y, z); return this; }
  flip(b = true): this { this._flip = b; return this; }
  size(s: number): this { this._size = s; return this; }
  sq(a: number): this { this._sq = a; return this; }
  tilt(r: number): this { this._tilt = r; return this; }
  lift(h: number): this { this._lift = h; return this; }
  alpha(a: number): this { this._alpha = a; return this; }
  flash(v: number): this { this._flash = v; return this; }
  sil(v: number): this { this._sil = v; return this; }
  tint(hex: number | null): this { this._tint = hex == null ? null : rgb(hex); return this; }
  noShadow(): this { this._shadow = false; return this; }
  hide(): this { this._alpha = 0; return this; }
  get x() { return this.holder.position.x; }
  get y() { return this.holder.position.y; }
  get z() { return this.holder.position.z; }

  /**
   * 这一帧的角色状态（全片预检用）：画的是哪一格、看不看得见、有没有会让它「悄悄不见」的坏数。
   * three.js 遇到 NaN 的坐标 / 缩放不报错，只是不画；透明度是 NaN 时这里的 commit() 也会把角色藏起来——都得在开渲前揪出来。
   */
  probe(): { id: CharId; key: string; shown: boolean; bad: string | null } {
    const p = this.holder.position;
    const bad = (pairs: [string, number][]) => { const hit = pairs.find(([, v]) => !Number.isFinite(v)); return hit ? `${hit[0]}=${hit[1]}` : null; };
    const a = bad([['alpha', this._alpha]]);
    if (a) return { id: this.id, key: this.key, shown: false, bad: a };
    if (!(this._alpha > 0.02)) return { id: this.id, key: this.key, shown: false, bad: null };
    return {
      id: this.id, key: this.key, shown: true,
      bad: bad([['x', p.x], ['y', p.y], ['z', p.z], ['size', this._size], ['sq', this._sq], ['tilt', this._tilt], ['lift', this._lift], ['flash', this._flash], ['sil', this._sil]]),
    };
  }

  /**
   * 这一帧会被画成什么样的全部状态，写成一行「名字=值;…」（预检用它核对：同一帧不管之前渲过哪些帧，结果都得一样）。
   * 看不见的角色只有「不显示」——反正不画，别的值是什么都无所谓。
   * 注意 begin() 只复位缩放 / 倾斜 / 透明度这些修饰量，造型和位置不复位：哪一帧没写，就停在这个页面上一次渲到的样子。
   */
  stateLine(): string {
    if (!(this._alpha > 0.02)) return '显隐=不显示';
    const p = this.holder.position, q = this.holder.quaternion, sc = this.holder.scale, t = this._tint;
    return [
      '显隐=显示', `造型=${this.key}`, `位置=${p.x},${p.y},${p.z}`, `挂点朝向与缩放=${q.x},${q.y},${q.z},${q.w},${sc.x},${sc.y},${sc.z}`,
      `大小=${this._size}`, `挤压=${this._sq}`, `倾斜=${this._tilt}`, `跳起=${this._lift}`, `透明度=${this._alpha}`, `闪白=${this._flash}`, `剪影=${this._sil}`,
      `左右翻转=${this._flip}`, `染色=${t ? `${t.x},${t.y},${t.z}` : '无'}`, `阴影=${this._shadow}`,
    ].join(';');
  }

  begin() { this._size = 1; this._sq = 0; this._tilt = 0; this._lift = 0; this._alpha = 1; this._flash = 0; this._sil = 0; this._flip = false; this._tint = null; this._shadow = true; }

  commit(cam: THREE.Camera, cardTint: THREE.Vector3) {
    const vis = this._alpha > 0.02;
    this.holder.visible = vis;
    if (!vis) return;
    this.bill.quaternion.copy(cam.quaternion);
    this.bill.position.y = this._lift;
    const s = this.baseSize * this._size;
    this.inner.scale.set(s * (1 + this._sq * 0.6), s * (1 - this._sq), 1);
    this.inner.rotation.z = this._tilt;
    const tint = this._tint ?? cardTint;
    this.mat.uniforms.cut.value = this.key.startsWith('whale_big') && this.layers.some((l) => l.wear === 'tail') ? 0.875 : 2;
    for (const m of [this.mat, ...this.layers.map((l) => l.mat)]) {
      const u = m.uniforms;
      u.flip.value = this._flip ? 1 : 0; u.alpha.value = this._alpha; u.flash.value = this._flash; u.sil.value = this._sil;
      (u.tint.value as THREE.Vector3).copy(tint);
    }
    const r = this.atlas.rects[this.key];
    const w = Math.min(1.5, r[2] * PX * this.k * s * 0.62);
    const k = Math.max(0.25, 1 - this._lift * 0.22);
    this.shadow.visible = this._shadow && this._sil < 0.5;
    this.shadow.scale.set(w * k, 1, w * 0.42 * k);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = 0.3 * k * this._alpha;
  }
}
