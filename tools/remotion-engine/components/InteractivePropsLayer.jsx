import React from 'react';
import { semanticStateAt, clamp, lerp, seg, ease, easeOut, backOut, kf } from '../../engine/timeline_core.mjs';
import { handAt } from '../../engine/character_motion.mjs';

function PropGlyph({ propId, state = {}, scale = 1 }) {
  const s = scale;
  switch (propId) {
    case 'lantern':
    case 'sky_lantern':
      return (
        <g transform={`scale(${s})`}>
          <ellipse cx={0} cy={0} rx={22} ry={28} fill="#FFB74D" stroke="#6D3B1A" strokeWidth={2.4} />
          <ellipse cx={0} cy={2} rx={12} ry={16} fill="#FFF3C4" opacity={0.85} />
        </g>
      );
    case 'sesame_flatbread':
    case 'flatbread':
      return (
        <g transform={`scale(${s})`}>
          <ellipse cx={0} cy={0} rx={42} ry={26} fill="#E8BA78" stroke="#433548" strokeWidth={2.5} />
          <ellipse cx={-2} cy={-3} rx={32} ry={18} fill="#F5D59A" />
        </g>
      );
    case 'rice_bowl':
    case 'empty_bowl':
      return (
        <g transform={`scale(${s})`}>
          <path d="M-36,-8 L36,-8 L26,22 L-26,22 Z" fill="#A9D2E0" stroke="#32445D" strokeWidth={2.5} />
          <ellipse cx={0} cy={-8} rx={36} ry={9} fill={propId === 'rice_bowl' ? '#FFFDF7' : '#6A8FA3'} stroke="#32445D" strokeWidth={2} />
        </g>
      );
    case 'umbrella':
      return (
        <g transform={`scale(${s})`}>
          <path d="M-56,-34 Q0,-86 56,-34 Z" fill="#63C7B8" stroke="#1E3A46" strokeWidth={2.8} />
          <line x1={0} y1={-34} x2={0} y2={24} stroke="#4A3B32" strokeWidth={3.2} />
        </g>
      );
    case 'shovel':
    case 'river_staff':
      return (
        <g transform={`scale(${s})`}>
          <line x1={0} y1={-46} x2={0} y2={42} stroke="#8D6346" strokeWidth={5} strokeLinecap="round" />
          <path d="M-12,-56 L12,-56 L9,-36 L-9,-36 Z" fill="#9BB0C1" stroke="#2D3E4E" strokeWidth={2} />
        </g>
      );
    case 'scroll_map':
    case 'old_notebook':
    case 'folded_page':
    default: {
      const title = state.title || state.text || '';
      return (
        <g transform={`scale(${s})`}>
          <rect x={-48} y={-32} width={96} height={64} rx={7} fill="#FAF0D7" stroke="#3A475C" strokeWidth={2.4} />
          <line x1={-32} y1={-12} x2={32} y2={-12} stroke="#9BA8B8" strokeWidth={2} />
          <line x1={-32} y1={4} x2={24} y2={4} stroke="#9BA8B8" strokeWidth={2} />
          {title && (
            <text x={0} y={-14} textAnchor="middle" fontSize={13} fontWeight="800" fill="#2C3A4E" fontFamily="NewdayNoto, Noto Sans CJK SC, sans-serif">
              {title}
            </text>
          )}
        </g>
      );
    }
  }
}

function EnvelopeSvg({ scale = 1, waxColor = '#E05252' }) {
  return (
    <g transform={`scale(${scale})`}>
      <rect x={-44} y={-28} width={88} height={56} rx={6} fill="#FFFDF7" stroke="#45566B" strokeWidth={2.8} />
      <path d="M -43 -26 L 0 5 L 43 -26" fill="#F5ECD8" stroke="#45566B" strokeWidth={2.4} strokeLinejoin="round" />
      <line x1={-42} y1={26} x2={-12} y2={0} stroke="#CBD3DC" strokeWidth={2} />
      <line x1={42} y1={26} x2={12} y2={0} stroke="#CBD3DC" strokeWidth={2} />
      <circle cx={0} cy={4} r={7.5} fill={waxColor} stroke="#FFF6EA" strokeWidth={1.6} />
    </g>
  );
}

function OrigamiCraneSvg({ color = '#FF9EB5', stroke = '#9C4660', wingLift = 0, scale = 1, flip = false }) {
  const dir = flip ? -1 : 1;
  return (
    <g transform={`scale(${dir * scale}, ${scale})`}>
      <polygon points="-28,6 0,-8 22,6 0,14" fill={color} stroke={stroke} strokeWidth={2.2} strokeLinejoin="round" />
      <polygon points="10,2 30,-24 38,-20 20,6" fill={color} stroke={stroke} strokeWidth={2.2} strokeLinejoin="round" />
      <polygon points="-14,4 -34,-22 -20,8" fill={color} stroke={stroke} strokeWidth={2.2} strokeLinejoin="round" />
      <polygon
        points={`-8,0 14,0 2,${(-34 - wingLift * 14).toFixed(1)}`}
        fill="#FFF6F8"
        stroke={stroke}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
    </g>
  );
}

function evalTrack2D(t, track, defX = 640, defY = 600) {
  if (!Array.isArray(track) || track.length === 0) return [defX, defY];
  const norm = track.map((row) => (Array.isArray(row[1]) ? row : [row[0], [row[1], row[2] ?? defY], row[3]]));
  const res = kf(t, norm);
  return Array.isArray(res) ? res : [Number.isFinite(res) ? res : defX, defY];
}

/**
 * 声明式世界机关与叙事道具渲染器（纯参数与时间 t 求解，零镜头硬编码）
 */
function renderMechanism(mech, t, idx) {
  switch (mech.kind) {
    case 'lever_switch': {
      const u = ease(seg(t, mech.pullAt ?? 1.2, (mech.pullAt ?? 1.2) + (mech.duration ?? 0.55)));
      const ang = lerp(-34, 38, u);
      return (
        <g key={`mech-${idx}`} transform={`translate(${mech.x}, ${mech.y})`}>
          <rect x={-26} y={-20} width={52} height={22} rx={5} fill="#505C68" stroke="#28323C" strokeWidth={2.5} />
          <g transform={`translate(0, -16) rotate(${ang.toFixed(1)})`}>
            <line x1={0} y1={0} x2={0} y2={-64} stroke="#CBD4DE" strokeWidth={7} strokeLinecap="round" />
            <circle cx={0} cy={-68} r={12} fill="#E8594F" stroke="#5C201C" strokeWidth={2.5} />
          </g>
        </g>
      );
    }

    case 'envelope_flood': {
      const standX = mech.standX ?? 655;
      const standY = mech.standY ?? 600;
      const floodU = seg(t, mech.floodAt ?? 3.65, mech.floodEnd ?? 5.25);
      const swept = floodU > 0;
      const q = ease(floodU);
      const envX = swept ? lerp(standX, mech.toX ?? 1135, q) : standX;
      const envY = swept
        ? lerp(standY - 68, (mech.toY ?? 558), Math.min(1, floodU * 2.4)) + Math.sin(t * 9.5) * 11
        : standY - 68 + Math.sin(t * 2.6) * 2.5;
      const envRot = swept ? Math.sin(t * 7.2) * 22 + q * 28 : -4;
      return (
        <g key={`mech-${idx}`}>
          {/* 堤岸木托架 */}
          <g transform={`translate(${standX}, ${standY})`}>
            <rect x={-6} y={-52} width={12} height={52} rx={3} fill="#7B583B" stroke="#402C1D" strokeWidth={2} />
            <rect x={-34} y={-58} width={68} height={10} rx={4} fill="#9E734E" stroke="#402C1D" strokeWidth={2} />
          </g>
          {/* 水花浪头托举效果 */}
          {swept && (
            <g transform={`translate(${envX.toFixed(1)}, ${(envY + 20).toFixed(1)})`}>
              <path d="M -54 6 Q -26 -18 0 2 Q 28 -16 56 6" fill="none" stroke="#E8FAFF" strokeWidth={4.5} strokeLinecap="round" />
              <circle cx={-36} cy={-8} r={5} fill="#FFFFFF" opacity={0.85} />
              <circle cx={32} cy={-10} r={6} fill="#FFFFFF" opacity={0.85} />
            </g>
          )}
          <g transform={`translate(${envX.toFixed(1)}, ${envY.toFixed(1)}) rotate(${envRot.toFixed(1)})`}>
            <EnvelopeSvg scale={1.08} />
          </g>
        </g>
      );
    }

    case 'sunday_calendar': {
      const hitU = seg(t, mech.pierceAt ?? 7.25, (mech.pierceAt ?? 7.25) + 1.35);
      const hit = t >= (mech.pierceAt ?? 7.25);
      const q = easeOut(hitU);
      const flyX = q * 285;
      const flyY = -Math.sin(q * Math.PI) * 95 + q * 35;
      const flyRot = q * 54;
      const shake = hit && hitU < 0.25 ? Math.sin(t * 48) * 5 * (1 - hitU * 4) : 0;
      return (
        <g key={`mech-${idx}`} transform={`translate(${(mech.x + shake).toFixed(1)}, ${mech.y})`}>
          {/* 木画架三脚架 */}
          <line x1={-38} y1={0} x2={-12} y2={-168} stroke="#8D623F" strokeWidth={7} strokeLinecap="round" />
          <line x1={38} y1={0} x2={12} y2={-168} stroke="#8D623F" strokeWidth={7} strokeLinecap="round" />
          <line x1={0} y1={0} x2={0} y2={-155} stroke="#6E4B2F" strokeWidth={6} strokeLinecap="round" />
          {/* 日历底板与空白次页 */}
          <rect x={-58} y={-166} width={116} height={112} rx={10} fill="#FFFDF7" stroke="#43352B" strokeWidth={3} />
          <rect x={-58} y={-166} width={116} height={28} rx={8} fill="#7B8FA6" stroke="#43352B" strokeWidth={2.5} />
          <line x1={-32} y1={-108} x2={32} y2={-108} stroke="#D5DCE4" strokeWidth={4} strokeLinecap="round" />
          <line x1={-24} y1={-88} x2={24} y2={-88} stroke="#D5DCE4" strokeWidth={4} strokeLinecap="round" />
          {/* 「周日」页（中箭后整页飘飞！） */}
          <g
            transform={`translate(${flyX.toFixed(1)}, ${(-110 + flyY).toFixed(1)}) rotate(${flyRot.toFixed(1)})`}
            opacity={1 - q * 0.22}
          >
            <rect x={-56} y={-54} width={112} height={108} rx={9} fill="#FFF9EA" stroke="#43352B" strokeWidth={3} />
            <path d="M -56 -32 Q -56 -54 -34 -54 L 34 -54 Q 56 -54 56 -32 L 56 -26 L -56 -26 Z" fill="#FF7A59" stroke="#43352B" strokeWidth={2.5} />
            <circle cx={-28} cy={-40} r={4.5} fill="#FFFDF7" />
            <circle cx={28} cy={-40} r={4.5} fill="#FFFDF7" />
            <text x={0} y={20} textAnchor="middle" fontSize={36} fontWeight="900" fill="#2D3748" fontFamily="NewdayNoto, Noto Sans CJK SC, sans-serif">
              {mech.label || '周日'}
            </text>
          </g>
        </g>
      );
    }

    case 'flying_arrow': {
      if (t < (mech.shootAt ?? 6.95)) return null;
      const flightU = seg(t, mech.shootAt ?? 6.95, mech.hitAt ?? 7.25);
      const landed = flightU >= 1;
      const ax = lerp(mech.fromX ?? 1160, mech.toX ?? 640, easeOut(flightU));
      const ay = lerp(mech.fromY ?? 155, mech.toY ?? 485, easeOut(flightU)) - Math.sin(flightU * Math.PI) * 32;
      const dx = (mech.toX ?? 640) - (mech.fromX ?? 1160);
      const dy = (mech.toY ?? 485) - (mech.fromY ?? 155);
      const baseDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      const quiver = landed ? Math.exp(-(t - (mech.hitAt ?? 7.25)) * 7) * Math.sin(t * 55) * 6 : 0;
      return (
        <g key={`mech-${idx}`}>
          {!landed && (
            <line
              x1={ax - dx * 0.16}
              y1={ay - dy * 0.16}
              x2={ax}
              y2={ay}
              stroke="#FFE082"
              strokeWidth={4}
              strokeLinecap="round"
              opacity={0.72}
            />
          )}
          <g transform={`translate(${ax.toFixed(1)}, ${ay.toFixed(1)}) rotate(${(baseDeg + quiver).toFixed(1)})`}>
            <line x1={-76} y1={0} x2={8} y2={0} stroke="#C88A4B" strokeWidth={5} strokeLinecap="round" />
            <polygon points="18,0 -2,-9 -2,9" fill="#FFD54F" stroke="#5C4018" strokeWidth={2} />
            <polygon points="-76,0 -92,-10 -82,0 -92,10" fill="#FF7043" stroke="#5C2B18" strokeWidth={1.6} />
          </g>
        </g>
      );
    }

    case 'sliding_mountain': {
      const pos = evalTrack2D(t, mech.track, mech.x ?? 620, mech.y ?? 600);
      const mx = pos[0];
      const my = pos[1] ?? 600;
      const firstRow = mech.track?.[0];
      const startX = Array.isArray(firstRow?.[1]) ? firstRow[1][0] : (firstRow?.[1] ?? mx);
      return (
        <g key={`mech-${idx}`}>
          {mx > startX + 8 && (
            <line
              x1={startX - 40}
              y1={my + 6}
              x2={mx - 30}
              y2={my + 6}
              stroke="#5A6658"
              strokeWidth={5}
              strokeDasharray="14 10"
              opacity={0.55}
            />
          )}
          <g transform={`translate(${mx.toFixed(1)}, ${my.toFixed(1)})`}>
            <path d="M -165 0 L -78 -245 L 8 -165 L 72 -285 L 185 0 Z" fill="#678D79" stroke="#31493E" strokeWidth={4} strokeLinejoin="round" />
            <path d="M -78 -245 L -42 -175 L -8 -195 L 8 -165 Z" fill="#E8F3EC" opacity={0.82} />
            <path d="M 72 -285 L 36 -196 L 74 -212 L 114 -184 Z" fill="#F2F8F4" opacity={0.88} />
            <path d="M -125 0 L -32 -162 L 62 -118 L 136 0 Z" fill="#4E7361" opacity={0.85} />
          </g>
        </g>
      );
    }

    case 'cushion': {
      if (t < (mech.enterAt ?? 11.1)) return null;
      const pop = backOut(seg(t, mech.enterAt ?? 11.1, (mech.enterAt ?? 11.1) + 0.36), 1.6);
      return (
        <g key={`mech-${idx}`} transform={`translate(${mech.x}, ${mech.y}) scale(${pop.toFixed(3)})`}>
          <ellipse cx={0} cy={-24} rx={48} ry={26} fill="#FF9EB5" stroke="#6E3546" strokeWidth={3} />
          <ellipse cx={0} cy={-28} rx={32} ry={14} fill="#FFC2D1" />
          <circle cx={0} cy={-28} r={5} fill="#FFF5F7" />
        </g>
      );
    }

    case 'paper_puppets': {
      const enterU = easeOut(seg(t, mech.enterAt ?? 13.6, (mech.enterAt ?? 13.6) + 0.85));
      if (enterU <= 0.01) return null;
      const scatterU = easeOut(seg(t, mech.scatterAt ?? 14.55, (mech.scatterAt ?? 14.55) + 0.75));
      const colors = ['#FFE082', '#B2F2BB', '#FFC9C9'];
      const bodies = ['#E69F73', '#D98A6C', '#CFA07E'];
      return (
        <g key={`mech-${idx}`}>
          {[0, 1, 2].map((pi) => {
            const baseX = lerp((mech.fromX ?? 930) + pi * 68, (mech.toX ?? 660) + pi * 74, enterU) + scatterU * (38 + pi * 26);
            const hop = Math.abs(Math.sin(t * 8.5 + pi * 1.4)) * 12 * (1 - scatterU * 0.5);
            const swing = Math.sin(t * 8.5 + pi * 1.4) * 26;
            const noteFlyX = scatterU * (75 + pi * 35);
            const noteFlyY = -scatterU * (65 + pi * 28);
            const noteRot = scatterU * (48 + pi * 22);
            return (
              <g key={`pp-${pi}`} transform={`translate(${baseX.toFixed(1)}, ${(600 - hop).toFixed(1)})`}>
                {/* 关节泥纸小人 */}
                <line x1={-8} y1={-28} x2={-12 - swing * 0.25} y2={0} stroke="#5C3D2E" strokeWidth={4.5} strokeLinecap="round" />
                <line x1={8} y1={-28} x2={12 + swing * 0.25} y2={0} stroke="#5C3D2E" strokeWidth={4.5} strokeLinecap="round" />
                <rect x={-16} y={-68} width={32} height={42} rx={9} fill={bodies[pi]} stroke="#5C3D2E" strokeWidth={2.8} />
                <circle cx={0} cy={-86} r={17} fill="#FFE8D6" stroke="#5C3D2E" strokeWidth={2.8} />
                <circle cx={-5} cy={-87} r={2.4} fill="#3B281E" />
                <circle cx={5} cy={-87} r={2.4} fill="#3B281E" />
                <line x1={-15} y1={-60} x2={-30} y2={-76 + swing * 0.4} stroke="#5C3D2E" strokeWidth={4} strokeLinecap="round" />
                <line x1={15} y1={-60} x2={28} y2={-78 - swing * 0.4} stroke="#5C3D2E" strokeWidth={4} strokeLinecap="round" />
                {/* 空白彩色小纸牌（零文字零数字，挥手后散开！） */}
                <g transform={`translate(${(-32 + noteFlyX).toFixed(1)}, ${(-88 + noteFlyY).toFixed(1)}) rotate(${(-14 + noteRot).toFixed(1)})`}>
                  <rect x={-18} y={-14} width={36} height={28} rx={4} fill={colors[pi]} stroke="#5C4B37" strokeWidth={2} />
                </g>
              </g>
            );
          })}
        </g>
      );
    }

    case 'savings_jar_beam': {
      const jarX = mech.x ?? 640;
      const jarY = mech.y ?? 472;
      const holeX = mech.holeX ?? 1020;
      const holeY = mech.holeY ?? 292;
      const stealStart = mech.stealAt ?? 17.45;
      const tokenOffsets = [
        [-16, -16],
        [14, -15],
        [-2, -28],
        [-15, -36],
        [13, -38],
      ];
      return (
        <g key={`mech-${idx}`}>
          {/* 储蓄玻璃罐后壁 */}
          <g transform={`translate(${jarX}, ${jarY})`}>
            <rect x={-36} y={-86} width={72} height={86} rx={16} fill="rgba(186, 236, 255, 0.28)" stroke="#9CE3F8" strokeWidth={3} />
            <rect x={-26} y={-98} width={52} height={14} rx={4} fill="#B88B58" stroke="#5A3F24" strokeWidth={2.4} />
          </g>
          {/* 5 枚纯金色圆币（随偷光光束沿弧线被吸进墙洞！） */}
          {tokenOffsets.map(([ox, oy], ti) => {
            const u = seg(t, stealStart + ti * 0.16, stealStart + ti * 0.16 + 0.92);
            const q = ease(u);
            const startX = jarX + ox;
            const startY = jarY + oy;
            const tx = lerp(startX, holeX, q);
            const ty = lerp(startY, holeY, q) - Math.sin(q * Math.PI) * (68 + ti * 10);
            const sc = q > 0.85 ? 1 - (q - 0.85) / 0.15 : 1;
            return (
              <g key={`tok-${ti}`} transform={`translate(${tx.toFixed(1)}, ${ty.toFixed(1)}) scale(${sc.toFixed(3)})`}>
                <circle cx={0} cy={0} r={11} fill="#FFD43B" stroke="#B07914" strokeWidth={2.4} />
                <circle cx={-3} cy={-3} r={3.5} fill="#FFF9DB" />
              </g>
            );
          })}
          {/* 玻璃罐高光前壁 */}
          <path d={`M ${jarX - 24} ${jarY - 74} L ${jarX - 24} ${jarY - 18}`} stroke="#FFFFFF" strokeWidth={3.5} strokeLinecap="round" opacity={0.55} />
        </g>
      );
    }

    case 'straw_boat_cranes': {
      const boatPos = evalTrack2D(t, mech.boatTrack, 880, 548);
      const bx = boatPos[0];
      const by = (boatPos[1] ?? 548) + Math.sin(t * 2.8) * 5;
      const pierX = mech.pierX ?? 595;
      const pierY = mech.pierY ?? 554;
      const boardU = seg(t, mech.boardAt ?? 21.05, (mech.boardAt ?? 21.05) + 0.95);
      const q = ease(boardU);
      const crane2X = boardU <= 0 ? pierX + 36 : lerp(pierX + 36, bx - 16, q);
      const crane2Y = boardU <= 0 ? pierY : lerp(pierY, by - 48, q) - Math.sin(q * Math.PI) * 58;
      const wing = 0.5 + 0.5 * Math.sin(t * 6.4);

      if (mech.renderPass === 'boat') {
        return (
          <g key={`mech-boat-${idx}`} transform={`translate(${bx.toFixed(1)}, ${by.toFixed(1)})`}>
            {/* 船底水花 */}
            <path d="M -118 18 Q -40 28 36 18 Q 88 26 126 16" fill="none" stroke="#E8FCFA" strokeWidth={4} strokeLinecap="round" />
            {/* 草船木船身与草垛 */}
            <path d="M -112 -6 L 112 -6 L 84 22 L -84 22 Z" fill="#8C5E3C" stroke="#472E1B" strokeWidth={3} strokeLinejoin="round" />
            {[-58, -18, 22, 58].map((sx, si) => (
              <ellipse key={si} cx={sx} cy={-16} rx={24} ry={16} fill="#E6C267" stroke="#8C6D23" strokeWidth={2.2} />
            ))}
            {/* 船桅与小帆 */}
            <line x1={4} y1={-18} x2={4} y2={-132} stroke="#5B3E28" strokeWidth={5} strokeLinecap="round" />
            <path d={`M 6 -126 Q ${58 + Math.sin(t * 3.2) * 8} -86 6 -42 Z`} fill="#FAF3E0" stroke="#7A6548" strokeWidth={2.4} />
          </g>
        );
      }

      return (
        <g key={`mech-cranes-${idx}`}>
          {/* 留在码头桩上的单只纸鹤 */}
          <g transform={`translate(${pierX - 6}, ${(pierY + Math.sin(t * 3.4) * 2).toFixed(1)})`}>
            <OrigamiCraneSvg color="#8CE0F5" stroke="#2C6E85" wingLift={wing * 0.35} scale={0.95} />
          </g>
          {/* 被草船带走的另一只纸鹤（成对 -> 单只！） */}
          <g transform={`translate(${crane2X.toFixed(1)}, ${crane2Y.toFixed(1)})`}>
            <OrigamiCraneSvg
              color="#FFA8BE"
              stroke="#8C3B52"
              wingLift={boardU > 0 && boardU < 1 ? wing : wing * 0.3}
              scale={0.95}
              flip={boardU <= 0}
            />
          </g>
        </g>
      );
    }

    case 'pear_to_envelope': {
      const slideU = ease(seg(t, mech.slideStart ?? 23.45, mech.openAt ?? 25.55));
      const openU = seg(t, mech.openAt ?? 25.55, (mech.openAt ?? 25.55) + 0.38);
      const pushBackU = ease(seg(t, mech.pushBackAt ?? 26.2, (mech.pushBackAt ?? 26.2) + 0.85));
      const baseX = lerp(mech.fromX ?? 765, mech.midX ?? 625, slideU);
      const curX = lerp(baseX, mech.pushBackX ?? 735, pushBackU);
      const curY = mech.y ?? 464;
      const opened = openU > 0.25;
      const pop = opened ? backOut(clamp(openU), 1.7) : 1 + Math.sin(slideU * Math.PI) * 0.06;

      return (
        <g key={`mech-${idx}`}>
          <g transform={`translate(${curX.toFixed(1)}, ${curY.toFixed(1)}) scale(${pop.toFixed(3)})`}>
            {!opened ? (
              <g>
                {/* 饱满大金梨 */}
                <path d="M 0 -58 C -18 -54 -34 -26 -32 -2 C -30 22 30 22 32 -2 C 34 -26 18 -54 0 -58 Z" fill="#F7D348" stroke="#7A5D16" strokeWidth={3} />
                <line x1={0} y1={-58} x2={4} y2={-74} stroke="#5C3D24" strokeWidth={4} strokeLinecap="round" />
                <path d="M 3 -68 Q 22 -78 26 -62 Q 12 -56 3 -68 Z" fill="#69B34C" stroke="#366324" strokeWidth={2} />
                <ellipse cx={-10} cy={-26} rx={6} ry={12} fill="#FFF5B8" opacity={0.65} />
              </g>
            ) : (
              <g transform="translate(0, -14)">
                <EnvelopeSvg scale={1.12} waxColor="#D94848" />
              </g>
            )}
          </g>
          {/* 鲸鱼娘收好胸前蓝色缎带工牌（纯图案无文字） */}
          {t >= (mech.openAt ?? 25.55) && (
            <g
              transform={`translate(${mech.badgeX ?? 545}, ${mech.badgeY ?? 468}) scale(${backOut(seg(t, (mech.openAt ?? 25.55) + 0.35, (mech.openAt ?? 25.55) + 0.72), 1.5).toFixed(3)})`}
            >
              <path d="M -14 -24 L 0 0 L 14 -24" fill="none" stroke="#4DABF7" strokeWidth={3.5} />
              <rect x={-18} y={-2} width={36} height={26} rx={5} fill="#E7F5FF" stroke="#1C7ED6" strokeWidth={2.4} />
              <circle cx={0} cy={11} r={6} fill="#339AF0" />
            </g>
          )}
        </g>
      );
    }

    case 'scrolling_houses': {
      const scrollU = ease(seg(t, mech.start ?? 27.65, mech.end ?? 28.75));
      const shiftX = lerp(mech.fromOffset ?? 120, mech.toOffset ?? -360, scrollU);
      const specs = [
        { x: 160, roof: '#4D6A88', wall: '#F5F2EB', door: '#7C583F' },
        { x: 520, roof: '#C96A50', wall: '#FBE8D3', door: '#6E4736' },
        { x: 880, roof: '#4E8C7B', wall: '#E8F4EE', door: '#59483B' },
      ];
      return (
        <g key={`mech-${idx}`} transform={`translate(${shiftX.toFixed(1)}, 0)`}>
          {specs.map((hs, hi) => (
            <g key={`hs-${hi}`} transform={`translate(${hs.x}, 600)`}>
              <rect x={-96} y={-195} width={192} height={195} rx={4} fill={hs.wall} stroke="#3B3745" strokeWidth={3} />
              <polygon points="-116,-190 0,-268 116,-190" fill={hs.roof} stroke="#2C2A35" strokeWidth={3} strokeLinejoin="round" />
              <rect x={-22} y={-92} width={44} height={92} rx={4} fill={hs.door} stroke="#2C2A35" strokeWidth={2.5} />
              <rect x={-72} y={-148} width={36} height={36} rx={4} fill="#FFE8A3" stroke="#5A4E3C" strokeWidth={2.4} />
              <rect x={36} y={-148} width={36} height={36} rx={4} fill="#FFE8A3" stroke="#5A4E3C" strokeWidth={2.4} />
            </g>
          ))}
        </g>
      );
    }

    case 'steaming_teacup': {
      if (t < (mech.enterAt ?? 28.45)) return null;
      const pop = backOut(seg(t, mech.enterAt ?? 28.45, (mech.enterAt ?? 28.45) + 0.32), 1.5);
      return (
        <g key={`mech-${idx}`} transform={`translate(${mech.x ?? 742}, ${mech.y ?? 542}) scale(${pop.toFixed(3)})`}>
          <ellipse cx={0} cy={4} rx={24} ry={6} fill="#DCECE8" stroke="#486862" strokeWidth={2} />
          <path d="M -16 -18 L 16 -18 L 12 2 L -12 2 Z" fill="#F3FAF8" stroke="#486862" strokeWidth={2.4} />
          <path d="M 15 -14 Q 24 -14 22 -5 Q 20 0 13 -2" fill="none" stroke="#486862" strokeWidth={2.4} />
          {[0, 1].map((si) => {
            const rise = ((t * 1.1 + si * 0.5) % 1 + 1) % 1;
            const sx = -5 + si * 10 + Math.sin(t * 4 + si) * 4;
            return (
              <path
                key={si}
                d={`M ${sx.toFixed(1)} ${(-22 - rise * 26).toFixed(1)} Q ${(sx + 5).toFixed(1)} ${(-30 - rise * 26).toFixed(1)} ${sx.toFixed(1)} ${(-38 - rise * 26).toFixed(1)}`}
                fill="none"
                stroke="#FFF9EE"
                strokeWidth={2.4}
                strokeLinecap="round"
                opacity={(1 - rise) * 0.78}
              />
            );
          })}
        </g>
      );
    }

    default:
      return null;
  }
}

function evaluateCueArc(ev, t, fps, actors) {
  const frame = t * fps;
  if (frame < ev.startFrame || frame > ev.endFrame) return null;
  const targetIdx = ev.actor ?? (['slap_deflect', 'tug_grab', 'unroll_scroll', 'handoff'].includes(ev.verb) ? 1 : 0);
  const actor = actors[targetIdx] || actors[0] || { x: 640, y: 600, u: 38 };
  const hand = handAt(actor, 'right');
  const head = handAt(actor, 'headTop');
  const land = ev.params?.land || ev.params?.at || [640, 520];

  if (ev.verb === 'drop_bonk') {
    if (frame <= ev.contactFrame) {
      const q = clamp((frame - ev.startFrame) / Math.max(1, ev.contactFrame - ev.startFrame));
      return { x: head.x, y: lerp(-60, head.y - 26, q * q), rot: q * 18, hit: frame >= ev.contactFrame, hitPt: [head.x, head.y] };
    }
    const q = clamp((frame - ev.contactFrame) / 22);
    const arcY = lerp(head.y - 26, land[1] - 24, 1 - Math.pow(1 - q, 2)) - Math.sin(Math.PI * q) * 72;
    return { x: lerp(head.x, land[0], q), y: arcY, rot: q * 28, hit: true, hitPt: [head.x, head.y] };
  }

  if (ev.verb === 'handoff') {
    const fromHand = handAt(actors[ev.actor ?? 0] || actor, 'right');
    const toHand = handAt(actors[ev.toActor ?? 1] || actor, 'left');
    const q = ease(clamp((frame - ev.startFrame) / Math.max(1, ev.contactFrame - ev.startFrame)));
    return {
      x: lerp(fromHand.x, toHand.x, q),
      y: lerp(fromHand.y, toHand.y, q) - Math.sin(Math.PI * q) * 34,
      rot: lerp(-8, 6, q),
      hit: frame >= ev.contactFrame,
      hitPt: [toHand.x, toHand.y],
    };
  }

  if (ev.verb === 'sink_drop') {
    const q = ease(clamp((frame - ev.startFrame) / Math.max(1, ev.endFrame - ev.startFrame)));
    return {
      x: land[0] + Math.sin(q * 9) * 14,
      y: lerp(220, Math.min(585, land[1]), q),
      rot: Math.sin(q * 7) * 12,
      hit: frame >= ev.contactFrame,
      hitPt: land,
    };
  }

  const q = ease(clamp((frame - ev.startFrame) / Math.max(1, ev.contactFrame - ev.startFrame)));
  return {
    x: lerp(hand.x, land[0], q),
    y: lerp(hand.y, land[1], q),
    rot: 0,
    hit: frame >= ev.contactFrame,
    hitPt: land,
  };
}

/**
 * InteractivePropsLayer — 世界道具、声明式机关、handAt 手持道具、语义翻转纸张与接触冲击波层
 * 支持 layer="back"（人物身后层：如靠山、三迁屋舍、水面草船）与 layer="front"（人物前景层）
 */
export function InteractivePropsLayer({
  layer = 'front',
  shot,
  worldState,
  actors = [],
  events = [],
  cues = [],
  t = 0,
  fps = 30,
  openerStamp = null,
  isOpener = false,
}) {
  const mechanisms = shot.mechanisms || [];

  if (layer === 'back') {
    const backMechs = mechanisms.filter((m) => m.layer === 'back');
    if (backMechs.length === 0) return null;
    return (
      <svg
        width={1280}
        height={720}
        viewBox="0 0 1280 720"
        style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}
      >
        {backMechs.map((mech, idx) => renderMechanism(mech, t, idx))}
      </svg>
    );
  }

  const frontMechs = mechanisms.filter((m) => m.layer !== 'back');
  const shotEvents = events.filter((e) => !e.shotId || e.shotId === shot.id);

  return (
    <svg
      width={1280}
      height={720}
      viewBox="0 0 1280 720"
      style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}
    >
      {/* 前景承托桌 */}
      {shot.foregroundTable && (
        <g>
          <rect
            x={shot.foregroundTable.x - shot.foregroundTable.width / 2}
            y={shot.foregroundTable.y}
            width={shot.foregroundTable.width}
            height={18}
            rx={6}
            fill="#8B684A"
            stroke="#3B2B20"
            strokeWidth={2.5}
          />
          <rect
            x={shot.foregroundTable.x - shot.foregroundTable.width / 2 + 24}
            y={shot.foregroundTable.y + 18}
            width={shot.foregroundTable.width - 48}
            height={38}
            fill="#5E4431"
          />
        </g>
      )}

      {/* 声明式世界机关与叙事道具 */}
      {frontMechs.map((mech, idx) => renderMechanism(mech, t, idx))}

      {/* 场景配套静态/入场道具 (companionProps / mv props) */}
      {(shot.companionProps || shot.props || []).map((ref, idx) => {
        const enterAt = Number.isFinite(ref.enterAt)
          ? ref.enterAt
          : (ref.fromLine && cues[ref.fromLine - 1] ? cues[ref.fromLine - 1].start : (shot.start ?? 0));
        if (t < enterAt) return null;
        const pop = ref.carry ? 1 : backOut(clamp((t - enterAt) / 0.28), 1.3);
        let state = { ...(ref.state || {}) };
        for (const ch of ref.stateChanges || []) {
          const at = ch.line != null && cues[ch.line - 1] ? cues[ch.line - 1].start + (ch.delay || 0) : ch.at;
          if (t >= at) state = { ...state, ...ch.state };
        }
        return (
          <g key={`cp-${idx}`} transform={`translate(${ref.x}, ${Math.min(592, ref.y)}) scale(${pop.toFixed(3)})`}>
            <PropGlyph propId={ref.propId} state={state} scale={ref.scale ?? 1} />
          </g>
        );
      })}

      {/* 语义纸张翻转与勾画轨道 (semanticTracks) */}
      {(shot.semanticTracks || []).map((track) => {
        const st = semanticStateAt(track, t);
        if (!st) return null;
        if (track.kind === 'prop') {
          return (
            <g key={track.id} transform={`translate(${st.x}, ${Math.min(592, st.y)})`}>
              <PropGlyph propId={track.propId} state={st.state} scale={1} />
            </g>
          );
        }
        return (
          <g
            key={track.id}
            transform={`translate(${st.x.toFixed(1)}, ${st.y.toFixed(1)}) scale(${Math.max(0.04, st.scaleX).toFixed(3)}, 1)`}
          >
            <rect
              x={-track.w / 2}
              y={-track.h / 2}
              width={track.w}
              height={track.h}
              rx={8}
              fill="#FCF5E3"
              stroke="#34465A"
              strokeWidth={2.5}
            />
            {st.state?.title && (
              <text x={0} y={-track.h / 2 + 28} textAnchor="middle" fontSize={18} fontWeight="800" fill="#243447" fontFamily="NewdayNoto, Noto Sans CJK SC, sans-serif">
                {st.state.title}
              </text>
            )}
            {(st.marks || []).map((mk, mi) => (
              <circle
                key={mi}
                cx={0}
                cy={-10 + (mk.row || 0) * 28}
                r={22 * mk.progress}
                fill="none"
                stroke="#D94848"
                strokeWidth={3}
              />
            ))}
          </g>
        );
      })}

      {/* handAt 绑定的手持/抛放跟随道具 */}
      {(worldState?.boundProps || []).map((bp, idx) => (
        <g
          key={`bp-${idx}`}
          transform={`translate(${bp.x.toFixed(2)}, ${Math.min(594, bp.y).toFixed(2)}) rotate(${((bp.rotation * 180) / Math.PI).toFixed(2)})`}
        >
          <PropGlyph propId={bp.propId} state={bp.state} scale={bp.scale ?? 0.72} />
        </g>
      ))}

      {/* 词点锁定交互轨迹 (drop_bonk / handoff / sink_drop / slap_deflect ...) */}
      {shotEvents.map((ev, idx) => {
        const arc = evaluateCueArc(ev, t, fps, actors);
        if (!arc) return null;
        return (
          <g key={`ev-${idx}`}>
            <g transform={`translate(${arc.x.toFixed(1)}, ${Math.min(594, arc.y).toFixed(1)}) rotate(${arc.rot.toFixed(1)})`}>
              <PropGlyph propId={ev.propId} state={ev.params} scale={ev.params?.scale ?? 0.85} />
            </g>
          </g>
        );
      })}

      {/* 接触冲击波扩散环 */}
      {(worldState?.shockwaves || []).map((sw, idx) => {
        const radius = 14 + easeOut(sw.u) * 76;
        return (
          <circle
            key={`sw-${idx}`}
            cx={sw.x}
            cy={sw.y}
            r={radius}
            fill="none"
            stroke={sw.color || '#FFE099'}
            strokeWidth={2.8 * (1 - sw.u * 0.6)}
            opacity={(1 - sw.u) * 0.62}
          />
        );
      })}

      {/* 开场词点落章 */}
      {isOpener && openerStamp && t >= openerStamp.time && (
        <g
          transform={`translate(${openerStamp.at[0]}, ${openerStamp.at[1]}) rotate(-9) scale(${backOut(clamp((t - openerStamp.time) / 0.22), 2.1).toFixed(3)})`}
        >
          <rect x={-74} y={-26} width={148} height={52} rx={8} fill="rgba(196,54,54,0.92)" stroke="#FFF2D6" strokeWidth={2.5} />
          <text x={0} y={7} textAnchor="middle" fontSize={22} fontWeight="900" fill="#FFF8E7" fontFamily="NewdayNoto, Noto Sans CJK SC, sans-serif">
            {openerStamp.text}
          </text>
        </g>
      )}
    </svg>
  );
}
