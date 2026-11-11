// 镜头表（上）：序章 I1–I3 · 主歌一 L01–L08 · 导歌一 L09–L12 · 副歌 L13–L19
import * as THREE from 'three';
import { cam, glide, mixCam, type Kit, type ShotDef } from './core';
import type { Actor } from './actors';
import {
  backOut, ball, box, canvasTex, clock, cloud, cone, cyl, disc, ease, easeOut, flower, glowMat, hash, lerp, mesh, paperBoat, pine, put, rock,
  seg, setOp, sprite, toon, toonMap, tree, basic, lantern,
} from './kit';
import { book, buildTown, castle, Fireworks, hill, mushroom, straightRiver, useTown, wheel } from './sets';
import { FPS, type Beat } from './timeline';

export const PI = Math.PI;
export const many = <T,>(n: number, f: (i: number) => T): T[] => Array.from({ length: n }, (_, i) => f(i));
export const beatSq = (bt: Beat, amt = 0.07) => bt.pulse * amt * (bt.down ? 1 : 0.6);

export function backdrop(k: Kit, c1 = 0x79b98a, c2 = 0x6aa9c9, clouds = true) {
  many(12, (i) => { const a = (i / 12) * PI * 2 + 0.2; k.add(hill(36 + hash(i) * 30, 14 + hash(i + 3) * 20, i % 2 ? c1 : c2), Math.cos(a) * 175, 0, Math.sin(a) * 175); });
  if (clouds) many(9, (i) => k.add(cloud(i * 7, 2 + hash(i) * 2), -120 + i * 30, 30 + hash(i + 1) * 20, -110 - hash(i + 2) * 40));
}
export function sail(boat: THREE.Object3D, who: Actor, x: number, z: number, ang: number, T: number, y = 0.12) {
  const bob = Math.sin(T * 2.3) * 0.05;
  boat.position.set(x, y + bob, z); boat.rotation.y = ang; boat.rotation.z = Math.sin(T * 1.7) * 0.04;
  who.at(x, y + bob + 0.4, z).noShadow();
}
const FINALE: { id: 'doubao' | 'gemini' | 'claude' | 'whale' | 'qwen' | 'kimi' | 'zai'; wear?: 'hood' | 'bow' | 'crown' | 'tophat' | 'tiara' }[] = [
  { id: 'doubao', wear: 'hood' }, { id: 'gemini', wear: 'bow' }, { id: 'claude', wear: 'crown' }, { id: 'whale' },
  { id: 'qwen', wear: 'tophat' }, { id: 'kimi', wear: 'tiara' }, { id: 'zai' },
];

export const SHOTS_A: ShotDef[] = [
  {
    id: 'I1', look: 'stage', title: '翻开立体书', cast: ['whale'], fx: { title: true, whiteOut: true },
    note: '书桌上的童话书自己翻开，鲸鱼娘小跑、起跳、跃进发光的书页——开场两秒内就有动作，不站桩。',
    build: (k) => {
      k.add(disc(70, 0x6b4630));
      const b = book(); k.add(b.g);
      k.add(cyl(0.22, 0.26, 1.3, 0xfff2dc, 10), -5.4, 0, -3.2);
      const flame = k.add(sprite('glow', 1.8, 0xffb347, true, 0.9), -5.4, 1.65, -3.2);
      k.add(sprite('drop', 0.42, 0xffe9a0), -5.4, 1.58, -3.2);
      k.add(cyl(0.5, 0.62, 0.9, 0x2f4f8f, 10), 5.4, 0, -3.4);
      const quill = k.add(cone(0.13, 2.4, 0xfffaf0, 5), 5.4, 0.8, -3.4); quill.rotation.z = -0.5;
      const whale = k.actor('whale');
      const sparks = many(26, (i) => k.add(sprite('star', 0.5, i % 3 ? 0xfff2a8 : 0xffffff, true)));
      const A = cam([-2.6, 5.4, 13.5], [-0.5, 0.6, 1.4], 40), B = cam([0, 6.4, 6.2], [0, 0.8, 0], 34);
      return ({ u, T }) => {
        const open = ease(seg(u, 0.1, 0.48));
        b.cover.rotation.z = open * 2.8;
        (b.glow.material as THREE.MeshBasicMaterial).opacity = open * 0.95;
        const run = seg(u, 0, 0.5), jump = seg(u, 0.54, 0.84);
        if (jump <= 0) whale.walk(T, 1.5).at(lerp(-9.5, -3.8, run), 0, 5);
        else { const j = ease(jump); whale.set('whale_wave').at(lerp(-3.8, 0, j), 0.85 * j, lerp(5, 0, j)).lift(Math.sin(j * PI) * 2.6).size(lerp(1, 0.4, j)).alpha(jump > 0.96 ? 0 : 1); }
        sparks.forEach((s, i) => { const ph = (T * 0.5 + hash(i)) % 1; s.position.set((hash(i + 9) - 0.5) * 5, 0.9 + ph * 4.6, (hash(i + 5) - 0.5) * 7); s.scale.setScalar(0.25 + 0.5 * Math.sin(ph * PI)); setOp(s, open * Math.sin(ph * PI)); });
        flame.scale.setScalar(1.7 + 0.18 * Math.sin(T * 9));
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'I2', look: 'day', title: '折纸船离岸', cast: ['whale'], fx: { whiteIn: true },
    note: '镜头贴着七彩河面跟在纸船后面滑行，两岸民居掠过，鲸鱼娘在船上挥手。',
    build: (k) => {
      const town = k.shared('town', buildTown);
      const boat = k.add(paperBoat()), whale = k.actor('whale');
      return ({ u, T, bt }) => {
        useTown(k, town, 1, false);
        const { p, ang, dx, dz } = town.at(lerp(0.2, 0.285, u));
        sail(boat, whale, p.x, p.z, ang, T);
        whale.set(bt.idx % 4 < 2 ? 'whale_wave' : 'whale_idle').sq(beatSq(bt));
        return cam([p.x - dx * 9.5 - dz * 2.4, 3.6 - u * 0.9, p.z - dz * 9.5 + dx * 2.4], [p.x + dx * 7, 1.5, p.z + dz * 7], 42);
      };
    },
  },
  {
    id: 'I3', look: 'day', title: '城堡与掠过的龙影', cast: ['gpt', 'whale'],
    note: '从桥头摇升，露出山丘上的王城；GPT 龙娘从塔尖上空飞过，预告她的反派戏份。',
    build: (k) => {
      const town = k.shared('town', buildTown);
      const boat = k.add(paperBoat()), whale = k.actor('whale'), gpt = k.actor('gpt', 4.2);
      const A = cam([8, 2.3, 25], [20, 4.5, -8], 42), B = cam([3, 15.5, 42], [38, 12, -42], 40);
      return ({ u, T }) => {
        useTown(k, town, 1, false);
        const { p, ang } = town.at(lerp(0.5, 0.53, u));
        sail(boat, whale, p.x, p.z, ang, T); whale.front(T);
        gpt.walk(T).at(lerp(10, 68, u), 22 + Math.sin(u * PI) * 5, -36).noShadow();
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'L01', look: 'day', title: '白雪公主在逃跑', cast: ['claude', 'whale'],
    note: 'Claude 大小姐（全片唯一的公主，戴小金冠）冲出城门，苹果一路掉；鲸鱼娘在后面追。横移跟拍，城堡向后退去。',
    build: (k) => {
      k.add(disc(320, 0x86d36b)); backdrop(k);
      k.add(castle(), -5, 0, -17);
      k.add(box(70, 0.05, 3.2, 0xf0dfb8, 0), 8, 0, 0.2);
      many(9, (i) => {
        const tr = k.add(tree(3.6 + hash(i) * 1.4, 0x55c060, i), -9 + i * 4.3 + hash(i + 3) * 1.5, 0, -3.8 - hash(i + 7) * 2.5);
        many(4, (j) => put(tr, ball(0.17, 0xe63946, false, 0.02), Math.cos(j * 1.7 + i) * 0.9, 2.1 + hash(i * 4 + j) * 0.9, 0.8 + Math.sin(j * 1.7) * 0.4));
      });
      many(18, (i) => k.add(flower([0xff7aa8, 0xffd166, 0xffffff, 0xb388ff][i % 4], 0.35 + hash(i) * 0.25), -8 + i * 1.5, 0, 2.4 + hash(i + 2) * 1.4));
      const claude = k.actor('claude').wear('crown'), whale = k.actor('whale');
      const bf = many(5, () => k.add(sprite('butterfly', 0.4)));
      const dust = many(6, () => k.add(sprite('smoke', 0.5, 0xffffff, false, 0.5)));
      const apples = many(3, () => k.add(ball(0.17, 0xe63946, false, 0.03)));
      return ({ u, T, t, dur }) => {
        const xa = (uu: number) => lerp(-4.5, 4.2, uu), x = xa(u);
        claude.walk(T, 1.5).at(x, 0, 0.2).tilt(-0.1).lift(Math.abs(Math.sin(T * 9.4)) * 0.07);
        whale.walk(T, 1.5).at(x - 3.3 + Math.sin(u * 4) * 0.3, 0, 0.7).tilt(-0.07);
        bf.forEach((s, i) => { s.position.set(x + 1.6 + i * 0.7 + Math.sin(T * 2 + i) * 0.4, 1.7 + Math.sin(T * 3 + i * 2) * 0.4, -0.3 + Math.cos(T * 1.7 + i) * 0.5); s.scale.x = 0.4 * (0.35 + 0.65 * Math.abs(Math.sin(T * 14 + i))); });
        dust.forEach((s, i) => { const ph = (T * 2.4 + i / 6) % 1; s.position.set(x - 0.5 - ph * 1.5, 0.15 + ph * 0.35, 0.35); s.scale.setScalar(0.25 + ph * 0.5); setOp(s, (1 - ph) * 0.5); });
        apples.forEach((a, i) => { const t0 = 0.45 + i * 0.95, tt = t - t0; a.visible = tt > 0; a.position.set(xa(t0 / dur) - 0.4 - tt * 0.5, 0.17 + Math.abs(Math.sin(tt * 6)) * 0.7 * Math.exp(-tt * 1.6), 0.5); });
        return cam([x + 0.4, 1.35, 7.3 - u * 0.5], [x - 0.7, 1.05, 0], 36);
      };
    },
  },
  {
    id: 'L02', look: 'forest', title: '小红帽在担心大灰狼', cast: ['doubao', 'gpt'],
    note: '豆包披红斗篷提篮穿林（按设定不戴皇冠）；唱到「大灰狼」镜头右摇，树后 GPT 龙娘的狼耳剪影升起、红瞳亮起。',
    build: (k) => {
      k.add(disc(220, 0x2f5f4a));
      k.add(box(70, 0.05, 2.4, 0x6a5a48, 0), 0, 0, 0.1);
      many(30, (i) => k.add(pine(5 + hash(i) * 3.5, i % 2 ? 0x235c48 : 0x2f7a55), -18 + i * 1.3 + hash(i + 1), 0, -3.6 - hash(i + 5) * 10));
      k.add(pine(8, 0x1c4a3a), -5.6, 0, 3.2); k.add(pine(9, 0x1c4a3a), 7.2, 0, 3.4);
      many(6, (i) => k.add(mushroom(0.5 + hash(i) * 0.3, 0xe63946), -6 + i * 2.3, 0, -1.5 - hash(i) * 0.8));
      k.add(ball(1.15, 0x1f4a3a, true), 2.7, 0.25, -2.3);
      const flies = many(14, () => k.add(sprite('glow', 0.3, 0xd8ff8a, true)));
      const doubao = k.actor('doubao').wear('hood');
      const wolf = k.actor('gpt', 1.5).wear('ears');
      const eyes = many(2, () => k.add(sprite('glow', 0.7, 0xff2d4a, true)));
      const sweat = k.add(sprite('drop', 0.24, 0x9fdcff));
      const basket = k.add(box(0.34, 0.24, 0.24, 0xb07a3c, 0.03));
      const A = cam([-2.6, 1.35, 6.3], [-1.8, 1.0, 0], 36), B = cam([1.0, 1.5, 6.8], [0.9, 1.3, -1.4], 38);
      return ({ u, T, bt }) => {
        const x = lerp(-2.7, -0.9, seg(u, 0, 0.46)), stop = u > 0.46;
        if (stop) doubao.front(T).at(x + Math.sin(T * 40) * 0.012, 0, 0.1).sq(beatSq(bt, 0.05)); else doubao.walk(T, 0.75).at(x, 0, 0.1);
        basket.position.set(x + 0.32, 0.5, 0.28);
        const lift = lerp(-2.3, 0, ease(seg(u, 0.42, 0.62)));
        wolf.set('gpt_boss_rage').at(2.7, 0, -3.3).lift(lift).sil(1).noShadow();
        eyes.forEach((e, i) => { e.position.set(2.7 + (i ? 0.22 : -0.13), lift + 2.18, -3.2); setOp(e, seg(u, 0.52, 0.62) * (0.65 + 0.3 * Math.sin(T * 9))); });
        const sp = (T * 1.4) % 1; sweat.position.set(x + 0.3, 1.5 - sp * 0.5, 0.2); setOp(sweat, stop ? 1 - sp : 0);
        flies.forEach((s, i) => { s.position.set(-7 + hash(i) * 14 + Math.sin(T * 0.7 + i) * 0.6, 0.6 + hash(i + 4) * 2.4 + Math.sin(T * 1.1 + i * 2) * 0.3, -2.5 + hash(i + 8) * 4); setOp(s, 0.4 + 0.5 * Math.sin(T * 2.3 + i * 1.7)); });
        return glide(A, B, ease(seg(u, 0.28, 0.72)) * 0.85 + u * 0.15, 0);
      };
    },
  },
  {
    id: 'L03', look: 'day', title: '疯帽喜欢爱丽丝', cast: ['qwen', 'gemini'],
    note: '千问戴紫色高礼帽（疯帽子），Gemini 系蓝蝴蝶结（爱丽丝）；茶桌、棋盘草地、巨型蘑菇。爱心沿抛物线从疯帽飞向爱丽丝，「喜欢」落拍时弹出大爱心。',
    build: (k) => {
      k.add(disc(320, 0x8fd672)); backdrop(k);
      const ck = canvasTex(64, 64, (c) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { c.fillStyle = (x + y) % 2 ? '#b79be8' : '#f7f1ff'; c.fillRect(x * 8, y * 8, 8, 8); } });
      ck.magFilter = THREE.NearestFilter;
      const lawn = new THREE.Mesh(new THREE.PlaneGeometry(10, 10).rotateX(-PI / 2), toonMap(ck)); k.add(lawn, 0, 0.03, 0, 0.3);
      k.add(cyl(1.6, 2.0, 0.92, 0xfff0f5, 18), 0, 0, 0); k.add(cyl(1.62, 1.62, 0.1, 0xffffff, 18), 0, 0.92, 0);
      k.add(ball(0.34, 0x7fd3ff), 0, 1.33, 0); k.add(cone(0.1, 0.4, 0x7fd3ff, 8), 0.42, 1.25, 0).rotation.z = -1.1;
      k.add(ball(0.09, 0xffd166, false, 0.02), 0, 1.7, 0);
      many(3, (i) => k.add(cyl(0.17, 0.11, 0.17, 0xffffff, 10), Math.cos(i * 2.1 + 0.6) * 1.0, 1.02, Math.sin(i * 2.1 + 0.6) * 0.8));
      k.add(cyl(0.32, 0.32, 0.26, 0xffb3cf, 12), -0.7, 1.02, 0.5); k.add(ball(0.09, 0xe63946, false, 0.02), -0.7, 1.36, 0.5);
      k.add(mushroom(3.2, 0xe63946), -5, 0, -3); k.add(mushroom(2.2, 0xb388ff), 5.2, 0, -2.4); k.add(mushroom(1.3, 0x4fd0ff), 3.6, 0, -4.2);
      many(7, (i) => k.add(box(1.6, 1.3, 1.2, 0x3f9f5a), -7 + i * 2.3, 0, -6.5));
      many(10, (i) => k.add(flower([0xff7aa8, 0xffffff, 0xffd166][i % 3], 0.5), -6 + i * 1.3, 0, -5.4));
      const qwen = k.actor('qwen').wear('tophat'), gem = k.actor('gemini').wear('bow');
      const hearts = many(5, () => k.add(sprite('heart', 0.36)));
      const big = k.add(sprite('heart', 1.3), 0, 3.0, 0);
      const steam = many(3, () => k.add(sprite('smoke', 0.4, 0xffffff, false, 0.5)));
      const A = cam([-2.7, 1.9, 7.5], [0, 1.2, 0], 34), B = cam([2.1, 1.65, 6.3], [0.1, 1.25, 0], 32);
      return ({ u, T, bt }) => {
        qwen.set('qwen_side_0').at(-2.2, 0, 0.3).tilt(-0.08 + Math.sin(T * 3) * 0.03).sq(beatSq(bt)).lift(bt.down ? bt.pulse * 0.12 : 0);
        gem.set('gemini_side_0').flip().at(2.2, 0, 0.3).tilt(Math.sin(T * 2.6) * 0.05).sq(beatSq(bt, 0.04)).lift(u > 0.55 ? Math.sin(bt.phase * PI) * 0.22 : 0);
        hearts.forEach((s, i) => { const ph = (T * 0.55 + i / 5) % 1; s.position.set(lerp(-1.8, 1.9, ph), 1.75 + Math.sin(ph * PI) * 1.1, 0.4); s.scale.setScalar(0.3 + 0.14 * Math.sin(ph * PI)); setOp(s, Math.sin(ph * PI)); });
        const pop = backOut(seg(u, 0.55, 0.7)); big.scale.setScalar(Math.max(0.001, pop * 1.3 * (1 + 0.14 * bt.pulse))); big.visible = pop > 0.01;
        steam.forEach((s, i) => { const ph = (T * 0.5 + i / 3) % 1; s.position.set(0.5 + Math.sin(ph * 5 + i) * 0.12, 1.5 + ph * 0.9, 0); s.scale.setScalar(0.2 + ph * 0.4); setOp(s, (1 - ph) * 0.5); });
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'L04', look: 'day', title: '丑小鸭会变成白天鹅', cast: ['whale'], fx: { flash: [0.5] },
    note: '灰色小鸭低头游过池塘；「变成」二字落下，星光一闪，白天鹅展翅弹出。鲸鱼娘在岸边蹦着鼓掌。',
    build: (k) => {
      k.add(disc(320, 0x86d36b)); backdrop(k);
      k.add(disc(7.4, 0xf3e4b8, 0.03)); k.add(disc(6.8, 0x49b6ee, 0.05)); k.add(disc(4.2, 0x6cc8f5, 0.06), -0.8, 0, 0.4);
      many(7, (i) => { const a = i * 0.9 + 0.4; k.add(disc(0.4, 0x4fb85a, 0.08), Math.cos(a) * 4.4, 0, Math.sin(a) * 3.2 - 1); k.add(ball(0.12, 0xff9fc0, true, 0.02), Math.cos(a) * 4.4, 0.16, Math.sin(a) * 3.2 - 1); });
      many(16, (i) => { const x = -6 + i * 0.8; const r = k.add(cyl(0.03, 0.04, 1.2 + hash(i) * 0.8, 0x4f9a4a, 5, 0), x, 0, -5.4 - hash(i) * 0.8); put(r, cyl(0.07, 0.07, 0.3, 0x7a4a2c, 6, 0.02), 0, 1.2 + hash(i) * 0.8, 0); });
      k.add(tree(5.5, 0x6fcf6a, 3), -6.5, 0, -6.5); k.add(tree(4.5, 0x55c060, 5), 6.8, 0, -5.5); k.add(rock(0.7, 0x9a94a8, 2), 4.6, 0.2, 2.6);
      const duck = new THREE.Group(); k.add(duck);
      const db = put(duck, ball(0.34, 0x8f8a80), 0, 0.22, 0); db.scale.set(1.25, 0.8, 0.9);
      put(duck, ball(0.21, 0x9a958c), 0.32, 0.52, 0); put(duck, cone(0.07, 0.2, 0xe9a23c, 6), 0.5, 0.48, 0).rotation.z = -PI / 2;
      const swan = new THREE.Group(); k.add(swan);
      const sb = put(swan, ball(0.55, 0xffffff), 0, 0.3, 0); sb.scale.set(1.35, 0.8, 0.95);
      const neck = new THREE.CatmullRomCurve3([new THREE.Vector3(0.5, 0.4, 0), new THREE.Vector3(0.95, 0.8, 0), new THREE.Vector3(0.7, 1.25, 0), new THREE.Vector3(0.95, 1.5, 0)]);
      swan.add(mesh(new THREE.TubeGeometry(neck, 14, 0.1, 8), toon(0xffffff), 0));
      put(swan, ball(0.17, 0xffffff), 1.0, 1.52, 0); put(swan, cone(0.07, 0.24, 0xff8a3c, 6), 1.15, 1.5, 0).rotation.z = -PI / 2;
      const wings = [-1, 1].map((s) => { const w = put(swan, ball(0.5, 0xf4f8ff, false, 0.035), -0.1, 0.55, s * 0.4); w.scale.set(1.25, 0.7, 0.16); return w; });
      const stars = many(16, () => k.add(sprite('star', 0.6, 0xfff6c0, true)));
      const rings = many(3, () => { const r = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 28).rotateX(-PI / 2), glowMat(0xffffff, 0.6)); k.add(r); return r; });
      const whale = k.actor('whale');
      const A = cam([-2.4, 1.5, 7.4], [-1.7, 0.5, 0], 36), B = cam([1.9, 1.9, 6.8], [1.0, 0.9, 0], 34);
      return ({ u, T, bt }) => {
        const sx = u < 0.5 ? lerp(-3.2, -0.5, seg(u, 0, 0.5)) : -0.5 + (u - 0.5) * 2.4;
        duck.visible = u < 0.5; duck.position.set(sx, 0.06 + Math.sin(T * 3) * 0.03, 0); duck.rotation.z = -0.12 + Math.sin(T * 2) * 0.04;
        const pop = backOut(seg(u, 0.5, 0.63)); swan.visible = u >= 0.5; swan.position.set(sx, 0.08 + Math.sin(T * 2.4) * 0.04, 0); swan.scale.setScalar(Math.max(0.001, pop));
        wings.forEach((w, i) => { w.rotation.x = (i ? 1 : -1) * (0.35 + 0.75 * Math.abs(Math.sin(T * 5)) * seg(u, 0.5, 0.7)); });
        stars.forEach((s, i) => { const r = easeOut(seg(u, 0.47, 0.75)) * 2.6, a = (i / 16) * PI * 2; s.position.set(-0.4 + Math.cos(a) * r, 1 + Math.sin(a) * r * 0.8, 0.3); setOp(s, u > 0.47 ? 1 - seg(u, 0.55, 0.8) : 0); });
        rings.forEach((r, i) => { const ph = (T * 0.6 + i / 3) % 1; r.position.set(sx, 0.09, 0); r.scale.setScalar(0.6 + ph * 2); (r.material as THREE.MeshBasicMaterial).opacity = (1 - ph) * 0.6; });
        if (u < 0.55) whale.front(T).at(2.7, 0, 2.1); else whale.set(bt.idx % 2 ? 'whale_wave' : 'whale_idle').at(2.7, 0, 2.1).lift(Math.sin(bt.phase * PI) * 0.3).sq(beatSq(bt));
        return mixCam(A, B, ease(seg(u, 0.05, 0.6)) * 0.92 + u * 0.08);
      };
    },
  },
  {
    id: 'L05', look: 'night', title: '彼得潘总长不大', cast: ['zai'],
    note: '智谱出演彼得潘：按项目设定不加叶帽和纸翅，只靠掠过月亮的飞行轨迹与星屑表达；钟楼指针倒着转——时间不往前走，所以长不大。',
    build: (k) => {
      k.add(disc(320, 0x1c2a55));
      many(14, (i) => { const x = -26 + i * 4; if (Math.abs(x) < 3) return; const h = 3 + hash(i) * 2.5; const hs = k.add(new THREE.Group(), x, 0, -6 - hash(i + 2) * 6); put(hs, box(3.2, h, 3, [0x5a5f9a, 0x6a5a8f, 0x4f6a9a][i % 3])); put(hs, cone(2.6, 2.2, 0x2f3470, 4), 0, h, 0); put(hs, lantern(0xffd27a, 0.14), 0.6, h * 0.55, 1.6); });
      k.add(box(3.2, 12, 3.2, 0x8a84b8), 0, 0, -7); k.add(cone(2.9, 3.8, 0x3a3f8f, 4), 0, 12, -7);
      const ck = clock(1.25); k.add(ck.g, 0, 9.7, -5.36);
      k.add(new THREE.Mesh(new THREE.SphereGeometry(3.2, 20, 14), basic(0xfff3c4)), 9, 14.5, -34);
      k.add(sprite('glow', 16, 0xfff6cf, true, 0.5), 9, 14.5, -33);
      const zai = k.actor('zai', 1.1);
      const trail = many(12, () => k.add(sprite('star', 0.6, 0xfff2a8, true)));
      const path = (uu: number): [number, number, number] => [lerp(-8.5, 9, uu), 8.4 + Math.sin(uu * PI * 1.5) * 2.2, -3 + Math.sin(uu * PI) * 2];
      const A = cam([-4, 3.2, 14.5], [-1, 8, -4], 44), B = cam([3, 5, 13], [2.5, 9.3, -4], 40);
      return ({ u, T }) => {
        const [x, y, z] = path(u);
        zai.set('zai_side_0').at(x, y, z).tilt(-0.5 + Math.sin(T * 3) * 0.12).noShadow();
        trail.forEach((s, i) => { const uu = u - (i + 1) * 0.02; if (uu < 0) { s.visible = false; return; } const [a, b, c] = path(uu); s.position.set(a - 0.3, b + 0.7 + Math.sin(T * 6 + i) * 0.1, c); s.scale.setScalar(0.65 * (1 - i / 13)); setOp(s, 1 - i / 12); });
        ck.mh.rotation.z = T * 2.6; ck.hh.rotation.z = T * 0.45;
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'L06', look: 'day', title: '杰克他有竖琴和魔法', cast: ['zai'],
    note: '镜头沿豆茎摇升到云上：智谱站在巨叶上拨金竖琴，琴弦逐拍发亮，音符和星屑往上飘。竖琴只在这一句出现。',
    build: (k) => {
      many(28, (i) => k.add(cloud(i * 3, 1.2 + hash(i) * 1.2), -36 + hash(i) * 72, -3.4 + hash(i + 4) * 2.6, -32 + hash(i + 8) * 30));
      const helix = new THREE.CatmullRomCurve3(many(34, (i) => new THREE.Vector3(Math.cos(i * 0.55) * 0.55, i * 0.42 - 5, Math.sin(i * 0.55) * 0.55)));
      k.add(mesh(new THREE.TubeGeometry(helix, 120, 0.42, 8), toon(0x4fb85a), 0));
      const leaves = many(9, (i) => { const l = k.add(ball(1, 0x6fd06a, false, 0.04), Math.cos(i * 2.2) * 1.3, -2 + i * 1.15, Math.sin(i * 2.2) * 1.3); l.scale.set(1.3, 0.1, 0.65); l.rotation.y = -i * 2.2; return l; });
      const pad = k.add(ball(1, 0x7fe07a, false, 0.04), 1.9, 6.0, 0.3); pad.scale.set(2.3, 0.12, 1.2);
      k.add(castle(), -16, 0.5, -44, 0.3, 1.4);
      const harp = new THREE.Group(); k.add(harp, 2.75, 6.12, 0.3);
      put(harp, box(0.1, 1.6, 0.1, 0xffc233, 0.03), 0.42, 0, 0); put(harp, box(0.95, 0.12, 0.12, 0xffc233, 0.03), 0, 0, 0);
      const top = put(harp, box(1.05, 0.1, 0.1, 0xffc233, 0.03), 0, 1.25, 0); top.rotation.z = 0.42;
      const strings = many(6, (i) => { const hgt = 0.95 + i * 0.1; const s = new THREE.Mesh(new THREE.BoxGeometry(0.022, hgt, 0.022).translate(0, hgt / 2, 0), basic(0xfff3b0)); put(harp, s, -0.36 + i * 0.13, 0.12, 0); return s; });
      const zai = k.actor('zai');
      const notes = many(6, () => k.add(sprite('note', 0.46)));
      const stars = many(10, () => k.add(sprite('star', 0.4, 0xfff2a8, true)));
      const A = cam([6.2, 0.6, 11.5], [0, 1.6, 0], 42), B = cam([4.9, 6.9, 7.4], [1.9, 6.95, 0], 36);
      return ({ u, T, bt }) => {
        zai.set('zai_side_0').at(1.65, 6.12, 0.3).sq(beatSq(bt)).tilt(Math.sin(T * 2.4) * 0.04);
        strings.forEach((s, i) => { const hit = bt.idx % 6 === i ? bt.pulse : 0; s.scale.x = 1 + hit * 3.5; s.position.z = Math.sin(T * 50) * 0.02 * hit; });
        notes.forEach((s, i) => { const ph = (T * 0.45 + i / 6) % 1; s.position.set(2.8 + Math.sin(ph * 6 + i) * 0.5 + ph * 1.1, 7.1 + ph * 2.4, 0.3); setOp(s, Math.sin(ph * PI)); });
        stars.forEach((s, i) => { const ph = (T * 0.6 + hash(i)) % 1; s.position.set(2.75 + (hash(i + 3) - 0.5) * 1.6, 6.3 + ph * 2.2, 0.5); setOp(s, Math.sin(ph * PI) * 0.9); });
        leaves.forEach((l, i) => { l.rotation.z = Math.sin(T * 1.5 + i) * 0.06; });
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'L07', look: 'forest', title: '森林里有糖果屋', cast: ['doubao', 'gemini'],
    note: '松林空地里的糖果屋：巧克力屋顶挂奶油、棒棒糖和软糖路。豆包（红斗篷）和 Gemini 结伴走近，镜头推进到门口。',
    build: (k) => {
      k.add(disc(220, 0x4f9a5c));
      many(26, (i) => { const a = -0.3 + (i / 25) * (PI + 0.6), r = 9.5 + hash(i) * 6; k.add(pine(6 + hash(i + 1) * 4, i % 2 ? 0x235c48 : 0x2f7a55), Math.cos(a) * r, 0, -Math.sin(a) * r * 0.8 - 1); });
      k.add(pine(9, 0x1c4a3a), -8.2, 0, 4.2);
      const hs = new THREE.Group(); k.add(hs, 0.6, 0, -2.2);
      put(hs, box(4.2, 2.8, 3.4, 0xffc2d6)); put(hs, mesh(new THREE.ConeGeometry(1, 2.4, 4).rotateY(PI / 4).scale(3.5, 1, 2.9).translate(0, 1.2, 0), toon(0x8a4b2a), 0.05), 0, 2.8, 0);
      many(8, (i) => put(hs, ball(0.3, 0xffffff, false, 0.03), -2.1 + i * 0.6, 2.82, 1.78));
      put(hs, box(0.95, 1.7, 0.12, 0x9a5a2c), 0, 0, 1.72); put(hs, sprite('heart', 0.4), 0, 1.25, 1.85);
      for (const s of [-1, 1]) { put(hs, box(0.8, 0.8, 0.1, 0xfff2a8, 0.03), s * 1.3, 1.2, 1.72); put(hs, sprite('glow', 2.2, 0xffe08a, true, 0.5), s * 1.3, 1.6, 1.9); many(6, (j) => put(hs, cyl(0.14, 0.14, 0.42, j % 2 ? 0xe63946 : 0xffffff, 8, 0.03), s * 2.2, j * 0.42, 1.8)); }
      put(hs, box(0.6, 1.1, 0.6, 0xe9a27a), 1.1, 3.3, 0);
      many(5, (i) => { const lx = [-3.4, -2.6, 3.6, 4.6, -4.4][i], lz = [-0.6, 0.8, -0.2, 1.0, 1.4][i], c = [0xff6b8a, 0x7fe3ff, 0xffd166, 0xb388ff, 0x8dffb0][i]; const lp = k.add(new THREE.Group(), lx, 0, lz); put(lp, cyl(0.05, 0.05, 1.6 + hash(i) * 0.6, 0xffffff, 6, 0.02)); const d = put(lp, cyl(0.55, 0.55, 0.14, c, 16), 0, 1.6 + hash(i) * 0.6, 0); d.rotation.x = PI / 2; const d2 = put(lp, cyl(0.3, 0.3, 0.16, 0xffffff, 12, 0), 0, 1.6 + hash(i) * 0.6, 0); d2.rotation.x = PI / 2; });
      many(9, (i) => { const g = k.add(mesh(new THREE.SphereGeometry(0.24, 10, 6, 0, PI * 2, 0, PI / 2), toon([0xff6b8a, 0xffd166, 0x7fe3ff, 0x8dffb0][i % 4]), 0.03), -6.6 + i * 0.85, 0, 2.2 + (i % 2) * 0.5); return g; });
      const doubao = k.actor('doubao').wear('hood'), gem = k.actor('gemini').wear('bow');
      const puffs = many(3, () => k.add(sprite('heart', 0.4)));
      const A = cam([-3.6, 2.0, 12.4], [-1, 1.5, 0], 40), B = cam([-1.3, 1.7, 7.8], [-0.5, 1.5, 0], 34);
      return ({ u, T, bt }) => {
        const go = seg(u, 0, 0.8), x = lerp(-6.4, -2.3, go);
        if (go < 1) { doubao.walk(T).at(x, 0, 1.5); gem.walk(T).at(x - 1.5, 0, 2.3); }
        else { doubao.front(T).at(x, 0, 1.5).lift(Math.sin(bt.phase * PI) * 0.25); gem.front(T).at(x - 1.5, 0, 2.3).lift(Math.sin(((bt.phase + 0.5) % 1) * PI) * 0.25); }
        puffs.forEach((s, i) => { const ph = (T * 0.4 + i / 3) % 1; s.position.set(1.7 + Math.sin(ph * 5) * 0.2, 4.6 + ph * 2.2, -2.2); s.scale.setScalar(0.3 + ph * 0.4); setOp(s, 1 - ph); });
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'L08', look: 'night', title: '灰姑娘丢了心爱的玻璃鞋', cast: ['kimi'],
    note: '午夜十二点，Kimi（灰姑娘，银冠）从宫殿长阶跑下出画；镜头不跟人，反而推向台阶上那只独自发光的玻璃鞋。',
    build: (k) => {
      k.add(disc(320, 0x2a3566));
      many(10, (i) => { k.add(box(7.4, 0.32, 0.95, 0xd8d2ea), 0, i * 0.32, -i * 0.9); k.add(box(2.3, 0.34, 0.97, 0xb5303f, 0), 0, i * 0.32, -i * 0.9); });
      k.add(box(16, 9, 0.8, 0xcfc6e6), 0, 2.9, -9.9); k.add(box(2.6, 4.4, 0.3, 0x3a2f55), 0, 3.2, -9.45);
      for (const s of [-1, 1]) { k.add(cyl(0.45, 0.5, 7, 0xe6e0f5, 12), s * 3.2, 3.2, -9.2); k.add(lantern(0xffd27a, 0.2), s * 3.2, 5.6, -8.6); k.add(box(0.5, 0.9, 9.4, 0xbdb6d8), s * 3.95, 0, -4.2).rotation.x = -0.34; }
      const ck = clock(1.15); k.add(ck.g, 0, 9.3, -9.4);
      const shoe = new THREE.Group(); k.add(shoe, 0.55, 1.29, -2.75);
      const sole = put(shoe, new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), glowMat(0xc8f4ff, 0.85)), 0, 0.09, 0); sole.scale.set(1.5, 0.5, 0.6);
      put(shoe, new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 6), glowMat(0xe8fbff, 0.9)), -0.2, 0.1, 0).rotation.x = PI;
      put(shoe, new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), glowMat(0xffffff, 0.9)), 0.2, 0.12, 0);
      const halo = put(shoe, sprite('glow', 1.8, 0x9fe8ff, true, 0.7), 0, 0.2, 0);
      const tw = many(6, () => k.add(sprite('star', 0.4, 0xffffff, true)));
      k.add(new THREE.Mesh(new THREE.SphereGeometry(2.4, 18, 12), basic(0xfff3c4)), -14, 16, -40);
      const kimi = k.actor('kimi').wear('tiara');
      const A = cam([3.6, 3.0, 8.8], [0.6, 2.2, -3.6], 40), B = cam([2.0, 2.15, 0.5], [0.55, 1.4, -2.75], 30);
      return ({ u, T, bt }) => {
        const s = seg(u, 0, 0.6), st = lerp(8.6, -1.6, s);
        const off = Math.max(0, u - 0.6) * 14;
        kimi.walk(T, 1.5).at(lerp(-0.5, 3.4, s) + off, Math.max(0, Math.ceil(st) * 0.32 + 0.32) * (st > -0.4 ? 1 : 0), -st * 0.9 + (st < 0 ? 1.2 : 0)).tilt(-0.09).alpha(off > 6 ? 0 : 1);
        const drop = st < 3; shoe.visible = drop; shoe.rotation.y = 0.5 + Math.sin(T * 1.2) * 0.08;
        halo.scale.setScalar(1.6 + 0.5 * bt.pulse);
        tw.forEach((x, i) => { const ph = (T * 0.9 + i * 0.37) % 1; x.position.set(0.55 + Math.cos(i * 1.1) * 0.5, 1.5 + Math.sin(i * 2.3) * 0.3 + ph * 0.3, -2.7 + Math.sin(i * 1.7) * 0.2); x.scale.setScalar(0.15 + 0.35 * Math.sin(ph * PI)); setOp(x, drop ? Math.sin(ph * PI) : 0); });
        ck.g.scale.setScalar(1 + 0.06 * bt.pulse); ck.mh.rotation.z = Math.sin(T * 30) * 0.02 * bt.pulse; ck.hh.rotation.z = 0;
        return mixCam(A, B, ease(seg(u, 0.4, 0.95)) * 0.9 + u * 0.1);
      };
    },
  },
  {
    id: 'L09', look: 'day', title: '只有睿智的河水知道', cast: ['whale', 'kimi'],
    note: '机位压到水面：七彩河水自己泛起一圈圈光纹，像在说悄悄话。鲸鱼娘从船上侧身去听，岸边的 Kimi（河水智者）指向河心。',
    build: (k) => {
      k.add(disc(320, 0x7fcf66)); backdrop(k);
      const rv = straightRiver(120, 7.5, 1, -1); k.add(box(120, 0.05, 9.8, 0xf3e4b8, 0), 0, 0, -1); k.add(rv.mesh);
      many(14, (i) => k.add(i % 3 ? tree(4 + hash(i) * 2, 0x55c060, i) : pine(6), -28 + i * 4.2, 0, -10.5 - hash(i) * 5));
      many(14, (i) => k.add(cyl(0.03, 0.04, 1 + hash(i) * 0.7, 0x4f9a4a, 5, 0), -9 + i * 1.5, 0, -5.9 - hash(i + 1) * 0.5));
      k.add(rock(0.8, 0x9a94a8, 1), 5.4, 0.15, -6.3); k.add(rock(0.4, 0x8a8498, 3), 7.4, 0.1, 3.4); k.add(lantern(0xffe08a, 0.12), 6.2, 1.5, -6.2);
      const boat = k.add(paperBoat()), whale = k.actor('whale'), kimi = k.actor('kimi').wear('tiara');
      const rings = many(4, () => { const r = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.0, 32).rotateX(-PI / 2), glowMat(0xffffff, 0.7)); k.add(r); return r; });
      const glints = many(14, () => k.add(sprite('star', 0.4, 0xffffff, true)));
      const A = cam([-7.6, 0.9, 6.8], [-1, 0.75, 0], 40), B = cam([-2.6, 1.5, 6.4], [0.8, 0.85, -0.5], 34);
      return ({ u, T, bt }) => {
        const bx = lerp(-3, 1.4, u);
        sail(boat, whale, bx, -0.6, 0, T);
        whale.front(T).tilt(-0.28 * ease(seg(u, 0.25, 0.6)));
        kimi.front(T).at(5.4, 0.85, -6.3).sq(beatSq(bt, 0.04));
        rings.forEach((r, i) => { const ph = (T / (bt.len * 4) + i / 4) % 1; r.position.set(bx + 0.4, 0.11, -0.6); r.scale.setScalar(0.5 + ph * 4.5); (r.material as THREE.MeshBasicMaterial).opacity = (1 - ph) * 0.75; });
        glints.forEach((s, i) => { const ph = (T * 0.7 + hash(i)) % 1; s.position.set(-8 + hash(i + 2) * 16, 0.25 + ph * 0.5, -4 + hash(i + 6) * 6); s.scale.setScalar(0.15 + 0.4 * Math.sin(ph * PI)); setOp(s, Math.sin(ph * PI)); });
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'L10', look: 'day', title: '白雪是因为贪玩跑出了城堡', cast: ['claude', 'whale'],
    note: '真相是贪玩：Claude 大小姐在城堡花园一蹦一蹦追蝴蝶，每一跳都踩在拍子上；鲸鱼娘躲在树篱后偷看。',
    build: (k) => {
      k.add(disc(320, 0x86d36b)); backdrop(k);
      k.add(castle(), 0, 0, -16);
      k.add(box(3.4, 0.05, 20, 0xf0dfb8, 0), 0, 0, -4);
      many(8, (i) => { if (i === 3 || i === 4) return; k.add(box(2.2, 1.0, 1.0, 0x3f9f5a), -7.7 + i * 2.2, 0, -1.4); });
      many(26, (i) => k.add(flower([0xff7aa8, 0xffd166, 0xffffff, 0xb388ff, 0xff9f43][i % 5], 0.35 + hash(i) * 0.3), -7 + hash(i) * 14, 0, 0.2 + hash(i + 5) * 3.6));
      k.add(tree(4.6, 0xffb3cf, 2), -6.4, 0, -4); k.add(tree(5.2, 0x55c060, 4), 6.6, 0, -4.4);
      const claude = k.actor('claude').wear('crown'), whale = k.actor('whale');
      const bf = many(4, () => k.add(sprite('butterfly', 0.42)));
      const notes = many(3, () => k.add(sprite('note', 0.4)));
      return ({ u, T, bt }) => {
        const x = lerp(-2.7, 2.6, u), z = 1.2 + Math.sin(u * PI * 3) * 0.7;
        claude.walk(T).at(x, 0, z).lift(Math.sin(bt.phase * PI) * 0.42).sq(bt.phase < 0.12 ? 0.08 : 0);
        bf.forEach((s, i) => { s.position.set(x + 1.2 + i * 0.5 + Math.sin(T * 3 + i) * 0.3, 1.5 + i * 0.2 + Math.sin(T * 4 + i * 2) * 0.3, z + Math.cos(T * 2 + i) * 0.4); s.scale.x = 0.42 * (0.35 + 0.65 * Math.abs(Math.sin(T * 14 + i))); });
        notes.forEach((s, i) => { const ph = (T * 0.6 + i / 3) % 1; s.position.set(x - 0.4 + Math.sin(ph * 5 + i) * 0.3, 2 + ph * 1.2, z); setOp(s, Math.sin(ph * PI)); });
        whale.front(T).at(-5.4, 0, -2.0).lift(-0.35 + 0.25 * Math.sin(T * 1.6));
        return cam([x * 0.6 - 0.7, 1.5, 7.6 - u * 1.0], [x * 0.8 + 0.3, 1.15, 0], 35);
      };
    },
  },
  {
    id: 'L11', look: 'night', title: '小红帽有件抑制自己', cast: ['doubao'],
    note: '反转：月光下豆包裹紧红斗篷发抖，她身后石壁上的影子却是一头越涨越大的狼——要压住的是她自己。',
    build: (k) => {
      k.add(disc(220, 0x1f3a40));
      many(22, (i) => k.add(pine(6 + hash(i) * 4, 0x1c4a3a), -16 + i * 1.5 + hash(i + 2), 0, -6 - hash(i + 4) * 8));
      k.add(new THREE.Mesh(new THREE.BoxGeometry(14, 6.6, 0.7).translate(0, 3.3, 0), basic(0x8c9cd6)), 0.8, 0, -2.5); k.add(rock(1.2, 0x4a5a7a, 4), -6.4, 0.5, -2.2); k.add(rock(1.0, 0x4a5a7a, 7), 8, 0.4, -2.2);
      k.add(new THREE.Mesh(new THREE.SphereGeometry(2.4, 18, 12), basic(0xfff3c4)), -10, 13, -34); k.add(sprite('glow', 13, 0xfff6cf, true, 0.45), -10, 13, -33);
      const wolf = k.add(sprite('wolf', 4, 0xffffff, false, 0.8), 1.7, 2.4, -2.05);
      const aura = k.add(sprite('glow', 2.6, 0xff2d4a, true, 0.4), -1.1, 0.9, -0.3);
      const doubao = k.actor('doubao').wear('hood');
      const A = cam([1.0, 1.4, 9.0], [0.4, 1.85, 0], 40), B = cam([0.5, 1.4, 7.8], [0.4, 1.75, 0], 40);
      return ({ u, T, bt }) => {
        doubao.front(T).at(-1.1 + Math.sin(T * 38) * 0.012, 0, 0).sq(beatSq(bt, 0.05));
        const s = 2.6 + 1.6 * ease(u) + 0.25 * bt.pulse; wolf.scale.set(s, s, 1); wolf.position.set(1.9, s * 0.5 - 0.1, -2.05); setOp(wolf, 0.6 + 0.35 * u);
        aura.scale.setScalar(2.2 + bt.pulse * 0.9); setOp(aura, 0.25 + 0.3 * bt.pulse);
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'L12', look: 'night', title: '变成狼的大红袍', cast: ['doubao'], fx: { flash: [0.6] },
    note: '大红袍旋成三道红环把她裹住，狼影被一点点压回墙里；一声闪白之后，只剩一个蹦起来松了口气的小红帽。',
    build: (k) => {
      k.add(disc(220, 0x1f3a40));
      many(22, (i) => k.add(pine(6 + hash(i) * 4, 0x1c4a3a), -16 + i * 1.5 + hash(i + 2), 0, -6 - hash(i + 4) * 8));
      k.add(new THREE.Mesh(new THREE.BoxGeometry(14, 6.6, 0.7).translate(0, 3.3, 0), basic(0x8c9cd6)), 0.8, 0, -2.5);
      k.add(new THREE.Mesh(new THREE.SphereGeometry(2.4, 18, 12), basic(0xfff3c4)), -10, 13, -34); k.add(sprite('glow', 13, 0xfff6cf, true, 0.45), -10, 13, -33);
      const wolf = k.add(sprite('wolf', 4, 0xffffff, false, 0.8), 2.2, 2.0, -2.05);
      const rings = many(3, (i) => { const r = k.add(new THREE.Mesh(new THREE.TorusGeometry(1.0 + i * 0.28, 0.07, 6, 40, 4.6).rotateX(PI / 2), basic(i === 1 ? 0xff5c6c : 0xe63946)), -0.4, 0.45 + i * 0.6, 0); return r; });
      const bits = many(18, () => k.add(sprite('petal', 0.3, 0xff3348)));
      const stars = many(12, () => k.add(sprite('star', 0.5, 0xfff2a8, true)));
      const doubao = k.actor('doubao').wear('hood');
      const A = cam([3.2, 1.6, 7.0], [0.2, 1.6, 0], 40), B = cam([-2.2, 2.0, 6.6], [-0.1, 1.4, 0], 38);
      return ({ u, T, bt, f }) => {
        const spin = u < 0.6;
        doubao.front(T).at(-0.4, 0, 0).flip(spin && Math.floor(f / 4) % 2 === 1).lift(spin ? 0 : Math.sin(bt.phase * PI) * 0.4).sq(spin ? 0 : beatSq(bt));
        const w = 1 - ease(seg(u, 0.1, 0.58)); const s = 1.4 + 3.3 * w; wolf.scale.set(s, s, 1); wolf.position.y = s * 0.5 - 0.1; setOp(wolf, 0.9 * w);
        rings.forEach((r, i) => { r.rotation.y = T * (5 + i * 1.3) * (i % 2 ? -1 : 1); r.scale.setScalar(Math.max(0.001, backOut(seg(u, 0, 0.2)) * (1 - 0.9 * ease(seg(u, 0.62, 0.85))))); });
        bits.forEach((b, i) => { const ph = (T * 0.8 + hash(i)) % 1, a = ph * 9 + i; b.position.set(-0.4 + Math.cos(a) * (0.9 + ph), 0.2 + ph * 2.8, Math.sin(a) * (0.9 + ph)); setOp(b, spin ? Math.sin(ph * PI) : 0); });
        stars.forEach((x, i) => { const r = easeOut(seg(u, 0.6, 0.85)) * 2.4, a = (i / 12) * PI * 2; x.position.set(-0.4 + Math.cos(a) * r, 1.1 + Math.sin(a) * r * 0.8, 0.3); setOp(x, u > 0.6 ? 1 - seg(u, 0.7, 0.95) : 0); });
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'L13a', look: 'day', title: '总有一条蜿蜒在童话镇里…', cast: ['whale'], fx: { flash: [0] },
    note: '副歌起：闪白后切大航拍，整条七彩河在童话镇里蜿蜒，鲸鱼娘的纸船是河上唯一的小白点。',
    build: (k) => {
      const town = k.shared('town', buildTown);
      const boat = k.add(paperBoat()), whale = k.actor('whale');
      const A = cam([-62, 38, 54], [-30, 0, -2], 42), B = cam([-20, 25, 42], [6, 0, -6], 40);
      return ({ u, T }) => {
        useTown(k, town, 1, false);
        const { p, ang } = town.at(lerp(0.36, 0.42, u));
        sail(boat, whale, p.x, p.z, ang, T); whale.set('whale_wave');
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'L13b', look: 'day', title: '…七彩的河', cast: ['whale'],
    note: '「七彩的河」落在后半句：机位砸到水面，贴着彩带般的河水追船，从拱桥下钻过去。',
    build: (k) => {
      const town = k.shared('town', buildTown);
      const boat = k.add(paperBoat()), whale = k.actor('whale');
      const spray = many(10, () => k.add(sprite('drop', 0.3)));
      return ({ u, T, bt }) => {
        useTown(k, town, 1, false);
        const { p, ang, dx, dz } = town.at(lerp(0.455, 0.56, u));
        sail(boat, whale, p.x, p.z, ang, T, 0.12 + Math.sin(bt.phase * PI) * 0.12);
        whale.set(bt.idx % 2 ? 'whale_wave' : 'whale_idle').sq(beatSq(bt));
        spray.forEach((s, i) => { const ph = (T * 2 + i / 10) % 1; s.position.set(p.x - dx * (1.2 + ph * 2) + (hash(i) - 0.5) * 1.4, 0.2 + Math.sin(ph * PI) * 0.8, p.z - dz * (1.2 + ph * 2) + (hash(i + 3) - 0.5) * 1.4); setOp(s, 1 - ph); });
        return cam([p.x - dx * 8 - dz * 1.4, 1.7, p.z - dz * 8 + dx * 1.4], [p.x + dx * 8, 1.5, p.z + dz * 8], 44, Math.sin(u * PI) * 0.05);
      };
    },
  },
  {
    id: 'L14', look: 'magic', title: '沾染魔法的乖张气息', cast: ['qwen', 'gpt'],
    note: '天色转紫。千问（疯帽子）在岸边挥手施法，河里升起磷火；房子和茶杯倒着飘在半空，GPT 龙娘在头顶兜圈拖出星屑——「乖张」靠倒置和倾斜机位来演。',
    build: (k) => {
      k.add(disc(320, 0x5a4a9a));
      const rv = straightRiver(140, 7, 1, -4.5); k.add(box(140, 0.05, 9, 0x8f7fd0, 0), 0, 0, -4.5); k.add(rv.mesh);
      many(7, (i) => k.add(mushroom(1.2 + hash(i) * 2.2, [0x4fd0ff, 0xff7ad9, 0x8dffb0][i % 3], true), -9 + i * 3.1 + hash(i), 0, -9.5 - hash(i + 3) * 3));
      k.add(mushroom(1.1, 0xff7ad9, true), 2.6, 0, 1.6); k.add(mushroom(0.7, 0x4fd0ff, true), 3.5, 0, 2.3);
      many(16, (i) => k.add(pine(6 + hash(i) * 5, 0x3a2f7a), -30 + i * 4, 0, -16 - hash(i) * 8));
      const floats = many(3, (i) => { const g = new THREE.Group(); k.add(g, -5 + i * 4.6, 5.2 + i * 0.7, -6 - i); const h = put(g, new THREE.Group()); put(h, box(1.8, 1.5, 1.6, [0xf2d6b3, 0xcfe0ea, 0xf2b8c6][i])); put(h, cone(1.6, 1.2, [0xb5473c, 0x3f6fb5, 0x8a4fa3][i], 4), 0, 1.5, 0); return g; });
      const cups = many(4, (i) => k.add(cyl(0.3, 0.2, 0.3, 0xffffff, 10), -3 + i * 2.4, 3.2 + hash(i) * 2, -2.5 - hash(i + 2) * 2));
      const qwen = k.actor('qwen').wear('tophat'), gpt = k.actor('gpt', 1.3);
      const wand = k.add(sprite('star', 0.7, 0xf3b6ff, true));
      const wisps = many(26, (i) => k.add(sprite('glow', 0.55, [0xb388ff, 0x7fe3ff, 0x8dffb0][i % 3], true)));
      const trail = many(8, () => k.add(sprite('star', 0.5, 0xf3b6ff, true)));
      const gp = (uu: number): [number, number, number, boolean] => { const a = uu * PI * 2.2; return [2.6 + Math.cos(a) * 3.4, 3.5 + Math.sin(a) * 1.2, -3, Math.sin(a) > 0]; };
      const A = cam([2.9, 1.2, 8.4], [-0.3, 1.4, -2], 40, 0.07), B = cam([-0.7, 1.3, 7.4], [0.5, 1.5, -2], 38, -0.05);
      return ({ u, T, bt }) => {
        qwen.front(T).at(-1.7, 0, 1).sq(beatSq(bt)).tilt(Math.sin(T * 2.2) * 0.06).lift(bt.down ? bt.pulse * 0.15 : 0);
        wand.position.set(-1.05, 1.25 + Math.sin(T * 5) * 0.1, 1.1); wand.scale.setScalar(0.5 + 0.5 * bt.pulse);
        const [gx, gy, gz, fl] = gp(u); gpt.walk(T).at(gx, gy, gz).flip(fl).noShadow().tilt(fl ? 0.2 : -0.2);
        trail.forEach((s, i) => { const [a, b, c] = gp(Math.max(0, u - (i + 1) * 0.022)); s.position.set(a, b + 0.8, c); s.scale.setScalar(0.6 * (1 - i / 9)); setOp(s, 1 - i / 8); });
        wisps.forEach((s, i) => { const ph = (T * 0.25 + hash(i)) % 1, a = ph * 9 + i, r = 0.5 + ph * 1.4; s.position.set(-6 + (i / 26) * 13 + Math.cos(a) * r * 0.5, 0.2 + ph * 5.5, -4.5 + Math.sin(a) * r * 0.5); setOp(s, Math.sin(ph * PI) * 0.85); });
        floats.forEach((g, i) => { g.rotation.z = PI + Math.sin(T * 0.8 + i) * 0.16; g.rotation.y = T * 0.3 + i; g.position.y = 5.4 + i * 0.7 + Math.sin(T * 1.1 + i * 2) * 0.35; });
        cups.forEach((c, i) => { c.rotation.z = T * (0.8 + i * 0.3); c.position.y = 3.2 + hash(i) * 2 + Math.sin(T * 1.3 + i) * 0.3; });
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'L15', look: 'golden', title: '却又在爱里曲折', cast: ['claude', 'whale'],
    note: '俯拍：河水在这里拐成一颗心。心形河湾中间的花树下，Claude 大小姐和鲸鱼娘面对面轮流蹦，纸船绕着爱心转圈。',
    build: (k) => {
      k.add(disc(320, 0x8fd672)); backdrop(k, 0x9ac27a, 0xc9a27a);
      const hp = many(40, (i) => { const t = (i / 40) * PI * 2, sc = 0.62; return new THREE.Vector3(16 * Math.pow(Math.sin(t), 3) * sc, 0, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * sc + 1.5); });
      const heart = new THREE.CatmullRomCurve3(hp, true);
      const wm = straightRiver(1, 1, 1).mat;
      const rb = (w: number, mat: THREE.Material, y: number) => { const pos: number[] = [], uv: number[] = [], idx: number[] = []; let d = 0; let prev: THREE.Vector3 | null = null; const N = 160; for (let i = 0; i <= N; i++) { const uu = (i % N) / N, p = heart.getPointAt(uu), tg = heart.getTangentAt(uu); const n = new THREE.Vector3(-tg.z, 0, tg.x).normalize().multiplyScalar(w / 2); if (prev) d += p.distanceTo(prev); prev = p; pos.push(p.x + n.x, y, p.z + n.z, p.x - n.x, y, p.z - n.z); uv.push(0, d, 1, d); if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return new THREE.Mesh(g, mat); };
      k.add(rb(3.6, toon(0xf3e4b8), 0.03)); k.add(rb(2.7, wm, 0.08));
      k.add(cyl(0.3, 0.45, 2.4, 0x7a4a2c, 7), 0, 0, -1.2);
      many(7, (i) => k.add(ball(1.0 + hash(i) * 0.6, i % 2 ? 0xffb3cf : 0xff9fc0, true), Math.cos(i * 0.9) * 1.3, 3.0 + hash(i + 2) * 0.9, -1.2 + Math.sin(i * 0.9) * 1.0));
      many(18, (i) => { const a = hash(i) * PI * 2, r = 14 + hash(i + 1) * 12; k.add(tree(3.5 + hash(i + 2) * 2, 0x6fcf6a, i), Math.cos(a) * r, 0, Math.sin(a) * r + 1); });
      const boats = many(3, () => k.add(paperBoat(), 0, 0, 0, 0, 0.55));
      const claude = k.actor('claude').wear('crown'), whale = k.actor('whale');
      const hearts = many(7, () => k.add(sprite('heart', 0.5)));
      const petals = many(16, () => k.add(sprite('petal', 0.3)));
      const A = cam([0, 20, 21], [0, 0, -1], 40), B = cam([0, 9.5, 14], [0, 0.8, -0.6], 36);
      return ({ u, T, bt }) => {
        boats.forEach((b, i) => { const s = (u * 0.22 + i / 3) % 1, p = heart.getPointAt(s), tg = heart.getTangentAt(s); b.position.set(p.x, 0.1 + Math.sin(T * 2 + i) * 0.03, p.z); b.rotation.y = Math.atan2(-tg.z, tg.x); });
        claude.set('claude_side_0').at(-1.0, 0, 1.4).lift(bt.idx % 2 ? 0 : Math.sin(bt.phase * PI) * 0.35);
        whale.set('whale_wave').at(1.0, 0, 1.4).lift(bt.idx % 2 ? Math.sin(bt.phase * PI) * 0.35 : 0);
        hearts.forEach((s, i) => { const ph = (T * 0.4 + i / 7) % 1; s.position.set(Math.sin(ph * 6 + i) * 0.8, 2 + ph * 3.2, 1.4); s.scale.setScalar(0.3 + 0.3 * Math.sin(ph * PI)); setOp(s, Math.sin(ph * PI)); });
        petals.forEach((s, i) => { const ph = (T * 0.22 + hash(i)) % 1; s.position.set(-2.5 + hash(i + 2) * 5 + Math.sin(ph * 7 + i) * 0.5, 4 - ph * 4, -1.5 + hash(i + 5) * 3.5); setOp(s, Math.sin(ph * PI)); });
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'L16', look: 'day', title: '川流不息扬起水花', cast: ['whale'],
    note: '急流段：纸船每一拍弹起一次，水珠按抛物线炸向镜头；水车在后景不停地转。相机在重拍上做逐帧反向的冲击抖动。',
    build: (k) => {
      k.add(disc(320, 0x86d36b)); backdrop(k);
      const rv = straightRiver(140, 8.5, 0.55); k.add(box(140, 0.05, 10.6, 0xf3e4b8, 0), 0, 0, 0); k.add(rv.mesh);
      many(6, (i) => k.add(rock(0.45 + hash(i) * 0.4, 0x8f8a9c, i), -9 + i * 3.6, 0.1, -2.2 + hash(i + 2) * 4.2));
      const mill = k.add(new THREE.Group(), 3.4, 0, -7.6); put(mill, box(4, 3.6, 3.4, 0xf2d6b3)); put(mill, cone(3.4, 2.6, 0xb5473c, 4), 0, 3.6, 0);
      const wh = k.add(wheel(2.0), 3.4, 1.7, -5.3);
      many(12, (i) => k.add(i % 2 ? tree(4 + hash(i) * 2, 0x55c060, i) : pine(6), -26 + i * 4.6, 0, -10 - hash(i) * 5));
      many(10, (i) => k.add(flower([0xff7aa8, 0xffd166, 0xffffff][i % 3], 0.4), -9 + i * 2, 0, 5.6 + hash(i) * 0.6));
      const boat = k.add(paperBoat()), whale = k.actor('whale');
      const drops = many(36, (i) => k.add(sprite('drop', 0.16 + hash(i) * 0.22)));
      return ({ u, T, bt, f }) => {
        const bx = lerp(-7, 7, u), hop = Math.sin(bt.phase * PI) * 0.4;
        sail(boat, whale, bx, 0, 0, T, 0.12 + hop); boat.rotation.z = Math.sin(bt.phase * PI * 2) * 0.16;
        whale.set('whale_wave').sq(beatSq(bt, 0.09));
        const tau = bt.phase * bt.len;
        drops.forEach((s, i) => { const a = hash(i) * PI * 2, vx = Math.cos(a) * 2.6 * (0.4 + hash(i + 1)), vy = 3 + hash(i + 2) * 3.6, vz = Math.sin(a) * 1.4 + 1.3; const y = 0.2 + vy * tau - 4.9 * tau * tau * 2.2; s.position.set(bx - 0.3 + vx * tau, y, vz * tau); s.visible = y > 0.05; });
        wh.rotation.z = -T * 1.7;
        const kick = (bt.down ? 0.1 : 0.035) * bt.pulse * (f % 2 ? 1 : -1);
        return cam([bx - 2.5, 1.0 + kick, 6.6], [bx + 1.4, 1.0 - kick * 0.5, 0], 38);
      };
    },
  },
  {
    id: 'L17', look: 'dusk', title: '又卷入一帘时光入水', cast: ['whale'],
    note: '暮色里的瀑布像一挂帘子，怀表和书页跟着水一起往下掉、指针乱转——时间被卷进了河里。纸船驶向水帘。',
    build: (k) => {
      k.add(disc(320, 0x4a5aa0)); k.add(disc(26, 0x4f8fe0, 0.05));
      const wm = straightRiver(1, 1, 0.75).mat;
      const fg = new THREE.PlaneGeometry(13, 18); const uvA = fg.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uvA.count; i++) uvA.setY(i, uvA.getY(i) * 18);
      const fall = new THREE.Mesh(fg, wm); fall.rotation.z = PI; k.add(fall, 0, 9, -3.2);
      for (const s of [-1, 1]) many(6, (i) => k.add(rock(3.4 - i * 0.2, i % 2 ? 0x6a5f9a : 0x7a6fae, i + (s > 0 ? 9 : 0)), s * (8.6 + hash(i) * 1.6), 1 + i * 2.9, -3.6 - hash(i + 3)));
      k.add(box(22, 1.2, 4, 0x6a5f9a), 0, 17.6, -4.6);
      const clocks = many(7, (i) => { const c = clock(0.5 + hash(i) * 0.45); k.add(c.g); return c; });
      const pages = many(7, () => k.add(new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.95), basic(0xfff6e0))));
      const mist = many(9, () => k.add(sprite('smoke', 3, 0xffffff, false, 0.5)));
      const boat = k.add(paperBoat()), whale = k.actor('whale');
      const A = cam([-1.6, 1.8, 14.5], [0, 2.9, 0], 42), B = cam([0.9, 2.4, 10.4], [0.4, 2.9, -2], 40);
      return ({ u, T, bt }) => {
        clocks.forEach((c, i) => { const y = 17 - ((T * (1.9 + hash(i) * 1.2) + i * 2.4) % 17); c.g.position.set((hash(i + 3) - 0.5) * 10, y, -2.7 + hash(i) * 0.5); c.g.rotation.z = T * (0.8 + hash(i + 1)) * (i % 2 ? 1 : -1); c.mh.rotation.z = -T * 7; c.hh.rotation.z = -T * 1.3; });
        pages.forEach((p, i) => { const y = 17 - ((T * 1.5 + i * 2.7) % 17); p.position.set((hash(i + 13) - 0.5) * 11, y, -2.4); p.rotation.set(T * 1.3 + i, T * 0.9 + i * 2, i); });
        mist.forEach((s, i) => { s.position.set(-6 + i * 1.5, 0.8 + Math.sin(T * 0.8 + i) * 0.4, -2.2 + hash(i) * 1.2); s.scale.setScalar(2.6 + Math.sin(T + i) * 0.6); });
        sail(boat, whale, lerp(-6.2, -2.4, u), lerp(3.4, 0.4, u), 0.45, T);
        whale.front(T).sq(beatSq(bt));
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'L18', look: 'golden', title: '让所有很久很久以前', cast: ['whale', 'gemini'],
    note: '摊开的大书里，一页页写着「很久很久以前」的书页盘旋着飞上天；鲸鱼娘抬手一指，镜头跟着书页仰起来。',
    build: (k) => {
      k.add(disc(320, 0x8fd672)); backdrop(k, 0x9ac27a, 0xc9a27a);
      const rv = straightRiver(140, 7, 1, -9); k.add(box(140, 0.05, 9, 0xf3e4b8, 0), 0, 0, -9); k.add(rv.mesh);
      const boats = many(5, (i) => k.add(paperBoat(), 0, 0.1, -9 + (i % 2) * 1.6 - 0.8, 0, 0.8));
      const b = book(); k.add(b.g, 0, 0, 1, 0, 0.8); b.cover.rotation.z = 3.0; (b.glow.material as THREE.MeshBasicMaterial).opacity = 0.9;
      const pt = canvasTex(128, 180, (c) => { c.fillStyle = '#fff6e0'; c.fillRect(0, 0, 128, 180); c.strokeStyle = '#c9a27a'; c.lineWidth = 3; c.strokeRect(6, 6, 116, 168); c.fillStyle = '#7a3a2c'; c.font = '900 22px "Kaiti SC","STKaiti","KaiTi","Noto Serif CJK SC",serif'; c.textAlign = 'center'; '很久很久以前'.split('').forEach((ch, i) => c.fillText(ch, 64, 36 + i * 25)); });
      const pm = new THREE.MeshBasicMaterial({ map: pt, side: THREE.DoubleSide });
      const pages = many(22, () => k.add(new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.4), pm)));
      const stars = many(12, () => k.add(sprite('star', 0.5, 0xfff2a8, true)));
      many(10, (i) => k.add(tree(4 + hash(i) * 2, 0x6fcf6a, i), -24 + i * 5.2, 0, -15 - hash(i) * 4));
      const whale = k.actor('whale'), gem = k.actor('gemini').wear('bow');
      const A = cam([0, 2.0, 9.8], [0, 1.5, 0.5], 40), B = cam([0, 3.2, 12.5], [0, 2.3, -1], 42);
      return ({ u, T, bt }) => {
        boats.forEach((bo, i) => { bo.position.x = -16 + ((T * 1.3 + i * 6.5) % 32); bo.position.y = 0.1 + Math.sin(T * 2 + i) * 0.04; });
        pages.forEach((p, i) => { const ph = (T * 0.22 + i / 22) % 1, a = ph * 7 + i * 1.3, r = 0.5 + ph * 4.2; p.position.set(Math.cos(a) * r, 1.2 + ph * 9.5, 1 + Math.sin(a) * r * 0.6); p.rotation.set(Math.sin(a) * 0.5, a, Math.sin(T * 2 + i) * 0.4); p.scale.setScalar(0.5 + ph * 0.8); });
        stars.forEach((s, i) => { const ph = (T * 0.5 + hash(i)) % 1; s.position.set((hash(i + 2) - 0.5) * 4, 0.9 + ph * 3.5, 1 + (hash(i + 4) - 0.5) * 4); setOp(s, Math.sin(ph * PI)); });
        whale.set('whale_point').flip().at(3.2, 0, 3.2).sq(beatSq(bt)).lift(bt.down ? bt.pulse * 0.12 : 0);
        gem.front(T).at(5.1, 0, 2.6).sq(beatSq(bt, 0.05));
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'L19a', look: 'dusk', title: '都走到幸福结局的时刻', cast: ['doubao', 'gemini', 'claude', 'whale', 'qwen', 'kimi', 'zai', 'gpt'],
    note: '对位原海报构图：晚霞、七彩河、王城。七位角色排成一列沿河岸「走到」结局，GPT 龙娘坐在塔尖上。步速按步幅匹配，不打滑。',
    build: (k) => {
      const town = k.shared('town', buildTown);
      const cast = FINALE.map((c) => { const a = k.actor(c.id); if (c.wear) a.wear(c.wear); return a; });
      const gpt = k.actor('gpt', 3.2);
      const fw = new Fireworks(k.root, 4, 22, 7);
      return ({ u, T, bt }) => {
        useTown(k, town, 1, true, 0xffd6cc);
        const base = lerp(21.5, 27, u);
        cast.forEach((a, i) => a.walk(T + i * 0.2).at(base + i * 2.2, 0.05, 16 + (i % 2) * 0.9).sq((bt.idx + i) % 2 ? 0 : beatSq(bt, 0.05)));
        gpt.front(T).at(42, 25.6, -46.6).noShadow();
        fw.update(T, 40, 34, -70, 44);
        const cx = base + 6.6;
        return cam([cx - 0.6, 1.7, 28.4], [cx + 0.6, 3.5, 0], 40);
      };
    },
  },
  {
    id: 'L19b', look: 'dusk', title: '幸福结局 · 全员谢幕', cast: ['doubao', 'gemini', 'claude', 'whale', 'qwen', 'kimi', 'zai', 'gpt'],
    note: '长音拖满：全员转身面向镜头轮流蹦起，孔明灯升空、烟花在王城上方炸开，机位摇升后拉。',
    build: (k) => {
      const town = k.shared('town', buildTown);
      const cast = FINALE.map((c) => { const a = k.actor(c.id); if (c.wear) a.wear(c.wear); return a; });
      const gpt = k.actor('gpt', 3.2);
      const fw = new Fireworks(k.root, 5, 24, 9);
      const lamps = many(16, () => k.add(lantern(0xffb05a, 0.22)));
      const A = cam([33.0, 1.9, 28.4], [34.2, 3.6, 0], 40), B = cam([33.6, 4.6, 36], [36, 4.2, -20], 42);
      return ({ u, T, bt }) => {
        useTown(k, town, 1, true, 0xffd6cc);
        cast.forEach((a, i) => {
          const on = (bt.idx + i) % 2 === 0;
          if (a.id === 'whale') a.set(on ? 'whale_wave' : 'whale_idle'); else a.front(T + i);
          a.at(27 + i * 2.2, 0.05, 16 + (i % 2) * 0.9).lift(on ? Math.sin(bt.phase * PI) * 0.45 : 0).sq(on && bt.phase < 0.12 ? 0.08 : 0);
        });
        gpt.set(bt.idx % 4 < 2 ? 'gpt_boss_idle' : 'gpt_boss_blink').at(42, 25.6, -46.6).noShadow();
        fw.update(T, 40, 30, -70, 46, 1.5);
        lamps.forEach((l, i) => { l.position.set(18 + hash(i) * 34 + Math.sin(T * 0.5 + i) * 0.8, 1.5 + ((T * 0.9 + i * 1.7) % 16), -6 + hash(i + 3) * 18); });
        return glide(A, B, u);
      };
    },
  },
];

void FPS; void rock; void easeOut;
