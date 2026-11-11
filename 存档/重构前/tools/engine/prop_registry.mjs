// prop_registry.mjs — 跨集统一道具注册表
// 汇总既有通用道具（cue_props_engine 的 PROP_LIBRARY）、Day10 参数化原型，
// 并补齐跨集可复用的立牌/对照板/折页/印章底座。每个道具声明 extent（本地坐标下沿），
// 供校验器断言前景道具下沿 <= 600（字幕安全区之上）。
import { CORE, PROP_LIBRARY } from '../互动元素/cue_props_engine.mjs';
import { DAY10_PROPS } from '../互动元素/day10_cue_props.mjs';
import { drawText } from './room_base.mjs';

const { paint, rrPts, ellPts, inkLine, reseedBoil } = CORE;
const INK = '#283C52';

function withExtent(prop, bottom) {
  return { ...prop, extent: { ...(prop.extent || {}), bottom } };
}

const extra = {
  // 大饼隐喻：明确可见的饼与拒绝斜线，不仅换一行文字；可供任何集使用。
  flatbread: {
    id: 'flatbread', extent: { bottom: 48 },
    draw(ctx, _t, st = {}) {
      ctx.save();ctx.beginPath();ctx.ellipse(0,0,76,31,0,0,Math.PI*2);ctx.fillStyle='#DDA35D';ctx.fill();ctx.strokeStyle='#785131';ctx.lineWidth=3;ctx.stroke();
      ctx.beginPath();ctx.ellipse(0,-3,65,23,0,0,Math.PI*2);ctx.fillStyle='#F1CE8B';ctx.fill();
      for(const [x,y]of[[-42,-8],[-16,7],[10,-11],[38,4],[-3,-1],[48,-10]]){ctx.beginPath();ctx.ellipse(x,y,5,2,.35,0,Math.PI*2);ctx.fillStyle='#9F713B';ctx.fill();}
      if(st.rejected){ctx.strokeStyle='#D34C4A';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-72,40);ctx.lineTo(72,-40);ctx.stroke();}
      ctx.restore();
    },
  },
  // 前景立牌：木框 + 深板 + 两行字，脚落地（本地原点为牌中心，脚在 +78）
  standee: {
    id: 'standee', extent: { bottom: 78 },
    draw(ctx, t, st = {}) {
      reseedBoil(0);
      paint(ctx, rrPts(-136, -50, 272, 100, 8, 0), { wash: '#8C674B', fill: '#B58D62', fillOp: 220, ink: '#343E4F', sw: 2.5 });
      paint(ctx, rrPts(-124, -40, 248, 80, 5, 0), { wash: '#1D3C4D', fill: '#2F5362', fillOp: 240, ink: '#C8C1A0', sw: 1 });
      drawText(ctx, st.title || '先看这里', 0, -12, 24, '#F2E9C9');
      drawText(ctx, st.sub || '有话好好说', 0, 20, 20, '#C9DCD5');
      for (const xx of [-100, 100]) inkLine(ctx, [[xx, 49], [xx - 4, 78]], 7, '#8A6D50', 'stand-foot', 0);
    },
  },
  // 通知板 / 对照板（横向大板，挂墙或手持展示，文字由 spec 注入）
  notice_board: {
    id: 'notice_board', extent: { bottom: 66 },
    draw(ctx, t, st = {}) {
      reseedBoil(0);
      paint(ctx, rrPts(-138, -66, 276, 132, 14, 0), { wash: '#20384C', fill: '#2B4A62', fillOp: 242, ink: '#9BC4D4', sw: 2.6 });
      drawText(ctx, st.title || '对照一下', 0, -30, 22, '#FFE8A3');
      drawText(ctx, st.left || '这边看看', -62, 22, 17, '#D9F2FF');
      drawText(ctx, st.right || '那边看看', 62, 22, 17, '#FFE8A3');
      inkLine(ctx, [[0, -8], [0, 44]], 2, '#9BC4D4', 'board-mid', 0);
    },
  },
  // 名牌（可被争抢/交接的小牌，原点为牌中心）
  name_plate: {
    id: 'name_plate', extent: { bottom: 26 },
    draw(ctx, t, st = {}) {
      reseedBoil(0);
      paint(ctx, rrPts(-90, -26, 180, 52, 9, 0), { wash: '#C6D5CC', fill: '#F2EAD5', fillOp: 235, ink: '#52748A', sw: 2 });
      drawText(ctx, st.text || '监工位', 0, 2, 22, '#344557');
    },
  },
  // 折页纸（展开的旧纸，原点为中心）
  folded_page: {
    id: 'folded_page', extent: { bottom: 42 },
    draw(ctx, t, st = {}) {
      const open = Math.max(0, Math.min(1, st.open ?? 1));
      const w = 58 + 110 * open;
      reseedBoil(0);
      paint(ctx, rrPts(-w / 2, -42, w, 84, 5, 0), { wash: '#B99E74', fill: '#EFE2C0', fillOp: 240, ink: '#424653', sw: 2 });
      for (let i = 1; i < 4; i++) inkLine(ctx, [[-w / 2 + (i * w) / 4, -32], [-w / 2 + (i * w) / 4, 32]], 1, '#B5A580', 'fold-line', 0);
      drawText(ctx, st.title ?? '旧事提醒', 0, -12, 20, '#47546A');
      drawText(ctx, st.sub ?? '先看碗里', 0, 18, 18, '#805F51');
    },
  },
  // 空碗（敲击/护碗语义，原点为碗心）
  empty_bowl: {
    id: 'empty_bowl', extent: { bottom: 28 },
    draw(ctx, t, st = {}) {
      reseedBoil(0);
      paint(ctx, [[-45, -10], [45, -10], [32, 28], [-29, 28]], { wash: '#86B5CF', fill: '#C2DCE1', fillOp: 220, ink: '#32445D', sw: 2.5 });
      paint(ctx, ellPts(0, -10, 45, 12, 24, 0.1), { wash: '#5B809A', fill: '#A9C5D0', fillOp: 125, ink: '#32445D', sw: 2 });
      drawText(ctx, st.text || '空的', 0, 8, 13, '#32445D');
    },
  },
  // 提灯（晨昏/雨夜手持或挂梁照明，原点为提手下方灯心）
  lantern: {
    id: 'lantern', extent: { bottom: 30 },
    draw(ctx, t, st = {}) {
      const glow = 0.88 + 0.12 * Math.sin(t * 4.2);
      ctx.save();
      ctx.fillStyle = `rgba(255,222,140,${(0.28 * glow).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(0, 4, 34, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFE39C';
      ctx.strokeStyle = '#5D402C';
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.roundRect(-14, -14, 28, 34, 8); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-8, -14); ctx.quadraticCurveTo(0, -26, 8, -14); ctx.stroke();
      if (st.label) drawText(ctx, st.label, 0, 4, 12, '#6B4226');
      ctx.restore();
    },
  },
  // 雨伞（MV「共伞同挡雨」与 Day 雨夜戏通用）
  // 原点在伞尖顶，伞面 y 0..44，伞杆长度由 state.shaft 控制（默认 96px），伞柄钩在杆底。
  umbrella: {
    id: 'umbrella', extent: { bottom: 140 },
    draw(ctx, _t, st = {}) {
      const shaft = st.shaft ?? 96;
      const bottom = 44 + shaft;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-58, 44);
      ctx.quadraticCurveTo(0, -6, 58, 44);
      ctx.closePath();
      ctx.fillStyle = st.color || '#63C7B8';
      ctx.fill();
      ctx.strokeStyle = '#1E3A46';
      ctx.lineWidth = 2.8;
      ctx.stroke();
      for (const x of [-28, 0, 28]) {
        ctx.beginPath();
        ctx.moveTo(x, 44 - Math.abs(x) * 0.18);
        ctx.quadraticCurveTo(x * 0.55, 16, 0, 1);
        ctx.strokeStyle = 'rgba(30,58,70,.45)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
      ctx.strokeStyle = '#4A3B32';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.lineTo(0, bottom);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-7, bottom + 2, 8, 0, Math.PI, false);
      ctx.stroke();
      ctx.restore();
    },
  },
  // 治水木尺/水拍（手持工具）
  paddle: {
    id: 'paddle', extent: { bottom: 38 },
    draw(ctx, _t, st = {}) {
      ctx.save();
      ctx.fillStyle = '#B98552';
      ctx.strokeStyle = '#4A3423';
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.roundRect(-7, -36, 14, 46, 5); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(-16, 4, 32, 30, 8); ctx.fill(); ctx.stroke();
      if (st.label) drawText(ctx, st.label, 0, 20, 11, '#3E2A1B');
      ctx.restore();
    },
  },
};

export const PROP_REGISTRY = {
  ...Object.fromEntries(Object.entries(PROP_LIBRARY).map(([k, v]) => [k, withExtent(v, v.extent?.bottom ?? 40)])),
  ...Object.fromEntries(Object.entries(DAY10_PROPS).map(([k, v]) => [k, withExtent(v, k === 'rice_jar_guard' ? 42 : 66)])),
  ...extra,
  scroll: extra.folded_page,
  badge: extra.name_plate,
  clipboard: extra.notice_board,
  mug: extra.empty_bowl,
};

export function getProp(id) {
  const p = PROP_REGISTRY[id];
  if (!p) throw new Error(`未知道具：${id}（已注册：${Object.keys(PROP_REGISTRY).join(', ')}）`);
  return p;
}

/** 道具在世界坐标 (x,y) 以 scale 绘制时，像素下沿（逻辑坐标）。 */
export function propBottom(id, y, scale = 1) {
  const p = getProp(id);
  return y + (p.extent?.bottom ?? 40) * scale;
}

export function assertForegroundWithinStage(id, y, scale = 1) {
  const b = propBottom(id, y, scale);
  if (b > 600) throw new Error(`前景道具 ${id} 下沿 ${b.toFixed(1)} 越界（必须 <= 600，字幕安全区之上）`);
  return b;
}
