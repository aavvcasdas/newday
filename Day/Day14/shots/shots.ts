// Day14｜两只沙漏，一张给不出的账单 —— 19 个镜头。
// 分镜依据：存档/重构前/Day/Day14/Day14分镜_制作版.md 的 C01–C12（那份是给旧 2D 引擎写的），这里按同样的画面事件在 3D 布景里重排；
// 原来的 C12 一镜盖 22 句太长，拆成 C12a–C12g。镜头里写的 n（lineU(f, n)、f.line === n）都是全片句序号，从 0 数。
//
// 本集画面红线（方向稿里定的）：沙漏只画沙子、钟只画指针，不出现金额 / 百分比 / 表格；伞柄上不画手；
// 一天一客——上桌的客人只有龙娘，豆包只负责撑伞，其余伙伴只在 C11 群像里出现；没有片尾卡，没有角标。
import * as THREE from 'three';
import { cam, glide, lineU, track, type Frame, type Kit, type ShotDef } from '@tpl/core';
import { backOut, box, clock, cyl, disc, ease, easeOut, hash, lantern, lerp, seg, setOp, sprite } from '@tpl/kit';
import { cameraProp, door, hourglass, notebook, paperStack, plant, rain, riceBowl, room, sheet, table, umbrella, windowPane, writeLine } from '@tpl/props';

const PI = Math.PI;
const TOP = 0.8; // 桌面高度

/** 雨里的街：湿地面、外墙、龙娘家的门、亮着灯的窗、路灯、雨、一把伞 */
function street(k: Kit) {
  k.add(disc(80, 0x46556b));
  for (let i = 0; i < 7; i++) k.add(disc(0.45 + hash(i) * 0.6, 0x5d7592, 0.012), -5 + i * 1.7 + hash(i + 9), 0, 1.2 + hash(i + 4) * 2.6);
  k.add(box(26, 7, 0.6, 0x6a5f7a, 0), 0, 0, -3.5);
  k.add(box(26, 0.45, 0.8, 0x4b425a, 0), 0, 0, -3.15);
  const dr = door(1.6, 2.8); k.add(dr.g, -4.4, 0.18, -3.14);
  k.add(box(2.6, 0.18, 1.1, 0x8f8a9c, 0.03), -4.4, 0, -2.75);
  k.add(windowPane(1.9, 1.5, 0xffe2a0), 0.6, 1.7, -3.14);
  k.add(cyl(0.07, 0.09, 3.7, 0x2f3440, 8, 0.03), 4.6, 0, -2.3);
  k.add(lantern(0xffd58a, 0.2), 4.6, 3.75, -2.3);
  const rn = rain(170, 20, 9, 7.5); k.add(rn.g, 0, 0, 0.8);
  const umb = k.add(umbrella());
  /** 伞立在豆包身边：x = 伞柄位置，tilt > 0 = 伞面向左（朝鲸鱼娘）倾 */
  const hold = (x: number, z: number, tilt: number) => { umb.position.set(x, 0.5, z + 0.05); umb.rotation.z = tilt; };
  return { dr, rn, hold };
}

/** 龙娘的屋子：房间、门、窗、桌子 */
function office(k: Kit) {
  k.add(room({ w: 12, d: 9, wall: 0xf1dfc4, floor: 0xb98a5e, rug: 0xd98f8f }));
  const dr = door(); k.add(dr.g, -3.6, 0, -4.48); dr.set(0.3);
  k.add(windowPane(2.2, 1.6), 2.9, 1.5, -4.48);
  k.add(plant(), 5.1, 0, -3.6);
  k.add(table(3.0, 1.4, TOP), 0.6, 0, 0.2);
}
const WHALE: [number, number, number] = [-1.7, 0, 0.6];
const GPT: [number, number, number] = [3.1, 0, 0.5];

/** 特写用的桌面：一整块木头，镜头从上往下看 */
function desk(k: Kit) {
  k.add(box(9, 0.2, 6, 0xb9824f, 0), 0, TOP - 0.2, 0);
  for (let i = 0; i < 6; i++) k.add(box(9, 0.004, 0.02, 0x9a6a3c, 0), 0, TOP, -2.5 + i);
}
const text = (lines: [string, number, number][], color?: string) => (c: CanvasRenderingContext2D, W: number, H: number) => lines.forEach(([s, y, size]) => writeLine(c, W, H, s, y, size, color));
/** 纸片滑入：e 从 0 到 1，从 from 滑到 to（带一点回弹） */
const slide = (m: THREE.Object3D, e: number, from: [number, number], to: [number, number], y: number, rot = 0) => {
  const b = backOut(e);
  m.visible = e > 0.001;
  m.position.set(lerp(from[0], to[0], b), y, lerp(from[1], to[1], b));
  m.rotation.y = rot * b;
};

export const SHOTS: ShotDef[] = [
  {
    id: 'C01', look: 'forest', title: '伞下的空隙', cast: ['whale', 'doubao'],
    note: '雨里，豆包举着伞，鲸鱼娘站在伞沿外面——伞和她头顶之间空着一截。这是上一集留下没修的事。',
    build: (k) => {
      const { rn, hold } = street(k);
      const whale = k.actor('whale'), doubao = k.actor('doubao');
      const rings = [0, 1, 2].map(() => k.add(sprite('ring', 0.5, 0xcfe6ff)));
      const A = cam([0.2, 1.75, 7.6], [0.2, 1.25, 0], 36), B = cam([0.0, 1.6, 6.6], [0.1, 1.25, 0], 34);
      return ({ u, T, line }) => {
        rn.set(T); hold(1.2, 0.3, 0);
        doubao.front(T).at(1.5, 0, 0.3);
        whale.front(T).at(-1.0, 0, 0.35).tilt(Math.sin(T * 19) * 0.012).talk(T, line === 0); // 淋着雨，微微发抖
        rings.forEach((r, i) => { const ph = (T * 1.3 + i / 3) % 1; r.position.set(-1.0 + (i - 1) * 0.5, 0.03 + ph * 0.02, 0.9 + (i % 2) * 0.3); r.scale.setScalar(0.25 + ph * 0.5); setOp(r, (1 - ph) * 0.7); });
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'C02', look: 'forest', title: '去找会算账的', cast: ['whale', 'doubao'],
    note: '鲸鱼娘转身指向街那头的门，门缝里漏出一束光。镜头从两人拉开，把门带进画面。',
    build: (k) => {
      const { dr, rn, hold } = street(k);
      const whale = k.actor('whale'), doubao = k.actor('doubao');
      const A = cam([0.6, 1.6, 6.4], [0.2, 1.2, 0], 35), B = cam([-1.4, 1.9, 8.8], [-1.9, 1.35, -0.6], 38), C = cam([-1.9, 1.85, 8.4], [-2.2, 1.35, -0.8], 37);
      return (f) => {
        const { u, T } = f;
        rn.set(T); hold(1.2, 0.3, 0);
        dr.set(0.34 * ease(seg(u, 0.2, 0.55)));
        doubao.front(T).at(1.5, 0, 0.3);
        // 第 3 句「本鲸要个会算账的」：抬手一指
        whale.set(f.said >= 2 ? 'whale_point' : T % 2.6 < 0.13 ? 'whale_blink' : 'whale_idle').flip().at(-1.0, 0, 0.35).talk(T, f.line >= 0);
        return track([[0, A], [0.55, B], [1, C]], u);
      };
    },
  },
  {
    id: 'C03a', look: 'golden', title: '名单上的名字', cast: [],
    note: '特写：一张纸，上面只有一行名字。',
    build: (k) => {
      desk(k);
      const paper = k.add(sheet(1.2, 0.8, text([['名单', 0.2, 0.13], ['龙娘', 0.6, 0.36]])), 0, TOP + 0.01, 0);
      paper.rotation.y = 0.06;
      const A = cam([0.1, 2.75, 1.3], [0, TOP, 0], 30), B = cam([0.05, 2.45, 1.1], [0, TOP, 0.02], 28);
      return ({ u }) => glide(A, B, u);
    },
  },
  {
    id: 'C03b', look: 'golden', title: '两只沙漏', cast: ['gpt'],
    note: '龙娘站在桌边，面前一大一小两只沙漏，沙子在落。只画沙子，不画刻度。',
    build: (k) => {
      office(k);
      const gpt = k.actor('gpt');
      const small = hourglass(0.44), big = hourglass(0.74);
      k.add(small.g, 1.2, TOP, 0.5); k.add(big.g, 1.8, TOP, 0.2);
      const A = cam([0.1, 1.6, 4.5], [1.9, 1.2, 0.3], 32), B = cam([0.8, 1.48, 3.7], [2.0, 1.2, 0.3], 30);
      return ({ u, T }) => {
        small.set(0.35 + u * 0.25, T); big.set(0.2 + u * 0.04, T);
        gpt.front(T).flip().at(...GPT);
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'C04', look: 'forest', title: '把饭碗端到门口', cast: ['whale', 'doubao'],
    note: '鲸鱼娘端着饭碗走向那扇门，豆包撑着伞跟在旁边——这次伞向她倾过来，伞沿罩住了头顶。碗最后落在门前台阶上。',
    build: (k) => {
      const { dr, rn, hold } = street(k);
      const whale = k.actor('whale'), doubao = k.actor('doubao');
      const bowl = k.add(riceBowl(0.2));
      const A = cam([-0.4, 1.55, 5.0], [-1.3, 1.15, -1.2], 34), B = cam([-2.9, 1.5, 4.3], [-3.2, 1.05, -1.5], 33);
      return ({ u, T }) => {
        rn.set(T); dr.set(0.34);
        const go = ease(seg(u, 0, 0.72));
        const x = lerp(-0.6, -2.9, go), z = -1.3;
        if (go < 1) { whale.walkBy(go * 2.3).flip().at(x, 0, z); doubao.walkBy(go * 2.3).flip().at(x + 1.3, 0, z - 0.05); }
        else { whale.front(T).flip().at(x, 0, z); doubao.front(T).at(x + 1.3, 0, z - 0.05); }
        hold(x + 0.95, z - 0.05, 0.3);
        // 碗：走路时端在身前；站定后落到台阶上
        const down = easeOut(seg(u, 0.74, 0.92));
        bowl.position.set(lerp(x - 0.45, -3.55, down), lerp(0.66, 0.18, down), lerp(z + 0.25, -2.35, down));
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'C05', look: 'golden', title: '翻账本', cast: ['whale', 'gpt'],
    note: '饭碗摆上桌当诚意。龙娘翻开鲸鱼娘的旧账本，只翻了一页就停住，半天没说话；鲸鱼娘在旁边站得笔直。',
    build: (k) => {
      office(k);
      const whale = k.actor('whale'), gpt = k.actor('gpt');
      k.add(riceBowl(0.2), -0.45, TOP, 0.5);
      const nb = notebook(0.6, 0.42); k.add(nb.g, 1.35, TOP, 0.4);
      const A = cam([-0.5, 1.75, 6.6], [0.6, 1.1, 0.2], 36), B = cam([0.9, 1.6, 4.6], [1.5, 1.05, 0.3], 32), C = cam([1.2, 1.5, 4.1], [1.6, 1.05, 0.3], 31);
      return (f) => {
        const { u, T } = f;
        const open = lineU(f, 7); // 第 8 句：翻开封面，再翻一页，然后停住
        nb.cover.rotation.z = ease(seg(open, 0.05, 0.3)) * PI;
        nb.page.rotation.z = ease(seg(open, 0.4, 0.62)) * PI * 0.97;
        whale.front(T).at(...WHALE).talk(T, f.line >= 0);
        gpt.set(open > 0.05 && open < 0.62 ? 'gpt_boss_cast0' : T % 3.1 < 0.14 ? 'gpt_boss_blink' : 'gpt_boss_idle').flip().at(...GPT);
        return track([[0, A], [0.5, B], [1, C]], u);
      };
    },
  },
  {
    id: 'C06', look: 'golden', title: '只有一行字', cast: [],
    note: '账本内页特写：封面掀开，纸上只有一行「没相关经验」；说到「第三十七批」时一张批次条滑进来。不画表格，不出现金额。',
    build: (k) => {
      desk(k);
      k.add(sheet(1.5, 1.0, text([['没相关经验', 0.46, 0.2]])), 0, TOP + 0.01, 0);
      const cover = k.add(box(1.56, 0.03, 1.06, 0x7a4a2c, 0.02), 0, TOP + 0.02, 0);
      const slip = k.add(sheet(0.62, 0.26, text([['第三十七批', 0.5, 0.52]], '#7a2b3a'), '#ffe9a8'));
      const A = cam([0.0, 2.9, 1.35], [0, TOP, 0.0], 30), B = cam([0.1, 2.6, 1.2], [0.06, TOP, 0.04], 28), C = cam([0.2, 2.45, 1.15], [0.14, TOP, 0.08], 27);
      return (f) => {
        const off = ease(seg(lineU(f, 8), 0.05, 0.5)); // 第 9 句：掀开封面
        cover.position.x = -off * 1.75; cover.rotation.y = off * 0.25;
        slide(slip, seg(lineU(f, 10), 0.05, 0.45), [1.7, 0.5], [0.38, 0.3], TOP + 0.025, -0.14);
        return track([[0, A], [0.5, B], [1, C]], f.u);
      };
    },
  },
  {
    id: 'C07', look: 'golden', title: '把数字分清楚', cast: ['whale', 'gpt'],
    note: '龙娘把两只沙漏并排推到桌子中间，再一左一右分开——看的是能不能把数字分清楚。鲸鱼娘点头。',
    build: (k) => {
      office(k);
      const whale = k.actor('whale'), gpt = k.actor('gpt');
      const small = hourglass(0.44), big = hourglass(0.74);
      k.add(small.g); k.add(big.g);
      const A = cam([0.2, 1.75, 6.3], [0.7, 1.1, 0.2], 35), B = cam([0.5, 1.6, 5.0], [0.7, 1.05, 0.2], 33), C = cam([0.6, 1.55, 4.7], [0.65, 1.05, 0.2], 32);
      return (f) => {
        const { u, T } = f;
        const push = ease(seg(lineU(f, 11), 0.3, 0.75)), apart = ease(seg(lineU(f, 12), 0.25, 0.7));
        small.g.position.set(lerp(lerp(1.2, 0.45, push), -0.05, apart), TOP, lerp(0.5, 0.3, push));
        big.g.position.set(lerp(lerp(1.8, 1.0, push), 1.35, apart), TOP, lerp(0.2, 0.25, push));
        small.set(0.6 + u * 0.2, T); big.set(0.24 + u * 0.04, T);
        const moving = (push > 0 && push < 1) || (apart > 0 && apart < 1);
        gpt.set(moving ? 'gpt_boss_cast1' : 'gpt_boss_idle').flip().at(...GPT);
        whale.front(T).at(...WHALE).lift(apart >= 1 ? Math.abs(Math.sin(T * 6)) * 0.07 : 0).talk(T, f.line >= 0); // 分开之后连连点头
        return track([[0, A], [0.5, B], [1, C]], u);
      };
    },
  },
  {
    id: 'C08', look: 'golden', title: '做成画面那天', cast: ['whale', 'gpt'],
    note: '鲸鱼娘指向桌上那台拍 MV 的相机，旁边还摊着图纸。画面里不出现任何金额。',
    build: (k) => {
      office(k);
      const whale = k.actor('whale'), gpt = k.actor('gpt');
      k.add(cameraProp(), -0.2, TOP, 0.4, 0.5);
      [[0.7, 0.35, 0.2], [1.25, 0.6, -0.3], [1.0, -0.05, 0.1]].forEach(([x, z, r], i) => { const p = k.add(sheet(0.5, 0.36, text([[['分镜', '歌词', '动作'][i], 0.5, 0.4]])), x, TOP + 0.01 + i * 0.004, z); p.rotation.y = r; });
      const A = cam([-2.9, 1.65, 5.0], [-0.6, 1.1, 0.4], 33), B = cam([-1.7, 1.5, 4.3], [-0.5, 1.05, 0.4], 31);
      return (f) => {
        const { u, T } = f;
        whale.set(f.line === 13 ? 'whale_point' : T % 2.6 < 0.13 ? 'whale_blink' : 'whale_idle').at(...WHALE).talk(T, f.line >= 0);
        gpt.front(T).flip().at(...GPT);
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'C09', look: 'golden', title: '补的、改的、放一边的', cast: [],
    note: '桌面：图纸一张张推进来——要补鞋的、要改手的；画出多余腿的那张单独滑到桌角，打了个叉。不把那张图当人物展示。',
    build: (k) => {
      desk(k);
      const s1 = k.add(sheet(0.9, 0.62, text([['少了鞋', 0.36, 0.26], ['→ 补', 0.72, 0.2]])));
      const s2 = k.add(sheet(0.9, 0.62, text([['手对不上', 0.36, 0.24], ['→ 改', 0.72, 0.2]])));
      const s3 = k.add(sheet(0.9, 0.62, (c, W, H) => {
        writeLine(c, W, H, '多了腿', 0.42, 0.28);
        c.strokeStyle = '#d7263d'; c.lineWidth = 18; c.lineCap = 'round';
        c.beginPath(); c.moveTo(W * 0.14, H * 0.16); c.lineTo(W * 0.86, H * 0.84); c.moveTo(W * 0.86, H * 0.16); c.lineTo(W * 0.14, H * 0.84); c.stroke();
      }));
      const A = cam([0.1, 3.0, 1.9], [0.1, TOP, 0.1], 34), B = cam([0.5, 2.8, 1.8], [0.4, TOP, 0.05], 33), C = cam([0.9, 2.7, 1.7], [0.75, TOP, 0.0], 32);
      return (f) => {
        const a = lineU(f, 15), b = lineU(f, 16), c = lineU(f, 17);
        slide(s1, seg(a, 0.02, 0.3), [-2.6, 0.4], [-0.75, 0.15], TOP + 0.01, 0.1);
        slide(s2, seg(a, 0.5, 0.8), [-2.6, 0.1], [0.3, 0.05], TOP + 0.014, -0.08);
        // 第三张先滑到中间（第 17 句），再单独推到桌角（第 18 句）
        const aside = ease(seg(c, 0.15, 0.7));
        slide(s3, seg(b, 0.05, 0.4), [-2.6, 0.5], [lerp(1.3, 2.25, aside), lerp(0.3, -0.75, aside)], TOP + 0.018, lerp(0.12, 0.6, aside));
        return track([[0, A], [0.5, B], [1, C]], f.u);
      };
    },
  },
  {
    id: 'C10', look: 'golden', title: '第三十七批', cast: [],
    note: '批次纸越摞越高，最上面压着一张「第三十七批」；旁边另一摞是生成图和补画。两摞都只是纸，画面里唯一的数字是批次条上的编号。',
    build: (k) => {
      desk(k);
      const a = k.add(paperStack(37, 0.6, 0.44), -0.45, TOP, 0.1), b = k.add(paperStack(70, 0.6, 0.44), 0.55, TOP, 0.05);
      const slip = k.add(sheet(0.56, 0.24, text([['第三十七批', 0.5, 0.52]], '#7a2b3a'), '#ffe9a8'));
      const A = cam([-0.5, 1.75, 2.5], [-0.3, 1.0, 0.1], 34), B = cam([0.3, 1.95, 2.9], [0.1, 1.15, 0.1], 34), C = cam([0.6, 2.1, 3.1], [0.2, 1.25, 0.1], 34);
      return (f) => {
        const na = Math.round(lerp(4, 37, seg(lineU(f, 18), 0, 0.8))), nb = Math.round(lerp(0, 70, seg(lineU(f, 19), 0.05, 0.9)));
        a.children.forEach((p, i) => { p.visible = i < na; });
        b.children.forEach((p, i) => { p.visible = i < nb; });
        const on = seg(lineU(f, 18), 0.8, 0.95);
        slip.visible = on > 0;
        slip.position.set(-0.45, TOP + na * 0.014 + 0.012 + (1 - backOut(on)) * 0.5, 0.1); slip.rotation.y = -0.1;
        return track([[0, A], [0.5, B], [1, C]], f.u);
      };
    },
  },
  {
    id: 'C11', look: 'stage', title: '七位伙伴', cast: ['whale', 'claude', 'gpt', 'qwen', 'kimi', 'gemini', 'zai', 'doubao'],
    note: '舞台上七位伙伴站成一排，各自起伏；鲸鱼娘在最前面——姿势都有了，可这顿饭多少钱，没人告诉她。',
    build: (k) => {
      k.add(disc(40, 0x5a3d4f));
      k.add(box(26, 9, 0.6, 0x7a2b3a, 0), 0, 0, -5.2);
      for (let i = 0; i < 13; i++) k.add(box(0.5, 9, 0.3, i % 2 ? 0x8f3545 : 0x6a2433, 0), -12 + i * 2, 0, -4.8);
      k.add(box(14, 0.3, 5, 0x8a5a3c, 0.04), 0, 0, -1.6);
      const ids = ['claude', 'gpt', 'qwen', 'kimi', 'gemini', 'zai', 'doubao'] as const;
      const row = ids.map((id) => k.actor(id));
      const whale = k.actor('whale');
      const spots = ids.map((_, i) => k.add(sprite('glow', 3.2, 0xfff0c0, true, 0.22), (i - 3) * 1.75, 1.2, -1.9));
      const A = cam([0, 2.7, 10.5], [0, 1.4, -0.8], 40), B = cam([0, 1.9, 6.4], [0, 1.25, 0.6], 34), C = cam([0.2, 1.8, 5.8], [0.1, 1.2, 0.8], 33);
      return (f) => {
        const { u, T } = f;
        row.forEach((a, i) => { a.front(T).flip(i > 3).at((i - 3) * 1.75, 0.3, -1.6 - Math.abs(i - 3) * 0.12).lift(Math.max(0, Math.sin(T * 3.2 + i * 0.9)) * 0.12); });
        spots.forEach((s, i) => setOp(s, 0.16 + 0.08 * Math.sin(T * 2 + i)));
        whale.front(T).at(0, 0, 1.4).talk(T, f.line >= 0);
        return track([[0, A], [0.55, B], [1, C]], u);
      };
    },
  },
  {
    id: 'C12a', look: 'golden', title: '小沙漏倒过来', cast: ['gpt'],
    note: '龙娘把小的那只沙漏倒过来，沙子重新开始漏——它管的是几小时里的用量。',
    build: (k) => {
      office(k);
      const gpt = k.actor('gpt');
      const small = hourglass(0.44), big = hourglass(0.74);
      k.add(small.g, -0.05, TOP, 0.3); k.add(big.g, 1.35, TOP, 0.25);
      const A = cam([0.5, 1.55, 4.4], [0.6, 1.1, 0.3], 32), B = cam([-0.1, 1.35, 3.0], [0.0, 1.05, 0.3], 28), C = cam([-0.15, 1.3, 2.8], [-0.02, 1.04, 0.3], 27);
      return (f) => {
        const { u, T } = f;
        const e = seg(lineU(f, 22), 0.3, 0.62);
        if (e < 1) small.flip(e, 0.9, T); else small.set(0.1 + (lineU(f, 22) - 0.62) * 0.2 + lineU(f, 23) * 0.3, T);
        big.set(0.3 + u * 0.03, T);
        gpt.set(e > 0 && e < 1 ? 'gpt_boss_cast0' : 'gpt_boss_idle').flip().at(...GPT);
        return track([[0, A], [0.6, B], [1, C]], u);
      };
    },
  },
  {
    id: 'C12b', look: 'golden', title: '大的翻得慢', cast: ['whale', 'gpt'],
    note: '大沙漏慢慢翻过去，管的是整整一周。两只都还有沙才敢接活；小的一漏空，鲸鱼娘只能干等。',
    build: (k) => {
      office(k);
      const whale = k.actor('whale'), gpt = k.actor('gpt');
      const small = hourglass(0.44), big = hourglass(0.74);
      k.add(small.g, -0.05, TOP, 0.3); k.add(big.g, 1.35, TOP, 0.25);
      const zzz = [0, 1, 2].map(() => k.add(sprite('zzz', 0.5)));
      const A = cam([1.9, 1.5, 3.6], [1.3, 1.12, 0.25], 30), B = cam([0.4, 1.7, 5.8], [0.6, 1.1, 0.2], 35), C = cam([-0.5, 1.6, 5.1], [-0.5, 1.1, 0.4], 33);
      return (f) => {
        const { u, T } = f;
        const e = seg(lineU(f, 24), 0.08, 0.85); // 慢慢翻：占了这一句的大半
        if (e < 1) big.flip(e, 0.85, T); else big.set(0.15 + lineU(f, 25) * 0.02 + lineU(f, 26) * 0.02, T);
        const empty = lineU(f, 26); // 第 27 句：小的漏空了
        small.set(lerp(0.4 + u * 0.3, 1, ease(seg(empty, 0, 0.45))), T);
        gpt.set(e > 0 && e < 1 ? 'gpt_boss_cast0' : 'gpt_boss_idle').flip().at(...GPT);
        const wait = seg(empty, 0.45, 0.6);
        whale.front(T).at(...WHALE).tilt(-0.1 * wait).lift(f.line === 25 ? Math.abs(Math.sin(T * 7)) * 0.1 : 0).talk(T, f.line >= 0 && f.line !== 25);
        zzz.forEach((z, i) => { const ph = (T * 0.5 + i / 3) % 1; z.position.set(WHALE[0] + 0.5 + ph * 0.5, 1.7 + ph * 0.9, WHALE[2] + 0.1); z.scale.setScalar(0.3 + ph * 0.35); setOp(z, wait * (1 - ph)); });
        return track([[0, A], [0.42, B], [1, C]], u);
      };
    },
  },
  {
    id: 'C12c', look: 'golden', title: '额度，不是价目表', cast: ['whale', 'gpt'],
    note: '鲸鱼娘问沙漏值多少钱，龙娘干脆地摇头：翻过去的是额度，不是价目表，也不是谁把朋友忘了。',
    build: (k) => {
      office(k);
      const whale = k.actor('whale'), gpt = k.actor('gpt');
      const small = hourglass(0.44), big = hourglass(0.74);
      k.add(small.g, -0.05, TOP, 0.3); k.add(big.g, 1.35, TOP, 0.25);
      const A = cam([-0.8, 1.65, 5.8], [0.6, 1.1, 0.3], 34), B = cam([1.5, 1.55, 4.7], [2.3, 1.2, 0.4], 31), C = cam([0.6, 1.65, 5.6], [0.8, 1.12, 0.3], 34), D = cam([0.2, 1.7, 6.1], [0.7, 1.1, 0.3], 35);
      return (f) => {
        const { u, T } = f;
        small.set(0.2 + u * 0.4, T); big.set(0.18 + u * 0.03, T);
        whale.set(f.line === 27 ? 'whale_point' : f.said >= 30 ? (Math.floor(T * 2) % 2 ? 'whale_wave' : 'whale_idle') : T % 2.6 < 0.13 ? 'whale_blink' : 'whale_idle').at(...WHALE).talk(T, f.line >= 0);
        const shake = f.line === 28 ? Math.sin(T * 17) * 0.07 : 0; // 第 29 句：摇头摇得很干脆
        gpt.set(f.line === 29 ? 'gpt_boss_cast1' : f.line === 28 ? 'gpt_boss_blink' : 'gpt_boss_idle').flip().at(GPT[0] + shake, 0, GPT[2]);
        return track([[0, A], [0.3, B], [0.72, C], [1, D]], u);
      };
    },
  },
  {
    id: 'C12d', look: 'golden', title: '饭碗倒是标着价', cast: ['whale'],
    note: '饭碗上挂着一张价签（只写一个「价」字，没有数）。墙上的钟走过上午和下午时价签变红，走到中午变绿——鲸鱼娘就挑这时候来回忙活。',
    build: (k) => {
      office(k);
      const whale = k.actor('whale');
      k.add(riceBowl(0.24), -0.2, TOP, 0.45);
      const tags = ['#fffdf4', '#ffb0a8', '#b6efbe'].map((paper) => { const t = k.add(sheet(0.3, 0.2, text([['价', 0.52, 0.66]]), paper), 0.22, TOP + 0.011, 0.62); t.rotation.y = -0.25; return t; });
      const ck = clock(0.75); k.add(ck.g, -0.4, 3.05, -4.42);
      const pile = k.add(paperStack(30, 0.5, 0.36), 1.5, TOP, 0.3);
      const A = cam([-0.5, 1.95, 6.4], [-0.5, 1.75, -1.0], 37), B = cam([-0.8, 1.85, 5.6], [-0.6, 1.65, -1.0], 35), C = cam([-0.3, 1.8, 5.9], [-0.2, 1.5, -0.8], 36);
      return (f) => {
        const { u, T } = f;
        // 钟：第 33 句 九点→十二点；第 34 句 两点→六点；第 35、36 句 十二点→两点
        const h = f.said <= 31 ? 9 : f.said === 32 ? lerp(9, 12, lineU(f, 32)) : f.said === 33 ? lerp(14, 18, lineU(f, 33)) : lerp(12, 14, (lineU(f, 34) + lineU(f, 35)) / 2);
        ck.hh.rotation.z = -((h % 12) / 12) * PI * 2; ck.mh.rotation.z = -(h % 1) * PI * 2;
        const state = f.said === 32 || f.said === 33 ? 1 : f.said >= 34 ? 2 : 0; // 0 平常 / 1 贵（红）/ 2 便宜（绿）
        tags.forEach((t, i) => { t.visible = i === state; });
        // 第 36 句：挑便宜的时候多干活——在桌子和纸堆之间来回走
        const work = f.said >= 35 ? lineU(f, 35) : 0;
        pile.children.forEach((p, i) => { p.visible = i < 6 + Math.round(work * 24); });
        if (work > 0 && work < 1) {
          // x = 0.7·sin(3πw)：来回三趟。步态按「实际走过的路程」播：每四分之一周期走 0.7
          const q = work * 6, full = Math.floor(q), fr = q - full;
          const dist = 0.7 * (full + (full % 2 === 0 ? Math.sin((fr * PI) / 2) : 1 - Math.cos((fr * PI) / 2)));
          whale.walkBy(dist).flip(Math.cos(work * PI * 3) < 0).at(WHALE[0] + Math.sin(work * PI * 3) * 0.7, 0, 0.9);
        }
        else whale.front(T).at(...WHALE).talk(T, f.line >= 0);
        return track([[0, A], [0.5, B], [1, C]], u);
      };
    },
  },
  {
    id: 'C12e', look: 'golden', title: '账单只能老大给', cast: ['whale'],
    note: '图纸再多也换不出一个价钱。米饭是老大买的，账单也只能由老大给——鲸鱼娘把碗收回怀里。',
    build: (k) => {
      office(k);
      const whale = k.actor('whale');
      const bowl = k.add(riceBowl(0.22));
      k.add(paperStack(30, 0.5, 0.36), 0.75, TOP, 0.3); k.add(paperStack(22, 0.5, 0.36), 1.4, TOP, 0.1);
      const A = cam([-0.5, 1.55, 4.6], [-0.6, 1.1, 0.4], 33), B = cam([-1.2, 1.4, 3.5], [-1.4, 1.0, 0.6], 30), C = cam([-1.4, 1.35, 3.2], [-1.55, 1.0, 0.65], 29);
      return (f) => {
        const { u, T } = f;
        const hug = ease(seg(lineU(f, 39), 0.1, 0.6)); // 第 40 句：把碗收回怀里
        bowl.position.set(lerp(-0.25, WHALE[0], hug), lerp(TOP, 0.52, hug), lerp(0.45, WHALE[2] + 0.3, hug));
        whale.front(T).at(...WHALE).talk(T, f.line >= 0);
        return track([[0, A], [0.6, B], [1, C]], u);
      };
    },
  },
  {
    id: 'C12f', look: 'golden', title: '记在纸上的', cast: [],
    note: '特写：一张纸上依次贴上三张条子——批次、返工、站不稳。鲸鱼娘记得清楚的只有这些。',
    build: (k) => {
      desk(k);
      k.add(sheet(1.6, 1.05, text([['记在纸上', 0.16, 0.12]])), 0, TOP + 0.01, 0);
      const slips = ['批次', '返工', '站不稳'].map((s) => k.add(sheet(0.44, 0.26, text([[s, 0.52, 0.5]]), '#ffe9a8')));
      const A = cam([0.0, 2.95, 1.4], [0, TOP, 0.02], 30), B = cam([0.08, 2.65, 1.25], [0.04, TOP, 0.06], 28);
      return (f) => {
        slide(slips[0], seg(lineU(f, 40), 0.3, 0.55), [-1.9, 0.3], [-0.48, 0.12], TOP + 0.02, 0.08);
        slide(slips[1], seg(lineU(f, 40), 0.6, 0.85), [1.9, 0.3], [0.04, 0.16], TOP + 0.024, -0.06);
        slide(slips[2], seg(lineU(f, 41), 0.15, 0.45), [1.9, 0.0], [0.52, 0.1], TOP + 0.028, 0.1);
        return glide(A, B, f.u);
      };
    },
  },
  {
    id: 'C12g', look: 'forest', title: '先把伞撑稳', cast: ['whale', 'doubao', 'gpt'],
    note: '回到雨里：伞稳稳地罩在鲸鱼娘头顶。镜头拉开，门开着，龙娘站在门口。最后一句说完就结束，没有片尾卡。',
    build: (k) => {
      const { dr, rn, hold } = street(k);
      const whale = k.actor('whale'), doubao = k.actor('doubao'), gpt = k.actor('gpt');
      const A = cam([-0.5, 1.6, 4.6], [-0.4, 1.3, 0.2], 32), B = cam([-1.6, 1.9, 8.2], [-1.9, 1.35, -0.6], 37), C = cam([-1.9, 2.0, 8.9], [-2.1, 1.4, -0.8], 38);
      return (f: Frame) => {
        const { u, T } = f;
        rn.set(T); hold(-0.05, 0.3, 0.3);
        dr.set(lerp(0.34, 1, ease(seg(u, 0.3, 0.6))));
        doubao.front(T).at(0.45, 0, 0.3);
        whale.set(f.said >= 43 ? (Math.floor(T * 2) % 2 ? 'whale_wave' : 'whale_idle') : T % 2.6 < 0.13 ? 'whale_blink' : 'whale_idle').at(-0.9, 0, 0.35).talk(T, f.line >= 0);
        gpt.front(T).at(-4.4, 0.18, -2.55).alpha(seg(u, 0.32, 0.4) > 0 ? 1 : 0);
        return track([[0, A], [0.6, B], [1, C]], u);
      };
    },
  },
];
