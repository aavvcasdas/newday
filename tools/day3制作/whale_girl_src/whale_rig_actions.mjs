// ============================================================================
// whale_rig_actions.mjs — 骨架动作库（v5 新增）
//
// 和 v4 的 WHALE_ACT 的区别：
//   v4 = 整张立绘 + 外层 transform（跳、压、镜像），动作再多也只是「整块在动」；
//   v5 = 骨骼级动作（spine/head/armL/armR/legL/legR/hairL/hairR/tail），立绘会弯、会扭、会甩。
//
// 每个动作 fn(t) 返回：
//   { root: {dx,dy,rot,sx,sy},          // 整体位移/旋转/挤压（单位：立绘像素，不是屏幕像素）
//     bones: { spine:{rot,dx,dy,s}, ... },
//     lift }                            // 0..1，跳起来多少（只影响影子）
// rot 单位是弧度，正值 = 屏幕上顺时针；bones 的旋转绕自己骨头的 head 点。
//
// 这些动作可以叠在 9 张姿势里的任何一张上 —— 同一套骨架，姿势不同，动作通用。
// ============================================================================

const TAU = Math.PI * 2;
const sin = Math.sin, cos = Math.cos, abs = Math.abs;
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
// 0→1→0 的钟形包络（一拍用）
const bump = (x) => (x <= 0 || x >= 1 ? 0 : sin(Math.PI * clamp(x)) ** 1.4);
// 呼吸底噪：任何动作都有一点，不然像贴纸
const breathe = (t, k = 1) => ({ dy: -0.004 * k * sin(t * 2.1), rot: 0.006 * k * sin(t * 1.3) });
// 头发/尾巴的滞后摆动（次级运动），相位比身体晚一点
const lag = (t, amp, freq = 2.4, ph = 0.9) => amp * sin(t * freq - ph);

const mergeHair = (t, out, ampL = 0.05, ampR = 0.05) => {
  out.hairL = { rot: lag(t, ampL, 2.2, 0.7) };
  out.hairR = { rot: lag(t, ampR, 2.0, 1.1) };
  return out;
};

export const RIG_ACTIONS = {
  // ------------------------------------------------------------------ 呼吸
  breathe_idle: {
    label: '呼吸站姿', dur: 2.4,
    fn: (t) => ({
      root: { sy: 1 + 0.004 * sin(t * 2.1) },
      bones: mergeHair(t, {
        spine: { rot: 0.008 * sin(t * 1.3) },
        head: { rot: 0.010 * sin(t * 1.1 + 0.4) },
        tail: { rot: 0.10 * sin(t * 1.7 - 0.5) }
      })
    })
  },

  // ------------------------------------------------------------------ 鞠躬
  bow_deep: {
    label: '深鞠躬', dur: 2.4,
    fn: (t) => {
      const k = bump(t / 1.5);                    // 弯下去再起来
      return {
        root: { dy: 26 * k, sy: 1 - 0.03 * k },
        bones: mergeHair(t, {
          spine: { rot: 0.10 * k },
          head: { rot: 0.22 * k, dy: 10 * k, s: 1 - 0.04 * k },
          armL: { rot: 0.30 * k }, armR: { rot: -0.30 * k },
          tail: { rot: -0.12 * k }
        }, 0.12 * k, -0.12 * k),
        lift: 0
      };
    }
  },

  // ------------------------------------------------------------------ 点头
  nod_yes: {
    label: '点头答应', dur: 2.2,
    fn: (t) => {
      const k = abs(sin(t * 4.2)) ** 1.6;
      return {
        root: {},
        bones: mergeHair(t, {
          head: { rot: 0.05 + 0.16 * k, dy: 7 * k, s: 1 - 0.02 * k },
          spine: { rot: 0.02 + 0.05 * k },
          tail: { rot: 0.08 * sin(t * 3.1) }
        }, 0.04, -0.04)
      };
    }
  },

  // ------------------------------------------------------------------ 摇头
  shake_no: {
    label: '摇头说不', dur: 2.2,
    fn: (t) => {
      const a = sin(t * 5.4);
      const b = sin(t * 5.4 - 0.8);
      return {
        root: { dx: 5 * a },
        bones: {
          head: { rot: 0.10 * a, dx: 12 * a },
          spine: { rot: 0.03 * a },
          armL: { rot: 0.10 * b }, armR: { rot: -0.10 * b },
          hairL: { rot: 0.20 * b }, hairR: { rot: 0.20 * b },
          tail: { rot: 0.10 * sin(t * 3.2) }
        }
      };
    }
  },

  // ------------------------------------------------------------------ 抬臂挥手
  wave_arm: {
    label: '抬臂挥手', dur: 2.4,
    fn: (t) => {
      const w = sin(t * 7.5);
      const up = ease(clamp((t - 0.15) / 0.55));
      return {
        root: { dx: -4 * up, rot: -0.02 * up },
        bones: mergeHair(t, {
          armR: { rot: (-1.35 + 0.30 * w) * up },      // 右臂抬到头侧来回摆
          armL: { rot: 0.10 * up },
          spine: { rot: -0.05 * up },
          head: { rot: -0.05 * up + 0.02 * w * up },
          tail: { rot: 0.14 * sin(t * 2.6) }
        }, 0.06, 0.10 * up)
      };
    }
  },

  // ------------------------------------------------------------------ 招手
  beckon_hand: {
    label: '招招手过来', dur: 2.2,
    fn: (t) => {
      const p = (t * 2.2) % 1;
      const k = bump(p);
      return {
        root: { dx: 6 * k },
        bones: mergeHair(t, {
          armR: { rot: -0.95 * (0.6 + 0.4 * k) },     // 抬起来，手掌向自己扇
          armL: { rot: 0.12 },
          head: { rot: 0.10 * k },
          spine: { rot: 0.04 * k },
          tail: { rot: 0.12 * sin(t * 2.4) }
        }, 0.05, 0.08)
      };
    }
  },

  // ------------------------------------------------------------------ 蓄力跳
  squat_jump: {
    label: '蓄力蹲 → 弹起', dur: 2.6,
    fn: (t) => {
      const crouch = clamp(t / 0.55);
      const air = clamp((t - 0.65) / 0.95);
      const up = air > 0 ? sin(Math.PI * air) : 0;       // 抛物线
      const land = clamp((t - 1.5) / 0.3);
      const squash = crouch * (1 - air) * 0.10 + land * 0.06 * (1 - land);
      return {
        root: { dy: 30 * crouch * (1 - air) - 120 * up, sy: 1 - squash + 0.10 * up, sx: 1 + squash - 0.04 * up },
        bones: {
          legL: { rot: 0.12 * crouch * (1 - air) }, legR: { rot: -0.12 * crouch * (1 - air) },
          spine: { rot: 0.05 * crouch * (1 - air) - 0.04 * up },
          head: { dy: 6 * crouch * (1 - air) - 8 * up, rot: -0.06 * up },
          armL: { rot: -0.30 * up + 0.25 * crouch * (1 - air) },
          armR: { rot: 0.30 * up - 0.25 * crouch * (1 - air) },
          hairL: { rot: 0.25 * up, dy: 14 * up }, hairR: { rot: -0.25 * up, dy: 14 * up },
          tail: { rot: -0.25 * up }
        },
        lift: up
      };
    }
  },

  // ------------------------------------------------------------------ 后仰惊吓
  lean_back: {
    label: '后仰惊吓', dur: 2.2,
    fn: (t) => {
      const k = bump(t / 1.2);
      return {
        root: { dy: -10 * k, rot: -0.04 * k },
        bones: mergeHair(t, {
          spine: { rot: -0.16 * k },
          head: { rot: -0.20 * k, dy: -8 * k },
          armL: { rot: -0.55 * k }, armR: { rot: 0.55 * k },
          legL: { rot: 0.10 * k }, legR: { rot: -0.10 * k },
          tail: { rot: 0.30 * k }
        }, -0.15 * k, 0.15 * k)
      };
    }
  },

  // ------------------------------------------------------------------ 踮脚够高
  tiptoe_reach: {
    label: '踮脚够高处', dur: 2.4,
    fn: (t) => {
      const k = ease(clamp(t / 0.9));
      const w = sin(t * 3.0) * 0.06;
      return {
        root: { dy: -22 * k, sy: 1 + 0.03 * k },
        bones: {
          armR: { rot: -1.55 * k + w }, armL: { rot: -0.35 * k },
          spine: { rot: -0.06 * k }, head: { rot: -0.10 * k, dy: -6 * k },
          legL: { rot: 0.06 * k }, legR: { rot: -0.06 * k },
          hairL: { rot: 0.10 * k + w }, hairR: { rot: -0.10 * k - w },
          tail: { rot: 0.18 * sin(t * 2.2) }
        },
        lift: 0.25 * k
      };
    }
  },

  // ------------------------------------------------------------------ 扭胯
  hip_sway: {
    label: '扭胯摇摆', dur: 2.6,
    fn: (t) => {
      const a = sin(t * 3.4);
      return {
        root: { dx: 22 * a, rot: 0.035 * a },
        bones: {
          spine: { rot: -0.07 * a }, head: { rot: -0.05 * a, dx: -6 * a },
          armL: { rot: 0.22 * a }, armR: { rot: 0.22 * a },
          legL: { rot: -0.05 * a }, legR: { rot: -0.05 * a },
          hairL: { rot: 0.16 * sin(t * 3.4 - 0.7) }, hairR: { rot: 0.16 * sin(t * 3.4 - 0.7) },
          tail: { rot: 0.20 * sin(t * 3.4 - 0.5) }
        }
      };
    }
  },

  // ------------------------------------------------------------------ 转整圈
  spin_360: {
    label: '原地转一整圈', dur: 2.6,
    fn: (t) => {
      const p = clamp((t - 0.2) / 1.9);
      const th = p * TAU;
      const c = cos(th);
      const k = 0.55 + 0.45 * abs(c);                 // 侧对镜头时压窄
      return {
        root: { sx: (c < 0 ? -k : k), sy: 1 + 0.02 * abs(sin(th)), dy: -8 * abs(sin(th)) },
        bones: {
          spine: { rot: 0.05 * sin(th) },
          head: { rot: 0.06 * sin(th + 0.4) },
          armL: { rot: 0.16 * sin(th) }, armR: { rot: 0.16 * sin(th) },
          hairL: { rot: 0.30 * sin(th - 0.5) }, hairR: { rot: 0.30 * sin(th - 0.5) },
          tail: { rot: 0.28 * sin(th - 0.7) }
        },
        lift: 0.2 * abs(sin(th))
      };
    }
  },

  // ------------------------------------------------------------------ 甩尾
  tail_whip: {
    label: '鲸尾甩水', dur: 2.2,
    fn: (t) => ({
      root: { rot: 0.02 * sin(t * 3.2) },
      bones: {
        tail: { rot: 0.55 * sin(t * 3.6) },
        hairL: { rot: 0.16 * sin(t * 3.6 - 0.5) }, hairR: { rot: 0.16 * sin(t * 3.6 - 0.5) },
        spine: { rot: 0.03 * sin(t * 1.8) },
        head: { rot: 0.04 * sin(t * 1.8 - 0.4) }
      }
    })
  },

  // ------------------------------------------------------------------ 泄气
  sigh_collapse: {
    label: '泄气瘫下去', dur: 2.6,
    fn: (t) => {
      const k = ease(clamp((t - 0.2) / 0.9));
      const rebound = 0.03 * sin(t * 2.0) * k;
      return {
        root: { dy: 46 * k, sy: 1 - 0.075 * k, rot: 0.01 * sin(t * 1.6) },
        bones: mergeHair(t, {
          spine: { rot: 0.12 * k },
          head: { dy: 22 * k, rot: 0.10 * k, s: 1 - 0.03 * k },
          armL: { rot: 0.30 * k }, armR: { rot: -0.30 * k },
          legL: { rot: 0.08 * k }, legR: { rot: -0.08 * k },
          tail: { rot: -0.25 * k }
        }, 0.20 * k, -0.20 * k)
      };
    }
  },

  // ------------------------------------------------------------------ 踢腿
  kick_leg: {
    label: '踢一下腿', dur: 2.0,
    fn: (t) => {
      const k = bump((t - 0.25) / 0.7);
      return {
        root: { dx: -6 * k, dy: -6 * k, rot: -0.03 * k },
        bones: {
          legR: { rot: -1.15 * k, s: 1 + 0.06 * k },
          legL: { rot: 0.06 * k },
          spine: { rot: -0.05 * k }, head: { rot: 0.04 * k },
          armL: { rot: -0.45 * k }, armR: { rot: 0.45 * k },
          hairL: { rot: 0.18 * k }, hairR: { rot: -0.18 * k },
          tail: { rot: 0.22 * k }
        },
        lift: 0.15 * k
      };
    }
  },

  // ------------------------------------------------------------------ 歪头比心
  heart_tilt: {
    label: '歪头比心', dur: 2.4,
    fn: (t) => {
      const k = ease(clamp(t / 0.8));
      const w = sin(t * 2.6) * 0.05;
      return {
        root: { rot: 0.03 * k, dx: 4 * k },
        bones: {
          head: { rot: 0.22 * k + w },
          spine: { rot: -0.05 * k },
          armL: { rot: -0.85 * k }, armR: { rot: 0.85 * k },
          hairL: { rot: 0.14 * k + w }, hairR: { rot: 0.10 * k - w },
          tail: { rot: 0.15 * sin(t * 2.2) }
        }
      };
    }
  }
};

export const RIG_ACTION_NAMES = Object.keys(RIG_ACTIONS);

export function rigAnim(name, t) {
  const a = RIG_ACTIONS[name] || RIG_ACTIONS.breathe_idle;
  const anim = a.fn(t) || {};
  anim.bones = anim.bones || {};
  anim.root = anim.root || {};
  return anim;
}
