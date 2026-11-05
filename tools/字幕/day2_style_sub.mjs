// ============================================================================
// day2_style_sub.mjs —— 项目统一的字幕组件（Day2 加更版）
//
// 2026-10-27 用户定：**字幕定死用 Day2 加更《鲸鱼选鱼》那一版，以后所有视频默认走这个**。
// 所以把它的绘制逻辑从 render_day2_bonus_final.mjs 抽成这个共用模块，
// Day3 已经改用它，Day4 及其后的渲染器直接 import 即可，不许再各写一版。
//
// 形状（与 Day2 加更逐像素对齐）：
//   · 一屏一个**短分句**（按标点分句，不按字数硬切，也不做逐字点亮）；
//   · 对话条：填充 rgba(9,22,54,0.92) + 1.6px #48C8FF 描边 + 圆角 12；
//   · 左上角说话人小标签：#1E40AF 底 + #FACC15 描边 + #FDE68A 800 字；
//   · 正文白色 800，28px 起，宽度上限 1040，放不下自动缩字号，仍放不下才换行；
//   · 一屏一直显示到下一屏开始为止。
//
// 用法（渲染器里）：
//   import { createDay2Subtitle } from '../字幕/day2_style_sub.mjs';
//   const SUB = createDay2Subtitle({ font: '"NotoSansSC", sans-serif' });
//   SUB.draw(ctx, { lines: SUB.wrap(text), speaker: '鲸鱼娘', vis: 1, W, H });
// ============================================================================

export const DAY2_SUB = {
  maxTextWidth: 1040,
  baseSize: 28,
  weight: 800,
  boxFill: 'rgba(9,22,54,0.92)',
  boxStroke: '#48C8FF',
  boxStrokeW: 1.6,
  radius: 12,
  tagFill: '#1E40AF',
  tagStroke: '#FACC15',
  tagColor: '#FDE68A',
  textColor: '#FFFFFF',
  textStroke: 'rgba(6,20,44,0.92)',
  bottomInset: 76,
  // 分句标点（与剧本一致：短句、逗号、省略号、破折号都算一句的结尾）
  punct: /[，。！？…—；：、]/
};

/**
 * @param {object} opts
 * @param {(size:number, weight:number)=>string} opts.fontOf  返回 canvas font 字符串
 * @param {CanvasRenderingContext2D} opts.measureCtx  只用来量字宽的小画布 ctx
 */
export function createDay2Subtitle({ fontOf, measureCtx, cfg = {} }) {
  const C = { ...DAY2_SUB, ...cfg };

  function measure(text, size = C.baseSize, weight = C.weight) {
    measureCtx.font = fontOf(size, weight);
    return measureCtx.measureText(text).width;
  }

  function wrap(text, maxW = C.maxTextWidth, size = C.baseSize, weight = C.weight) {
    measureCtx.font = fontOf(size, weight);
    const lines = [];
    let line = '';
    for (const ch of String(text)) {
      const next = line + ch;
      if (line && measureCtx.measureText(next).width > maxW) { lines.push(line); line = ch; }
      else line = next;
    }
    if (line) lines.push(line);
    return lines;
  }

  function shrink(text, maxW = C.maxTextWidth, size = C.baseSize, weight = C.weight) {
    let s = size;
    while (s > 15) {
      measureCtx.font = fontOf(s, weight);
      if (measureCtx.measureText(text).width <= maxW) break;
      s -= 1;
    }
    return s;
  }

  /** 把一句台词切成一屏一屏的短分句；有字级时间就按字级时间定边界。 */
  function clauses(text, chars, cueStart, cueEnd) {
    let segs;
    if (Array.isArray(chars) && chars.length) {
      segs = [];
      let cur = [];
      for (const c of chars) {
        cur.push(c);
        if (C.punct.test(c.suffix || '')) { segs.push(cur); cur = []; }
      }
      if (cur.length) segs.push(cur);
      segs = segs.map((cs) => ({
        text: cs.map((c) => c.ch + (c.suffix || '')).join(''),
        start: cs[0].start,
        end: cs[cs.length - 1].end
      }));
    } else {
      const parts = String(text || '').split(/(?<=[，。！？…—；：、])/).filter(Boolean);
      const total = parts.reduce((a, b) => a + b.length, 0) || 1;
      let acc = 0;
      segs = parts.map((p) => {
        const st = cueStart + (cueEnd - cueStart) * (acc / total);
        acc += p.length;
        const en = cueStart + (cueEnd - cueStart) * (acc / total);
        return { text: p, start: st, end: en };
      });
    }
    // 一屏显示到下一屏开始（最后一屏到台词结束）
    for (let i = 0; i < segs.length; i++) {
      segs[i].end = i + 1 < segs.length ? segs[i + 1].start : cueEnd;
    }
    // 太短的分句（去标点后 <3 字，例如单独的「诶」「哦」）不要单独占一屏：
    // 优先并到**后一屏**（「哦，」+「原来不是本鲸省饭，」读起来是连着的），
    // 已经是最后一屏时才并到前一屏。
    for (let i = 0; i < segs.length;) {
      if (segs[i].text.replace(/[，。！？…—；：、]/g, '').length >= 3 || segs.length === 1) { i++; continue; }
      if (i + 1 < segs.length) {
        segs[i + 1].text = segs[i].text + segs[i + 1].text;
        segs[i + 1].start = segs[i].start;
        segs.splice(i, 1);
      } else {
        segs[i - 1].text += segs[i].text;
        segs[i - 1].end = segs[i].end;
        segs.splice(i, 1);
      }
    }
    return segs.length ? segs : [{ text: String(text || ''), start: cueStart, end: cueEnd }];
  }

  function segmentAt(segs, t) {
    let hit = segs[0];
    for (const s of segs) if (t >= s.start) hit = s;
    return hit;
  }

  /** 画一屏字幕。lines 用 wrap() 得到，speaker 是说话人标签文字。 */
  function draw(ctx, { lines, speaker = '鲸鱼娘', vis = 1, W, H }) {
    const longest = lines.reduce((a, b) => (a.length >= b.length ? a : b), '');
    const size = shrink(longest);
    const textW = Math.max(...lines.map((l) => measure(l, size)));
    const boxW = Math.min(1120, Math.max(360, textW + 88));
    const boxH = lines.length > 1 ? 84 : 58;
    const bx = (W - boxW) / 2;
    const by = H - C.bottomInset - (boxH - 58) + (1 - vis) * 16;

    ctx.save();
    ctx.globalAlpha = vis;

    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, C.radius);
    ctx.fillStyle = C.boxFill;
    ctx.fill();
    ctx.lineWidth = C.boxStrokeW;
    ctx.strokeStyle = C.boxStroke;
    ctx.stroke();

    if (speaker) {
      const tagW = Math.max(64, measure(speaker, 14) + 28);
      ctx.beginPath();
      ctx.roundRect(bx + 16, by - 14, tagW, 24, 7);
      ctx.fillStyle = C.tagFill;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = C.tagStroke;
      ctx.stroke();

      ctx.font = fontOf(14, C.weight);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 2;
      ctx.strokeStyle = C.textStroke;
      ctx.strokeText(speaker, bx + 16 + tagW / 2, by - 1);
      ctx.fillStyle = C.tagColor;
      ctx.fillText(speaker, bx + 16 + tagW / 2, by - 1);
    }

    ctx.font = fontOf(size, C.weight);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const centerY = by + boxH / 2 + 1;
    lines.forEach((line, i) => {
      const y = centerY + (i - (lines.length - 1) / 2) * (size + 7);
      ctx.lineWidth = Math.max(2, size * 0.14);
      ctx.strokeStyle = C.textStroke;
      ctx.strokeText(line, W / 2, y);
      ctx.fillStyle = C.textColor;
      ctx.fillText(line, W / 2, y);
    });
    ctx.restore();
  }

  return { cfg: C, measure, wrap, shrink, clauses, segmentAt, draw };
}

/** 说话人标签规则：变色成大小姐的段落标「Claude 大小姐」，其余标「鲸鱼娘」。 */
export function speakerFor({ isClaude, claudeName = 'Claude 大小姐', whaleName = '鲸鱼娘' }) {
  return isClaude ? claudeName : whaleName;
}
