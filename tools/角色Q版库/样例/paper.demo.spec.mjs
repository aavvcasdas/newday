// 纸艺 Q 版通用模板结构样例（不是真集，不建 Day13/ 目录，不出正式成片）
// 用途：验证 Day13+ 通用模板可跑通——pets 真帧表演、同屏 ≤2 人、逐镜构造字段、纸艺场景。
// 台词是样例台词；day=13 只为满足 paperVersion 契约的适用范围检查。
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const script = fs.readFileSync(new URL('./demo_script.txt', import.meta.url), 'utf8');
const sourceScriptSha256 = createHash('sha256').update(script).digest('hex');

const whale = (states, extra = {}) => ({ id: 'whale', x: 620, y: 920, h: 400, states, ...extra });
const bean = (extra = {}) => ({ id: 'doubao', x: 1300, y: 920, h: 380, states: [{ state: 'idle' }], flip: true, ...extra });
const dir = (o) => ({
  kind: 'prop', settleSeconds: 0.1, holdSeconds: 0.4,
  trigger: '按词点触发可见事件', reaction: '按语义改变真帧状态',
  exit: '保留桌面结果', transition: '切下一镜观察重点',
  continuity: { in: '承接上一镜桌面', out: '结果延续到下一镜' }, ...o,
});

export default {
  day: 13, paperVersion: 1, status: 'planning', measured: false,
  title: '纸艺Q版结构样例', speaker: '本鲸', maxOnScreen: 2,
  sourceScriptSha256, estimatedRate: 3.35, tailSeconds: 0.24,
  shots: [
    {
      id: 'C01', fromLine: 1, toLine: 1, framing: 'wide', set: 'sea_room',
      direction: dir({ kind: 'staging', focus: '纸艺海底书桌全景', entry: '本鲸已在画面左侧', action: '本鲸走向桌前停稳', result: '停在桌角，桌面纸未动', wordLine: 1, wordChar: '纸', holdSeconds: 0.5 }),
      actors: [whale([{ state: 'walk-right', dur: 1.4 }, { state: 'idle' }], { x: 620, walk: { from: 300, to: 620, dur: 1.4 } })],
      props: [{ kind: 'desk', x: 640, y: 720, w: 660 }, { kind: 'plant', x: 1740, y: 880, scale: 1.3 }],
    },
    {
      id: 'C02', fromLine: 2, toLine: 2, framing: 'medium', set: 'sea_room',
      direction: dir({ focus: '昨天的纸摊在桌面', entry: '承接停稳', action: '纸张入场落桌，本鲸低头思考', result: '纸面停稳可读', wordLine: 2, wordChar: '纸' }),
      actors: [whale([{ state: 'think' }], { x: 560 })],
      props: [{ kind: 'desk', x: 640, y: 720, w: 660 }, { kind: 'sheet', x: 760, y: 560, w: 400, h: 190, title: '昨天筛过的', rows: ['还没核对完'], enterAt: 0.2 }],
    },
    {
      id: 'C03', fromLine: 3, toLine: 3, framing: 'two_shot', set: 'sea_room',
      direction: dir({ kind: 'staging', focus: '豆包入场，两人分居桌两侧', entry: '豆包从右侧入画', action: '豆包站定等待，本鲸保持思考', result: '双人关系建立，同屏仅两人', wordLine: 3, wordChar: '豆', holdSeconds: 0.5 }),
      actors: [whale([{ state: 'think', dur: 0.8 }, { state: 'idle' }], { x: 560 }), bean()],
      props: [{ kind: 'desk', x: 640, y: 720, w: 660 }, { kind: 'bowl', x: 1180, y: 700, scale: 1.1 }],
    },
    {
      id: 'C04', fromLine: 4, toLine: 4, framing: 'close', set: 'sea_room',
      direction: dir({ focus: '指向没核对的那一条', entry: '承接双人', action: '本鲸指证真帧，纸上圈记出现', result: '圈记留在纸面', wordLine: 4, wordChar: '指' }),
      actors: [whale([{ state: 'point' }], { x: 640, h: 430 })],
      props: [{ kind: 'sheet', x: 900, y: 520, w: 420, h: 200, title: '待核对', rows: ['经验是否匹配'], marks: [{ type: 'circle', row: 0, width: 260 }] }],
    },
    {
      id: 'C05', fromLine: 5, toLine: 5, framing: 'two_shot', set: 'sea_room',
      direction: dir({ kind: 'reaction', focus: '没回话后的愣住', entry: '承接圈记', action: '本鲸切震惊真帧，豆包静止不回话', result: '反应停住可读', wordLine: 5, wordChar: '愣', holdSeconds: 0.45 }),
      actors: [whale([{ state: 'shock' }], { x: 600 }), bean({ x: 1320 })],
      props: [{ kind: 'desk', x: 640, y: 720, w: 660 }, { kind: 'sign', x: 1420, y: 600, w: 220, h: 64, text: '没有回话', enterAt: 0.3 }],
    },
    {
      id: 'C06', fromLine: 6, toLine: 6, framing: 'medium', set: 'sea_room',
      direction: dir({ kind: 'reaction', focus: '得意收束', entry: '承接愣住', action: '本鲸切叉腰得意真帧', result: '纸留在桌上，结果停留后锁定', wordLine: 6, wordChar: '得', holdSeconds: 0.75 }),
      actors: [whale([{ state: 'confident_hips' }], { x: 700, h: 420 })],
      props: [{ kind: 'desk', x: 640, y: 720, w: 660 }, { kind: 'sheet', x: 820, y: 560, w: 380, h: 180, title: '留给明天', rows: ['继续核对'] }],
    },
  ],
};
