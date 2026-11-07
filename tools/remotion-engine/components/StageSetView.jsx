import React from 'react';
import { WORLD_BOUNDS } from '../../场景/stage_sets_core.mjs';

function parallaxOffset(camera, factor) {
  const cx = camera?.cx ?? 640;
  const cy = camera?.cy ?? 360;
  return {
    x: (cx - 640) * (1 - factor),
    y: (cy - 360) * (1 - factor),
  };
}

function buildRidgePath(x0, x1, groundY, layer, isMountainPass, gateOpen) {
  const pts = [`M ${x0} ${groundY}`];
  for (let x = x0; x <= x1; x += 72) {
    const base = groundY - 215 + layer * 48 - Math.sin(x * 0.0045 + layer * 1.9) * (68 - layer * 14);
    const dip = isMountainPass
      ? Math.exp(-Math.pow((x - 760) / (120 + gateOpen * 160), 2)) * (95 + gateOpen * 115)
      : 0;
    pts.push(`L ${x.toFixed(1)} ${(base + dip).toFixed(1)}`);
  }
  pts.push(`L ${x1} ${groundY} Z`);
  return pts.join(' ');
}

function buildWavePath(x0, x1, baseY, t, speed, amp, seed) {
  const pts = [`M ${x0} ${baseY}`];
  for (let x = x0; x <= x1; x += 32) {
    const y = baseY + Math.sin(x * 0.028 - t * speed + seed) * amp;
    pts.push(`L ${x} ${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

/**
 * StageSetView — 动态参数化多深度视差舞台组件（Remotion SVG 版）
 * 1:1 消费 tools/场景/stage_sets.mjs 的 resolveStageSet 状态与 world_interactions 反馈。
 */
export function StageSetView({ setState, worldState, camera, t = 0 }) {
  const { id, palette, anchors, lightSources, particles, groundY, reactive } = setState;
  const { x0, x1, y0, y1, width, height } = WORLD_BOUNDS;
  const farShift = parallaxOffset(camera, 0.35);
  const midShift = parallaxOffset(camera, 0.78);
  const indoorRoom = ['underwater_study', 'porthole_observatory', 'screening_desk', 'corridor_hatch', 'pantry_hearth', 'split_stage', 'terracotta_courtyard', 'rain_street'].includes(id);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`${x0} ${y0} ${width} ${height}`}
      style={{
        position: 'absolute',
        left: x0,
        top: y0,
        width,
        height,
        overflow: 'visible',
      }}
    >
      <defs>
        <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.skyTop} />
          <stop offset="100%" stopColor={palette.skyBot} />
        </linearGradient>
        <clipPath id={`win-clip-${id}`}>
          {anchors.window?.panoramic ? (
            <rect
              x={anchors.window.x - anchors.window.w / 2}
              y={anchors.window.y - anchors.window.h / 2}
              width={anchors.window.w}
              height={anchors.window.h}
              rx={46}
            />
          ) : (
            <circle
              cx={anchors.window?.x ?? 148}
              cy={anchors.window?.y ?? 236}
              r={anchors.window?.r ?? 76}
            />
          )}
        </clipPath>
      </defs>

      {/* L0: 远景天幕 / 深海 / 远山视差层 (factor = 0.35) */}
      <g transform={`translate(${farShift.x.toFixed(2)}, ${farShift.y.toFixed(2)})`}>
        <rect x={x0 - 120} y={y0 - 80} width={width + 240} height={height + 160} fill={`url(#sky-${id})`} />
        {['mountain_pass', 'sunset_ridge', 'river_gate'].includes(id) &&
          [0, 1, 2].map((layer) => (
            <path
              key={layer}
              d={buildRidgePath(x0 - 80, x1 + 80, groundY, layer, id === 'mountain_pass', reactive.gateOpen)}
              fill={layer === 0 ? 'rgba(42,68,78,0.28)' : layer === 1 ? 'rgba(54,84,82,0.45)' : palette.wall}
            />
          ))}
        {id === 'abyss_metaphor' &&
          [0, 1, 2].map((beamIdx) => {
            const bx = 360 + beamIdx * 280 + Math.sin(t * 0.45 + beamIdx) * 24;
            return (
              <polygon
                key={beamIdx}
                points={`${bx - 42},${y0} ${bx + 42},${y0} ${bx + 150},${groundY} ${bx - 120},${groundY}`}
                fill={palette.accent}
                opacity={0.09}
              />
            );
          })}
      </g>

      {/* L1: 中景建筑墙体与可交互门/窗/钉板/水闸/引导灯 (factor = 0.78) */}
      <g transform={`translate(${midShift.x.toFixed(2)}, ${midShift.y.toFixed(2)})`}>
        {indoorRoom && (
          <g>
            <rect x={x0 - 60} y={y0 - 40} width={width + 120} height={groundY - y0 + 40} fill={palette.wall} />
            {id === 'split_stage' && (
              <g>
                <polygon
                  points={`${anchors.dividerX},${y0} ${x1},${y0} ${x1},${groundY} ${anchors.dividerX - 45},${groundY}`}
                  fill="#33273B"
                />
                <line
                  x1={anchors.dividerX}
                  y1={y0}
                  x2={anchors.dividerX - 45}
                  y2={groundY}
                  stroke={palette.wallTrim}
                  strokeWidth={5}
                />
              </g>
            )}
            <rect x={x0 - 60} y={groundY - 18} width={width + 120} height={18} fill={palette.wallTrim} />
          </g>
        )}

        {/* 互动舷窗 / 街窗（含窗外游鱼与敲击涟漪反馈） */}
        {anchors.window && (
          <g>
            <g clipPath={`url(#win-clip-${id})`}>
              <rect
                x={(anchors.window.x ?? 148) - 440}
                y={(anchors.window.y ?? 236) - 240}
                width={880}
                height={480}
                fill={id === 'rain_street' || id === 'terracotta_courtyard' ? '#3B2F2A' : '#082644'}
              />
              {['underwater_study', 'porthole_observatory'].includes(id) &&
                [0, 1, 2].map((fi) => {
                  const swimBoost = anchors.window.ripple > 0 ? anchors.window.ripple * 38 : 0;
                  const fx = anchors.window.x - 120 + fi * 115 + Math.sin(t * 0.85 + fi * 1.9) * 36 + swimBoost * (fi % 2 ? 1 : -1);
                  const fy = anchors.window.y - 38 + (fi % 2) * 56 + Math.cos(t * 1.1 + fi) * 10;
                  return (
                    <g key={fi} transform={`translate(${fx.toFixed(1)}, ${fy.toFixed(1)})`}>
                      <ellipse cx={0} cy={0} rx={15} ry={6.5} fill="#6FD9EC" opacity={0.62} />
                      <polygon points="-13,0 -22,-6 -22,6" fill="#6FD9EC" opacity={0.55} />
                    </g>
                  );
                })}
              {(anchors.window.ripple ?? 0) > 0.02 && (
                <circle
                  cx={anchors.window.x}
                  cy={anchors.window.y}
                  r={22 + (1 - anchors.window.ripple) * 140}
                  fill="none"
                  stroke="#A8F0FF"
                  strokeWidth={3}
                  opacity={anchors.window.ripple * 0.72}
                />
              )}
            </g>
            {anchors.window.panoramic ? (
              <rect
                x={anchors.window.x - anchors.window.w / 2}
                y={anchors.window.y - anchors.window.h / 2}
                width={anchors.window.w}
                height={anchors.window.h}
                rx={46}
                fill="none"
                stroke={palette.wallTrim}
                strokeWidth={10}
              />
            ) : (
              <circle
                cx={anchors.window.x}
                cy={anchors.window.y}
                r={anchors.window.r ?? 76}
                fill="none"
                stroke={palette.wallTrim}
                strokeWidth={8}
              />
            )}
          </g>
        )}

        {/* 墙面互动软木钉板（随 pin_board 事件增加便签贴纸） */}
        {anchors.board && (
          <g>
            <rect
              x={anchors.board.x - anchors.board.w / 2 - 6}
              y={anchors.board.y - anchors.board.h / 2 - 6}
              width={anchors.board.w + 12}
              height={anchors.board.h + 12}
              rx={6}
              fill="#5D4636"
            />
            <rect
              x={anchors.board.x - anchors.board.w / 2}
              y={anchors.board.y - anchors.board.h / 2}
              width={anchors.board.w}
              height={anchors.board.h}
              fill="#B38B64"
            />
            {Array.from({ length: Math.min(6, Math.max(1, anchors.board.pins || 2)) }).map((_, idx) => {
              const nx = anchors.board.x - anchors.board.w / 2 + 24 + (idx % 3) * 74;
              const ny = anchors.board.y - anchors.board.h / 2 + 20 + Math.floor(idx / 3) * 58;
              return (
                <g key={idx}>
                  <rect x={nx} y={ny} width={52} height={38} rx={3} fill={idx % 2 === 0 ? '#FFF6DA' : '#DCF3F9'} />
                  <circle cx={nx + 26} cy={ny + 6} r={3.2} fill="#D85B5B" />
                </g>
              );
            })}
          </g>
        )}

        {/* 可开合舱门 / 院门（开门漏出走廊暖光） */}
        {anchors.door && id !== 'river_gate' && (
          <g>
            <rect
              x={anchors.door.x - anchors.door.w / 2}
              y={anchors.door.topY}
              width={anchors.door.w}
              height={anchors.door.h}
              rx={6}
              fill="#241F21"
            />
            {(anchors.door.open ?? 0) > 0.01 && (
              <rect
                x={anchors.door.x - anchors.door.w / 2 + 4}
                y={anchors.door.topY + 4}
                width={anchors.door.w * anchors.door.open}
                height={anchors.door.h - 4}
                fill="#FFE09C"
                opacity={0.88}
              />
            )}
            <rect
              x={anchors.door.x - anchors.door.w / 2 + anchors.door.w * (anchors.door.open ?? 0)}
              y={anchors.door.topY}
              width={Math.max(12, anchors.door.w * (1 - (anchors.door.open ?? 0)))}
              height={anchors.door.h}
              rx={4}
              fill={palette.wallTrim}
            />
          </g>
        )}

        {/* 江河水闸与奔涌水波 */}
        {id === 'river_gate' && anchors.gate && (
          <g>
            <rect x={x0} y={groundY - 96} width={width} height={102} fill="#2A85BA" />
            {[0, 1, 2].map((wi) => (
              <path
                key={wi}
                d={buildWavePath(x0, x1, groundY - 76 + wi * 22, t, 3.2 + anchors.gate.open * 3.8, 6 + anchors.gate.open * 9, wi * 1.4)}
                fill="none"
                stroke="#E4F8FF"
                strokeWidth={3}
                opacity={0.36 + wi * 0.14}
              />
            ))}
            <rect x={anchors.gate.x - anchors.gate.w / 2 - 16} y={148} width={18} height={442} fill="#4B3B30" />
            <rect x={anchors.gate.x + anchors.gate.w / 2 - 2} y={148} width={18} height={442} fill="#4B3B30" />
            <rect x={anchors.gate.x - anchors.gate.w / 2} y={anchors.gate.topY} width={anchors.gate.w} height={220} rx={4} fill="#7E5B40" />
          </g>
        )}

        {/* 走廊接近感应地面引导灯 */}
        {id === 'corridor_hatch' &&
          [220, 340, 460, 580, 700, 820, 940, 1060].map((lx) => {
            const prox = Math.max(0.18, 1 - Math.abs(lx - reactive.focusX) / 260);
            return (
              <rect
                key={lx}
                x={lx - 18}
                y={groundY - 12}
                width={36}
                height={6}
                rx={3}
                fill="#7BE3F2"
                opacity={0.2 + 0.7 * prox}
              />
            );
          })}
      </g>

      {/* L2: 角色同平面地面 + 光锥与地面光池 + 灶台/案台 + 人物动态投影与脚步涟漪 (factor = 1.0) */}
      <g>
        <rect x={x0 - 80} y={groundY} width={width + 160} height={y1 - groundY + 120} fill={palette.floor} />
        <line x1={x0 - 80} y1={groundY} x2={x1 + 80} y2={groundY} stroke={palette.floorLine} strokeWidth={3} />

        {/* 体积光锥与地面光池 */}
        {lightSources.map((ls, idx) =>
          ls.intensity > 0.01 ? (
            <g key={idx}>
              <polygon
                points={`${ls.x - 22},${ls.y} ${ls.x + 22},${ls.y} ${ls.targetX + ls.radius * 0.74},${ls.targetY} ${ls.targetX - ls.radius * 0.74},${ls.targetY}`}
                fill={ls.color}
                opacity={ls.intensity * 0.24}
              />
              <ellipse
                cx={ls.targetX}
                cy={groundY + 5}
                rx={ls.radius * 0.66}
                ry={22}
                fill={ls.color}
                opacity={ls.intensity * 0.36}
              />
            </g>
          ) : null
        )}

        {/* 茶水间灶台 */}
        {anchors.hearth && (
          <g>
            <rect
              x={anchors.hearth.x - anchors.hearth.w / 2}
              y={anchors.hearth.topY}
              width={anchors.hearth.w}
              height={groundY - anchors.hearth.topY}
              rx={6}
              fill="#5B4338"
            />
            <ellipse cx={anchors.hearth.x} cy={anchors.hearth.topY - 8} rx={48} ry={18} fill="#D99B66" />
          </g>
        )}

        {/* 背景中置书桌/审稿台（抖动由 deskShake 实时驱动） */}
        {anchors.desk && ['screening_desk', 'pantry_hearth', 'terracotta_courtyard'].includes(id) && (
          <g transform={`translate(${(anchors.desk.shake || 0).toFixed(2)}, 0)`}>
            <rect
              x={anchors.desk.x - anchors.desk.w / 2}
              y={anchors.desk.topY}
              width={anchors.desk.w}
              height={16}
              rx={5}
              fill="#8D6748"
            />
            <rect
              x={anchors.desk.x - anchors.desk.w / 2 + 18}
              y={anchors.desk.topY + 16}
              width={anchors.desk.w - 36}
              height={groundY - anchors.desk.topY - 16}
              fill="#624632"
            />
          </g>
        )}

        {/* 人物跳跃高度衰减投影 + 脚步涟漪/尘土反馈 */}
        {(worldState?.actorShadows || []).map((sh) => (
          <ellipse
            key={`sh-${sh.actorIndex}`}
            cx={sh.x}
            cy={sh.y}
            rx={sh.rx}
            ry={sh.ry}
            fill="#081324"
            opacity={sh.alpha}
          />
        ))}
        {(worldState?.surfaceRipples || []).map((rp, idx) => {
          const expand = 1 + rp.phase * 2.2;
          const op = Math.max(0, 0.36 * rp.strength * (1 - rp.phase));
          return rp.wet ? (
            <ellipse
              key={`rp-${idx}`}
              cx={rp.x}
              cy={rp.y}
              rx={18 * expand}
              ry={5 * expand}
              fill="none"
              stroke="#8BE6F8"
              strokeWidth={1.8}
              opacity={op}
            />
          ) : (
            <g key={`rp-${idx}`} opacity={op}>
              <circle cx={rp.x - 14 * expand} cy={rp.y - 4 * expand} r={4.5 * (1 - rp.phase * 0.5)} fill="#E8D8BE" />
              <circle cx={rp.x + 14 * expand} cy={rp.y - 4 * expand} r={4.5 * (1 - rp.phase * 0.5)} fill="#E8D8BE" />
            </g>
          );
        })}

        {/* 环境粒子（气泡 / 雨丝 / 蒸汽 / 微尘） */}
        {particles.map((p, idx) =>
          p.kind === 'rain' ? (
            <line
              key={idx}
              x1={p.x}
              y1={p.y}
              x2={p.x - 5}
              y2={p.y + p.len}
              stroke="#A9D6FF"
              strokeWidth={p.r}
              opacity={p.alpha}
            />
          ) : p.kind === 'bubbles' ? (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r={p.r}
              fill="none"
              stroke={palette.accent}
              strokeWidth={1.4}
              opacity={p.alpha}
            />
          ) : (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r={p.r}
              fill={p.kind === 'steam' ? '#FFF6EA' : palette.warm}
              opacity={p.alpha}
            />
          )
        )}
      </g>
    </svg>
  );
}
