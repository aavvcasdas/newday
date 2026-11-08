// tools/day14制作/contact_check.mjs — 伞是否真的罩住鲸娘（引擎坐标）
//
// Day13 的状态页写得很清楚：伞面和鲸娘之间还有空隙，伞/手接触没有逐像素标定。
// Day14 的 C04 想把这条空隙收掉。要把「收掉」变成可核验的东西，得先想清楚
// 什么才算罩住，而不是调一个数直到它通过：
//
//   1. 横向：鲸娘的头部轮廓必须完整落在伞面投影的左右边界之内；
//   2. 纵向：伞沿必须**高于**头顶（y 更小），而且高出量落在合理区间——
//      抬太高伞就成了飘在空中的道具，贴太近又会穿过头发。
//
// 两条都满足才算通过。门槛是常量，不随构图调参而变。
//
// 这份报告只覆盖**引擎坐标**：它证明构图数据里没有缝，
// 不证明编码后的画面没缝，更不证明有一只手真的握住了伞柄。

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const OUT = path.join(ROOT, 'tools/day14制作/contact_check.json');

// C04 构图参数，与 tools/mv_dayu/remotion/day14-contact.jsx 必须一致（有测试对账）。
const STAGE = {
  // 立绘按 Day13 的写法定位：顶边 = groundY - height，脚底贴地。
  whale: { x: 620, groundY: 610, height: 395 },
  doubao: { x: 870, groundY: 610, height: 370 },
  // 伞：伞面中心、伞沿高度、半宽、向鲸娘一侧的倾斜角。
  umbrella: { cx: 620, rimY: 176, halfWidth: 170, tiltDeg: -8 },
  // 伞柄位置（豆包伸手够到的那根），单独列出，便于和豆包手部位置对账。
  caneX: 790,
};

// Day12 鲸娘立绘的头顶离图片顶边只有约 1.3%（发饰几乎顶到边），
// 这个比例是从立绘实测出来的，不是「留一点安全边」的估数。
const HEAD_TOP_PADDING = 0.013;
// 头部轮廓半宽：发团最宽处约为身高的 30%。
const HEAD_HALF_WIDTH_RATIO = 0.3;
// 伞沿高出头顶的合理区间（px，720 坐标系）。逐点判，不用全局最低点：
// 低于下限说明伞面压进了头发，高于上限说明伞飘在半空、雨还是会落到身上。
const CLEARANCE_MIN_PX = 2;
const CLEARANCE_MAX_PX = 40;

const rad = (deg) => (deg * Math.PI) / 180;
const r2 = (n) => Math.round(n * 100) / 100;

function build() {
  const { whale, umbrella } = STAGE;
  const headTopY = whale.groundY - whale.height * (1 - HEAD_TOP_PADDING);
  const headHalfW = whale.height * HEAD_HALF_WIDTH_RATIO;
  const headLeft = whale.x - headHalfW;
  const headRight = whale.x + headHalfW;

  // 倾斜后伞面在水平方向的投影收窄。
  const halfSpan = umbrella.halfWidth * Math.cos(rad(umbrella.tiltDeg));
  const canopyLeft = umbrella.cx - Math.abs(halfSpan);
  const canopyRight = umbrella.cx + Math.abs(halfSpan);

  // 伞沿是一条斜线：绕伞柄根部转 tiltDeg 之后，伞沿在 x 处的高度是
  //   rim(x) = rimY + (x - caneX) · sin(tiltDeg)
  // 必须沿着**鲸娘头顶整段宽度**采样。只取全局最低点会漏掉头顶那一侧的真实净空，
  // 之前就因此把 4px 的贴头发当成了通过。
  const rimAt = (x) => umbrella.rimY + (x - STAGE.caneX) * Math.sin(rad(umbrella.tiltDeg));
  const SAMPLES = 9;
  const clearances = Array.from({ length: SAMPLES }, (_, i) => {
    const x = headLeft + ((headRight - headLeft) * i) / (SAMPLES - 1);
    return { x: r2(x), rimY: r2(rimAt(x)), clearancePx: r2(headTopY - rimAt(x)) };
  });
  const minClearance = Math.min(...clearances.map((c) => c.clearancePx));
  const maxClearance = Math.max(...clearances.map((c) => c.clearancePx));

  const horizontallyCovered = headLeft >= canopyLeft && headRight <= canopyRight;
  const verticallyReasonable = minClearance >= CLEARANCE_MIN_PX && maxClearance <= CLEARANCE_MAX_PX;
  const caneReachesDoubao = Math.abs(STAGE.caneX - STAGE.doubao.x) <= STAGE.doubao.height * 0.22;

  return {
    measured: false,
    scope: 'engine coordinates only; not a decoded-frame or hand-contact verification',
    coordinateSpace: '1280x720 viewBox (same as Day13 scenes)',
    stage: STAGE,
    derived: {
      whaleHeadTopY: r2(headTopY),
      whaleHeadLeftX: r2(headLeft),
      whaleHeadRightX: r2(headRight),
      canopyLeftX: r2(canopyLeft),
      canopyRightX: r2(canopyRight),
      clearanceAboveHeadMinPx: r2(minClearance),
      clearanceAboveHeadMaxPx: r2(maxClearance),
      clearanceSamples: clearances,
    },
    checks: {
      horizontallyCovered: { pass: horizontallyCovered, need: '鲸娘头部左右界都在伞面投影内' },
      verticallyReasonable: {
        pass: verticallyReasonable,
        need: `沿头顶整段宽度逐点采样，净空都落在 ${CLEARANCE_MIN_PX}–${CLEARANCE_MAX_PX}px`,
      },
      caneReachesDoubao: { pass: caneReachesDoubao, need: '伞柄在豆包伸手可及范围内' },
    },
    passesGeometry: horizontallyCovered && verticallyReasonable && caneReachesDoubao,
    caveats: [
      '头顶留白与头部半宽取自立绘实测比例，不是逐帧像素扫描',
      '伞是代码绘制的圆弧，没有伞柄与手掌的接触数据',
      'caneReachesDoubao 只算距离，不代表手掌真的落在柄上',
      '通过本检查只代表构图数据无缝隙，不代表成片已获验收',
    ],
  };
}

const report = build();
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n');
const d = report.derived;
console.log(`伞面横向 ${d.canopyLeftX}–${d.canopyRightX}，鲸娘头部 ${d.whaleHeadLeftX}–${d.whaleHeadRightX}`);
console.log(`头顶 y=${d.whaleHeadTopY}；沿头顶宽度逐点净空 ${d.clearanceAboveHeadMinPx}–${d.clearanceAboveHeadMaxPx}px`);
for (const [k, v] of Object.entries(report.checks)) console.log(`  ${v.pass ? '✓' : '✗'} ${k}：${v.need}`);
console.log(report.passesGeometry ? '构图数据通过（仍需编码后抽帧核对）' : '构图数据未通过');
if (!report.passesGeometry) process.exitCode = 1;
