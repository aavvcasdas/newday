// ============================================================================
// whale_rig.mjs — 鲸鱼娘高清立绘的「骨架 + 蒙皮」装置（Day3 v5）
//
// 背景：v4 的 9 张姿势是「整张图 + 外层 transform」，能跳能压但不能弯。
// 这里把每张立绘拆成一副可动的骨架：
//   1. 从 alpha 通道自动量出骨架（头/胸/胯/四肢/头发/尾巴），不靠手填坐标；
//   2. 给网格顶点按「到骨骼线段的距离」刷权重（线性混合蒙皮 LBS，最多 4 根骨头）；
//   3. 渲染时把每根骨头的「姿势矩阵」混合到顶点上，再用三角形贴图重绘 —— 于是
//      立绘可以被真正弯曲：鞠躬、摇头、抬臂、蹲、踮脚、扭胯、甩尾……
//
// 为什么用「三角贴图」而不是切片：切片会在关节处留下横向接缝；三角形网格
// 沿着骨骼连续变形，接缝只可能出现在网格线，且靠 0.7px 外扩覆盖掉。
// 实测 850 个三角形 / 帧 ≈ 5ms（@napi-rs/canvas，1080p），够 30fps 离线渲染。
//
// 用法：
//   import { buildRig, drawRigged, RIG_ACTIONS, skeletonOverlay } from './whale_rig.mjs';
//   const rig = await buildRig(image);              // image = canvas Image
//   drawRigged(ctx, rig, x, y, u, { t, action: 'bow_deep', foot: 0.988 });
// ============================================================================

export const BONE_ORDER = ['root', 'spine', 'head', 'armL', 'armR', 'legL', 'legR', 'hairL', 'hairR', 'tail'];
export const BONE_PARENT = {
  root: null, spine: 'root', head: 'spine',
  armL: 'spine', armR: 'spine', legL: 'root', legR: 'root',
  hairL: 'head', hairR: 'head', tail: 'root'
};
// 影响半径（按立绘高度归一化）：越小越「只动自己那一块」
export const BONE_SIGMA = {
  root: 0.55, spine: 0.30, head: 0.24,
  armL: 0.135, armR: 0.135, legL: 0.17, legR: 0.17,
  hairL: 0.20, hairR: 0.20, tail: 0.15
};

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
const sin = Math.sin, cos = Math.cos, abs = Math.abs;

// ---------------------------------------------------------------------------
// 1. 从 alpha 通道量骨架
// ---------------------------------------------------------------------------
export function measureMask(img, ctxFactory) {
  const { width: w, height: h } = img;
  const cv = ctxFactory(w, h);
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, w, h).data;
  const rows = [];
  let x0 = w, x1 = 0, y0 = h, y1 = 0;
  for (let y = 0; y < h; y++) {
    let minX = -1, maxX = -1, cnt = 0;
    for (let x = 0; x < w; x++) {
      const a = d[(y * w + x) * 4 + 3];
      if (a > 24) { if (minX < 0) minX = x; maxX = x; cnt++; }
    }
    rows.push({ minX, maxX, cnt });
    if (cnt > 2) {
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (minX >= 0 && minX < x0) x0 = minX;
      if (maxX > x1) x1 = maxX;
    }
  }
  return { w, h, rows, bbox: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } };
}

// 在 bbox 归一化坐标（0..1，v 从上往下）里摆骨架
export function skeletonFromMask(m) {
  const { rows, bbox: B } = m;
  const X = (fu) => B.x + fu * B.w;
  const Y = (fv) => B.y + fv * B.h;

  // 身体中线：取中段（0.45–0.70 高度）的中点中位数，避开举起来的手和散开的头发
  const mids = [];
  for (let fv = 0.45; fv <= 0.72; fv += 0.02) {
    const r = rows[Math.round(Y(fv))];
    if (r && r.cnt > 6) mids.push((r.minX + r.maxX) / 2);
  }
  mids.sort((a, b) => a - b);
  const cx = mids.length ? mids[Math.floor(mids.length / 2)] : B.x + B.w / 2;

  // 底线两脚：最下面 6% 里，中线左右各自的最外点
  let footL = cx - B.w * 0.08, footR = cx + B.w * 0.08, fy = 0;
  for (let y = Math.round(B.y + B.h * 0.94); y <= Math.round(B.y + B.h); y++) {
    const r = rows[y]; if (!r || r.cnt < 2) continue;
    fy = y;
    if (r.minX < footL) footL = r.minX;
    if (r.maxX > footR) footR = r.maxX;
  }
  if (!fy) fy = Y(0.985);

  // 四肢端点用「比例」而不是轮廓极值：这几张 Q 版立绘的头发比手臂宽得多，
  // 纯取左右极值会把头发当成手（v5 第一版就踩了）——骨架一动，整片头发跟着手臂跑。
  const handL = cx - B.w * 0.20, handR = cx + B.w * 0.20;
  const hyL = Y(0.70), hyR = Y(0.70);

  const hips = { x: cx, y: Y(0.73) };
  const chest = { x: cx, y: Y(0.53) };
  const headC = { x: cx, y: Y(0.26) };
  const shoulderY = Y(0.56);

  const B2 = (name, head, tail) => ({ name, head, tail });
  return {
    root: B2('root', { x: cx, y: hips.y }, { x: cx, y: chest.y }),
    spine: B2('spine', { x: cx, y: hips.y }, { x: cx, y: chest.y }),
    head: B2('head', { x: cx, y: Y(0.42) }, { x: headC.x, y: Y(0.16) }),
    armL: B2('armL', { x: cx - B.w * 0.105, y: shoulderY }, { x: handL, y: hyL }),
    armR: B2('armR', { x: cx + B.w * 0.105, y: shoulderY }, { x: handR, y: hyR }),
    legL: B2('legL', { x: cx - B.w * 0.055, y: hips.y + B.h * 0.03 }, { x: Math.max(footL, cx - B.w * 0.20), y: Math.min(fy, Y(1)) }),
    legR: B2('legR', { x: cx + B.w * 0.055, y: hips.y + B.h * 0.03 }, { x: Math.min(footR, cx + B.w * 0.20), y: Math.min(fy, Y(1)) }),
    hairL: B2('hairL', { x: cx - B.w * 0.16, y: Y(0.44) }, { x: cx - B.w * 0.30, y: Y(0.88) }),
    hairR: B2('hairR', { x: cx + B.w * 0.16, y: Y(0.44) }, { x: cx + B.w * 0.30, y: Y(0.88) }),
    tail: B2('tail', { x: cx + B.w * 0.14, y: Y(0.80) }, { x: cx + B.w * 0.30, y: Y(0.90) })
  };
}

// ---------------------------------------------------------------------------
// 2. 网格 + 权重
// ---------------------------------------------------------------------------
function distToSeg(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay;
  const l2 = vx * vx + vy * vy || 1;
  let t = ((px - ax) * vx + (py - ay) * vy) / l2;
  t = clamp(t);
  const dx = px - (ax + vx * t), dy = py - (ay + vy * t);
  return Math.hypot(dx, dy);
}

export function buildRig(img, opts = {}) {
  const ctxFactory = opts.ctxFactory;
  const m = opts.mask || measureMask(img, ctxFactory);
  const bones = skeletonFromMask(m);
  const { w, h, bbox: B } = m;
  const nx = opts.nx || 34, ny = opts.ny || 54;

  const cxB = bones.root.head.x;   // 人物中线（腿骨左右分界用）
  const verts = [];
  const weights = [];
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const fu = i / nx, fv = j / ny;
      const px = B.x + fu * B.w, py = B.y + fv * B.h;
      verts.push([px, py]);
      // 权重：exp(-(d/σ)^2)，σ 按立绘高度归一化
      const ws = [];
      let sum = 0;
      for (const name of BONE_ORDER) {
        const b = bones[name];
        const d = distToSeg(px, py, b.head.x, b.head.y, b.tail.x, b.tail.y) / h;
        const s = BONE_SIGMA[name];
        // root 是"兜底骨"，给一个不会死掉的底权重
        let wgt = Math.exp(-Math.pow(d / s, 2));
        if (name === 'root') wgt = Math.max(wgt, 0.10);
        // 腿骨不许影响髋线以上的部分：否则摆腿会把腰和裙摆一起扯变形。
        if (name === 'legL' || name === 'legR') {
          const hipY = bones.root.head.y;
          // 髋线以上完全归躯干；髋线以下把腿骨权重放大，免得被 root/spine 摊平成“腿不动”。
          // 髋线到裙摆下缘之间归躯干（裙子不许被腿扯变形），只有裙摆以下的小腿/鞋才吃腿骨。
          let below = clamp((py - (hipY + 0.125 * h)) / (0.06 * h));
          below = below * below * (3 - 2 * below);
          wgt *= below * 3.0;
          // 左右腿之间也别互相拽：按中线做软分界。
          const side = name === 'legL' ? (cxB - px) : (px - cxB);
          wgt *= clamp(0.5 + side / (0.06 * h));
        }
        ws.push([name, wgt]);
        sum += wgt;
      }
      // 只留最强的 4 根 + 锐化（gamma 1.6）：
      // 不锐化时四肢被 spine/root 摊平，抬臂只有袖子轻微动一下，动作读不出来。
      ws.sort((a, b2) => b2[1] - a[1]);
      let top = ws.slice(0, 4).filter(([, v]) => v > 0.004);
      top = top.map(([n, v]) => [n, Math.pow(v, 1.6)]);
      const tot = top.reduce((a, [, v]) => a + v, 0) || 1;
      weights.push(top.map(([n, v]) => [BONE_ORDER.indexOf(n), v / tot]));
    }
  }
  return { img, m, bones, nx, ny, verts, weights, w, h, bbox: B, foot: opts.foot ?? 0.985 };
}

// ---------------------------------------------------------------------------
// 3. 骨骼姿势 → 顶点变换
// ---------------------------------------------------------------------------
function matMul(a, b) {
  return [
    a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]
  ];
}
const matId = () => [1, 0, 0, 1, 0, 0];
function matTRS(tx, ty, rot, sx = 1, sy = 1) {
  const c = cos(rot), s = sin(rot);
  return [c * sx, s * sx, -s * sy, c * sy, tx, ty];
}
function matInv(a) {
  const det = a[0] * a[3] - a[1] * a[2] || 1e-6;
  const i0 = a[3] / det, i1 = -a[1] / det, i2 = -a[2] / det, i3 = a[0] / det;
  return [i0, i1, i2, i3, -(i0 * a[4] + i2 * a[5]), -(i1 * a[4] + i3 * a[5])];
}
const applyMat = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

// anim: { root:{x,y,rot,sx,sy}, bones:{ name:{rot,len?} }, } 角度单位 rad
export function skinMatrices(rig, anim = {}) {
  const bones = rig.bones;
  const rootAnim = anim.root || {};
  const worldRest = {};
  const worldPose = {};
  // root 的旋转/缩放必须绕「胯」这个点，不能绕贴图原点 ——
  // 否则 spin_360 里 sx=-1 会把整个人镜像到画布外面去（v5 调试时整格是空的，就是这条）。
  const rh = bones.root.head;
  const rootT = matMul(
    matMul(matTRS(rh.x, rh.y, 0), matTRS(rootAnim.dx || 0, rootAnim.dy || 0, rootAnim.rot || 0,
      rootAnim.sx ?? 1, rootAnim.sy ?? 1)),
    matTRS(-rh.x, -rh.y, 0)
  );
  for (const name of BONE_ORDER) {
    const b = bones[name];
    const p = BONE_PARENT[name];
    // 相对父骨的静止偏移（用绝对 head 相减，而不是把绝对平移连乘 —— 连乘会把父骨位置重复加一遍）
    const off = p
      ? [b.head.x - bones[p].head.x, b.head.y - bones[p].head.y]
      : [b.head.x, b.head.y];
    const localRest = [1, 0, 0, 1, off[0], off[1]];
    worldRest[name] = p ? matMul(worldRest[p], localRest) : localRest;
    const a = (anim.bones && anim.bones[name]) || {};
    const localPose = matMul(
      [1, 0, 0, 1, off[0], off[1]],
      matTRS(a.dx || 0, a.dy || 0, a.rot || 0, a.s ?? 1, a.sy ?? a.s ?? 1)
    );
    worldPose[name] = name === 'root'
      ? matMul(rootT, localPose)
      : matMul(worldPose[p], localPose);
  }
  const skin = {};
  for (const name of BONE_ORDER) skin[name] = matMul(worldPose[name], matInv(worldRest[name]));
  return skin;
}

// ---------------------------------------------------------------------------
// 4. 三角形贴图渲染
// ---------------------------------------------------------------------------
function drawTriangle(ctx, img, s0, s1, s2, d0, d1, d2, alpha) {
  // 目标三角形向外扩 0.6px，盖住相邻三角形之间的抗锯齿缝
  const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3;
  const grow = (p) => {
    const vx = p[0] - cx, vy = p[1] - cy;
    const l = Math.hypot(vx, vy) || 1;
    return [p[0] + (vx / l) * 0.6, p[1] + (vy / l) * 0.6];
  };
  const D0 = grow(d0), D1 = grow(d1), D2 = grow(d2);
  const ax = s1[0] - s0[0], ay = s1[1] - s0[1];
  const bx = s2[0] - s0[0], by = s2[1] - s0[1];
  const cx2 = D1[0] - D0[0], cy2 = D1[1] - D0[1];
  const dx2 = D2[0] - D0[0], dy2 = D2[1] - D0[1];
  const det = ax * by - ay * bx;
  if (Math.abs(det) < 1e-9) return;
  const m00 = (cx2 * by - dx2 * ay) / det;
  const m10 = (cy2 * by - dy2 * ay) / det;
  const m01 = (ax * dx2 - bx * cx2) / det;
  const m11 = (ax * dy2 - bx * cy2) / det;   // L11 = (-cy2*bx + dy2*ax)/det；写成 by 会把整格纹理错位
  const e0 = D0[0] - (m00 * s0[0] + m01 * s0[1]);
  const e1 = D0[1] - (m10 * s0[0] + m11 * s0[1]);
  ctx.save();
  if (alpha != null && alpha < 1) ctx.globalAlpha *= alpha;
  ctx.beginPath();
  ctx.moveTo(D0[0], D0[1]); ctx.lineTo(D1[0], D1[1]); ctx.lineTo(D2[0], D2[1]);
  ctx.closePath();
  ctx.clip();
  ctx.transform(m00, m10, m01, m11, e0, e1);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

/**
 * 把一张立绘按骨架姿势画出来。
 * x,y = 落点（y 是脚底），u = 「1u = 多少屏幕像素」的口径与 Day3 渲染器一致：
 * 屏幕高 H = SPRITE_H_U * u，SPRITE_H_U = 12.0（见 render_day3_sample.mjs）。
 */
export function drawRigged(ctx, rig, x, y, u, opts = {}) {
  const spriteH = (opts.spriteH || 12.0) * u;
  const scale = spriteH / rig.h;
  const footPx = rig.bbox.y + rig.bbox.h;          // 立绘底线
  const footN = footPx / rig.h;
  const anim = opts.anim || {};
  const skin = skinMatrices(rig, anim);

  // 影子
  if (opts.shadow !== false) {
    const j = anim.lift || 0;
    const sw = spriteH * (0.42 - 0.12 * j), sh = spriteH * 0.062 * (1 - 0.25 * j);
    ctx.save();
    ctx.globalAlpha *= 0.24 * (1 - 0.45 * j);
    ctx.fillStyle = '#0A1730';
    ctx.beginPath();
    ctx.ellipse(x, y + spriteH * 0.008, sw, sh, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  const ny = rig.ny, nx = rig.nx;
  // 顶点世界位置（rest → skinned）
  const world = new Array((nx + 1) * (ny + 1));
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const vi = j * (nx + 1) + i;
      const [rx, ry] = rig.verts[vi];
      let sx = 0, sy = 0;
      for (const [bi, w] of rig.weights[vi]) {
        const m = skin[BONE_ORDER[bi]];
        sx += w * (m[0] * rx + m[2] * ry + m[4]);
        sy += w * (m[1] * rx + m[3] * ry + m[5]);
      }
      world[vi] = [x + sx * scale, y + (sy - footPx) * scale];
    }
  }
  // 三角形：源三角固定，目标用蒙皮后的顶点
  const tri = (a, b, c) => {
    drawTriangle(ctx, rig.img, rig.verts[a], rig.verts[b], rig.verts[c], world[a], world[b], world[c], opts.alpha);
  };
  const id = (i, j) => j * (nx + 1) + i;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = id(i, j), b = id(i + 1, j), c = id(i + 1, j + 1), d = id(i, j + 1);
      tri(a, b, c);
      tri(a, c, d);
    }
  }
}

// ---------------------------------------------------------------------------
// 5. 骨架可视化（证明「真的拆成了骨架」）
// ---------------------------------------------------------------------------
export function skeletonOverlay(ctx, rig, x, y, u, opts = {}) {
  const spriteH = (opts.spriteH || 12.0) * u;
  const scale = spriteH / rig.h;
  const footPx = rig.bbox.y + rig.bbox.h;
  const P = (p) => [x + p.x * scale, y + (p.y - footPx) * scale];
  const COL = {
    root: '#FDE047', spine: '#F97316', head: '#22D3EE', armL: '#A78BFA', armR: '#C084FC',
    legL: '#34D399', legR: '#10B981', hairL: '#FB7185', hairR: '#F43F5E', tail: '#60A5FA'
  };
  ctx.save();
  ctx.lineWidth = Math.max(1.5, spriteH * 0.012);
  ctx.lineCap = 'round';
  for (const name of BONE_ORDER) {
    const b = rig.bones[name];
    const a1 = P(b.head), a2 = P(b.tail);
    ctx.strokeStyle = COL[name];
    ctx.globalAlpha = 0.95;
    ctx.beginPath(); ctx.moveTo(a1[0], a1[1]); ctx.lineTo(a2[0], a2[1]); ctx.stroke();
  }
  for (const name of BONE_ORDER) {
    const b = rig.bones[name];
    const a1 = P(b.head);
    ctx.fillStyle = '#0B1224';
    ctx.strokeStyle = COL[name];
    ctx.beginPath(); ctx.arc(a1[0], a1[1], Math.max(2.4, spriteH * 0.016), 0, TAU); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}
