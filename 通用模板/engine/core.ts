// 镜头契约：对应 claude-animated-shorts 的 story.ts（SHOTS / CAMS）——
// 每个镜头 = 一次性搭景 build() + 逐帧纯函数 update(frame) → 相机状态。
//
// 写镜头的三条硬规矩（引擎靠它们保证「任意跳帧 / 并发渲染都得到同一帧」）：
//   1. update(frame) 只能读 frame 里的时间（t / u / T / bt / f），不许用 Math.random、Date.now、累积变量；
//      要随机就用 k.rnd()（按镜头 id 播种，只在 build 里调用）或 kit.ts 的 hash(n)。
//   2. 角色每帧的姿态都要在 update 里重新写一遍（引擎每帧先 actor.begin() 复位）。
//   3. 缺素材直接抛错（Actor.set 会抛），不许静默换成别的造型。
import * as THREE from 'three';
import { Actor, type AtlasData, type CharId } from './actors';
import { ease, lerp, mulberry, put, type LookName } from './kit';
import type { Beat } from './timeline';

export type V3 = [number, number, number];
export interface CamState { p: V3; l: V3; fov: number; roll: number }
export interface Frame { t: number; u: number; dur: number; T: number; bt: Beat; f: number }

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
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (u <= keys[i][0]) {
      const [u0, a] = keys[i - 1], [u1, b] = keys[i];
      return glide(a, b, u1 > u0 ? (u - u0) / (u1 - u0) : 1, k);
    }
  }
  return keys[keys.length - 1][1];
}
