// stage_sets_core.mjs — 纯函数多舞台场景注册表与世界空间锚点求解器（零 Node/Canvas 依赖，浏览器与 Node 通用）
import { clamp, hash, lerp } from '../engine/timeline_core.mjs';

export const WORLD_BOUNDS = Object.freeze({ x0: -260, x1: 1540, y0: -140, y1: 780, width: 1800, height: 920 });

function lerpHex(c0, c1, u) {
  const q = clamp(u);
  const p0 = parseInt(c0.replace('#', ''), 16);
  const p1 = parseInt(c1.replace('#', ''), 16);
  const r = Math.round(lerp((p0 >> 16) & 255, (p1 >> 16) & 255, q));
  const g = Math.round(lerp((p0 >> 8) & 255, (p1 >> 8) & 255, q));
  const b = Math.round(lerp(p0 & 255, p1 & 255, q));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function makeParticles(count, t, { kind = 'dust', x0 = -120, x1 = 1400, y0 = 40, y1 = 590, speed = 18, sway = 14, seed = 1 } = {}) {
  const spanY = Math.max(40, y1 - y0);
  const spanX = Math.max(80, x1 - x0);
  const items = [];
  for (let i = 0; i < count; i++) {
    const h1 = hash(i * 13.7 + seed);
    const h2 = hash(i * 29.3 + seed * 3.1);
    const h3 = hash(i * 47.9 + seed * 7.7);
    if (kind === 'rain') {
      const y = y0 + (((h2 * spanY) + t * (260 + h3 * 90) * speed * 0.05) % spanY);
      const x = x0 + (((h1 * spanX) - t * 48) % spanX + spanX) % spanX;
      items.push({ x, y, r: 1.4, len: 18 + h3 * 12, alpha: 0.22 + h3 * 0.2, kind });
    } else if (kind === 'petals') {
      const y = y0 + (((h2 * spanY) + t * (34 + h3 * 22)) % spanY);
      const x = x0 + (((h1 * spanX) + Math.sin(t * 1.4 + i) * 28 - t * 24) % spanX + spanX) % spanX;
      items.push({ x, y, r: 3.4 + h3 * 2.6, rot: (t * 65 + i * 37) % 360, alpha: 0.55 + h3 * 0.3, kind });
    } else if (kind === 'bubbles') {
      const y = y1 - (((h2 * spanY) + t * (speed + h3 * 14)) % spanY);
      const x = x0 + h1 * spanX + Math.sin(t * (1.1 + h3) + i) * sway;
      items.push({ x, y, r: 2.2 + h3 * 4.2, alpha: 0.16 + h3 * 0.22, kind });
    } else if (kind === 'steam') {
      const cyc = ((t * 0.55 + h2) % 1 + 1) % 1;
      const x = x0 + (h1 - 0.5) * spanX + Math.sin(t * 1.8 + i) * 10 * cyc;
      const y = y1 - cyc * spanY;
      items.push({ x, y, r: 6 + cyc * 16, alpha: (1 - cyc) * 0.26, kind });
    } else {
      const x = x0 + h1 * spanX + Math.sin(t * (0.45 + h3 * 0.5) + i * 1.7) * sway;
      const y = y0 + h2 * spanY + Math.cos(t * (0.38 + h2 * 0.4) + i * 2.3) * (sway * 0.8);
      items.push({ x, y, r: 1.6 + h3 * 2.4, alpha: 0.14 + 0.16 * (0.5 + 0.5 * Math.sin(t * 1.7 + i)), kind });
    }
  }
  return items;
}

const CUSTOM_SETS = new Map();

export const BUILTIN_STAGE_SETS = Object.freeze({
  underwater_study: {
    id: 'underwater_study',
    family: 'underwater',
    surface: 'indoor_sea',
    label: '深海书房主屋',
    palette: { skyTop: '#0B2340', skyBot: '#14385A', wall: '#1A3550', wallTrim: '#2A4E6E', floor: '#17283D', floorLine: '#2B4764', accent: '#76D4E8', warm: '#F6D997' },
    groundY: 600,
    weather: 'bubbles',
    build(t, st) {
      const doorOpen = clamp(st.doorOpen ?? 0);
      const lampLit = clamp(st.lampLit ?? 0.85);
      const impactAge = st.windowImpactAt != null ? t - st.windowImpactAt : -1;
      const ripple = impactAge >= 0 && impactAge < 1.1 ? 1 - impactAge / 1.1 : 0;
      return {
        anchors: {
          groundY: 600,
          window: { x: 148, y: 236, r: 77, ripple },
          door: { x: 1070, y: 600, topY: 148, w: 145, h: 394, open: doorOpen },
          desk: { x: 640, y: 542, topY: 482, w: 320, h: 60, shake: st.deskShake || 0 },
          lamp: { x: 640, y: 112, coneW: 250, lit: lampLit },
          board: { x: 745, y: 255, w: 230, h: 140, pins: st.pinnedCount || 0 },
          stageLeft: { x: 420, y: 600 },
          stageCenter: { x: 640, y: 600 },
          stageRight: { x: 850, y: 600 },
        },
        lightSources: [
          { x: 640, y: 112, targetX: 640, targetY: 600, radius: 270, color: '#F6D997', intensity: 0.24 * lampLit },
          { x: 148, y: 236, targetX: 290, targetY: 600, radius: 220, color: '#6BCDE4', intensity: 0.18 + 0.08 * ripple },
          ...(doorOpen > 0.02 ? [{ x: 1070, y: 360, targetX: 960, targetY: 600, radius: 240, color: '#FFD78C', intensity: 0.34 * doorOpen }] : []),
        ],
      };
    },
  },

  porthole_observatory: {
    id: 'porthole_observatory',
    family: 'underwater',
    surface: 'wet_deck',
    label: '深海全景舷窗甲板',
    palette: { skyTop: '#061A33', skyBot: '#0F3D63', wall: '#132B45', wallTrim: '#356082', floor: '#102236', floorLine: '#2B5374', accent: '#6CE0F5', warm: '#FAD793' },
    groundY: 600,
    weather: 'bubbles',
    build(t, st) {
      const impactAge = st.windowImpactAt != null ? t - st.windowImpactAt : -1;
      const ripple = impactAge >= 0 && impactAge < 1.3 ? 1 - impactAge / 1.3 : 0;
      const lampLit = clamp(st.lampLit ?? 0.7);
      return {
        anchors: {
          groundY: 600,
          window: { x: 640, y: 278, w: 760, h: 310, r: 155, panoramic: true, ripple },
          rail: { x: 640, y: 468, w: 820 },
          desk: { x: 960, y: 545, topY: 486, w: 210, h: 58, shake: st.deskShake || 0 },
          lamp: { x: 260, y: 128, coneW: 210, lit: lampLit },
          door: { x: 1130, y: 600, topY: 185, w: 132, h: 415, open: clamp(st.doorOpen ?? 0) },
          stageLeft: { x: 400, y: 600 },
          stageCenter: { x: 640, y: 600 },
          stageRight: { x: 880, y: 600 },
        },
        lightSources: [
          { x: 640, y: 220, targetX: 640, targetY: 600, radius: 420, color: '#68D8EE', intensity: 0.26 + 0.1 * ripple },
          { x: 260, y: 128, targetX: 300, targetY: 600, radius: 210, color: '#FAD793', intensity: 0.2 * lampLit },
        ],
      };
    },
  },

  screening_desk: {
    id: 'screening_desk',
    family: 'indoor',
    surface: 'wood_floor',
    label: '审稿作战案台',
    palette: { skyTop: '#162436', skyBot: '#21354D', wall: '#223349', wallTrim: '#3D5570', floor: '#262129', floorLine: '#493E47', accent: '#8AD4DF', warm: '#FFE09E' },
    groundY: 600,
    weather: 'dust',
    build(t, st) {
      const lampLit = clamp(st.lampLit ?? 1);
      const doorOpen = clamp(st.doorOpen ?? 0);
      const brickOpen = st.brickWall ? clamp(st.gateOpen ?? doorOpen) : 0;
      return {
        palette: st.brickWall
          ? { skyTop: '#101829', skyBot: '#1A2740', wall: '#2B3348', wallTrim: '#4A556E', floor: '#231E26', floorLine: '#473D4A', accent: '#FFD982', warm: '#FFE599' }
          : undefined,
        anchors: {
          groundY: 600,
          desk: { x: 640, y: 552, topY: 472, w: 460, h: 80, shake: st.deskShake || 0 },
          lamp: { x: 520, y: 150, coneW: 320, lit: lampLit },
          board: st.brickWall ? null : { x: 820, y: 248, w: 310, h: 176, pins: Math.max(2, st.pinnedCount || 2) },
          brickHole: st.brickWall ? { x: 1020, y: 292, open: brickOpen } : null,
          window: { x: 185, y: 242, r: 72, ripple: 0 },
          door: st.brickWall ? null : { x: 1120, y: 600, topY: 168, w: 136, h: 432, open: doorOpen },
          stageLeft: { x: 390, y: 600 },
          stageCenter: { x: 640, y: 600 },
          stageRight: { x: 890, y: 600 },
        },
        lightSources: [
          { x: 520, y: 150, targetX: 620, targetY: 560, radius: 300, color: '#FFE09E', intensity: (st.brickWall ? 0.16 : 0.34) * lampLit },
          { x: 185, y: 242, targetX: 250, targetY: 600, radius: 190, color: '#78CEE0', intensity: 0.14 },
          ...(brickOpen > 0.02
            ? [{ x: 1020, y: 292, targetX: 640, targetY: 520, radius: 340, color: '#FFE48F', intensity: 0.52 * brickOpen }]
            : []),
        ],
      };
    },
  },

  corridor_hatch: {
    id: 'corridor_hatch',
    family: 'underwater',
    surface: 'metal_deck',
    label: '深海舱门连接走廊',
    palette: { skyTop: '#0D1F33', skyBot: '#18324B', wall: '#1D3650', wallTrim: '#3B6285', floor: '#152536', floorLine: '#386384', accent: '#7BE3F2', warm: '#FFD38A' },
    groundY: 600,
    weather: 'dust',
    build(t, st) {
      const doorOpen = clamp(st.doorOpen ?? 0.35);
      const focusX = st.focusX ?? 640;
      return {
        anchors: {
          groundY: 600,
          door: { x: 980, y: 600, topY: 152, w: 190, h: 448, open: doorOpen },
          window: { x: 310, y: 250, r: 68, ripple: 0 },
          board: { x: 590, y: 255, w: 190, h: 118, pins: st.pinnedCount || 1 },
          lamp: { x: 640, y: 96, coneW: 280, lit: clamp(st.lampLit ?? 0.9) },
          guideFocusX: focusX,
          stageLeft: { x: 360, y: 600 },
          stageCenter: { x: 620, y: 600 },
          stageRight: { x: 900, y: 600 },
        },
        lightSources: [
          { x: 980, y: 320, targetX: 900, targetY: 600, radius: 290, color: '#FFD38A', intensity: 0.18 + 0.32 * doorOpen },
          { x: 640, y: 96, targetX: 620, targetY: 600, radius: 260, color: '#8BE2F0', intensity: 0.2 },
        ],
      };
    },
  },

  pantry_hearth: {
    id: 'pantry_hearth',
    family: 'indoor',
    surface: 'warm_tile',
    label: '深海暖食茶水间',
    palette: { skyTop: '#231D29', skyBot: '#352A36', wall: '#332B38', wallTrim: '#5C4B56', floor: '#282028', floorLine: '#4F3E46', accent: '#F4B97A', warm: '#FFE4A8' },
    groundY: 600,
    weather: 'steam',
    build(t, st) {
      const hearthLit = clamp(st.lampLit ?? 1);
      return {
        anchors: {
          groundY: 600,
          hearth: { x: 320, y: 510, topY: 430, w: 220, h: 90, steam: 0.6 + 0.4 * hearthLit },
          desk: { x: 700, y: 548, topY: 480, w: 300, h: 68, shake: st.deskShake || 0 },
          lamp: { x: 680, y: 118, coneW: 310, lit: hearthLit },
          door: { x: 1090, y: 600, topY: 170, w: 140, h: 430, open: clamp(st.doorOpen ?? 0) },
          stageLeft: { x: 420, y: 600 },
          stageCenter: { x: 660, y: 600 },
          stageRight: { x: 880, y: 600 },
        },
        lightSources: [
          { x: 680, y: 118, targetX: 680, targetY: 600, radius: 320, color: '#FFE4A8', intensity: 0.34 * hearthLit },
          { x: 320, y: 460, targetX: 340, targetY: 600, radius: 210, color: '#FFAD66', intensity: 0.24 * hearthLit },
        ],
      };
    },
  },

  abyss_metaphor: {
    id: 'abyss_metaphor',
    family: 'exterior_sea',
    surface: 'sea_floor',
    label: '深海光束隐喻剧场',
    palette: { skyTop: '#041226', skyBot: '#0B2D4F', wall: '#08223D', wallTrim: '#1E547B', floor: '#0D263E', floorLine: '#23567A', accent: '#6FE3F7', warm: '#BCEFFF' },
    groundY: 600,
    weather: 'bubbles',
    build(t, st) {
      const lampLit = clamp(st.lampLit ?? 0.95);
      return {
        anchors: {
          groundY: 600,
          pedestal: { x: 640, y: 568, topY: 512, w: 240, h: 56 },
          desk: { x: 640, y: 568, topY: 512, w: 240, h: 56, shake: st.deskShake || 0 },
          lamp: { x: 640, y: 20, coneW: 380, lit: lampLit },
          window: { x: 640, y: 180, r: 160, ripple: st.windowImpactAt != null ? clamp(1 - (t - st.windowImpactAt)) : 0 },
          stageLeft: { x: 410, y: 600 },
          stageCenter: { x: 640, y: 600 },
          stageRight: { x: 870, y: 600 },
        },
        lightSources: [
          { x: 640, y: -20, targetX: 640, targetY: 600, radius: 390, color: '#8BE9FA', intensity: 0.34 * lampLit },
        ],
      };
    },
  },

  split_stage: {
    id: 'split_stage',
    family: 'theatrical',
    surface: 'stage_wood',
    label: '双栏对照剧场',
    palette: { skyTop: '#132942', skyBot: '#2D2638', wall: '#1A334E', wallTrim: '#E8C589', floor: '#1B2434', floorLine: '#50647D', accent: '#75D6EC', warm: '#F7C97E' },
    groundY: 600,
    weather: 'dust',
    build(t, st) {
      const splitX = 640 + Math.sin(t * 0.9) * 8;
      const lampLit = clamp(st.lampLit ?? 1);
      return {
        anchors: {
          groundY: 600,
          dividerX: splitX,
          desk: { x: 640, y: 552, topY: 492, w: 260, h: 60, shake: st.deskShake || 0 },
          lamp: { x: 410, y: 95, coneW: 250, lit: lampLit },
          stageLeft: { x: 390, y: 600 },
          stageCenter: { x: 640, y: 600 },
          stageRight: { x: 890, y: 600 },
        },
        lightSources: [
          { x: 390, y: 90, targetX: 390, targetY: 600, radius: 260, color: '#75D6EC', intensity: 0.28 * lampLit },
          { x: 890, y: 90, targetX: 890, targetY: 600, radius: 260, color: '#F7C97E', intensity: 0.28 * lampLit },
        ],
      };
    },
  },

  river_gate: {
    id: 'river_gate',
    family: 'exterior_water',
    surface: 'wet_stone',
    label: '江河水闸与潮涌堤岸',
    palette: { skyTop: '#D9ECF7', skyBot: '#A8D2EB', wall: '#5D7B93', wallTrim: '#3C556B', floor: '#6C7A82', floorLine: '#48555E', accent: '#2E8BC0', warm: '#FFE59E' },
    groundY: 600,
    weather: 'bubbles',
    build(t, st) {
      const gateOpen = clamp(st.gateOpen ?? st.doorOpen ?? 0.25);
      return {
        anchors: {
          groundY: 600,
          gate: { x: 930, y: 585, topY: 220 - gateOpen * 130, w: 210, h: 280, open: gateOpen },
          door: { x: 930, y: 585, topY: 220, w: 210, h: 280, open: gateOpen },
          lamp: { x: 310, y: 230, coneW: 220, lit: clamp(st.lampLit ?? 0.7) },
          desk: { x: 640, y: 555, topY: 495, w: 220, h: 60, shake: st.deskShake || 0 },
          stageLeft: { x: 390, y: 600 },
          stageCenter: { x: 620, y: 600 },
          stageRight: { x: 860, y: 600 },
        },
        lightSources: [
          { x: 930, y: 180, targetX: 880, targetY: 600, radius: 340, color: '#A6E8FF', intensity: 0.22 + 0.26 * gateOpen },
          { x: 310, y: 230, targetX: 330, targetY: 600, radius: 200, color: '#FFE59E', intensity: 0.18 },
        ],
      };
    },
  },

  terracotta_courtyard: {
    id: 'terracotta_courtyard',
    family: 'courtyard',
    surface: 'courtyard_stone',
    label: '晨昏院落与工坊',
    palette: { skyTop: '#FDE6C4', skyBot: '#F7C59F', wall: '#EFE2CF', wallTrim: '#8C6249', floor: '#C9B39B', floorLine: '#9E846C', accent: '#E07A5F', warm: '#FFD98E' },
    groundY: 600,
    weather: 'dust',
    build(t, st) {
      const dawn = clamp(st.dawn ?? 0.75);
      const doorOpen = clamp(st.doorOpen ?? 0.2);
      const lampLit = clamp(st.lampLit ?? (1 - dawn * 0.5));
      return {
        anchors: {
          groundY: 600,
          door: { x: 1030, y: 600, topY: 210, w: 158, h: 390, open: doorOpen },
          window: { x: 280, y: 280, w: 180, h: 150, r: 85, ripple: 0 },
          desk: { x: 650, y: 552, topY: 486, w: 290, h: 66, shake: st.deskShake || 0 },
          lamp: { x: 860, y: 185, coneW: 240, lit: lampLit },
          board: { x: 540, y: 265, w: 220, h: 132, pins: st.pinnedCount || 1 },
          dawn,
          stageLeft: { x: 400, y: 600 },
          stageCenter: { x: 640, y: 600 },
          stageRight: { x: 880, y: 600 },
        },
        lightSources: [
          { x: 240 + dawn * 220, y: 80, targetX: 560, targetY: 600, radius: 420, color: '#FFE3A8', intensity: 0.2 + 0.22 * dawn },
          { x: 860, y: 185, targetX: 850, targetY: 600, radius: 240, color: '#FFB86B', intensity: 0.28 * lampLit },
        ],
      };
    },
  },

  mountain_pass: {
    id: 'mountain_pass',
    family: 'exterior_mountain',
    surface: 'mountain_stone',
    label: '群山峡口与云海步道',
    palette: { skyTop: '#CFE8DA', skyBot: '#F5E8C8', wall: '#5A7D6C', wallTrim: '#355245', floor: '#7D8778', floorLine: '#555F52', accent: '#F2B866', warm: '#FFEAB0' },
    groundY: 600,
    weather: 'dust',
    build(t, st) {
      const passOpen = clamp(st.gateOpen ?? st.doorOpen ?? 0.45);
      return {
        anchors: {
          groundY: 600,
          gate: { x: 760, y: 560, topY: 140, gapW: 110 + passOpen * 220, open: passOpen },
          pedestal: { x: 640, y: 572, topY: 520, w: 230, h: 52 },
          lamp: { x: 760, y: 110, coneW: 360, lit: passOpen },
          stageLeft: { x: 390, y: 600 },
          stageCenter: { x: 630, y: 600 },
          stageRight: { x: 890, y: 600 },
        },
        lightSources: [
          { x: 760, y: 90, targetX: 680, targetY: 600, radius: 410, color: '#FFEAB0', intensity: 0.18 + 0.34 * passOpen },
        ],
      };
    },
  },

  rain_street: {
    id: 'rain_street',
    family: 'street',
    surface: 'wet_pavement',
    label: '雨夜街灯微缩街景',
    palette: { skyTop: '#101B30', skyBot: '#1F3352', wall: '#24354F', wallTrim: '#476285', floor: '#172336', floorLine: '#385170', accent: '#7CC6FE', warm: '#FFD88A' },
    groundY: 600,
    weather: 'rain',
    build(t, st) {
      const lampLit = clamp(st.lampLit ?? 1);
      const doorOpen = clamp(st.doorOpen ?? 0.15);
      return {
        anchors: {
          groundY: 600,
          lamp: { x: 460, y: 175, postX: 460, coneW: 300, lit: lampLit },
          door: { x: 1020, y: 600, topY: 245, w: 142, h: 355, open: doorOpen },
          window: { x: 790, y: 330, w: 165, h: 120, r: 75, ripple: 0 },
          desk: { x: 260, y: 560, topY: 500, w: 160, h: 60, shake: 0 },
          stageLeft: { x: 420, y: 600 },
          stageCenter: { x: 650, y: 600 },
          stageRight: { x: 890, y: 600 },
        },
        lightSources: [
          { x: 460, y: 175, targetX: 460, targetY: 600, radius: 300, color: '#FFD88A', intensity: 0.38 * lampLit },
          ...(doorOpen > 0.05 ? [{ x: 1020, y: 390, targetX: 960, targetY: 600, radius: 220, color: '#FFC978', intensity: 0.28 * doorOpen }] : []),
        ],
      };
    },
  },

  sunset_ridge: {
    id: 'sunset_ridge',
    family: 'exterior_ridge',
    surface: 'meadow',
    label: '暮色山脊与星夜草坡',
    palette: { skyTop: '#2B2D5C', skyBot: '#E8997A', wall: '#47436B', wallTrim: '#7D6A8A', floor: '#354B45', floorLine: '#567568', accent: '#FAD089', warm: '#FFE2A6' },
    groundY: 600,
    weather: 'dust',
    build(t, st) {
      const dawn = clamp(st.dawn ?? 0.45);
      const lampLit = clamp(st.lampLit ?? 0.9);
      return {
        anchors: {
          groundY: 600,
          lamp: { x: 1060, y: 210, coneW: 340, lit: lampLit },
          pedestal: { x: 640, y: 576, topY: 530, w: 200, h: 46 },
          dawn,
          stageLeft: { x: 400, y: 600 },
          stageCenter: { x: 640, y: 600 },
          stageRight: { x: 880, y: 600 },
        },
        lightSources: [
          { x: 1060, y: 210, targetX: 820, targetY: 600, radius: 380, color: '#FFE2A6', intensity: 0.3 * lampLit },
        ],
      };
    },
  },

  seaside_deck: {
    id: 'seaside_deck',
    family: 'exterior_coast',
    surface: 'sandy_deck',
    label: '晴海周日木栈台',
    palette: { skyTop: '#78C8F6', skyBot: '#FFF1C6', wall: '#3CA4CE', wallTrim: '#E2B87E', floor: '#EBD3A8', floorLine: '#C9A874', accent: '#FFD45E', warm: '#FFEAA0' },
    groundY: 600,
    weather: 'dust',
    build(t, st) {
      const dawn = clamp(st.dawn ?? 1);
      const lampLit = clamp(st.lampLit ?? 1);
      const sunY = lerp(410, 148, dawn);
      return {
        palette: {
          skyTop: lerpHex('#232A4E', '#78C8F6', dawn),
          skyBot: lerpHex('#6A5379', '#FFF1C6', dawn),
          wall: lerpHex('#244A6E', '#3CA4CE', dawn),
          wallTrim: '#D6AA72',
          floor: lerpHex('#7A6D6B', '#EBD3A8', dawn),
          floorLine: lerpHex('#564C4D', '#C9A874', dawn),
          accent: '#FFD45E',
          warm: '#FFEAA0',
        },
        anchors: {
          groundY: 600,
          sun: { x: 985, y: sunY, r: 54, glow: dawn },
          parasol: { x: 255, y: 600, topY: 280 },
          dawn,
          stageLeft: { x: 390, y: 600 },
          stageCenter: { x: 640, y: 600 },
          stageRight: { x: 900, y: 600 },
        },
        lightSources: [
          { x: 985, y: sunY, targetX: 640, targetY: 600, radius: 480, color: '#FFE899', intensity: (0.12 + 0.34 * dawn) * (0.4 + 0.6 * lampLit) },
        ],
      };
    },
  },

  misty_pier: {
    id: 'misty_pier',
    family: 'exterior_water',
    surface: 'wet_stone',
    label: '烟波渡口与芦苇木栈',
    palette: { skyTop: '#CAE6E3', skyBot: '#EEF7F5', wall: '#7FA9A8', wallTrim: '#6E533E', floor: '#8A6B52', floorLine: '#5D4432', accent: '#58B4B0', warm: '#FFF2CC' },
    groundY: 600,
    weather: 'dust',
    build(t, st) {
      const gateOpen = clamp(st.gateOpen ?? 0.5);
      const lampLit = clamp(st.lampLit ?? 0.85);
      return {
        anchors: {
          groundY: 600,
          pier: { x0: -140, x1: 660, y: 584 },
          reeds: { x: 180, y: 585 },
          lamp: { x: 615, y: 390, coneW: 180, lit: lampLit },
          gate: { x: 940, y: 565, open: gateOpen },
          stageLeft: { x: 340, y: 600 },
          stageCenter: { x: 520, y: 600 },
          stageRight: { x: 860, y: 600 },
        },
        lightSources: [
          { x: 615, y: 360, targetX: 540, targetY: 600, radius: 240, color: '#FFF0C2', intensity: 0.28 * lampLit },
        ],
      };
    },
  },

  pear_orchard: {
    id: 'pear_orchard',
    family: 'courtyard',
    surface: 'courtyard_stone',
    label: '梨园庭院办公台',
    palette: { skyTop: '#E4F3D8', skyBot: '#FAF6E4', wall: '#EFE7D6', wallTrim: '#7D9B6A', floor: '#D6C8B0', floorLine: '#A8987E', accent: '#F2CA52', warm: '#FFF0B8' },
    groundY: 600,
    weather: 'petals',
    build(t, st) {
      const lampLit = clamp(st.lampLit ?? 0.9);
      return {
        anchors: {
          groundY: 600,
          tree: { x: 310, y: 600, canopyY: 185 },
          desk: { x: 655, y: 556, topY: 486, w: 330, h: 70, shake: st.deskShake || 0 },
          lamp: { x: 660, y: 120, coneW: 320, lit: lampLit },
          stageLeft: { x: 430, y: 600 },
          stageCenter: { x: 655, y: 600 },
          stageRight: { x: 875, y: 600 },
        },
        lightSources: [
          { x: 640, y: 80, targetX: 655, targetY: 600, radius: 380, color: '#FFF3C4', intensity: 0.28 * lampLit },
        ],
      };
    },
  },

  twilight_street: {
    id: 'twilight_street',
    family: 'street',
    surface: 'street_pavement',
    label: '暮色三迁暖灯街巷',
    palette: { skyTop: '#3E4772', skyBot: '#F2BE96', wall: '#5D5D82', wallTrim: '#8E7A8C', floor: '#5A5566', floorLine: '#7C7487', accent: '#FFD485', warm: '#FFE6AD' },
    groundY: 600,
    weather: 'dust',
    build(t, st) {
      const lampLit = clamp(st.lampLit ?? 0.95);
      return {
        anchors: {
          groundY: 600,
          lamp: { x: 760, y: 178, postX: 760, coneW: 310, lit: lampLit },
          bench: { x: 690, y: 566, w: 190, h: 34 },
          stageLeft: { x: 380, y: 600 },
          stageCenter: { x: 640, y: 600 },
          stageRight: { x: 880, y: 600 },
        },
        lightSources: [
          { x: 760, y: 178, targetX: 710, targetY: 600, radius: 320, color: '#FFE29E', intensity: 0.42 * lampLit },
          { x: 260, y: 195, targetX: 280, targetY: 600, radius: 230, color: '#FFD699', intensity: 0.24 * lampLit },
        ],
      };
    },
  },
});

export const STAGE_SET_NAMES = Object.freeze(Object.keys(BUILTIN_STAGE_SETS));

export function defineStageSet(id, definition) {
  if (!id || typeof id !== 'string') throw new Error('StageSet id 必须是非空字符串');
  if (!definition || typeof definition.build !== 'function') throw new Error(`StageSet ${id} 须提供 build(t, state) 函数`);
  CUSTOM_SETS.set(id, { id, groundY: 600, weather: 'dust', ...definition });
  return CUSTOM_SETS.get(id);
}

export function isKnownStageSet(specOrId) {
  if (!specOrId) return true;
  const id = typeof specOrId === 'string' ? specOrId : (specOrId.id || specOrId.base || 'underwater_study');
  return Boolean(BUILTIN_STAGE_SETS[id] || CUSTOM_SETS.has(id));
}

export function resolveShotSetSpec(shot = {}, shotIndex = 0, episodeSpec = {}) {
  const explicit = shot.set || shot.stageSet;
  if (explicit) {
    return typeof explicit === 'string' ? { id: explicit } : { id: explicit.id || explicit.base || 'underwater_study', ...explicit };
  }
  if (episodeSpec?.defaultSet && !episodeSpec?.autoStageProgression) {
    return typeof episodeSpec.defaultSet === 'string' ? { id: episodeSpec.defaultSet } : { ...episodeSpec.defaultSet };
  }
  if (episodeSpec?.autoStageProgression) {
    const kind = shot.direction?.kind;
    if (kind === 'prop' || (Array.isArray(shot.actors) && shot.actors.length === 0)) return { id: 'screening_desk' };
    if (shot.mood === 'warm_meal') return { id: 'pantry_hearth' };
    if (shot.mood === 'cinema_glow') return { id: 'porthole_observatory' };
    if ((shot.actors || []).some((a) => a.walk && (a.walk.from > 1180 || a.walk.to > 1180))) return { id: 'corridor_hatch' };
    if ((shot.actors || []).length >= 2) return { id: shotIndex % 2 === 0 ? 'corridor_hatch' : 'split_stage' };
    const rotation = ['underwater_study', 'porthole_observatory', 'screening_desk', 'corridor_hatch'];
    return { id: rotation[shotIndex % rotation.length] };
  }
  return { id: 'underwater_study' };
}

export function resolveStageSet(setSpec = 'underwater_study', t = 0, interactionState = {}) {
  const normalized = typeof setSpec === 'string' ? { id: setSpec } : (setSpec || { id: 'underwater_study' });
  const setId = normalized.id || normalized.base || 'underwater_study';
  const def = CUSTOM_SETS.get(setId) || BUILTIN_STAGE_SETS[setId];
  if (!def) throw new Error(`未知舞台场景 preset: ${setId}`);

  const mergedState = { ...normalized, ...interactionState };
  const built = def.build(t, mergedState);
  const palette = { ...def.palette, ...(built.palette || {}), ...(normalized.palette || {}) };
  const weatherKind = normalized.weather ?? def.weather ?? 'dust';
  const weatherCount = weatherKind === 'rain' ? 38 : weatherKind === 'petals' ? 20 : weatherKind === 'bubbles' ? 16 : weatherKind === 'steam' ? 10 : 12;
  const particles = weatherKind === 'none'
    ? []
    : makeParticles(weatherCount, t, {
        kind: weatherKind,
        x0: def.id === 'pantry_hearth' ? 240 : -80,
        x1: def.id === 'pantry_hearth' ? 400 : 1360,
        y0: def.id === 'pantry_hearth' ? 260 : 40,
        y1: def.id === 'pantry_hearth' ? 455 : (built.anchors?.groundY ?? def.groundY ?? 600) - 12,
        seed: setId.length * 7.1,
      });

  return {
    id: def.id,
    family: def.family,
    surface: def.surface,
    label: def.label,
    mood: mergedState.mood || 'work_cool',
    palette,
    worldBounds: WORLD_BOUNDS,
    groundY: built.anchors?.groundY ?? def.groundY ?? 600,
    anchors: built.anchors,
    lightSources: built.lightSources || [],
    particles,
    customFixtures: normalized.fixtures || [],
    reactive: {
      doorOpen: clamp(mergedState.doorOpen ?? built.anchors?.door?.open ?? 0),
      gateOpen: clamp(mergedState.gateOpen ?? built.anchors?.gate?.open ?? 0),
      lampLit: clamp(mergedState.lampLit ?? built.anchors?.lamp?.lit ?? 0.85),
      dawn: clamp(mergedState.dawn ?? 0.65),
      deskShake: mergedState.deskShake || 0,
      windowImpactAt: mergedState.windowImpactAt ?? null,
      focusX: mergedState.focusX ?? 640,
    },
  };
}
