// build_pets.mjs — 把 Q 版角色库的 AI 生成姿势打包成 pets 格式 spritesheet + pet.json
//
// 格式参照 tqlearning/ai-girl-chatgpt-pets 的自描述结构（网格/行状态/每帧毫秒/方向行），
// 不是官方协议。上游 FORMAT.md 的硬规则在这里同样执行：
//   · 整格写入，行内剩余格全透明；
//   · 归一化只在打包期做一次（统一 standPx / footY / 水平居中）；
//   · 播放期不得再逐帧裁切、重新居中或拉伸。
//
// 用法：node tools/角色Q版库/build_pets.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');

// canvas 依赖装在 tools/engine（package.json 里唯一声明处），本目录不放 node_modules。
// 从 engine 解析，保证从仓库根直接跑本脚本也能用，不依赖软链或 cwd。
const ENGINE = path.join(ROOT, 'tools/engine');
let createCanvas, loadImage;
try {
  const req = createRequire(path.join(ENGINE, 'package.json'));
  ({ createCanvas, loadImage } = await import(pathToFileURL(req.resolve('@napi-rs/canvas')).href));
} catch (err) {
  console.error('缺少 @napi-rs/canvas：先执行 cd tools/engine && npm install');
  throw err;
}
const CHECK = process.argv.includes('--check');
const cast = JSON.parse(fs.readFileSync(path.join(HERE, 'cast.json'), 'utf8'));
const { w: CW, h: CH, columns: COLS, footY: FOOT, standPx: STAND } = cast.cell;

const sha = (buf) => createHash('sha256').update(buf).digest('hex');

/** 边界连通 flood-fill 去白底：只改 alpha，角色 RGB 不动。 */
function cutWhite(canvas) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const idat = ctx.getImageData(0, 0, w, h);
  const d = idat.data;
  const seen = new Uint8Array(w * h);
  const q = new Int32Array(w * h);
  let qs = 0, qe = 0;
  const isBg = (i) => {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return mx > 232 && mn > 226 && mx - mn < 32;
  };
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (seen[p]) return;
    const i = p * 4;
    if (d[i + 3] < 10 || isBg(i)) { seen[p] = 1; q[qe++] = p; }
  };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (qs < qe) {
    const p = q[qs++], x = p % w, y = (p / w) | 0;
    push(x - 1, y); push(x + 1, y); push(x, y - 1); push(x, y + 1);
  }
  for (let p = 0; p < w * h; p++) if (seen[p]) d[p * 4 + 3] = 0;
  ctx.putImageData(idat, 0, 0);
  return canvas;
}

function alphaBox(canvas) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const d = ctx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (d[(y * w + x) * 4 + 3] > 12) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) throw new Error('全透明姿势图');
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** 水平锚点＝可见 bbox 中心。
 *  实测（20 姿势）：bbox 中心 0 次边缘钳制，帧间漂移 idle 2.0px / walk 1.2px / typing 0.0px；
 *  脚底重心锚点反而在 walk_a/b/c＋sleep 上钳制 4 次（迈步时脚底重心横移会把身体推着走）。
 *  故按实测选 bbox 中心，不用脚底重心。 */
function anchorX(box) { return box.x0 + box.w / 2; }

/** 全角色共用一套缩放：以基准站姿定标，其余姿势沿用同一 k。
 *  这样 idle/wave/typing 多帧之间不会忽大忽小，坐姿也如实更矮。 */
function sharedScale(boxes, refPose) {
  const ref = boxes.get(refPose);
  if (!ref) throw new Error(`基准姿势 ${refPose} 不存在`);
  let k = STAND / ref.h;
  for (const [pose, b] of boxes) {
    k = Math.min(k, (CW - 8) / b.w, (FOOT - 4) / b.h);
    if (!Number.isFinite(k) || k <= 0) throw new Error(`${pose} 尺寸异常`);
  }
  return k;
}

/** 一次性归一化到公共格：共用缩放 k、脚底对齐 FOOT、脚底重心对齐格中心。 */
function normalize(canvas, box, k, mirror = false) {
  const dw = box.w * k, dh = box.h * k;
  const dx = CW / 2 - (anchorX(box) - box.x0) * k;
  const clamped = Math.min(Math.max(dx, 2), CW - 2 - dw);
  const cell = createCanvas(CW, CH);
  const ctx = cell.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  if (mirror) { ctx.translate(CW, 0); ctx.scale(-1, 1); }
  ctx.drawImage(canvas, box.x0, box.y0, box.w, box.h, clamped, FOOT - dh, dw, dh);
  return { cell, shifted: Math.abs(clamped - dx) > 0.5 };
}

const report = { schema: 'newday-q-pets/build@1', ok: true, characters: {}, errors: [] };

for (const [id, ch] of Object.entries(cast.characters)) {
  const genDir = path.join(HERE, 'generations', id);
  const outDir = path.join(HERE, 'pets', id);
  const states = Object.entries(ch.states).filter(([, s]) => s.frames.length);
  if (!states.length) {
    report.characters[id] = { skipped: true, reason: '尚无已生成帧；静态纸偶走 fallbackSprite，不冒充图集' };
    console.log('skip', id, '(no generated frames yet)');
    continue;
  }
  // 先把本角色所有姿势抠好量好，再定一个共用缩放，最后逐格写入。
  // 每个姿势只切一次；mirror 状态复用同一源姿势的镜像格。
  const raw = new Map(), boxes = new Map();
  for (const pose of ch.poses) {
    const file = path.join(genDir, `${pose}.png`);
    if (!fs.existsSync(file)) throw new Error(`${id}/${pose} 缺生成图 ${file}`);
    const img = await loadImage(fs.readFileSync(file));
    const c = createCanvas(img.width, img.height);
    c.getContext('2d').drawImage(img, 0, 0);
    const cut = cutWhite(c);
    const box = alphaBox(cut);
    raw.set(pose, cut); boxes.set(pose, box);
  }
  const refPose = ch.referencePose && boxes.has(ch.referencePose) ? ch.referencePose : ch.poses[0];
  const K = sharedScale(boxes, refPose);
  const shiftedPoses = [];
  const poseCache = new Map();
  const loadPose = async (pose, mirror) => {
    const key = `${pose}${mirror ? ':m' : ''}`;
    if (poseCache.has(key)) return poseCache.get(key);
    if (!raw.has(pose)) throw new Error(`${id}/${pose} 未登记在 poses`);
    const { cell, shifted } = normalize(raw.get(pose), boxes.get(pose), K, mirror);
    if (shifted && !shiftedPoses.includes(pose)) shiftedPoses.push(pose);
    poseCache.set(key, cell);
    return cell;
  };

  const rows = states.length;
  const sheet = createCanvas(COLS * CW, rows * CH);
  const sctx = sheet.getContext('2d');
  const animations = [];
  const poseSha = {};
  for (let r = 0; r < states.length; r++) {
    const [name, st] = states[r];
    if (st.frames.length > COLS) throw new Error(`${id}/${name} 帧数 ${st.frames.length} 超列数 ${COLS}`);
    if (st.frames.length !== st.durationsMs.length) throw new Error(`${id}/${name} 帧数与时长数不一致`);
    for (let c = 0; c < st.frames.length; c++) {
      const cell = await loadPose(st.frames[c], !!st.mirror);
      sctx.drawImage(cell, c * CW, r * CH);
    }
    animations.push({
      state: name, cn: st.cn, kind: st.kind, row: r,
      frame_count: st.frames.length, frame_durations_ms: st.durationsMs,
      loop: !!st.loop, source_poses: st.frames, mirrored: !!st.mirror,
    });
  }
  for (const pose of ch.poses) {
    const f = path.join(genDir, `${pose}.png`);
    if (fs.existsSync(f)) poseSha[pose] = sha(fs.readFileSync(f));
  }
  fs.mkdirSync(outDir, { recursive: true });
  const sheetBuf = sheet.toBuffer('image/png');
  const pet = {
    schema: 'newday-q-pets/pet@1',
    format_reference: 'tqlearning/ai-girl-chatgpt-pets FORMAT.md（自描述结构参照，非官方协议）',
    id, name: ch.name, role: ch.role,
    design_source: ch.designSource,
    art_origin: 'AI 生成重绘（用户授权）；非上游原画，不主张官方授权',
    grid: { columns: COLS, rows, cell_width: CW, cell_height: CH },
    anchor: { foot_y: FOOT, stand_px: STAND, center_x: CW / 2 },
    playback_rules: [
      '整格绘制，禁止逐帧 autocrop / recenter / stretch',
      '行内未使用格保持全透明',
      '公共脚底 foot_y，切换状态不跳位',
      '禁止整图 bounce/hop/sway 冒充动画',
    ],
    animations,
    generated_poses_sha256: poseSha,
    pending_poses: ch.pending,
    integrity: { spritesheet_sha256: sha(sheetBuf), width: sheet.width, height: sheet.height },
  };
  fs.writeFileSync(path.join(outDir, 'spritesheet.png'), sheetBuf);
  fs.writeFileSync(path.join(outDir, 'pet.json'), JSON.stringify(pet, null, 2) + '\n');
  report.characters[id] = {
    states: animations.length,
    frames: animations.reduce((a, b) => a + b.frame_count, 0),
    cycles: animations.filter((a) => a.kind === 'cycle').map((a) => a.state),
    normalization: {
      referencePose: refPose, sharedScale: Number(K.toFixed(6)),
      anchor: 'bbox-center', standPxActual: Number((boxes.get(refPose).h * K).toFixed(2)),
      edgeClampedPoses: shiftedPoses,
    },
    sheet: `pets/${id}/spritesheet.png`, bytes: sheetBuf.length,
    sha256: pet.integrity.spritesheet_sha256,
  };
  console.log('built', id, animations.length, 'states,', report.characters[id].frames, 'frames', `${sheet.width}x${sheet.height}`);
}

// 同屏人数上限是硬约束，写进构建报告供门禁引用。
report.maxOnScreen = cast.maxOnScreen;
report.appliesFrom = cast.appliesFrom;
if (cast.maxOnScreen !== 2) { report.ok = false; report.errors.push('maxOnScreen 必须为 2'); }
fs.writeFileSync(path.join(HERE, 'build_report.json'), JSON.stringify(report, null, 2) + '\n');
if (CHECK) console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(2);
