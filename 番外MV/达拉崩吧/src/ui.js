// ui.js — 16-bit RPG windows, portrait dialog boxes, bulging 12/8 name grid, action HUD, 5-slot item gag & pixel captions
import { C, W, H, clamp, eo, seg } from './px.js';
import { drawTextPx, measureTextPx } from './glyphs.js';
import { getPortrait, drawGagItemIcon, drawMiniWhaleIcon } from './cast.js';

export function drawRpgWindow(fb, x, y, w, h, { skin = 'blue', alert = false } = {}) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  if (w < 6 || h < 6) return;
  const cols = alert
    ? [C.scarf, C.crimson, C.umber]
    : skin === 'parchment'
      ? [C.parchment, C.sand, C.tan]
      : skin === 'dark'
        ? [C.dslate, C.night, C.ink]
        : [C.blue, C.navy, C.night];

  fb.rect(x + 1, y, w - 2, h, C.ink);
  fb.rect(x, y + 1, w, h - 2, C.ink);
  fb.gradV(x + 2, y + 2, w - 4, h - 4, cols);
  // Crisp double pixel border (white/gold outer + silver/steel inner)
  const b1 = alert ? C.goldL : skin === 'parchment' ? C.dbrown : C.uiW;
  const b2 = alert ? C.gold : skin === 'parchment' ? C.brown : C.silver;
  fb.hline(x + 2, x + w - 3, y + 1, b1);
  fb.hline(x + 2, x + w - 3, y + h - 2, b2);
  fb.vline(x + 1, y + 2, y + h - 3, b1);
  fb.vline(x + w - 2, y + 2, y + h - 3, b2);
  // Corner studs
  fb.px(x + 2, y + 2, C.gold);
  fb.px(x + w - 3, y + 2, C.gold);
  fb.px(x + 2, y + h - 3, C.gold);
  fb.px(x + w - 3, y + h - 3, C.gold);
}

export function drawDialogBox(fb, t, {
  who = 'claude',
  mood = 'neutral',
  name = '陛下',
  text = '',
  t0 = 0,
  dur = 1.6,
  overflowBreak = false,
} = {}) {
  const slide = eo(seg(t, t0, t0 + 0.22));
  const y = Math.round(180 - slide * 46); // settles at y = 134..176
  const baseW = overflowBreak ? 216 : 292;
  const typedFrac = clamp((t - (t0 + 0.12)) / Math.max(0.25, dur * 0.72), 0, 1);
  const charsShown = Math.max(1, Math.ceil(text.length * typedFrac));
  const busted = overflowBreak && charsShown > 8;

  drawRpgWindow(fb, 14, y, baseW, 42, { alert: busted });
  if (busted) {
    // Jagged broken opening punched right through the right wall of the RPG dialog box!
    fb.rect(14 + baseW - 5, y + 9, 6, 22, C.scarfD);
    fb.px(14 + baseW - 2, y + 8, C.goldL);
    fb.px(14 + baseW - 2, y + 31, C.goldL);
  }
  // Speaker name tab
  drawRpgWindow(fb, 20, y - 11, 56, 13, { skin: 'dark', alert: busted });
  drawTextPx(fb, 26, y - 9, name, { size: 8, color: C.goldL, shadow: C.ink });

  // 32×32 Portrait
  const port = getPortrait(who, mood);
  fb.blit(port, 20, y + 5);

  // Text body (in overflowBreak mode, blasts right past baseW onto the screen with dark outline!)
  drawTextPx(fb, 58, y + 14, text, {
    size: 12,
    color: busted ? C.goldL : C.uiW,
    outline: busted ? C.ink : null,
    shadow: busted ? null : C.ink,
    tracking: busted ? 4 : 1,
    maxChars: charsShown,
  });

  // Right-wall shatter splinters when name overflows!
  if (busted) {
    const wallX = 14 + baseW;
    for (let i = 0; i < 8; i++) {
      const ang = -1.0 + i * 0.28;
      const d = (t - (t0 + 0.9)) * 34;
      const sx = Math.round(wallX + Math.cos(ang) * clamp(d, 2, 22));
      const sy = Math.round(y + 20 + Math.sin(ang) * clamp(d, 2, 18));
      fb.rect(sx, sy, 3, 2, i % 2 ? C.goldL : C.uiW);
    }
  } else if (typedFrac >= 1 && (Math.floor(t * 3) & 1)) {
    // Blinking RPG advance triangle ▼ (STYLE.md §4)
    fb.tri(294, y + 31, 300, y + 31, 297, y + 35, C.goldL);
  }
}

// S10 Signature Gag: RPG Name Entry Grid (0/8 → 12/8 bulging explosion!)
const HERO_NAME_CHARS = [...'达拉崩吧斑得贝迪卜多比鲁翁'];

export function drawNameEntryGrid(fb, t, t0 = 55.41) {
  const u = clamp((t - t0) / 2.25, 0, 1);
  const count = clamp(Math.floor(u * 14), 0, 13);
  const over = Math.max(0, count - 8);
  const slotW = 18;
  const totalSlots = Math.max(8, count);
  const winW = 20 + totalSlots * (slotW + 2);
  const winX = Math.max(4, Math.round((W - winW) * 0.5));
  const winY = 44 - (over > 0 ? 3 : 0);
  const winH = 52 + (over > 0 ? 6 : 0);

  drawRpgWindow(fb, winX, winY, Math.min(312, winW), winH, { alert: over > 0 });
  const counterStr = `昵称输入  ${count}/8${over > 0 ? ' !!' : ''}`;
  drawTextPx(fb, winX + 10, winY + 7, counterStr, {
    size: 10,
    color: over > 0 ? C.goldL : C.uiW,
    shadow: C.ink,
  });

  for (let i = 0; i < totalSlots; i++) {
    const sx = winX + 10 + i * (slotW + 2);
    const sy = winY + 22 + (i >= 8 ? Math.round(Math.sin(t * 22 + i) * 2) : 0);
    if (sx + slotW > 314) break;
    const isOverSlot = i >= 8;
    fb.rect(sx, sy, slotW, 20, isOverSlot ? C.scarfD : C.ink);
    fb.box(sx, sy, slotW, 20, i === count - 1 ? C.goldL : isOverSlot ? C.scarfL : C.silver);
    if (i < count) {
      drawTextPx(fb, sx + 3, sy + 4, HERO_NAME_CHARS[i], {
        size: 12,
        color: isOverSlot ? C.goldL : C.uiW,
        shadow: C.ink,
      });
    }
  }
  // Bobbing RPG hand cursor (freezes on hesitation, STYLE.md §5)
  const curSlot = Math.min(totalSlots - 1, count);
  const curX = Math.min(300, winX + 14 + curSlot * (slotW + 2));
  const bob = Math.floor(t * 4) & 1;
  fb.tri(curX, winY + 45 + bob, curX + 6, winY + 45 + bob, curX + 3, winY + 41 + bob, C.goldL);
}

// S15–S19 Action-RPG Top HUD + Mini-Map!
export function drawAdventureHud(fb, t, {
  lv = 1,
  hp = 5,
  gold = 0,
  exp = 0.15,
  mapU = 0,
} = {}) {
  // Left Status Panel
  drawRpgWindow(fb, 6, 5, 114, 28, { skin: 'dark' });
  drawTextPx(fb, 12, 9, `鲸鱼娘 LV.${lv}`, { size: 8, color: C.goldL, shadow: C.ink });
  // 5 Pixel Hearts
  for (let i = 0; i < 5; i++) {
    const hx = 74 + i * 8, hy = 10;
    const col = i < hp ? C.scarf : C.dslate;
    fb.px(hx + 1, hy, col); fb.px(hx + 4, hy, col);
    fb.hline(hx, hx + 5, hy + 1, col);
    fb.hline(hx + 1, hx + 4, hy + 2, col);
    fb.hline(hx + 2, hx + 3, hy + 3, col);
  }
  drawTextPx(fb, 12, 20, `GOLD:${String(gold).padStart(2, '0')}`, { size: 8, color: C.gold, shadow: C.ink });
  // EXP Gauge
  fb.rect(58, 22, 54, 5, C.ink);
  fb.box(58, 22, 54, 5, C.slate);
  fb.rect(59, 23, Math.round(52 * clamp(exp, 0, 1)), 3, exp >= 0.98 ? C.goldL : C.lime);

  // Right Parchment Mini-Map
  drawRpgWindow(fb, 252, 5, 62, 26, { skin: 'parchment' });
  fb.line(258, 23, 272, 18, C.brown);
  fb.line(272, 18, 288, 21, C.brown);
  fb.line(288, 21, 306, 12, C.brown);
  // Dragon cave skull mark at end
  fb.disc(306, 12, 2, C.plum);
  // Animated mini Whale-girl icon marching along route!
  const mx = Math.round(259 + clamp(mapU, 0, 1) * 45);
  const my = Math.round(22 - Math.sin(clamp(mapU, 0, 1) * Math.PI * 1.5) * 6);
  drawMiniWhaleIcon(fb, mx, my, t);
}

// S24–S25 Signature Gag: 5-Slot Wrong-Name Inventory Window (昆特牌 | 提琴 | 烤蛋挞 | 苏打 | 马拉松)
const GAG_ITEMS = ['昆特牌', '提琴', '烤蛋挞', '苏打', '马拉松'];
const GAG_TIMES = [125.45, 126.00, 126.55, 127.10, 127.65];

export function drawWrongItemInventory(fb, t) {
  const burn = clamp((t - 128.40) / 0.46, 0, 1);
  if (burn >= 1) return;
  const winW = 192, winH = 58;
  const wx = 6;
  const wy = (burn > 0 ? 34 : 44) + (burn > 0 ? Math.round(Math.sin(t * 40) * 2) : 0);

  drawRpgWindow(fb, wx, wy, winW, winH, {
    skin: burn > 0.35 ? 'dark' : 'parchment',
    alert: burn > 0,
  });
  drawTextPx(fb, wx + 6, wy + 6, burn > 0 ? '道具栏 — 惨遭龙焰焚毁!!' : '道具栏 ITEM — 勇者猜测中…', {
    size: 8,
    color: burn > 0 ? C.goldL : C.ink,
  });

  for (let i = 0; i < 5; i++) {
    const sx = wx + 6 + i * 36;
    const sy = wy + 18;
    const shown = t >= GAG_TIMES[i];
    const active = shown && (i === 4 || t < GAG_TIMES[i + 1]) && burn === 0;
    fb.rect(sx, sy, 34, 34, burn > 0.4 ? C.ink : C.sand);
    fb.box(sx, sy, 34, 34, active ? C.scarf : C.dbrown);
    if (shown) {
      drawGagItemIcon(fb, sx + 17, sy + 13, i, burn);
      const lw = measureTextPx(GAG_ITEMS[i], 8);
      drawTextPx(fb, sx + Math.round((34 - lw) * 0.5), sy + 24, GAG_ITEMS[i], {
        size: 8,
        color: burn > 0.3 ? C.orange : C.ink,
      });
    }
  }
}

// Clean Burned-in 16-bit Pixel Lyric Bar (bottom safe zone, never covers subjects)
export function drawLyricCaption(fb, t, subs, hiddenIds) {
  const cue = subs.find((s) => t >= s.t0 && t <= s.t1);
  if (!cue || hiddenIds.has(cue.id)) return;
  const w = measureTextPx(cue.text, 10, 1);
  const x = Math.round((W - w) * 0.5);
  const y = 163;
  // Subtle dark translucent-style dither strip behind pixel text for universal legibility
  fb.rect(x - 6, y - 3, w + 12, 15, C.ink);
  fb.hline(x - 5, x + w + 4, y - 3, cue.speaker === 'gpt' ? C.dragV : cue.speaker === 'claude' ? C.gold : C.whaleM);
  drawTextPx(fb, x, y, cue.text, {
    size: 10,
    color: cue.speaker === 'gpt' ? C.goldL : C.uiW,
    outline: C.ink,
    tracking: 1,
  });
}
