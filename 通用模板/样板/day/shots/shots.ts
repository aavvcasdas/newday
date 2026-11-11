// 样板镜头：一间屋子、一张桌子、两个人。每个镜头 = build（搭景，只跑一次）+ 返回的逐帧函数（摆人、摆道具、给机位）。
// 逐帧函数只许读参数里的时间（u / T / line …），不许用 Math.random、Date.now 或自己累加变量——这样任意跳帧都画得出同一帧。
import { cam, track, type Kit, type ShotDef } from '@tpl/core';
import { ease, lerp, seg } from '@tpl/kit';
import { door, hourglass, plant, riceBowl, room, table, windowPane } from '@tpl/props';

/** 三个镜头共用同一间屋子：每个镜头各搭一份（镜头之间互不影响），返回会动的道具 */
function stage(k: Kit) {
  k.add(room({ w: 12, d: 9 }));
  const dr = door(); k.add(dr.g, -3.6, 0, -4.48);
  k.add(windowPane(), 2.6, 1.5, -4.48);
  k.add(plant(), 5.1, 0, -3.6);
  k.add(table(), 0.6, 0, 0.2);
  k.add(riceBowl(), -0.1, 0.8, 0.35);
  const hg = hourglass(); k.add(hg.g, 1.3, 0.8, 0.2);
  return { dr, hg };
}

export const SHOTS: ShotDef[] = [
  {
    id: 'S1', look: 'golden', title: '推门进屋', cast: ['whale'],
    note: '门推开一道光，鲸鱼娘从门口走到桌边，站定后朝镜头挥手。镜头从全景缓缓推到中景。',
    build: (k) => {
      const { dr, hg } = stage(k);
      const whale = k.actor('whale');
      const A = cam([0.4, 2.6, 10.5], [0, 1.2, -1], 40), B = cam([-0.4, 1.7, 6.6], [-0.9, 1.05, 0], 36);
      return ({ u, T, line }) => {
        dr.set(ease(seg(u, 0, 0.22)));
        hg.set(u * 0.3, T);
        // 走位：门口 → 桌边，用走过的距离驱动步态（脚不打滑）；到位后转正面
        const go = ease(seg(u, 0.1, 0.52));
        const x = lerp(-3.6, -1.5, go), z = lerp(-3.4, 0.9, go);
        if (go < 1) whale.walkBy(go * 4.8).at(x, 0, z);
        else whale.set(u > 0.62 ? 'whale_wave' : 'whale_idle').at(x, 0, z).talk(T, line >= 0);
        return track([[0, A], [1, B]], u);
      };
    },
  },
  {
    id: 'S2', look: 'golden', title: '桌边对谈', cast: ['whale', 'gpt'],
    note: '两人隔着桌子对谈，谁在说话谁就轻轻一颠一颠；沙漏里的沙子一直在落。',
    build: (k) => {
      const { dr, hg } = stage(k);
      const whale = k.actor('whale'), gpt = k.actor('gpt');
      const A = cam([-0.6, 1.7, 7.2], [0.7, 1.05, 0], 36), B = cam([0.9, 1.6, 6.6], [0.7, 1.1, 0], 34), C = cam([1.3, 1.55, 6.3], [0.75, 1.1, 0], 33);
      return ({ u, T, line }) => {
        dr.set(1); hg.set(0.3 + u * 0.5, T);
        // line 是「此刻正在说第几句」（0 起）：样板里第 3、5 句是龙娘说的
        const gptTalks = line === 2 || line === 4;
        whale.front(T).at(-1.5, 0, 0.9).talk(T, line >= 0 && !gptTalks);
        gpt.set(gptTalks ? 'gpt_boss_cast0' : 'gpt_boss_idle').flip().at(2.9, 0, 0.7).talk(T, gptTalks);
        // 运镜关键帧：每一段的起止机位都不一样，镜头始终在缓缓地动（没有完全静止的一帧）
        return track([[0, A], [0.5, B], [1, C]], u);
      };
    },
  },
  {
    id: 'S3', look: 'golden', title: '近景收尾', cast: ['whale', 'gpt'],
    note: '镜头推近鲸鱼娘，她抬手指向镜头；最后一句说完就结束，不加片尾卡。',
    build: (k) => {
      const { dr, hg } = stage(k);
      const whale = k.actor('whale'), gpt = k.actor('gpt');
      const A = cam([0.6, 1.6, 5.2], [-0.4, 1.1, 0], 34), M = cam([0.3, 1.55, 4.9], [-0.6, 1.1, 0.1], 33), B = cam([-0.9, 1.35, 3.9], [-1.3, 1.05, 0.6], 30);
      return ({ u, T, line }) => {
        dr.set(1); hg.set(0.8 + u * 0.2, T);
        gpt.set(line === 4 ? 'gpt_boss_cast1' : 'gpt_boss_blink').flip().at(2.9, 0, 0.7).talk(T, line === 4);
        whale.set(line === 5 ? 'whale_point' : 'whale_idle').at(-1.5, 0, 0.9).talk(T, line === 5);
        return track([[0, A], [0.45, M], [1, B]], u);
      };
    },
  },
];
