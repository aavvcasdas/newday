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

function EnvelopeSvg({ scale = 1, waxColor = '#E05252', label = '' }) {
  return (
    <g transform={`scale(${scale})`}>
      <rect x={-48} y={-30} width={96} height={60} rx={7} fill="#FFF7DF" stroke="#45566B" strokeWidth={3} />
      <path d="M -47 -28 L 0 3 L 47 -28" fill="#F4E3B8" stroke="#45566B" strokeWidth={2.4} strokeLinejoin="round" />
      {label ? (
        <g>
          <rect x={-32} y={-10} width={64} height={30} rx={5} fill="rgba(224, 67, 56, 0.14)" stroke="#D63B2F" strokeWidth={2} />
          <text
            x={0}
            y={12}
            textAnchor="middle"
            fontSize={22}
            fontWeight="900"
            fill="#C93328"
            fontFamily="NewdayNoto, Noto Sans CJK SC, sans-serif"
          >
            {label}
          </text>
        </g>
      ) : (
        <circle cx={0} cy={4} r={7.5} fill={waxColor} stroke="#FFF6EA" strokeWidth={1.6} />
      )}
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
      // 梗1：大禹治水 -> 治没了我的薪水（鼓鼓囊囊的「薪水」袋被开闸大水一浪卷走！）
      const standX = mech.standX ?? 655;
      const standY = mech.standY ?? 600;
      const floodU = seg(t, mech.floodAt ?? 1.90, mech.floodEnd ?? 3.95);
      const swept = floodU > 0;
      const q = ease(floodU);
      const envX = swept ? lerp(standX, mech.toX ?? 1135, q) : standX;
      const envY = swept
        ? lerp(standY - 70, (mech.toY ?? 558), Math.min(1, floodU * 2.4)) + Math.sin(t * 9.5) * 11
        : standY - 70 + Math.sin(t * 2.6) * 2.5;
      const envRot = swept ? Math.sin(t * 7.2) * 20 + q * 26 : -3;
      return (
        <g key={`mech-${idx}`}>
          {/* 堤岸木托架 */}
          <g transform={`translate(${standX}, ${standY})`}>
            <rect x={-6} y={-52} width={12} height={52} rx={3} fill="#7B583B" stroke="#402C1D" strokeWidth={2} />
            <rect x={-36} y={-58} width={72} height={10} rx={4} fill="#9E734E" stroke="#402C1D" strokeWidth={2} />
          </g>
          {/* 奔涌水浪托举 */}
          {swept && (
            <g transform={`translate(${envX.toFixed(1)}, ${(envY + 24).toFixed(1)})`}>
              <path d="M -68 10 Q -32 -18 0 4 Q 34 -16 68 8" fill="none" stroke="#8BE3FF" strokeWidth={7} strokeLinecap="round" />
              <path d="M -54 6 Q -26 -16 0 2 Q 28 -14 56 6" fill="none" stroke="#E8FAFF" strokeWidth={4.5} strokeLinecap="round" />
              <circle cx={-38} cy={-8} r={5.5} fill="#FFFFFF" opacity={0.88} />
              <circle cx={34} cy={-10} r={6.5} fill="#FFFFFF" opacity={0.88} />
            </g>
          )}
          <g transform={`translate(${envX.toFixed(1)}, ${envY.toFixed(1)}) rotate(${envRot.toFixed(1)})`}>
            <EnvelopeSvg scale={1.12} label={mech.label ?? '薪水'} />
          </g>
        </g>
      );
    }

    case 'sunday_calendar': {
      // 梗2：后羿射日 -> 射没了我的周日（「周日」页被一箭射飞，直接露出底下黑底苦逼「周一」页！）
      const hitU = seg(t, mech.pierceAt ?? 5.42, (mech.pierceAt ?? 5.42) + 1.25);
      const hit = t >= (mech.pierceAt ?? 5.42);
      const q = easeOut(hitU);
      const flyX = q * 290;
      const flyY = -Math.sin(q * Math.PI) * 95 + q * 35;
      const flyRot = q * 52;
      const shake = hit && hitU < 0.25 ? Math.sin(t * 48) * 5 * (1 - hitU * 4) : 0;
      return (
        <g key={`mech-${idx}`} transform={`translate(${(mech.x + shake).toFixed(1)}, ${mech.y})`}>
          {/* 木画架三脚架 */}
          <line x1={-38} y1={0} x2={-12} y2={-168} stroke="#8D623F" strokeWidth={7} strokeLinecap="round" />
          <line x1={38} y1={0} x2={12} y2={-168} stroke="#8D623F" strokeWidth={7} strokeLinecap="round" />
          <line x1={0} y1={0} x2={0} y2={-155} stroke="#6E4B2F" strokeWidth={6} strokeLinecap="round" />
          {/* 日历底板：露出残酷的「周一」次页！ */}
          <rect x={-58} y={-166} width={116} height={112} rx={10} fill="#28354A" stroke="#182232" strokeWidth={3} />
          <rect x={-58} y={-166} width={116} height={28} rx={8} fill="#465978" stroke="#182232" strokeWidth={2.5} />
          <text
            x={0}
            y={-90}
            textAnchor="middle"
            fontSize={35}
            fontWeight="900"
            fill="#E2ECF9"
            fontFamily="NewdayNoto, Noto Sans CJK SC, sans-serif"
          >
            {mech.underLabel || '周一'}
          </text>
          {/* 红火快乐「周日」页（中箭后整页飘飞！） */}
          <g
            transform={`translate(${flyX.toFixed(1)}, ${(-110 + flyY).toFixed(1)}) rotate(${flyRot.toFixed(1)})`}
            opacity={1 - q * 0.22}
          >
            <rect x={-56} y={-54} width={112} height={108} rx={9} fill="#FFF9EA" stroke="#43352B" strokeWidth={3} />
            <path d="M -56 -32 Q -56 -54 -34 -54 L 34 -54 Q 56 -54 56 -32 L 56 -26 L -56 -26 Z" fill="#FF6B57" stroke="#43352B" strokeWidth={2.5} />
            <circle cx={-28} cy={-40} r={4.5} fill="#FFFDF7" />
            <circle cx={28} cy={-40} r={4.5} fill="#FFFDF7" />
            <text
              x={0}
              y={20}
              textAnchor="middle"
              fontSize={36}
              fontWeight="900"
              fill="#D63B2F"
              fontFamily="NewdayNoto, Noto Sans CJK SC, sans-serif"
            >
              {mech.label || '周日'}
            </text>
          </g>
        </g>
      );
    }

    case 'flying_arrow': {
      const bowX = mech.bowX ?? 885;
      const bowY = mech.bowY ?? 445;
      const shootAt = mech.shootAt ?? 4.95;
      const hitAt = mech.hitAt ?? 5.42;
      const drawU = clamp((t - (shootAt - 0.55)) / 0.52);
      const flightU = seg(t, shootAt, hitAt);
      const fired = t >= shootAt;
      const landed = flightU >= 1;
      const ax = lerp(mech.fromX ?? bowX, mech.toX ?? 640, easeOut(flightU));
      const ay = lerp(mech.fromY ?? bowY, mech.toY ?? 485, easeOut(flightU)) - Math.sin(flightU * Math.PI) * 52;
      const dx = (mech.toX ?? 640) - (mech.fromX ?? bowX);
      const dy = (mech.toY ?? 485) - (mech.fromY ?? bowY);
      const baseDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      const quiver = landed ? Math.exp(-(t - hitAt) * 7) * Math.sin(t * 55) * 6 : 0;
      const pull = !fired ? 24 * drawU : 0;

      return (
        <g key={`mech-${idx}`}>
          {/* 后羿雕花长弓 */}
          <g transform={`translate(${bowX}, ${bowY}) rotate(-18)`}>
            <path d="M 0 -58 Q -38 0 0 58" fill="none" stroke="#C87D2F" strokeWidth={7} strokeLinecap="round" />
            <path d={`M 0 -56 L ${pull.toFixed(1)} 0 L 0 56`} fill="none" stroke="#FFF4D4" strokeWidth={2.5} />
          </g>
          {fired && !landed && (
            <line
              x1={ax - dx * 0.16}
              y1={ay - dy * 0.16}
              x2={ax}
              y2={ay}
              stroke="#FFE082"
              strokeWidth={4.5}
              strokeLinecap="round"
              opacity={0.78}
            />
          )}
          {fired && (
            <g transform={`translate(${ax.toFixed(1)}, ${ay.toFixed(1)}) rotate(${(baseDeg + quiver).toFixed(1)})`}>
              <line x1={-76} y1={0} x2={8} y2={0} stroke="#C88A4B" strokeWidth={5.5} strokeLinecap="round" />
              <polygon points="20,0 -2,-9 -2,9" fill="#FFD54F" stroke="#5C4018" strokeWidth={2} />
              <polygon points="-76,0 -92,-10 -82,0 -92,10" fill="#FF7043" stroke="#5C2B18" strokeWidth={1.6} />
            </g>
          )}
        </g>
      );
    }

    case 'sliding_mountain': {
      // 梗3：愚公移山 -> 移走了我的「靠山」（山体正中刻着醒目的「靠山」大匾，被愚公整座推走！）
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
            <path d="M -175 0 L -82 -252 L 8 -172 L 76 -292 L 192 0 Z" fill="#678D79" stroke="#31493E" strokeWidth={4} strokeLinejoin="round" />
            <path d="M -82 -252 L -44 -178 L -8 -198 L 8 -172 Z" fill="#E8F3EC" opacity={0.82} />
            <path d="M 76 -292 L 38 -198 L 76 -215 L 116 -186 Z" fill="#F2F8F4" opacity={0.88} />
            <path d="M -132 0 L -34 -166 L 64 -120 L 142 0 Z" fill="#4E7361" opacity={0.85} />
            {/* 「靠山」摩崖石刻牌匾（置于主峰高处，全程不被推山角色遮挡） */}
            <g transform="translate(62, -172)">
              <rect x={-52} y={-30} width={104} height={56} rx={9} fill="#FDF3DC" stroke="#B83B2E" strokeWidth={3.8} />
              <text
                x={0}
                y={8}
                textAnchor="middle"
                fontSize={33}
                fontWeight="900"
                fill="#B83227"
                fontFamily="NewdayNoto, Noto Sans CJK SC, sans-serif"
              >
                {mech.label ?? '靠山'}
              </text>
            </g>
          </g>
        </g>
      );
    }

    case 'cushion': {
      if (t < (mech.enterAt ?? 9.15)) return null;
      const pop = backOut(seg(t, mech.enterAt ?? 9.15, (mech.enterAt ?? 9.15) + 0.36), 1.6);
      return (
        <g key={`mech-${idx}`} transform={`translate(${mech.x}, ${mech.y}) scale(${pop.toFixed(3)})`}>
          <ellipse cx={0} cy={-24} rx={48} ry={26} fill="#FF9EB5" stroke="#6E3546" strokeWidth={3} />
          <ellipse cx={0} cy={-28} rx={32} ry={14} fill="#FFC2D1" />
          <circle cx={0} cy={-28} r={5} fill="#FFF5F7" />
        </g>
      );
    }

    case 'paper_puppets': {
      // 梗4：女娲造人 -> 给我造的「小人」（职场小人三大损招：打「小报告」、甩「黑锅」、穿「小鞋」，倒八字眉坏笑指指点点！）
      const enterU = easeOut(seg(t, mech.enterAt ?? 12.65, (mech.enterAt ?? 12.65) + 0.65));
      if (enterU <= 0.01) return null;
      const scatterU = easeOut(seg(t, mech.scatterAt ?? 13.65, (mech.scatterAt ?? 13.65) + 0.42));
      const bodies = ['#48526E', '#574B6B', '#4B5E69'];
      const roles = ['report', 'pot', 'shoe'];

      return (
        <g key={`mech-${idx}`}>
          {roles.map((role, pi) => {
            const baseX = lerp((mech.fromX ?? 910) + pi * 78, (mech.toX ?? 645) + pi * 84, enterU) + scatterU * (32 + pi * 24);
            const hop = Math.abs(Math.sin(t * 10.5 + pi * 1.4)) * 13 * (1 - scatterU * 0.5);
            const swing = Math.sin(t * 10.5 + pi * 1.4) * 22;
            const noteFlyX = scatterU * (55 + pi * 28);
            const noteFlyY = -scatterU * (48 + pi * 22);
            const noteRot = scatterU * (36 + pi * 18);

            return (
              <g key={`pp-${pi}`} transform={`translate(${baseX.toFixed(1)}, ${(600 - hop).toFixed(1)})`}>
                {/* 职场小人腿与深色西装马甲身躯 */}
                <line x1={-8} y1={-28} x2={-12 - swing * 0.25} y2={0} stroke="#2B3142" strokeWidth={4.5} strokeLinecap="round" />
                <line x1={8} y1={-28} x2={12 + swing * 0.25} y2={0} stroke="#2B3142" strokeWidth={4.5} strokeLinecap="round" />
                <rect x={-18} y={-68} width={36} height={42} rx={9} fill={bodies[pi]} stroke="#232838" strokeWidth={2.8} />
                <circle cx={0} cy={-86} r={18} fill="#FFE6CE" stroke="#4D3729" strokeWidth={2.8} />
                {/* 倒八字奸笑眉眼 */}
                <line x1={-10} y1={-91} x2={-3} y2={-87} stroke="#2B1E17" strokeWidth={2.6} strokeLinecap="round" />
                <line x1={10} y1={-91} x2={3} y2={-87} stroke="#2B1E17" strokeWidth={2.6} strokeLinecap="round" />
                <path d="M -6 -79 Q 1 -74 7 -80" fill="none" stroke="#A6362B" strokeWidth={2.4} strokeLinecap="round" />
                {/* 朝主角指指点点的手 */}
                <line x1={-17} y1={-58} x2={-38} y2={-68 + swing * 0.3} stroke="#4D3729" strokeWidth={4.2} strokeLinecap="round" />
                <line x1={17} y1={-58} x2={28} y2={-74 - swing * 0.3} stroke="#4D3729" strokeWidth={4.2} strokeLinecap="round" />

                {/* 职场小人专属损招道具：小报告 / 大黑锅 / 穿小鞋 */}
                <g transform={`translate(${(-34 + noteFlyX).toFixed(1)}, ${(-106 + noteFlyY).toFixed(1)}) rotate(${(-10 + noteRot).toFixed(1)})`}>
                  {role === 'report' && (
                    <g>
                      <rect x={-32} y={-18} width={64} height={34} rx={5} fill="#FFF3B0" stroke="#A67B1E" strokeWidth={2.4} />
                      <text x={0} y={5} textAnchor="middle" fontSize={16} fontWeight="900" fill="#8C331E" fontFamily="NewdayNoto, Noto Sans CJK SC, sans-serif">
                        小报告
                      </text>
                    </g>
                  )}
                  {role === 'pot' && (
                    <g>
                      <ellipse cx={0} cy={0} rx={29} ry={20} fill="#23262E" stroke="#101217" strokeWidth={3} />
                      <path d="M -29 -2 Q -38 -10 -34 4" fill="none" stroke="#23262E" strokeWidth={3.8} />
                      <path d="M 29 -2 Q 38 -10 34 4" fill="none" stroke="#23262E" strokeWidth={3.8} />
                      <text x={0} y={6} textAnchor="middle" fontSize={16} fontWeight="900" fill="#FFE082" fontFamily="NewdayNoto, Noto Sans CJK SC, sans-serif">
                        黑锅
                      </text>
                    </g>
                  )}
                  {role === 'shoe' && (
                    <g>
                      <rect x={-30} y={-28} width={62} height={24} rx={5} fill="#8C2424" stroke="#F7D794" strokeWidth={1.8} />
                      <text x={1} y={-11} textAnchor="middle" fontSize={14} fontWeight="900" fill="#FFF7DE" fontFamily="NewdayNoto, Noto Sans CJK SC, sans-serif">
                        穿小鞋
                      </text>
                      <path d="M -24 10 L -8 -4 L 18 2 L 26 12 Q 4 18 -24 10 Z" fill="#E05656" stroke="#7D2424" strokeWidth={2.5} />
                    </g>
                  )}
                </g>
              </g>
            );
          })}
        </g>
      );
    }

    case 'savings_jar_beam': {
      // 梗5：凿壁偷光 -> 偷光了我的「积蓄」
      // 青花大瓷碗里堆满晶莹饱满的白米饭粒「积蓄」，反转时刻起一粒接一粒高速飞入隔壁凿穿的墙洞，碗内米粒逐层迅速见底直至空碗！
      const jarX = mech.x ?? 682;
      const jarY = mech.y ?? 478;
      const holeX = mech.holeX ?? 1020;
      const holeY = mech.holeY ?? 292;
      const stealStart = mech.stealAt ?? 15.85;

      // 42 粒分层堆叠在碗口的饱满白米粒（从碗顶峰尖 i=0 到碗口底层 i=41，按顺序一粒一粒高速被吸走！）
      const RICE_GRAINS = [
        // 顶峰层 (0..6)
        [0, -108, -8], [-11, -104, 16], [12, -103, -18], [-5, -99, 6], [7, -98, -12], [-18, -97, 22], [19, -96, -24],
        // 上中层 (7..17)
        [-25, -91, 18], [-12, -91, -14], [0, -90, 10], [13, -90, -8], [26, -89, 20],
        [-31, -84, -22], [-18, -83, 12], [-5, -83, -10], [8, -82, 15], [21, -82, -16], [33, -81, 24],
        // 中层 (18..29)
        [-38, -76, 14], [-25, -75, -18], [-11, -75, 8], [3, -75, -12], [16, -74, 18], [29, -74, -14],
        [39, -73, 20], [-42, -71, -10], [-17, -70, 14], [-2, -70, -8], [12, -70, 11], [25, -70, -15],
        // 碗口底层 (30..41)
        [-44, -66, -15], [-32, -66, 12], [-19, -65, -9], [-6, -65, 16], [7, -65, -14], [20, -65, 11],
        [32, -65, -18], [43, -64, 15], [-28, -61, 6], [-9, -61, -7], [10, -61, 9], [28, -61, -11],
      ];
      const totalGrains = RICE_GRAINS.length;
      const launchStep = 0.024; // 每 0.024 秒起飞一粒（每秒超 40 粒连珠炮式高速吸走！）
      const flightDur = 0.34;   // 单粒沿金光光束高速飞入墙洞仅需 0.34 秒
      const totalStealSpan = (totalGrains - 1) * launchStep + flightDur;
      const drainU = clamp((t - stealStart) / ((totalGrains - 1) * launchStep), 0, 1);
      const moundScaleY = Math.max(0, 1 - ease(drainU));

      const beamDx = holeX - jarX;
      const beamDy = holeY - (jarY - 78);
      const beamAngleDeg = (Math.atan2(beamDy, beamDx) * 180) / Math.PI;

      return (
        <g key={`mech-${idx}`}>
          {/* 凿壁强光光束 + 光束内柔和吸力金丝 */}
          <polygon
            points={`${holeX},${holeY - 18} ${holeX},${holeY + 18} ${jarX + 56},${jarY - 50} ${jarX - 54},${jarY - 112}`}
            fill={t >= stealStart ? 'rgba(255, 214, 84, 0.38)' : 'rgba(255, 240, 170, 0.20)'}
          />
          {t >= stealStart && t <= stealStart + totalStealSpan && [-12, 4, 18].map((offsetY, si) => {
            const dashOffset = -((t * 460 + si * 28) % 56);
            return (
              <line
                key={`suction-ray-${si}`}
                x1={jarX + 12}
                y1={jarY - 82 + offsetY}
                x2={holeX - 10}
                y2={holeY + offsetY * 0.32}
                stroke="rgba(255, 238, 158, 0.42)"
                strokeWidth={1.8}
                strokeDasharray="14 22"
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
              />
            );
          })}

          {/* 碗内白米饭基底与尚未被吸走的米粒 */}
          <g transform={`translate(${jarX}, ${jarY})`}>
            {/* 竹筷（随米饭被一粒粒抽空而缓缓滑落到空碗边） */}
            <g transform={`translate(${lerp(24, 10, drainU).toFixed(1)}, ${lerp(-90, -63, drainU).toFixed(1)}) rotate(${lerp(28, 7, drainU).toFixed(1)})`}>
              <line x1={-46} y1={-4} x2={44} y2={4} stroke="#C98A4B" strokeWidth={4.2} strokeLinecap="round" />
              <line x1={-44} y1={3} x2={45} y2={-3} stroke="#B07237" strokeWidth={4.2} strokeLinecap="round" />
            </g>

            {/* 碗内底层白米饭团核（随上层米粒一粒粒飞走同步下陷直至清零） */}
            {moundScaleY > 0.04 && (
              <g transform={`translate(0, -58) scale(${(0.88 + 0.12 * moundScaleY).toFixed(3)}, ${moundScaleY.toFixed(3)})`}>
                <path
                  d="M -50 0 C -52 -25 -31 -48 0 -50 C 31 -48 52 -25 50 0 Z"
                  fill="#FFFFFF"
                  stroke="#CBD5E1"
                  strokeWidth={2.4}
                />
                <path
                  d="M -38 -3 C -32 -22 -16 -38 6 -40 C -8 -32 -20 -18 -24 -2 Z"
                  fill="#F1F5F9"
                  opacity={0.8}
                />
              </g>
            )}

            {/* 碗口堆叠的 36 粒分明大米：还没轮到被吸走的米粒稳稳留在碗里，轮到的瞬间立刻起飞！ */}
            {RICE_GRAINS.map(([gx, gy, rot], gi) => {
              const launchT = stealStart + gi * launchStep;
              if (t >= launchT) return null;
              const sinkY = (gy + 58) * (1 - (0.35 + 0.65 * moundScaleY));
              const curY = gy - sinkY * 0.25;
              return (
                <g key={`bowl-grain-${gi}`} transform={`translate(${gx}, ${curY.toFixed(1)}) rotate(${rot})`}>
                  <ellipse cx={0} cy={0} rx={7.2} ry={3.7} fill="#FFFFFF" stroke="#94A3B8" strokeWidth={1.5} />
                  <ellipse cx={-1.6} cy={-0.9} rx={3.6} ry={1.3} fill="#F8FAFC" />
                </g>
              );
            })}

            {/* 热米饭袅袅热气（被偷光前飘起） */}
            {drainU < 0.35 && [-18, 6, 22].map((sx, si) => {
              const floatY = ((t * 24 + si * 11) % 24);
              return (
                <path
                  key={`steam-${si}`}
                  d={`M ${sx} ${-108 - floatY} Q ${sx - 5} ${-118 - floatY} ${sx + 2} ${-128 - floatY}`}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  opacity={(1 - floatY / 24) * 0.65}
                />
              );
            })}

            {/* 青花大瓷饭碗（遮住碗口下沿，空碗时露出碗底内壁阴影） */}
            <ellipse cx={0} cy={-58} rx={55} ry={10} fill={moundScaleY <= 0.05 ? '#CBD5E1' : '#E2E8F0'} stroke="#364FC7" strokeWidth={2.6} />
            <path
              d="M -56 -58 Q -52 -8 0 -8 Q 52 -8 56 -58 Z"
              fill="#F8FAFC"
              stroke="#2B44B8"
              strokeWidth={3.2}
              strokeLinejoin="round"
            />
            <path
              d="M -53 -49 Q 0 -42 53 -49"
              fill="none"
              stroke="#3B5BDB"
              strokeWidth={3.2}
              strokeDasharray="7 4"
            />
            <path
              d="M -46 -22 Q 0 -16 46 -22"
              fill="none"
              stroke="#748FFC"
              strokeWidth={2}
            />
            <rect x={-24} y={-10} width={48} height={10} rx={3.5} fill="#E2E8F0" stroke="#2B44B8" strokeWidth={2.6} />

            {/* 碗身醒目红底金字「积蓄」封签 */}
            <g transform="translate(0, -32)">
              <rect x={-29} y={-14} width={58} height={28} rx={5} fill="#D94336" stroke="#FFE299" strokeWidth={2} />
              <text x={0} y={6} textAnchor="middle" fontSize={18} fontWeight="900" fill="#FFF6D6" fontFamily="NewdayNoto, Noto Sans CJK SC, sans-serif">
                积蓄
              </text>
            </g>
          </g>

          {/* 一粒一粒连珠炮式沿金光光束内部高速飞入墙洞的晶莹白米粒 */}
          {RICE_GRAINS.map(([ox, oy, baseRot], gi) => {
            const launchT = stealStart + gi * launchStep;
            const u = (t - launchT) / flightDur;
            if (u <= 0 || u >= 1) return null;
            // 前段起吸、后段加速冲入墙洞的吸力曲线
            const q = 0.42 * u + 0.58 * u * u;
            const startX = jarX + ox * 0.72;
            const startY = jarY + oy * 0.92;
            // 严格收束在金色光束锥体内部，交错成清晰的米粒队列
            const laneOffset = ((gi % 5) - 2) * 5.2 * (1 - q * 0.72);
            const gentleArc = Math.sin(u * Math.PI) * (5 + (gi % 3) * 3);
            const tx = lerp(startX, holeX, q);
            const ty = lerp(startY, holeY, q) - gentleArc + laneOffset;
            const sc = u > 0.88 ? Math.max(0.28, 1 - (u - 0.88) / 0.12) : (0.94 + 0.14 * Math.sin(u * Math.PI));
            const rotDeg = beamAngleDeg + (baseRot * 0.45) + Math.sin(u * Math.PI * 2 + gi) * 14;

            return (
              <g
                key={`flying-grain-${gi}`}
                transform={`translate(${tx.toFixed(1)}, ${ty.toFixed(1)}) rotate(${rotDeg.toFixed(1)}) scale(${sc.toFixed(3)})`}
              >
                {/* 饱满大米颗粒本尊（微带胚芽弧度的雪白米粒，一眼认出是大米！） */}
                <path
                  d="M -8.6 0 C -8.6 -3.1 -3.8 -4.7 1.8 -4.4 C 6.2 -4.1 8.8 -2.1 8.8 0 C 8.8 2.4 5.6 4.5 -0.4 4.5 C -5.4 4.5 -8.6 2.6 -8.6 0 Z"
                  fill="#FFFFFF"
                  stroke="#475569"
                  strokeWidth={1.7}
                  strokeLinejoin="round"
                />
                {/* 米粒晶莹背脊高光 */}
                <ellipse cx={-1.2} cy={-1.3} rx={4.6} ry={1.3} fill="#F8FAFC" />
                <path d="M -4.2 0.8 Q 0.5 1.8 4.6 0.6" fill="none" stroke="#CBD5E1" strokeWidth={1.0} strokeLinecap="round" />
              </g>
            );
          })}
        </g>
      );
    }

    case 'straw_boat_minister':
    case 'straw_boat_cranes': {
      // 梗6：草船丞相 -> 抢走了我的对象（「对象」= 活生生的女朋友角色！草船上立着头戴冠冕、手摇羽扇的 Q版「丞相」，靠岸把女朋友角色接上船头甲板载走！）
      const boatPos = evalTrack2D(t, mech.boatTrack, 880, 548);
      const bx = boatPos[0];
      const by = (boatPos[1] ?? 548) + Math.sin(t * 3.2) * 4.5;
      const fanDeg = -22 + Math.sin(t * 7.5) * 18;

      if (mech.renderPass === 'heart') {
        // 主角与女朋友角色之间的粉红恋爱心 ♥：前半句完好无损跳动，19.00s 女朋友登上草船瞬间咔嚓裂成两半 💔！
        const breakAt = mech.breakAt ?? 19.00;
        const breakU = clamp((t - breakAt) / 1.55);
        if (breakU >= 0.99) return null;
        const baseHeartPos = evalTrack2D(t, mech.heartTrack, mech.x ?? 432, mech.y ?? 318);
        const hx = lerp(baseHeartPos[0], baseHeartPos[0] + 115, easeOut(clamp(breakU * 1.4)));
        const hy = (baseHeartPos[1] ?? 318) + Math.sin(t * 5.4) * 5;
        const pulse = breakU <= 0.005 ? 1 + Math.sin(t * 8.5) * 0.08 : 1;
        const split = easeOut(clamp(breakU * 1.8)) * 28;
        const fade = 1 - clamp((breakU - 0.78) / 0.22);

        return (
          <g key={`mech-heart-${idx}`} transform={`translate(${hx.toFixed(1)}, ${hy.toFixed(1)}) scale(${pulse.toFixed(3)})`} opacity={fade.toFixed(2)}>
            {breakU <= 0.005 ? (
              <path
                d="M 0 18 C -26 2 -34 -18 -18 -28 C -8 -34 -1 -26 0 -18 C 1 -26 8 -34 18 -28 C 34 -18 26 2 0 18 Z"
                fill="#FF6B9A"
                stroke="#C2255C"
                strokeWidth={2.6}
              />
            ) : (
              <g>
                <g transform={`translate(${(-split).toFixed(1)}, ${(split * 0.2).toFixed(1)}) rotate(${(-clamp(breakU * 1.8) * 18).toFixed(1)})`}>
                  <path d="M 0 18 C -26 2 -34 -18 -18 -28 C -8 -34 -1 -26 0 -18 L -5 -7 L 3 3 Z" fill="#FF6B9A" stroke="#C2255C" strokeWidth={2.6} />
                </g>
                <g transform={`translate(${split.toFixed(1)}, ${(split * 0.2).toFixed(1)}) rotate(${(clamp(breakU * 1.8) * 18).toFixed(1)})`}>
                  <path d="M 0 18 C 26 2 34 -18 18 -28 C 8 -34 1 -26 0 -18 L -5 -7 L 3 3 Z" fill="#FF6B9A" stroke="#C2255C" strokeWidth={2.6} />
                </g>
              </g>
            )}
            <g transform="translate(0, -44)">
              <rect x={-32} y={-15} width={64} height={26} rx={13} fill={breakU <= 0.005 ? 'rgba(255, 107, 154, 0.94)' : 'rgba(92, 54, 82, 0.88)'} stroke="#FFF0F6" strokeWidth={1.8} />
              <text x={0} y={4} textAnchor="middle" fontSize={15} fontWeight="900" fill="#FFFFFF" fontFamily="NewdayNoto, Noto Sans CJK SC, sans-serif">
                {breakU <= 0.005 ? '对象' : '被抢走'}
              </text>
            </g>
          </g>
        );
      }

      return (
        <g key={`mech-boat-${idx}`} transform={`translate(${bx.toFixed(1)}, ${by.toFixed(1)})`}>
          {/* 船底水花 */}
          <path d="M -162 22 Q -50 32 42 22 Q 112 30 164 18" fill="none" stroke="#E8FCFA" strokeWidth={4.5} strokeLinecap="round" />
          {/* 加宽草船木船身（左侧船头甲板宽敞承托登上草船的女朋友角色！） */}
          <path d="M -160 -6 L 160 -6 L 122 26 L -122 26 Z" fill="#8C5E3C" stroke="#472E1B" strokeWidth={3.2} strokeLinejoin="round" />
          {/* 船尾草垛靶子（草船借箭意象） */}
          {[78, 112, 138].map((sx, si) => (
            <ellipse key={si} cx={sx} cy={-18 + si * 2} rx={25 - si * 2} ry={18 - si} fill="#E6C267" stroke="#8C6D23" strokeWidth={2.4} />
          ))}
          {/* 船桅与大风帆 */}
          <line x1={58} y1={-12} x2={58} y2={-142} stroke="#5B3E28" strokeWidth={5.5} strokeLinecap="round" />
          <path d={`M 60 -136 Q ${124 + Math.sin(t * 3.2) * 8} -90 60 -42 Z`} fill="#FAF3E0" stroke="#7A6548" strokeWidth={2.5} />

          {/* 船中威风凛凛手摇鹅毛羽扇的 Q版「草船丞相」！ */}
          <g transform="translate(32, -6)">
            <path d="M -24 0 L -16 -56 L 16 -56 L 24 0 Z" fill="#2B4C7E" stroke="#162947" strokeWidth={2.8} />
            <path d="M -15 -56 L 0 -36 L 15 -56" fill="none" stroke="#F0DBA5" strokeWidth={3} />
            <circle cx={0} cy={-72} r={16.5} fill="#FFE2C6" stroke="#5C4030" strokeWidth={2.5} />
            {/* 丞相冠巾 */}
            <path d="M -18 -80 L -12 -102 L 12 -102 L 18 -80 Z" fill="#1E3557" stroke="#E0BD6B" strokeWidth={2.2} />
            <line x1={-8} y1={-74} x2={-3} y2={-74} stroke="#2B211B" strokeWidth={2.4} strokeLinecap="round" />
            <line x1={3} y1={-74} x2={8} y2={-74} stroke="#2B211B" strokeWidth={2.4} strokeLinecap="round" />
            <path d="M -3 -62 Q 0 -46 3 -62" fill="#2B211B" />
            {/* 摇动的鹅毛羽扇 */}
            <g transform={`translate(-18, -46) rotate(${fanDeg.toFixed(1)})`}>
              <line x1={0} y1={0} x2={-14} y2={-18} stroke="#8C5A2B" strokeWidth={3.2} />
              <ellipse cx={-23} cy={-29} rx={18} ry={12} transform="rotate(-35 -23 -29)" fill="#FFFFFF" stroke="#B8D4E8" strokeWidth={2.2} />
            </g>
          </g>

          {/* 船舷「草船丞相」木牌 */}
          <g transform="translate(22, 10)">
            <rect x={-46} y={-11} width={92} height={22} rx={5} fill="#FDF1D4" stroke="#6E4423" strokeWidth={2} />
            <text x={0} y={5} textAnchor="middle" fontSize={15} fontWeight="900" fill="#5C2D16" fontFamily="NewdayNoto, Noto Sans CJK SC, sans-serif">
              草船丞相
            </text>
          </g>
        </g>
      );
    }

    case 'pear_to_envelope': {
      // 梗7：孔融让梨 -> 就是让我「离职」（大黄梨递过来咔嚓裂开，秒变盖红章的「离职书」+ 抱箱走人纸箱，主角一把推回去！）
      const slideU = ease(seg(t, mech.slideStart ?? 21.45, mech.openAt ?? 23.40));
      const openU = seg(t, mech.openAt ?? 23.40, (mech.openAt ?? 23.40) + 0.32);
      const pushBackU = ease(seg(t, mech.pushBackAt ?? 23.85, (mech.pushBackAt ?? 23.85) + 0.72));
      const baseX = lerp(mech.fromX ?? 765, mech.midX ?? 625, slideU);
      const curX = lerp(baseX, mech.pushBackX ?? 742, pushBackU);
      const curY = mech.y ?? 480;
      const opened = openU > 0.22;
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
                {/* 打包离职纸箱 */}
                <g transform="translate(62, 10)">
                  <rect x={-32} y={-22} width={64} height={44} rx={4} fill="#D9A773" stroke="#7D522B" strokeWidth={2.6} />
                  <line x1={-32} y1={-6} x2={32} y2={-6} stroke="#7D522B" strokeWidth={2.2} />
                </g>
                {/* 盖红章的「离职书」 */}
                <rect x={-52} y={-34} width={104} height={68} rx={7} fill="#FFFDF9" stroke="#45566B" strokeWidth={3.2} />
                <circle cx={30} cy={14} r={12} fill="rgba(224, 67, 56, 0.24)" stroke="#D93B30" strokeWidth={2.2} />
                <text x={0} y={7} textAnchor="middle" fontSize={25} fontWeight="900" fill="#C93328" fontFamily="NewdayNoto, Noto Sans CJK SC, sans-serif">
                  离职书
                </text>
              </g>
            )}
          </g>
          {/* 鲸鱼娘死死护住自己的蓝色工牌不肯离职 */}
          {t >= (mech.openAt ?? 23.40) && (
            <g
              transform={`translate(${mech.badgeX ?? 545}, ${mech.badgeY ?? 468}) scale(${backOut(seg(t, (mech.openAt ?? 23.40) + 0.22, (mech.openAt ?? 23.40) + 0.55), 1.5).toFixed(3)})`}
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
      // 梗8：孟母三迁 -> 我月薪也是三千（三栋挂着「一迁」「二迁」「三迁」牌匾的屋舍滚过）
      const u = ease(seg(t, mech.start ?? 24.82, mech.end ?? 27.57));
      const offsetX = lerp(mech.fromOffset ?? 140, mech.toOffset ?? -420, u);
      const labels = ['一迁', '二迁', '三迁'];
      return (
        <g key={`mech-${idx}`} transform={`translate(${offsetX.toFixed(1)}, 0)`}>
          {[280, 620, 960].map((hx, hi) => (
            <g key={`house-${hi}`} transform={`translate(${hx}, 584)`} opacity={0.92}>
              <rect x={-72} y={-136} width={144} height={136} rx={6} fill="#D8CFC2" stroke="#5A4E3C" strokeWidth={3} />
              <polygon points="-88,-134 0,-196 88,-134" fill="#8C4F3E" stroke="#4A2920" strokeWidth={3} strokeLinejoin="round" />
              <rect x={-20} y={-68} width={40} height={68} rx={4} fill="#7B563D" stroke="#4A2F1D" strokeWidth={2.4} />
              <rect x={34} y={-112} width={30} height={30} rx={4} fill="#FFE8A3" stroke="#5A4E3C" strokeWidth={2.4} />
              {/* 屋檐「一迁 / 二迁 / 三迁」牌匾 */}
              <rect x={-36} y={-166} width={72} height={26} rx={5} fill="#FDF0D5" stroke="#6E4423" strokeWidth={2.2} />
              <text x={0} y={-147} textAnchor="middle" fontSize={17} fontWeight="900" fill="#6B3418" fontFamily="NewdayNoto, Noto Sans CJK SC, sans-serif">
                {labels[hi]}
              </text>
            </g>
          ))}
        </g>
      );
    }

    case 'steaming_teacup': {
      // 梗8后半句：也是三千（扁扁的「月薪三千」工资袋 + 三枚薄铜钱 + 热茶苦中作乐！）
      if (t < (mech.enterAt ?? 27.45)) return null;
      const pop = backOut(seg(t, mech.enterAt ?? 27.45, (mech.enterAt ?? 27.45) + 0.34), 1.5);
      return (
        <g key={`mech-${idx}`} transform={`translate(${mech.x ?? 762}, ${mech.y ?? 542}) scale(${pop.toFixed(3)})`}>
          {/* 扁扁的「月薪三千」薪资袋 + 三枚薄铜钱 */}
          <g transform="translate(-58, -4)">
            <rect x={-44} y={-16} width={88} height={30} rx={6} fill="#FBE7B5" stroke="#9C6E2B" strokeWidth={2.4} />
            <text x={0} y={5} textAnchor="middle" fontSize={16} fontWeight="900" fill="#9E3324" fontFamily="NewdayNoto, Noto Sans CJK SC, sans-serif">
              月薪三千
            </text>
            {[-20, 0, 20].map((cx, ci) => (
              <circle
                key={ci}
                cx={cx}
                cy={-26 - Math.abs(Math.sin(t * 4.5 + ci)) * 4}
                r={7.5}
                fill="#FFD43B"
                stroke="#B07914"
                strokeWidth={2}
              />
            ))}
          </g>

          {/* 热茶杯 */}
          <g transform="translate(22, 0)">
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
      y: lerp(220, Math.min(585, land.y ?? land[1]), q),
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
 * 支持 layer="back"（人物身后层：如靠山、三迁屋舍、水面草船丞相）与 layer="front"（人物前景层）
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
  const mechanisms = shot?.mechanisms || [];

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
  const shotEvents = events.filter((e) => !e.shotId || e.shotId === shot?.id);

  return (
    <svg
      width={1280}
      height={720}
      viewBox="0 0 1280 720"
      style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}
    >
      {/* 前景承托桌 */}
      {shot?.foregroundTable && (
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
      {(shot?.companionProps || shot?.props || []).map((ref, idx) => {
        const enterAt = Number.isFinite(ref.enterAt)
          ? ref.enterAt
          : (ref.fromLine && cues[ref.fromLine - 1] ? cues[ref.fromLine - 1].start : (shot?.start ?? 0));
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
      {(shot?.semanticTracks || []).map((track) => {
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
