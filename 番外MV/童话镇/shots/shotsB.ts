// 镜头表（下）：间奏 N1–N3 · 主歌二 L20–L27 · 导歌二 L28–L31 · 尾声 OUT
import * as THREE from 'three';
import { cam, glide, type ShotDef } from '@tpl/core';
import {
  backOut, ball, basic, box, clock, cloud, cone, cyl, disc, ease, easeOut, glowMat, hash, lantern, lerp, mesh, paperBoat, pine, put, rock,
  seg, setOp, sprite, toon,
} from '@tpl/kit';
import { BRIDGE_RISE, buildTown, hill, straightRiver, useTown, wheel } from '@tpl/sets';
import { backdrop, beatSq, many, PI, sail } from './shotsA';

function tiger() {
  const g = new THREE.Group();
  put(g, box(1.9, 0.75, 0.62, 0xe89a3c), 0, 0.72, 0);
  many(4, (i) => put(g, box(0.13, 0.77, 0.64, 0x7a3f1c, 0), -0.6 + i * 0.4, 0.72, 0));
  put(g, box(0.66, 0.62, 0.6, 0xf0a84a), 1.1, 0.95, 0);
  put(g, box(0.3, 0.26, 0.38, 0xfff0d8), 1.52, 0.97, 0);
  for (const s of [-1, 1]) {
    put(g, cone(0.11, 0.22, 0xe89a3c, 5), 0.95, 1.55, s * 0.2);
    put(g, cone(0.05, 0.36, 0xffffff, 6, 0.02), 1.56, 0.97, s * 0.13).rotation.x = PI;
    put(g, ball(0.05, 0x2a1c2e, false, 0), 1.3, 1.36, s * 0.31);
  }
  const tail = put(g, cyl(0.06, 0.08, 0.95, 0xe89a3c, 6), -0.95, 1.3, 0); tail.rotation.z = 2.2;
  const legs = [[0.65, 0.2], [0.65, -0.2], [-0.65, 0.2], [-0.65, -0.2]].map(([x, z]) => { const p = put(g, new THREE.Group(), x, 0.76, z); put(p, box(0.2, 0.76, 0.2, 0xd98a34), 0, -0.76, 0); return p; });
  return { g, legs, tail };
}

export const SHOTS_B: ShotDef[] = [
  {
    id: 'N1', look: 'night', title: '间奏 · 提灯夜航', cast: ['whale'],
    note: '间奏不放空镜：天黑了，沿岸一盏盏亮灯，鲸鱼娘提灯继续顺流而下。',
    build: (k) => {
      const town = k.shared('town', buildTown);
      const boat = k.add(paperBoat()), whale = k.actor('whale'), lamp = k.add(lantern(0xffc85a, 0.14));
      return ({ u, T, bt }) => {
        useTown(k, town, 1, true);
        const { p, ang, dx, dz } = town.at(lerp(0.3, 0.345, u));
        sail(boat, whale, p.x, p.z, ang, T); whale.front(T).sq(beatSq(bt, 0.04));
        lamp.position.set(p.x + dx * 0.8, 1.5 + Math.sin(T * 2.3) * 0.06, p.z + dz * 0.8);
        return cam([p.x - dx * 7 - dz * 5.4, 2.0, p.z - dz * 7 + dx * 5.4], [p.x + dx * 5, 1.7, p.z + dz * 5], 40);
      };
    },
  },
  {
    id: 'N2', look: 'night', title: '间奏 · 月下拱桥', cast: ['whale', 'kimi', 'gpt'],
    note: '纸船从拱桥下穿过，Kimi 站在桥顶目送；一道龙影（GPT 龙娘剪影）横掠月亮，把画面交给夜晚的第二段主歌。',
    build: (k) => {
      const town = k.shared('town', buildTown);
      const zb = town.zAt(8);
      const boat = k.add(paperBoat()), whale = k.actor('whale'), kimi = k.actor('kimi').wear('tiara'), gpt = k.actor('gpt', 4);
      k.add(new THREE.Mesh(new THREE.SphereGeometry(11, 22, 14), basic(0xfff3c4)), 150, 46, zb - 4);
      k.add(sprite('glow', 60, 0xfff6cf, true, 0.4), 148, 46, zb - 4);
      const A = cam([-10, 1.7, zb + 2.6], [8, 4.3, zb], 42), B = cam([-6.5, 2.3, zb + 1.3], [8, 4.8, zb], 40);
      return ({ u, T }) => {
        useTown(k, town, 1, true);
        const { p, ang } = town.at(lerp(0.497, 0.532, u));
        sail(boat, whale, p.x, p.z, ang, T); whale.front(T);
        kimi.front(T).at(8, BRIDGE_RISE + 0.42, zb);
        gpt.walk(T).at(66, 21 + Math.sin(u * PI) * 3, lerp(zb - 28, zb + 22, u)).sil(1).noShadow();
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'N3', look: 'night', title: '间奏 · 孔明灯与星空', cast: [],
    note: '镜头从河岸仰到星空，孔明灯一盏盏升上去；下一句「睡美人」直接接在夜色里。',
    build: (k) => {
      const town = k.shared('town', buildTown);
      const lamps = many(28, () => k.add(lantern(0xffb05a, 0.24)));
      const A = cam([22, 3, 30], [34, 4.5, 0], 42), B = cam([24, 5, 30], [36, 36, -30], 44);
      return ({ u, T }) => {
        useTown(k, town, 1, true);
        lamps.forEach((l, i) => l.position.set(8 + hash(i) * 52 + Math.sin(T * 0.5 + i) * 0.8, 1 + ((T * 1.2 + i * 1.3) % 34), -14 + hash(i + 3) * 34));
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'L20', look: 'night', title: '睡美人被埋葬', cast: ['claude'],
    note: '「埋葬」不做暴力画面：Claude 大小姐睡在月光石台上，玫瑰一拍一朵沿荆棘拱门开过来，轻轻把她盖住。',
    build: (k) => {
      k.add(disc(320, 0x25305a));
      k.add(cyl(2.3, 2.5, 12, 0x4a5490, 12), -6.5, 0, -9); k.add(cone(3, 4.2, 0x2f3470, 12), -6.5, 12, -9); k.add(lantern(0xffd27a, 0.2), -6.5, 8.5, -6.5);
      many(18, (i) => k.add(pine(6 + hash(i) * 4, 0x1c3f55), -18 + i * 2.2 + hash(i + 2), 0, -7 - hash(i + 4) * 9));
      k.add(new THREE.Mesh(new THREE.SphereGeometry(2.6, 18, 12), basic(0xfff3c4)), 9, 13, -34); k.add(sprite('glow', 14, 0xfff6cf, true, 0.45), 9, 13, -33);
      k.add(box(3.9, 0.55, 1.7, 0xbdb6d8)); const pl = k.add(ball(0.45, 0xffffff), -1.3, 0.68, -0.2); pl.scale.set(1.2, 0.5, 0.9);
      k.add(mesh(new THREE.TorusGeometry(2.6, 0.09, 6, 28, PI), toon(0x2f6f4a), 0.03), 0, 0.3, -0.8);
      const roses = many(26, (i) => {
        const g = new THREE.Group();
        put(g, ball(0.18, i % 3 ? 0xe63946 : 0xff6b8a, true, 0.025)); put(g, ball(0.1, 0x3f9f5a, true, 0.02), 0.14, -0.08, 0);
        if (i < 13) { const a = (i / 12) * PI; k.add(g, Math.cos(a) * 2.6, 0.3 + Math.sin(a) * 2.6, -0.72); }
        else k.add(g, 1.75 - (i - 13) * 0.29, 0.72 + hash(i) * 0.3, 0.62 + hash(i + 2) * 0.3);
        return g;
      });
      const claude = k.actor('claude').wear('crown');
      const zz = many(3, () => k.add(sprite('zzz', 0.5)));
      const petals = many(12, () => k.add(sprite('petal', 0.3)));
      const A = cam([2.9, 3.3, 6.8], [0.2, 1.35, 0], 38), B = cam([0.7, 2.5, 5.0], [0, 1.4, 0], 34);
      return ({ u, T, bt }) => {
        claude.set('claude_front_1').at(1.2, 1.36 + Math.sin(T * 1.6) * 0.012, 0.05).tilt(PI / 2).noShadow();
        roses.forEach((r, i) => { const s = backOut(seg(u, (i / 26) * 0.85, (i / 26) * 0.85 + 0.1)); r.scale.setScalar(Math.max(0.001, s * (1 + 0.12 * bt.pulse))); });
        zz.forEach((s, i) => { const ph = (T * 0.4 + i / 3) % 1; s.position.set(-1.1 + ph * 0.9, 2.2 + ph * 1.5, 0.3); s.scale.setScalar(0.25 + ph * 0.4); setOp(s, Math.sin(ph * PI)); });
        petals.forEach((s, i) => { const ph = (T * 0.2 + hash(i)) % 1; s.position.set(-3 + hash(i + 2) * 6 + Math.sin(ph * 7 + i) * 0.4, 4.5 - ph * 4.2, -0.5 + hash(i + 5) * 1.5); setOp(s, Math.sin(ph * PI) * 0.9); });
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'L21', look: 'dusk', title: '小人鱼在眺望金殿堂', cast: ['whale'],
    note: '鲸鱼娘 = 小人鱼（鲸尾设定天然匹配，加一条鱼尾）：坐在礁石上抬手指向海平线，远处金色宫殿在发光，一道光路铺到她脚边。',
    build: (k) => {
      k.add(disc(700, 0x3f86e0));
      const waves = many(46, (i) => { const d = hash(i); const w = k.add(new THREE.Mesh(new THREE.PlaneGeometry(2 + d * 9, 0.1 + d * 0.3).rotateX(-PI / 2), basic(i % 3 ? 0x9fd0ff : 0xffe0b0)), -30 + hash(i + 1) * 70, 0.05, 2 - d * d * 90 - i * 0.4); w.userData.x = w.position.x; return w; });
      k.add(rock(1.5, 0x6a6f8f, 1), -1.3, 0.3, 0); k.add(rock(0.9, 0x5a5f7f, 2), -0.1, 0.1, 0.7); k.add(rock(0.7, 0x6a6f8f, 5), -2.8, 0, 0.5); k.add(rock(1.1, 0x5a5f7f, 8), 5.5, 0, -6);
      const pal = new THREE.Group(); k.add(pal, 18, 0, -72);
      put(pal, cyl(7, 8, 3.4, 0xffc233, 18)); put(pal, ball(5, 0xffd166), 0, 5.4, 0); put(pal, cone(0.7, 5, 0xfff3b0, 8), 0, 9.6, 0);
      for (const [x, z] of [[-7, 0], [7, 0], [-4, 3], [4, 3]]) { put(pal, cyl(1.1, 1.3, 8, 0xffc233, 10), x, 0, z); put(pal, ball(1.5, 0xffd166), x, 8.6, z); put(pal, cone(0.3, 2.2, 0xfff3b0, 6), x, 9.8, z); }
      const halo = k.add(sprite('glow', 46, 0xffd98a, true, 0.6), 18, 7, -70);
      const path = new THREE.Mesh(new THREE.PlaneGeometry(4, 64).rotateX(-PI / 2), glowMat(0xffe08a, 0.3, true)); k.add(path, 8.5, 0.12, -34, -0.27);
      const glints = many(18, () => k.add(sprite('star', 0.5, 0xfff2c0, true)));
      const whale = k.actor('whale').wear('tail');
      const A = cam([0.1, 2.4, 7.6], [3.2, 2.7, -20], 40), B = cam([0.4, 2.2, 6.2], [3.2, 2.6, -20], 38);
      return ({ u, T, bt }) => {
        whale.set('whale_big_point').at(-1.2, 1.62, 0.35).noShadow().tilt(Math.sin(T * 1.4) * 0.03).sq(beatSq(bt, 0.035));
        waves.forEach((w, i) => { w.position.x = w.userData.x + Math.sin(T * 0.7 + i) * 0.9; });
        halo.scale.setScalar(44 + 5 * bt.pulse); path.material.opacity = 0.24 + 0.12 * Math.sin(T * 2);
        glints.forEach((s, i) => { const ph = (T * 0.6 + hash(i)) % 1, d = hash(i + 2); s.position.set(lerp(1, 15, d) + (hash(i + 4) - 0.5) * 3, 0.3 + ph * 0.4, lerp(-4, -58, d)); s.scale.setScalar((0.3 + d * 1.6) * Math.sin(ph * PI)); setOp(s, Math.sin(ph * PI)); });
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'L22', look: 'savanna', title: '阿波罗变成金乌', cast: ['gpt', 'whale'], fx: { flash: [0.45] },
    note: '西方的日神战车轮在烈日前越转越小，闪白之后化成东方的三足金乌迎面扑来——神话在这里换了一种讲法。GPT 龙娘伴飞，鲸鱼娘在坡上仰望。',
    build: (k) => {
      k.add(disc(320, 0xc9a04a)); backdrop(k, 0xd9a85a, 0xc98a4a, false); k.add(hill(6, 2.4, 0xb98a3a), -4.6, 0, 3.6);
      k.add(new THREE.Mesh(new THREE.SphereGeometry(13, 26, 18), basic(0xfff3b0)), 0, 17, -80);
      k.add(sprite('glow', 74, 0xffd98a, true, 0.6), 0, 17, -78);
      const rays = k.add(new THREE.Group(), 0, 17, -77);
      many(12, (i) => { const r = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 26).translate(0, 29, 0), glowMat(0xffd166, 0.28, true)); r.rotation.z = (i / 12) * PI * 2; rays.add(r); });
      const wh = k.add(wheel(2.4, 0xffc233, 8), 0, 14.5, -30);
      const crow = new THREE.Group(); k.add(crow); crow.rotation.y = -PI / 2;
      const body = put(crow, ball(0.75, 0xffc233), 0, 0, 0); body.scale.set(1.5, 0.9, 0.9);
      put(crow, ball(0.45, 0xffd166), 1.0, 0.38, 0); put(crow, cone(0.15, 0.55, 0xff8a3c, 8), 1.4, 0.36, 0).rotation.z = -PI / 2;
      for (const s of [-1, 1]) put(crow, ball(0.07, 0x2a1c2e, false, 0), 1.25, 0.5, s * 0.3);
      const tl = put(crow, cone(0.5, 1.2, 0xffb020, 5), -0.9, 0, 0); tl.rotation.z = PI / 2; tl.scale.z = 0.3;
      const wings = [-1, 1].map((s) => {
        const pv = put(crow, new THREE.Group(), 0, 0.3, s * 0.35);
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0.9, 0, 0, -0.9, 0, 0, -0.5, 0, s * 2.9, 0.9, 0, 0, -0.5, 0, s * 2.9, 0.5, 0, s * 1.6], 3)); g.computeVertexNormals();
        pv.add(new THREE.Mesh(g, basic(0xffd166))); return pv;
      });
      many(3, (i) => put(crow, cyl(0.04, 0.04, 0.7, 0x3a2418, 5, 0.015), -0.15 + i * 0.2, -1.25, 0));
      const whale = k.actor('whale'), gpt = k.actor('gpt', 1.0);
      const A = cam([0, 1.8, 12.8], [0, 8.4, -20], 46), B = cam([0, 2.6, 10.8], [0.4, 8.6, -20], 42);
      return ({ u, T, bt }) => {
        rays.rotation.z = T * 0.25; rays.scale.setScalar(1 + 0.05 * bt.pulse);
        wh.visible = u < 0.47; wh.rotation.z = -T * 6; wh.scale.setScalar(Math.max(0.01, 1 - ease(seg(u, 0.15, 0.47)) * 0.75));
        const fly = ease(seg(u, 0.45, 1)), pop = backOut(seg(u, 0.45, 0.62));
        crow.visible = u >= 0.45; crow.position.set(lerp(0, 0.8, fly), lerp(15, 7.4, fly) + Math.sin(T * 9) * 0.15, lerp(-40, -6, fly)); crow.scale.setScalar(Math.max(0.001, pop * lerp(1.7, 2.3, fly)));
        wings.forEach((w, i) => { w.rotation.x = (i ? -1 : 1) * Math.sin(T * 9) * 0.8; });
        gpt.walk(T).at(crow.position.x + 3.4, crow.position.y + 1.0, crow.position.z - 1).noShadow().alpha(u >= 0.5 ? 1 : 0);
        whale.set(u > 0.55 ? 'whale_wave' : 'whale_idle').at(-3.9, 2.3, 4.4).tint(0x7a5230).lift(u > 0.55 ? Math.sin(bt.phase * PI) * 0.2 : 0);
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'L23', look: 'savanna', title: '草原有奔跑的剑齿虎', cast: ['whale'],
    note: '全片最快的横移：三头剑齿虎分前中后景飞奔，前后腿成对蹬地。鲸鱼娘不靠腿跟（那会滑步），直接骑在头虎背上。',
    build: (k) => {
      k.add(disc(320, 0xd9b24f)); backdrop(k, 0xd9a85a, 0xc98a4a, false);
      many(13, (i) => { const g = k.add(new THREE.Group(), -34 + i * 7.5 + hash(i) * 3, 0, -12 - hash(i + 2) * 10); put(g, cyl(0.18, 0.26, 3.2, 0x7a4a2c, 6)); const c = put(g, ball(1, 0x8faf3a, true), 0, 3.6, 0); c.scale.set(2.6, 0.55, 2.6); });
      many(70, (i) => k.add(cone(0.12, 0.4 + hash(i) * 0.3, 0xb89a3a, 5, 0), -34 + hash(i) * 90, 0, -10 + hash(i + 7) * 15));
      const tg = many(3, () => { const t = tiger(); k.add(t.g); return t; });
      const whale = k.actor('whale');
      const dust = many(12, () => k.add(sprite('smoke', 0.8, 0xfff0c8, false, 0.5)));
      const off = [0, -4.4, 4.8], zs = [-0.5, -4.4, -8.2];
      return ({ u, T, bt }) => {
        const X = lerp(-11, 15, u);
        tg.forEach((t, i) => {
          const ph = T * 17 + i * 2, s = Math.sin(ph);
          t.g.position.set(X + off[i], Math.abs(s) * 0.22, zs[i]); t.g.rotation.z = s * 0.07;
          t.legs.forEach((l, j) => { l.rotation.z = (j < 2 ? 1 : -1) * s * 0.95; }); t.tail.rotation.z = 2.2 + Math.sin(ph * 0.5) * 0.3;
        });
        whale.set('whale_wave').at(X - 0.15, 1.44 + Math.abs(Math.sin(T * 17)) * 0.22, -0.45).noShadow().sq(beatSq(bt, 0.06)).tilt(-0.06);
        dust.forEach((s, i) => { const j = i % 3, ph = (T * 2.2 + i / 12) % 1; s.position.set(X + off[j] - 1.2 - ph * 2.4, 0.2 + ph * 0.6, zs[j] + 0.2); s.scale.setScalar(0.4 + ph * 0.9); setOp(s, (1 - ph) * 0.55); });
        return cam([X - 1.6, 1.25, 9.8], [X + 2, 1.2, -2.5], 40);
      };
    },
  },
  {
    id: 'L24', look: 'stage', title: '匹诺曹总说着谎', cast: ['gemini'],
    note: '木偶剧场：Gemini 报幕。匹诺曹每过一拍鼻子就长一截——八拍说完这句，鼻子也刚好戳到了幕布边。',
    build: (k) => {
      k.add(disc(140, 0x1f1326));
      k.add(box(15, 0.5, 6.4, 0x9a6a44)); k.add(box(15, 8.6, 0.3, 0x3a2f6a), 0, 0.5, -3.2);
      many(12, (i) => k.add(sprite('star', 0.5 + hash(i) * 0.4, 0xfff2a8, true), -6 + hash(i) * 12, 3.6 + hash(i + 3) * 3.6, -2.95));
      for (const s of [-1, 1]) many(4, (i) => k.add(box(0.72, 7.4, 0.5, i % 2 ? 0xb5303f : 0xc93a4a), s * (5.3 + i * 0.62), 0.5, 1.4 + (i % 2) * 0.12));
      k.add(box(15.4, 1.5, 0.7, 0xc93a4a), 0, 7.1, 1.5); k.add(box(15.4, 0.22, 0.74, 0xffd166, 0.03), 0, 7.0, 1.5);
      many(8, (i) => k.add(lantern(0xffe2a0, 0.13), -5.6 + i * 1.6, 0.64, 3.0));
      const pup = new THREE.Group(); k.add(pup, 0.4, 0.5, 0);
      for (const s of [-1, 1]) put(pup, box(0.16, 0.7, 0.16, 0x3f6fb5), 0, 0, s * 0.14);
      put(pup, box(0.5, 0.8, 0.6, 0xffd166), 0, 0.7, 0); put(pup, box(0.54, 0.3, 0.64, 0xe63946), 0, 0.62, 0);
      const arms = [-1, 1].map((s) => { const p = put(pup, new THREE.Group(), 0, 1.42, s * 0.36); put(p, box(0.13, 0.62, 0.13, 0xe8c39a), 0, -0.62, 0); return p; });
      put(pup, ball(0.45, 0xe8c39a), 0, 1.95, 0); put(pup, cone(0.36, 0.55, 0x3f8f4a, 10), 0, 2.3, 0); put(pup, ball(0.07, 0x2a1c2e, false, 0), 0.3, 2.04, 0.3);
      put(pup, ball(0.09, 0xff8fa3, false, 0), 0.22, 1.86, 0.36);
      const nose = put(pup, cyl(0.065, 0.075, 1, 0xd9a066, 8, 0.02), 0.42, 1.95, 0); nose.rotation.z = -PI / 2;
      many(3, (i) => k.add(box(0.025, 6.4, 0.025, 0xffffff, 0), 0.4 + (i - 1) * 0.3, 2.9, 0));
      const bird = k.add(sprite('butterfly', 0.5));
      const gem = k.actor('gemini').wear('bow');
      const A = cam([-0.4, 2.1, 9.6], [0.4, 2.0, 0], 38), B = cam([0.9, 1.9, 7.8], [0.7, 1.95, 0], 34);
      return ({ u, T, bt }) => {
        const len = 0.3 + 0.38 * (Math.min(7, bt.idx) + easeOut(seg(bt.phase, 0, 0.3)));
        nose.scale.y = len; pup.rotation.z = Math.sin(T * 6) * 0.035;
        arms.forEach((a, i) => { a.rotation.z = (i ? 1 : -1) * 0.3 + Math.sin(T * 7 + i * 2) * 0.5; });
        gem.set('gemini_side_0').at(-2.5, 0.5, 0.5).tilt(0.05 + len * 0.03).sq(beatSq(bt)).lift(bt.down ? bt.pulse * 0.15 : 0);
        bird.position.set(0.4 + 0.42 + len + 0.1, 2.75 + Math.sin(T * 3) * 0.05, 0.1); bird.scale.x = 0.5 * (0.4 + 0.6 * Math.abs(Math.sin(T * 12))); bird.visible = u > 0.72;
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'L25', look: 'cave', title: '侏儒怪拥有宝石满箱', cast: ['zai', 'gpt'],
    note: '洞窟里一口装到溢出来的宝箱，智谱（侏儒怪）绕着箱子蹦；纺车把稻草纺成金线。黑暗深处，守财的 GPT 龙娘亮起一双红瞳。',
    build: (k) => {
      k.add(disc(140, 0x2a2238));
      many(13, (i) => { const a = (i / 12) * PI; k.add(rock(2.6 + hash(i) * 2.2, i % 2 ? 0x3a3050 : 0x463a60, i), Math.cos(a) * 8.5, 1.6 + hash(i + 2) * 2, -Math.sin(a) * 6.5 - 1.5); });
      many(9, (i) => k.add(cone(0.35 + hash(i) * 0.3, 1.6 + hash(i + 1) * 1.6, 0x463a60, 6), -6 + i * 1.5, 7.2, -3 - hash(i) * 2).rotation.x = PI);
      k.add(box(1.9, 0.9, 1.15, 0x8a5a2c)); for (const x of [-0.8, 0, 0.8]) k.add(box(0.14, 0.94, 1.19, 0xffc233, 0.02), x, 0, 0);
      const lid = k.add(new THREE.Group(), 0, 0.9, -0.57); put(lid, box(1.9, 0.32, 1.15, 0x9a6a34), 0, 0, 0.57); lid.rotation.x = -1.9;
      const cols = [0xff3b5c, 0x3be08a, 0x4f8cff, 0xb46bff, 0xffc233, 0x5fe8ff];
      const gems = many(34, (i) => { const g = new THREE.Mesh(new THREE.OctahedronGeometry(0.12 + hash(i) * 0.1), basic(cols[i % 6])); if (i < 22) k.add(g, (hash(i + 1) - 0.5) * 1.5, 0.92 + hash(i + 2) * 0.5, (hash(i + 3) - 0.5) * 0.8); else k.add(g, (hash(i + 1) - 0.5) * 3.6, 0.14, 0.8 + hash(i + 3) * 1.2); return g; });
      many(3, (i) => k.add(cone(0.5, 0.5, 0xffc233, 12), -2.6 + i * 2.6, 0, -1.2 + (i % 2) * 0.6));
      const glow = k.add(sprite('glow', 4.5, 0xffd98a, true, 0.6), 0, 1.4, 0.2);
      const tw = many(10, () => k.add(sprite('star', 0.4, 0xffffff, true)));
      const sw = k.add(wheel(0.85, 0x8a5a3c, 8), -3.4, 1.1, -0.6); k.add(box(0.14, 1.1, 0.14, 0x6a4428), -3.4, 0, -0.75); k.add(box(1.8, 0.03, 0.03, 0xffd166, 0), -2.5, 1.12, -0.55);
      const zai = k.actor('zai'), gpt = k.actor('gpt', 1.6);
      const eyes = many(2, () => k.add(sprite('glow', 0.8, 0xff2d4a, true)));
      const A = cam([2.9, 1.7, 6.4], [0.2, 0.95, 0], 38), B = cam([-0.3, 1.5, 5.8], [0, 0.95, 0], 34);
      return ({ u, T, bt }) => {
        const side = Math.sin((T / (bt.len * 4)) * PI * 2);
        zai.set('zai_side_0').at(-1.5 + side * 0.3, 0, 0.9).flip(side < 0).lift(Math.sin(bt.phase * PI) * 0.42).sq(bt.phase < 0.12 ? 0.08 : 0);
        gems.forEach((g, i) => { g.rotation.y = T * 1.5 + i; g.rotation.x = i; });
        glow.scale.setScalar(4.2 + bt.pulse * 1.2);
        tw.forEach((s, i) => { const ph = (T * 0.9 + hash(i) * 3) % 1; s.position.set((hash(i + 1) - 0.5) * 2.2, 1.0 + hash(i + 2) * 0.9, 0.5 + hash(i + 3) * 0.6); s.scale.setScalar(0.5 * Math.sin(ph * PI)); setOp(s, Math.sin(ph * PI)); });
        sw.rotation.z = -T * 3;
        gpt.set('gpt_boss_rage').at(2.9, 0, -3.4).sil(1).noShadow().alpha(seg(u, 0.4, 0.6));
        eyes.forEach((e, i) => { e.position.set(2.9 + (i ? 0.24 : -0.14), 2.32, -3.3); setOp(e, seg(u, 0.5, 0.66) * (0.65 + 0.3 * Math.sin(T * 9))); });
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'L26', look: 'golden', title: '悬崖有棵长生树', cast: ['kimi'],
    note: '从云海底部沿峭壁一路摇升到崖顶：发光的古树下，Kimi（长生树智者）只有一个小点那么大——用尺度对比来说「长生」。',
    build: (k) => {
      k.add(disc(520, 0xffe2c0, -3));
      many(26, (i) => k.add(cloud(i * 3, 2.4 + hash(i) * 2), -40 + hash(i) * 80, -1.5 + hash(i + 4) * 2.4, -34 + hash(i + 8) * 44));
      many(8, (i) => k.add(rock(3.5 - i * 0.22, i % 2 ? 0x8f7f9c : 0xa08fae, i), (hash(i) - 0.5) * 1.4, 0.4 + i * 1.75, (hash(i + 3) - 0.5) * 1.2));
      k.add(cyl(2.8, 3.1, 0.7, 0x79b96a, 9), 0, 13.2, 0);
      k.add(cyl(0.5, 0.95, 3.4, 0x7a4a2c, 7), -0.3, 13.9, -0.2);
      const canopy = many(7, (i) => k.add(ball(1.5 + hash(i) * 0.8, i % 2 ? 0x7fe07a : 0xb6f08a, true), -0.3 + Math.cos(i * 0.9) * 1.8, 17.6 + hash(i + 2) * 1.4, -0.2 + Math.sin(i * 0.9) * 1.4));
      k.add(sprite('glow', 12, 0xd8ff9a, true, 0.5), -0.3, 18, 0.5);
      const motes = many(22, () => k.add(sprite('glow', 0.4, 0xeaffb0, true)));
      const kimi = k.actor('kimi').wear('tiara');
      const birds = many(4, () => k.add(sprite('leaf', 0.5, 0xffffff)));
      const A = cam([9.5, 1.5, 20], [0, 5.5, 0], 42), B = cam([6.8, 15.2, 12.6], [0.3, 15.9, 0], 38);
      return ({ u, T, bt }) => {
        kimi.front(T).at(1.5, 13.9, 0.9).sq(beatSq(bt, 0.04));
        canopy.forEach((c, i) => c.scale.setScalar(1 + 0.04 * bt.pulse + Math.sin(T * 1.2 + i) * 0.015));
        motes.forEach((s, i) => { const a = T * (0.3 + hash(i) * 0.4) + i, r = 2 + hash(i + 1) * 2.6; s.position.set(-0.3 + Math.cos(a) * r, 15 + hash(i + 2) * 5 + Math.sin(T + i) * 0.4, -0.2 + Math.sin(a) * r); setOp(s, 0.5 + 0.4 * Math.sin(T * 2 + i)); });
        birds.forEach((b, i) => { const a = T * 0.7 + i * 1.6; b.position.set(Math.cos(a) * 6.5, 9 + i * 1.6 + Math.sin(a * 2) * 0.4, Math.sin(a) * 4.5); });
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'L27', look: 'stage', title: '红鞋子不知疲倦地在跳舞', cast: ['doubao', 'whale'],
    note: '八音盒舞台在转，一双红舞鞋自己左一下右一下踩着每个半拍、拖出星屑；豆包跟着转圈，鲸鱼娘在台下打拍子。相机绕台半圈。',
    build: (k) => {
      k.add(disc(140, 0x2a1c30));
      k.add(cyl(3.2, 3.4, 0.7, 0xf2c6d8, 28)); many(16, (i) => { const a = (i / 16) * PI * 2; k.add(box(0.5, 0.72, 0.1, i % 2 ? 0xe63946 : 0xffffff, 0), Math.cos(a) * 3.36, 0, Math.sin(a) * 3.36, -a + PI / 2); });
      const top = k.add(cyl(3.0, 3.0, 0.1, 0xfff0f5, 28), 0, 0.7, 0); many(8, (i) => { const a = (i / 8) * PI * 2; put(top, box(0.22, 0.03, 2.4, 0xffb3cf, 0), Math.cos(a) * 1.5, 0.1, Math.sin(a) * 1.5, -a + PI / 2); });
      const cone1 = k.add(new THREE.Mesh(new THREE.ConeGeometry(3.4, 11, 24, 1, true).translate(0, 5.5, 0), glowMat(0xfff0c0, 0.1, true)), 0, 0.8, 0);
      k.add(box(0.2, 0.2, 1.4, 0xffc233), 3.9, 0.3, 0); k.add(cyl(0.3, 0.3, 0.12, 0xffc233, 10), 3.9, 0.2, 0.8).rotation.x = PI / 2;
      const shoes = many(2, () => { const g = new THREE.Group(); put(g, box(0.34, 0.12, 0.16, 0xe63946, 0.025)); put(g, ball(0.1, 0xe63946, false, 0.02), 0.13, 0.1, 0); put(g, box(0.06, 0.16, 0.06, 0x8f1423, 0), -0.13, -0.12, 0); k.add(g); return g; });
      const trail = many(10, () => k.add(sprite('star', 0.36, 0xff8fa3, true)));
      const notes = many(8, () => k.add(sprite('note', 0.45)));
      const doubao = k.actor('doubao').wear('hood'), whale = k.actor('whale');
      return ({ u, T, bt, f }) => {
        top.rotation.y = T * 0.9; cone1.material.opacity = 0.08 + 0.05 * bt.pulse;
        doubao.front(T).at(0, 0.82, 0).flip(Math.floor(f / 5) % 2 === 1).lift(Math.sin(bt.phase * PI) * 0.36).sq(bt.phase < 0.12 ? 0.08 : 0);
        const a = T * 1.5;
        shoes.forEach((s, i) => { const hop = Math.max(0, Math.sin(bt.phase * PI * 2 + i * PI)); s.position.set(Math.cos(a) * 1.6 + (i ? 0.22 : -0.22), 0.96 + hop * 0.42, Math.sin(a) * 1.6); s.rotation.z = hop * 0.5 * (i ? 1 : -1); });
        trail.forEach((s, i) => { const b = a - (i + 1) * 0.16; s.position.set(Math.cos(b) * 1.6, 1.0 + (i % 2) * 0.2, Math.sin(b) * 1.6); s.scale.setScalar(0.4 * (1 - i / 11)); setOp(s, 1 - i / 10); });
        notes.forEach((s, i) => { const ph = (T * 0.4 + i / 8) % 1, b = i * 0.8; s.position.set(Math.cos(b) * (2.4 + ph), 1.6 + ph * 3, Math.sin(b) * (2.4 + ph)); setOp(s, Math.sin(ph * PI)); });
        whale.set(bt.idx % 2 ? 'whale_wave' : 'whale_idle').at(-4.3, 0, 1.6).sq(beatSq(bt, 0.08));
        const ang = lerp(0.75, -0.75, lerp(u, ease(u), 0.5));
        return cam([Math.sin(ang) * 7.2, 2.4, Math.cos(ang) * 7.2], [0, 1.6, 0], 38);
      };
    },
  },
  {
    id: 'L28', look: 'sea', title: '只有睿智的河水知道（水下）', cast: ['whale', 'kimi'],
    note: '同一句歌词第二次出现，机位换到水下：仰头能看到七彩河面在头顶流过。小人鱼鲸鱼娘摆尾游过珍珠拱门，Kimi 坐在贝壳上当河底智者。',
    build: (k) => {
      k.add(disc(120, 0x2a7f9f));
      const surf = straightRiver(160, 12, 1, 0, 7.6); k.add(surf.mesh);
      many(6, (i) => { const s = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 13), glowMat(0xbff4ff, 0.13, true)); s.rotation.z = 0.28; k.add(s, -6 + i * 2.5, 4, -2 - (i % 3)); });
      const weeds = many(16, (i) => k.add(cone(0.14, 1.4 + hash(i) * 1.6, i % 2 ? 0x2f9f6a : 0x3fbf7a, 5), -8 + i * 1.05 + hash(i), 0, -2.5 - hash(i + 2) * 3));
      many(6, (i) => k.add(rock(0.5 + hash(i) * 0.6, 0x4a7f9a, i), -7 + i * 2.8, 0.1, -1.5 - hash(i) * 2));
      k.add(mesh(new THREE.TorusGeometry(2.3, 0.22, 8, 26, PI), toon(0xffe6f2), 0.04), 1.4, 0, -1.6); many(9, (i) => { const a = (i / 8) * PI; k.add(ball(0.2, 0xffffff, false, 0.02), 1.4 + Math.cos(a) * 2.3, Math.sin(a) * 2.3, -1.35); });
      const sh = k.add(ball(0.9, 0xffb3cf), 3.9, 0, -0.9); sh.scale.set(1.2, 0.45, 1);
      const bubbles = many(26, () => k.add(sprite('bubble', 0.3)));
      const whale = k.actor('whale').wear('tail'), kimi = k.actor('kimi').wear('tiara');
      const A = cam([-2.6, 1.4, 7.6], [-0.5, 2.3, 0], 40), B = cam([0.8, 1.9, 6.4], [0.6, 2.4, 0], 36);
      return ({ u, T, bt }) => {
        whale.set('whale_big_idle').at(lerp(-3.8, 1.0, u), 2.0 + Math.sin(T * 1.6) * 0.22, 0).tilt(-0.38 + Math.sin(T * 3.2) * 0.07).noShadow();
        kimi.front(T).at(3.9, 0.36, -0.8).sq(beatSq(bt, 0.04));
        weeds.forEach((w, i) => { w.rotation.z = Math.sin(T * 1.2 + i) * 0.16; });
        bubbles.forEach((s, i) => { const ph = (T * (0.18 + hash(i) * 0.14) + hash(i + 1)) % 1; s.position.set(-7 + hash(i + 2) * 14 + Math.sin(ph * 9 + i) * 0.2, ph * 7.4, -3 + hash(i + 3) * 4.5); s.scale.setScalar(0.14 + hash(i + 4) * 0.3); setOp(s, Math.sin(ph * PI)); });
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'L29', look: 'magic', title: '睡美人逃避了生活的煎熬', cast: ['claude'],
    note: '第二个真相：她是自己不想醒。闹钟、待办卷轴，还有一口煎着蛋的平底锅（「煎熬」）绕着玫瑰色护罩打转，统统被弹在外面——里面的 Claude 睡得很香。',
    build: (k) => {
      k.add(disc(320, 0x3a2f6a));
      many(14, (i) => k.add(pine(6 + hash(i) * 4, 0x3a2f7a), -22 + i * 3.4, 0, -9 - hash(i) * 7));
      k.add(box(3.9, 0.6, 1.8, 0xe9d6f5)); const pl = k.add(ball(0.45, 0xffffff), -1.3, 0.72, -0.2); pl.scale.set(1.2, 0.5, 0.9);
      const dome = k.add(new THREE.Mesh(new THREE.SphereGeometry(2.8, 26, 14, 0, PI * 2, 0, PI / 2), glowMat(0xff9fc0, 0.18)));
      const items = many(6, (i) => {
        const g = new THREE.Group(); k.add(g);
        if (i % 2 === 0) { const c = clock(0.42); g.add(c.g); for (const s of [-1, 1]) put(g, ball(0.11, 0xe63946, false, 0.02), s * 0.3, 0.44, 0); g.userData.clock = c; }
        else if (i === 1) { put(g, cyl(0.5, 0.42, 0.1, 0x2a2a33, 14)); put(g, box(0.75, 0.07, 0.1, 0x2a2a33), 0.8, 0.02, 0); put(g, cyl(0.27, 0.27, 0.03, 0xffffff, 12, 0), 0, 0.1, 0); put(g, ball(0.1, 0xffc233, false, 0), 0, 0.14, 0); g.rotation.x = 0.9; }
        else { put(g, box(0.62, 0.82, 0.04, 0xfff6e0)); many(4, (j) => put(g, box(0.4, 0.04, 0.05, 0x8a7a6a, 0), 0, 0.14 + j * 0.16, 0)); put(g, cyl(0.05, 0.05, 0.7, 0xc9a27a, 6), 0, 0.82, 0).rotation.z = PI / 2; }
        return g;
      });
      const zz = many(3, () => k.add(sprite('zzz', 0.5)));
      const bonk = many(6, () => k.add(sprite('star', 0.6, 0xffe0f0, true)));
      const claude = k.actor('claude').wear('crown');
      const A = cam([-2.9, 2.9, 6.9], [0, 1.3, 0], 40), B = cam([0.3, 2.4, 5.4], [0, 1.3, 0], 36);
      return ({ u, T, bt }) => {
        claude.set('claude_front_1').at(1.2, 1.42 + Math.sin(T * 1.6) * 0.012, 0.05).tilt(PI / 2).noShadow();
        dome.scale.setScalar(1 + 0.04 * bt.pulse); dome.material.opacity = 0.16 + 0.1 * bt.pulse;
        items.forEach((g, i) => {
          const a = T * 0.7 + (i / 6) * PI * 2, push = 0.5 * bt.pulse;
          g.position.set(Math.cos(a) * (3.5 + push), 1.5 + Math.sin(T * 2 + i) * 0.4, Math.sin(a) * (1.7 + push * 0.6));
          if (g.userData.clock) { g.rotation.z = Math.sin(T * 42 + i) * 0.14; g.userData.clock.mh.rotation.z = -T * 9; g.userData.clock.hh.rotation.z = -T * 1.5; } else g.rotation.y = T * 1.3 + i;
          bonk[i].position.set(Math.cos(a) * 2.9, 1.5, Math.sin(a) * 1.45); bonk[i].scale.setScalar(0.7 * bt.pulse + 0.01); setOp(bonk[i], bt.pulse);
        });
        zz.forEach((s, i) => { const ph = (T * 0.4 + i / 3) % 1; s.position.set(-1.1 + ph * 0.9, 2.3 + ph * 1.4, 0.3); s.scale.setScalar(0.25 + ph * 0.4); setOp(s, Math.sin(ph * PI)); });
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'L30', look: 'sea', title: '小人鱼把阳光抹成眼影', cast: ['whale'],
    note: '全片最近的特写：阳光从水面斜插下来，金色光点一粒粒汇到鲸鱼娘眼角，她闭眼、再睁开——眼尾多了两抹金。',
    build: (k) => {
      k.add(disc(120, 0x2a7f9f, -4));
      const surf = straightRiver(160, 14, 0.4, 0, 5.2, 0x8fe0ff, 0x4fb8f0); k.add(surf.mesh);
      many(7, (i) => { const s = new THREE.Mesh(new THREE.PlaneGeometry(1.1 + (i % 3) * 0.5, 12), glowMat(0xffe9a0, 0.16, true)); s.rotation.z = 0.32; k.add(s, -4 + i * 1.4, 2.5, -1.5 - (i % 3) * 0.8); });
      const bubbles = many(16, () => k.add(sprite('bubble', 0.2)));
      const whale = k.actor('whale', 1.25).wear('tail');
      const shadow = many(2, () => k.add(sprite('glow', 0.5, 0xffa51f, true)));
      const motes = many(14, () => k.add(sprite('glow', 0.14, 0xffe9a0, true)));
      const tw = many(2, () => k.add(sprite('star', 0.3, 0xfff6c0, true)));
      const A = cam([0.75, 1.75, 4.3], [0.05, 1.7, 0], 32), B = cam([0.28, 1.85, 3.3], [0.02, 1.8, 0], 28);
      return ({ u, T, bt }) => {
        const by = 0.35 + u * 0.22 + Math.sin(T * 1.5) * 0.03;
        whale.set(u > 0.36 && u < 0.6 ? 'whale_big_blink' : 'whale_big_idle').at(0, by, 0).noShadow().tilt(Math.sin(T * 1.2) * 0.025);
        const ex = [-0.25, 0.25], ey = by + 1.3, on = seg(u, 0.36, 0.6);
        shadow.forEach((s, i) => { s.position.set(ex[i] + (i ? 0.13 : -0.13), ey + 0.04, 0.12); s.scale.set(0.56 + 0.08 * bt.pulse, 0.24, 1); setOp(s, on * 0.6); });
        motes.forEach((s, i) => { const ph = (T * 0.5 + hash(i)) % 1, e = ease(ph), j = i % 2; s.position.set(lerp(-2.4 + hash(i + 1) * 4.8, ex[j], e), lerp(4.4, ey, e), lerp(-0.6, 0.15, e)); setOp(s, Math.sin(ph * PI) * (1 - on * 0.5)); });
        tw.forEach((s, i) => { const ph = (T * 1.1 + i * 0.37) % 1; s.position.set(ex[i] + (i ? 0.46 : -0.46), ey + 0.16, 0.16); s.scale.setScalar(0.24 * Math.sin(ph * PI)); setOp(s, on * Math.sin(ph * PI) * 0.9); });
        bubbles.forEach((s, i) => { const ph = (T * 0.2 + hash(i)) % 1; s.position.set(-2.5 + hash(i + 2) * 5, ph * 5, -1.2 + hash(i + 3) * 1.6); setOp(s, Math.sin(ph * PI)); });
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'L31', look: 'sea', title: '投进泡沫的怀抱', cast: ['whale'], fx: { whiteOut: true },
    note: '她闭着眼往上浮，身体一点点散成泡沫；镜头跟着泡沫仰向水面的光，最后整屏化白——不落到悲剧上，落到光里。',
    build: (k) => {
      k.add(disc(120, 0x2a7f9f, -4));
      const surf = straightRiver(160, 14, 0.4, 0, 8, 0x8fe0ff, 0x4fb8f0); k.add(surf.mesh);
      many(7, (i) => { const s = new THREE.Mesh(new THREE.PlaneGeometry(1.2 + (i % 3) * 0.5, 16), glowMat(0xffffff, 0.14, true)); s.rotation.z = 0.25; k.add(s, -4 + i * 1.4, 4, -1.5 - (i % 3) * 0.8); });
      const light = k.add(sprite('glow', 8, 0xffffff, true, 0.5), 0, 7.4, -1.5);
      const bubbles = many(64, () => k.add(sprite('bubble', 0.3)));
      const whale = k.actor('whale', 1.1).wear('tail');
      const A = cam([0.3, 1.7, 5.6], [0, 1.6, 0], 36), B = cam([0, 3.3, 6.0], [0, 5.6, 0], 40);
      return ({ u, T, t }) => {
        const wy = 0.5 + ease(u) * 1.8;
        whale.set('whale_big_blink').at(0, wy, 0).noShadow().alpha(1 - seg(u, 0.22, 0.78)).tilt(Math.sin(T) * 0.03);
        bubbles.forEach((s, i) => {
          const t0 = hash(i) * 1.9, ph = (t - t0) / 1.9;
          if (ph < 0 || ph > 1) { s.visible = false; return; }
          s.position.set((hash(i + 1) - 0.5) * (0.8 + ph * 2.2), wy - 0.4 + hash(i + 2) * 1.8 + ph * 4.2, (hash(i + 3) - 0.5) * 0.8 + 0.2);
          s.scale.setScalar(0.14 + hash(i + 4) * 0.36); setOp(s, Math.sin(ph * PI));
        });
        light.scale.setScalar(7 + u * 14); setOp(light, 0.4 + 0.55 * u);
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'OUT', look: 'night', title: '尾声 · 泡沫升成星星', cast: [], fx: { whiteIn: true, blackOut: true },
    note: '白光褪去，泡沫变成童话镇夜空里的灯火，七彩河还在流。镜头一路后拉升高，自然切黑；不做频道式片尾卡。',
    build: (k) => {
      const town = k.shared('town', buildTown);
      const lights = many(40, () => k.add(sprite('glow', 1.6, 0xfff2c0, true)));
      const A = cam([-30, 14, 46], [0, 3, -4], 42), B = cam([-48, 48, 82], [6, 0, -10], 40);
      return ({ u, T }) => {
        useTown(k, town, 1, true);
        lights.forEach((l, i) => { l.position.set(-60 + hash(i) * 130, 2 + ((T * 1.6 + i * 1.9) % 46), -40 + hash(i + 3) * 70); setOp(l, 0.5 + 0.4 * Math.sin(T * 2 + i)); });
        return glide(A, B, u);
      };
    },
  },
];

void cloud; void clock; void cyl; void cone; void easeOut; void wheel;
