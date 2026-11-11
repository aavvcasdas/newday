// 样板镜头：草地、小屋、一条路。四个镜头演示 MV 最常用的四件事——片名卡、走位、卡拍动作、片尾渐黑。
// bt 是节拍：bt.pulse 在每一拍落下时是 1、随后衰减到 0；bt.idx 是这一句里的第几拍；bt.down 是重拍。
import { cam, glide, track, type Kit, type ShotDef } from '@tpl/core';
import { cloud, disc, hash, house, lerp, seg, tree } from '@tpl/kit';
import { hill } from '@tpl/sets';

function meadow(k: Kit) {
  k.add(disc(300, 0x86d36b));
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + 0.3; k.add(hill(40 + hash(i) * 26, 16 + hash(i + 3) * 18, i % 2 ? 0x79b98a : 0x6aa9c9), Math.cos(a) * 170, 0, Math.sin(a) * 170); }
  for (let i = 0; i < 7; i++) k.add(cloud(i * 7, 2 + hash(i) * 2), -90 + i * 30, 30 + hash(i + 1) * 16, -100 - hash(i + 2) * 40);
  k.add(house(4.2, 3, 3.6, 0xf3e2c6, 0xd9534f), -6.5, 0, -6);
  k.add(tree(5, 0x4fb85a, 2), 6.5, 0, -5); k.add(tree(4, 0x55c060, 5), -11.5, 0, -2.5); k.add(tree(4.4, 0x6fcf6a, 7), 10.5, 0, 1.5);
}
const sq = (pulse: number, down: boolean) => pulse * 0.07 * (down ? 1 : 0.6);

export const SHOTS: ShotDef[] = [
  {
    id: 'I1', look: 'day', title: '片名', cast: ['whale'], fx: { title: true, whiteOut: true },
    note: '镜头从高处落到草地，鲸鱼娘站在路中间；片名卡叠在画面上，结尾渐白接下一镜。',
    build: (k) => {
      meadow(k);
      const whale = k.actor('whale');
      const A = cam([0, 9, 18], [0, 3, 0], 42), B = cam([0, 2.2, 8.5], [0, 1.2, 0], 36);
      return ({ u, T }) => { whale.front(T).at(0, 0, 0); return glide(A, B, u); };
    },
  },
  {
    id: 'L1', look: 'day', title: '第一、二句', cast: ['whale', 'claude'], fx: { whiteIn: true },
    note: '鲸鱼娘从左走到画面中间，Claude 在右边跟着拍子点头。',
    build: (k) => {
      meadow(k);
      const whale = k.actor('whale'), claude = k.actor('claude');
      const A = cam([-2.5, 1.9, 8], [-0.5, 1.1, 0], 36), B = cam([1.2, 1.7, 6.6], [0.6, 1.1, 0], 34), C = cam([1.8, 1.6, 6.2], [0.7, 1.1, 0], 33);
      return ({ u, T, bt }) => {
        const go = seg(u, 0, 0.55);
        if (go < 1) whale.walkBy(go * 4.2).at(lerp(-4.2, -0.6, go), 0, 0.4);
        else whale.set(bt.idx % 2 ? 'whale_wave' : 'whale_idle').at(-0.6, 0, 0.4).sq(sq(bt.pulse, bt.down));
        claude.front(T).flip().at(2.2, 0, 0.2).sq(sq(bt.pulse, bt.down));
        return track([[0, A], [0.6, B], [1, C]], u);
      };
    },
  },
  {
    id: 'L2', look: 'golden', title: '第三、四句', cast: ['whale', 'claude', 'gemini'], fx: { flash: [0.5] },
    note: '三个人排成一排卡拍起跳，重拍跳得高；中间闪白一次。',
    build: (k) => {
      meadow(k);
      const cast = [k.actor('claude'), k.actor('whale'), k.actor('gemini')];
      const A = cam([0, 1.5, 7.8], [0, 1.2, 0], 36), B = cam([0.8, 2.4, 6.4], [0, 1.3, 0], 34);
      return ({ u, T, bt }) => {
        cast.forEach((a, i) => {
          const mine = bt.idx % 3 === i; // 每一拍轮到一个人跳
          a.front(T).at((i - 1) * 2.1, 0, 0).lift(mine ? Math.sin(bt.phase * Math.PI) * (bt.down ? 0.5 : 0.3) : 0).sq(sq(bt.pulse, bt.down));
        });
        return glide(A, B, u);
      };
    },
  },
  {
    id: 'OUT', look: 'dusk', title: '尾声', cast: ['whale'], fx: { blackOut: true },
    note: '黄昏，鲸鱼娘朝镜头挥手，镜头缓缓升起；片尾字淡入淡出，最后渐黑。',
    build: (k) => {
      meadow(k);
      const whale = k.actor('whale');
      // 机位看向人物头顶上方：人落在画面下三分之一，把中间留给片尾字
      const A = cam([0, 1.7, 6.5], [0, 2.3, 0], 34), B = cam([0, 6, 15], [0, 5.2, 0], 40);
      return ({ u, T }) => { whale.set(Math.floor(T * 2) % 2 ? 'whale_wave' : 'whale_idle').at(0, 0, 0); return glide(A, B, u); };
    },
  },
];
