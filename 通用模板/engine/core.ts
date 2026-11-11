// 镜头契约：对应 claude-animated-shorts 的 story.ts（SHOTS / CAMS）——
// 每个镜头 = 一次性搭景 build() + 逐帧纯函数 update(frame) → 相机状态。
//
// 写镜头的三条硬规矩（引擎靠它们保证「任意跳帧 / 并发渲染都得到同一帧」）：
//   1. update(frame) 只能读 frame 里的时间（t / u / T / bt / f），不许用 Math.random、Date.now、累积变量；
//      要随机就用 k.rnd()（按镜头 id 播种，只在 build 里调用）或 kit.ts 的 hash(n)。
//   2. 角色和道具每帧的状态都要在 update 里重新写一遍。引擎每帧的 actor.begin() 只复位修饰量（缩放、倾斜、透明度…），
//      造型、位置、道具都不复位：只在一部分帧里写的状态，会让那一帧的画面取决于之前渲过哪些帧（engine.ts 的预检会查）。
//   3. 缺素材直接抛错（Actor.set 会抛），不许静默换成别的造型。
import * as THREE from 'three';
import { Actor, type AtlasData, type CharId } from './actors';
import { ease, lerp, mulberry, put, type LookName } from './kit';
import type { Beat } from './timeline';

export type V3 = [number, number, number];
export interface CamState { p: V3; l: V3; fov: number; roll: number }
/**
 * 每帧传给镜头的时间信息：
 *   t / dur / u   镜头内的秒数、镜头总长、进度 0–1          T   全片秒数          f   全片帧号
 *   bt            节拍（口播片没有节拍时 pulse 恒为 0）
 *   line / lp     此刻正在说 / 唱第几句（0 起；句间空档为 −1）与这一句的进度 0–1——口播片用它让「正在说话的人」动起来
 *   said          已经开口的最后一句（0 起；第一句开口之前为 −1）。句间空档里它不会变回 −1，用来写「说到第 n 句时道具出场」
 *   when(n, p)    第 n 句说到 p（0 = 开口，1 = 说完）的那一刻，折算成本镜头的进度 u（句子不在本镜头里时会小于 0 或大于 1）。
 *                 用它给相机关键帧定位：track([[0, A], [f.when(28), A], [f.when(28, 0.3), B]], f.u)
 *                 ——配音到了、卡点从估算换成实测以后，镜头还是在「那句话」上动，不用回来改数字。
 */
export interface Frame { t: number; u: number; dur: number; T: number; bt: Beat; f: number; line: number; lp: number; said: number; when: (n: number, p?: number) => number }
/** 第 n 句（0 起）说到哪了：还没轮到 = 0，正在说 = 0–1，已经说完（含之后的句间空档）= 1 */
export const lineU = (f: Frame, n: number): number => (f.said > n ? 1 : f.said < n ? 0 : f.line === n ? f.lp : 1);

export class Kit {
  root = new THREE.Group();
  actors: Actor[] = [];
  rnd: () => number;
  constructor(public atlas: AtlasData, seed: number, private pool: Map<string, unknown>) { this.rnd = mulberry(seed); }
  actor(id: CharId, size = 1): Actor {
    const a = new Actor(this.atlas, id, size);
    this.actors.push(a); this.root.add(a.holder);
    return a;
  }
  /** 跨镜头共用的大布景（同一时刻只挂在当前镜头下） */
  shared<T>(key: string, make: () => T): T {
    if (!this.pool.has(key)) this.pool.set(key, make());
    return this.pool.get(key) as T;
  }
  add<T extends THREE.Object3D>(o: T, x = 0, y = 0, z = 0, ry = 0, s = 1): T { return put(this.root, o, x, y, z, ry, s); }
}

/**
 * 镜头级叠加效果（都画在三维画面之上，由 Film.tsx 处理）：
 *   flash   在镜头内的若干进度点（0–1）闪白 0.22 秒
 *   whiteOut / whiteIn   镜头结尾渐白 / 镜头开头从白淡入（两镜首尾相接就是一次「闪白转场」）
 *   blackOut / blackIn   镜头结尾渐黑 / 镜头开头从黑淡入
 *   title   这个镜头上叠片名卡（文字在作品的 cards.title 里）
 */
export interface ShotFx { flash?: number[]; whiteOut?: boolean; whiteIn?: boolean; blackOut?: boolean; blackIn?: boolean; title?: boolean }
export interface ShotDef {
  id: string; look: LookName; title: string; note: string; cast: CharId[]; fx?: ShotFx;
  build: (k: Kit) => (f: Frame) => CamState;
}

export const cam = (p: V3, l: V3, fov = 38, roll = 0): CamState => ({ p, l, fov, roll });
const mix3 = (a: V3, b: V3, e: number): V3 => [lerp(a[0], b[0], e), lerp(a[1], b[1], e), lerp(a[2], b[2], e)];
export const mixCam = (a: CamState, b: CamState, e: number): CamState => ({ p: mix3(a.p, b.p, e), l: mix3(a.l, b.l, e), fov: lerp(a.fov, b.fov, e), roll: lerp(a.roll, b.roll, e) });
/** 滑行 + 匀速蠕动：smootherstep 与线性混合，保证任何一帧都不是完全静止的 hold */
export const glide = (a: CamState, b: CamState, u: number, k = 0.55): CamState => mixCam(a, b, lerp(u, ease(u), k));
/**
 * 多关键帧运镜：keys = [[u0, 机位0], [u1, 机位1], …]，u 从小到大（0–1）。
 * 每一段都用 glide（smootherstep + 匀速蠕动），所以整条运镜没有完全静止的一帧，也不会只吃第一条。
 */
export function track(keys: [number, CamState][], u: number, k = 0.55): CamState {
  if (!keys.length) throw new Error('[cam] track() 至少要一个关键帧');
  for (let i = 1; i < keys.length; i++) {
    if (!(keys[i][0] >= keys[i - 1][0])) throw new Error(`[cam] track() 的关键帧时间必须从小到大：第 ${i + 1} 个是 ${keys[i][0]}，前一个是 ${keys[i - 1][0]}`);
  }
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (u <= keys[i][0]) {
      const [u0, a] = keys[i - 1], [u1, b] = keys[i];
      return glide(a, b, u1 > u0 ? (u - u0) / (u1 - u0) : 1, k);
    }
  }
  return keys[keys.length - 1][1];
}
