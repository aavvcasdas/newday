// ============================================================================
// hd_speaker_pack.mjs — 把 Day3 的高清立绘 + 10 骨骨架，接到老项目（video-fx）
// 的「说话人」接口上。
//
// 老项目的场景代码统一调 `WHALE_GIRL.whaleGirl(ctx, x, y, u, o)` 画鲸鱼娘；
// o 里带的 `action` 就是 ACTION_LIST 的 28 个旧动作 id。这里把同一个调用
// 换成「高清立绘做姿势 + 骨骼做动作」，其余参数（dx / dy / t）照旧吃。
// 目的只有一个：说话的人不再是一团像素，但动作谱系和旧版一模一样。
// ============================================================================

import { POSES } from './whale_poses.mjs';
import { buildRig, drawRigged } from './whale_rig.mjs';
import { LEGACY_ACTIONS, motionAt } from './legacy_actions.mjs';

const ACTION_BY_ID = new Map(LEGACY_ACTIONS.map((a) => [a.id, a]));

// 旧项目传进来的 emotion 名，在没有 action 时兜一个像样的姿势
const EMOTION_POSE = {
  happy: 'idle',
  proud: 'confident_hips',
  shy: 'shy_fidget',
  panic: 'shock_petrify',
  focused: 'token_wordle_sneak',
  thinking: 'peek_curious',
  curious: 'peek_curious'
};

export async function createHdSpeaker({ createCanvas, loadImage, dir, spriteH = 8.6, onLog = () => {} }) {
  const rigs = new Map();
  const ctxFactory = (w, h) => createCanvas(w, h);

  async function rigFor(key) {
    if (rigs.has(key)) return rigs.get(key);
    const spec = POSES[key];
    if (!spec) return null;
    const img = await loadImage(`${dir}/${spec.file}`);
    const rig = buildRig(img, { ctxFactory });
    rigs.set(key, rig);
    return rig;
  }

  async function preload(keys) {
    const need = keys && keys.length
      ? keys
      : Array.from(new Set(LEGACY_ACTIONS.flatMap((a) => a.poses.map((p) => p.pose)).concat(['idle', 'wave'])));
    let n = 0;
    for (const k of need) {
      // eslint-disable-next-line no-await-in-loop
      if (await rigFor(k)) n += 1;
    }
    onLog(`[hd-speaker] 预载 ${n} 副高清骨架`);
    return n;
  }

  function resolve(o) {
    const id = o && o.action;
    const act = id ? ACTION_BY_ID.get(id) : null;
    if (act) return { act, poseKey: act.poses[0].pose };
    const byEmotion = o && o.emotion ? EMOTION_POSE[o.emotion] : null;
    return { act: null, poseKey: byEmotion || (o && o.pose) || 'idle' };
  }

  // 与 WHALE_GIRL.whaleGirl(ctx, x, y, u, o) 同签名，返回 true 表示已画
  function draw(ctx, x, y, u, o = {}) {
    const { act, poseKey } = resolve(o);
    const rig = rigs.get(poseKey);
    if (!rig) return false;
    const t = typeof o.t === 'number' ? o.t : (typeof globalThis.__HD_T === 'number' ? globalThis.__HD_T : 0);
    const anim = act ? motionAt(act, t) : {
      root: { sy: 1 + 0.004 * Math.sin(t * 2.1) },
      bones: {
        hairL: { rot: 0.05 * Math.sin(t * 2.2 - 0.7) },
        hairR: { rot: 0.05 * Math.sin(t * 2.0 - 1.1) },
        spine: { rot: 0.008 * Math.sin(t * 1.3) },
        head: { rot: 0.01 * Math.sin(t * 1.1 + 0.4) },
        tail: { rot: 0.10 * Math.sin(t * 1.7) }
      }
    };
    // drawRigged 的 x 是立绘左缘（图片坐标 0 → 屏幕 x），场景给的 x 是人物中线，
    // 这里按内容包围盒把中线对上，免得人物被画到画面右边外面去。
    const scale = (spriteH * u) / rig.h;
    const cx = rig.bbox.x + rig.bbox.w / 2;
    ctx.save();
    if (o.dx || o.dy) ctx.translate(o.dx || 0, (o.dy || 0) * u);
    drawRigged(ctx, rig, x - cx * scale, y, u, { anim, spriteH });
    ctx.restore();
    return true;
  }

  return { preload, draw, rigFor, rigs };
}
