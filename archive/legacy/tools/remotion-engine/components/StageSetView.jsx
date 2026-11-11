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
  for (let x = x0; x <= x1; x += 64) {
    const base = groundY - 235 + layer * 52 - Math.sin(x * 0.0044 + layer * 1.85) * (72 - layer * 14);
    const dip = isMountainPass
      ? Math.exp(-Math.pow((x - 760) / (125 + gateOpen * 165), 2)) * (98 + gateOpen * 118)
      : 0;
    pts.push(`L ${x.toFixed(1)} ${(base + dip).toFixed(1)}`);
  }
  pts.push(`L ${x1} ${groundY} Z`);
  return pts.join(' ');
}

function buildWavePath(x0, x1, baseY, t, speed, amp, seed) {
  const pts = [`M ${x0} ${baseY}`];
  for (let x = x0; x <= x1; x += 28) {
    const y = baseY + Math.sin(x * 0.028 - t * speed + seed) * amp;
    pts.push(`L ${x} ${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

function buildFilledWavePath(x0, x1, baseY, bottomY, t, speed, amp, seed) {
  const pts = [`M ${x0} ${bottomY}`, `L ${x0} ${baseY}`];
  for (let x = x0; x <= x1; x += 28) {
    const y = baseY + Math.sin(x * 0.026 - t * speed + seed) * amp;
    pts.push(`L ${x} ${y.toFixed(1)}`);
  }
  pts.push(`L ${x1} ${bottomY} Z`);
  return pts.join(' ');
}

/**
 * StageSetView — 动态参数化多深度视差舞台组件（Remotion SVG 版）
 * 1:1 消费 tools/场景/stage_sets_core.mjs 的 resolveStageSet 状态与 world_interactions 反馈。
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

      {/* L0: 远景天幕 / 深海 / 远山 / 云霞 / 落日视差层 (factor = 0.35) */}
      <g transform={`translate(${farShift.x.toFixed(2)}, ${farShift.y.toFixed(2)})`}>
        <rect x={x0 - 120} y={y0 - 80} width={width + 240} height={height + 160} fill={`url(#sky-${id})`} />

        {/* 柔和流云（江河/海滨/群山/渡口/梨园） */}
        {['river_gate', 'seaside_deck', 'mountain_pass', 'misty_pier', 'pear_orchard'].includes(id) &&
          [0, 1, 2, 3].map((ci) => {
            const cx = ((140 + ci * 360 + t * (14 + ci * 3)) % 1620) - 140;
            const cy = 68 + (ci % 2) * 54 + Math.sin(t * 0.5 + ci) * 6;
            return (
              <g key={`cloud-${ci}`} transform={`translate(${cx.toFixed(1)}, ${cy.toFixed(1)})`} opacity={id === 'seaside_deck' ? 0.35 + reactive.dawn * 0.45 : 0.62}>
                <ellipse cx={0} cy={0} rx={68} ry={22} fill="#FFFFFF" />
                <ellipse cx={-34} cy={6} rx={44} ry={16} fill="#FFFFFF" />
                <ellipse cx={36} cy={5} rx={48} ry={17} fill="#FFFFFF" />
              </g>
            );
          })}

        {/* 暮色与夜幕微星（海滨入暮 / 暮色街巷） */}
        {(id === 'twilight_street' || (id === 'seaside_deck' && reactive.dawn < 0.55)) &&
          [0, 1, 2, 3, 4, 5, 6].map((si) => {
            const sx = 110 + si * 195;
            const sy = 48 + (si % 3) * 44;
            const tw = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * 2.6 + si * 1.7));
            const duskFactor = id === 'seaside_deck' ? (0.55 - reactive.dawn) * 1.8 : 0.85;
            return <circle key={`st-${si}`} cx={sx} cy={sy} r={2.4 + (si % 2)} fill="#FFF6D6" opacity={tw * duskFactor} />;
          })}

        {/* 海滨周日骄阳（随 dawn_shift 被射落后下沉入海！） */}
        {id === 'seaside_deck' && anchors.sun && (
          <g transform={`translate(${anchors.sun.x.toFixed(1)}, ${anchors.sun.y.toFixed(1)})`}>
            <circle cx={0} cy={0} r={anchors.sun.r * 1.95} fill="#FFE57F" opacity={0.18 + anchors.sun.glow * 0.25} />
            <circle cx={0} cy={0} r={anchors.sun.r * 1.35} fill="#FFD54F" opacity={0.32 + anchors.sun.glow * 0.3} />
            <circle cx={0} cy={0} r={anchors.sun.r} fill={anchors.sun.glow > 0.5 ? '#FFCA28' : '#FF8A65'} stroke="#FFF8E1" strokeWidth={3} />
          </g>
        )}

        {/* 远山叠嶂 */}
        {['mountain_pass', 'sunset_ridge', 'river_gate', 'misty_pier'].includes(id) &&
          [0, 1, 2].map((layer) => (
            <path
              key={layer}
              d={buildRidgePath(x0 - 80, x1 + 80, groundY, layer, id === 'mountain_pass', reactive.gateOpen)}
              fill={
                id === 'misty_pier'
                  ? (layer === 0 ? 'rgba(92,138,136,0.22)' : layer === 1 ? 'rgba(84,132,130,0.38)' : 'rgba(78,124,122,0.52)')
                  : (layer === 0 ? 'rgba(42,68,78,0.26)' : layer === 1 ? 'rgba(54,84,82,0.44)' : palette.wall)
              }
            />
          ))}

        {/* 群山峡口拨开后的金色云霞光束 */}
        {id === 'mountain_pass' && reactive.gateOpen > 0.12 && (
          <polygon
            points={`710,${y0} 810,${y0} ${930 + reactive.gateOpen * 130},${groundY} ${590 - reactive.gateOpen * 130},${groundY}`}
            fill="#FFF0B5"
            opacity={0.12 + reactive.gateOpen * 0.26}
          />
        )}

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

      {/* L1: 中景建筑墙体、海岸波涛、渡口芦苇、梨园树冠、街巷灯柱与可交互机关 (factor = 0.78) */}
      <g transform={`translate(${midShift.x.toFixed(2)}, ${midShift.y.toFixed(2)})`}>
        {indoorRoom && (
          <g>
            <rect x={x0 - 60} y={y0 - 40} width={width + 120} height={groundY - y0 + 40} fill={palette.wall} />
            {/* 陶土工坊器皿博古架与窑炉暖火 */}
            {id === 'terracotta_courtyard' && (
              <g>
                {[215, 315].map((sy, si) => (
                  <g key={`shelf-${si}`}>
                    <rect x={120} y={sy} width={280} height={10} rx={4} fill="#8C6249" />
                    {[0, 1, 2, 3].map((pi) => (
                      <path
                        key={pi}
                        d={`M ${150 + pi * 64} ${sy} C ${142 + pi * 64} ${sy - 28}, ${172 + pi * 64} ${sy - 28}, ${164 + pi * 64} ${sy} Z`}
                        fill={pi % 2 === 0 ? '#D97B59' : '#C98A63'}
                      />
                    ))}
                  </g>
                ))}
                {/* 工坊红泥窑口 */}
                <path d="M 805 600 L 805 435 Q 865 375 925 435 L 925 600 Z" fill="#8D5843" stroke="#5E3829" strokeWidth={4} />
                <path d="M 832 600 L 832 478 Q 865 442 898 478 L 898 600 Z" fill="#FF9E44" opacity={0.45 + reactive.lampLit * 0.45} />
              </g>
            )}

            {/* 凿壁偷光夜读砖墙纹理 */}
            {id === 'screening_desk' && anchors.brickHole && (
              <g>
                <rect x={855} y={80} width={380} height={520} fill="#363D52" stroke="#23293A" strokeWidth={3} />
                {[0, 1, 2, 3, 4, 5, 6, 7].map((row) =>
                  [0, 1, 2, 3].map((col) => (
                    <rect
                      key={`br-${row}-${col}`}
                      x={872 + col * 84 + (row % 2) * 28}
                      y={112 + row * 56}
                      width={74}
                      height={42}
                      rx={3}
                      fill="none"
                      stroke="#49536E"
                      strokeWidth={2}
                      opacity={0.62}
                    />
                  ))
                )}
              </g>
            )}

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

        {/* 海滨周日碧海波涛 + 遮阳伞 + 沙滩躺椅 */}
        {id === 'seaside_deck' && (
          <g>
            <path d={buildFilledWavePath(x0 - 60, x1 + 60, 422, groundY + 10, t, 1.8, 8, 0.4)} fill={palette.wall} opacity={0.88} />
            <path d={buildFilledWavePath(x0 - 60, x1 + 60, 468, groundY + 10, t, 2.5, 10, 1.9)} fill="#56B9DC" opacity={0.45 + reactive.dawn * 0.35} />
            {[0, 1].map((wi) => (
              <path
                key={`sw-${wi}`}
                d={buildWavePath(x0, x1, 448 + wi * 38, t, 2.2 + wi * 0.6, 6, wi * 2.1)}
                fill="none"
                stroke="#FFFDF7"
                strokeWidth={2.6}
                opacity={0.42 + reactive.dawn * 0.25}
              />
            ))}
            {/* 海滩遮阳伞与木躺椅 */}
            <g transform="translate(245, 600)">
              <line x1={0} y1={0} x2={-18} y2={-275} stroke="#7C583A" strokeWidth={7} strokeLinecap="round" />
              <path d="M -148 -245 Q -18 -338 112 -245 Z" fill="#FF8A65" stroke="#5D3A28" strokeWidth={3} />
              <path d="M -92 -245 Q -18 -326 56 -245 Z" fill="#FFF3E0" />
              {/* 沙滩躺椅 */}
              <line x1={38} y1={-8} x2={158} y2={-48} stroke="#A47449" strokeWidth={9} strokeLinecap="round" />
              <line x1={152} y1={-46} x2={196} y2={-112} stroke="#A47449" strokeWidth={9} strokeLinecap="round" />
              <line x1={62} y1={-14} x2={48} y2={0} stroke="#6E4B2E" strokeWidth={6} />
              <line x1={148} y1={-42} x2={166} y2={0} stroke="#6E4B2E" strokeWidth={6} />
            </g>
          </g>
        )}

        {/* 烟波渡口：浩渺江面 + 摇曳芦苇丛 + 木栈码头 */}
        {id === 'misty_pier' && (
          <g>
            <path d={buildFilledWavePath(x0 - 60, x1 + 60, 438, y1, t, 1.9, 7, 0.7)} fill="#7BC3BE" opacity={0.78} />
            <path d={buildFilledWavePath(x0 - 60, x1 + 60, 492, y1, t, 2.6, 9, 2.2)} fill="#58A8A5" opacity={0.82} />
            {[0, 1, 2].map((wi) => (
              <path
                key={`mpw-${wi}`}
                d={buildWavePath(x0, x1, 466 + wi * 44, t, 2.1 + wi * 0.5, 6, wi * 1.5)}
                fill="none"
                stroke="#E8FAF8"
                strokeWidth={2.5}
                opacity={0.48}
              />
            ))}
            {/* 岸边摇曳芦苇 */}
            {[80, 125, 168, 212].map((rx, ri) => {
              const sway = Math.sin(t * 2.1 + ri * 0.8) * 10;
              return (
                <g key={`reed-${ri}`}>
                  <path d={`M ${rx} 590 Q ${rx + sway * 0.5} 500 ${rx + sway} 430`} fill="none" stroke="#6E8F72" strokeWidth={4} strokeLinecap="round" />
                  <ellipse cx={rx + sway + 3} cy={426} rx={6} ry={18} transform={`rotate(${sway * 1.4}, ${rx + sway + 3}, 426)`} fill="#EFE5CE" />
                </g>
              );
            })}
          </g>
        )}

        {/* 梨园庭院办公台：矮院墙 + 挂满金梨的摇曳树冠 */}
        {id === 'pear_orchard' && (
          <g>
            <rect x={x0 - 40} y={355} width={width + 80} height={245} fill="#F3ECE0" />
            <rect x={x0 - 40} y={345} width={width + 80} height={14} fill="#9C7A5B" />
            {/* 梨树主干与枝叶 */}
            <g transform={`translate(${anchors.tree?.x ?? 310}, 600)`}>
              <path d="M -22 0 Q -18 -190 -8 -330 L 24 -330 Q 18 -180 28 0 Z" fill="#7A563C" stroke="#4D3423" strokeWidth={3} />
              <g transform={`rotate(${(Math.sin(t * 1.3) * 1.4).toFixed(2)}, 0, -320)`}>
                <ellipse cx={-30} cy={-380} rx={185} ry={108} fill="#88BE70" />
                <ellipse cx={95} cy={-355} rx={165} ry={95} fill="#9BCE7E" />
                <ellipse cx={20} cy={-435} rx={150} ry={88} fill="#A9D98C" />
                {/* 枝头悬挂的小金梨 */}
                {[
                  [-95, -335],
                  [-15, -365],
                  [68, -325],
                  [138, -345],
                  [25, -298],
                ].map(([px, py], pi) => (
                  <g key={`tp-${pi}`} transform={`translate(${px}, ${py}) rotate(${(Math.sin(t * 2.2 + pi) * 5).toFixed(1)})`}>
                    <line x1={0} y1={-16} x2={0} y2={-6} stroke="#5B4229" strokeWidth={2.5} />
                    <path d="M 0 -8 C -9 -6 -14 4 -12 13 C -10 21 10 21 12 13 C 14 4 9 -6 0 -8 Z" fill="#F7D358" stroke="#9C7B24" strokeWidth={2} />
                  </g>
                ))}
              </g>
            </g>
          </g>
        )}

        {/* 暮色街巷路灯柱 */}
        {id === 'twilight_street' &&
          [260, 760].map((lx, li) => (
            <g key={`lamp-${li}`} transform={`translate(${lx}, 600)`}>
              <rect x={-5} y={-425} width={10} height={425} rx={4} fill="#3A3D52" />
              <path d="M -5 -420 Q 28 -448 52 -412" fill="none" stroke="#3A3D52" strokeWidth={7} strokeLinecap="round" />
              <circle cx={54} cy={-405} r={16} fill="#FFF2BA" stroke="#E5B96E" strokeWidth={3} />
            </g>
          ))}

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
            <path
              d={buildFilledWavePath(x0 - 60, x1 + 60, groundY - 92 - anchors.gate.open * 26, groundY + 12, t, 3.2 + anchors.gate.open * 4.2, 7 + anchors.gate.open * 10, 0.5)}
              fill="#2B89C2"
            />
            {[0, 1, 2].map((wi) => (
              <path
                key={wi}
                d={buildWavePath(x0, x1, groundY - 76 - anchors.gate.open * 16 + wi * 24, t, 3.4 + anchors.gate.open * 4.2, 6 + anchors.gate.open * 10, wi * 1.4)}
                fill="none"
                stroke="#E6F9FF"
                strokeWidth={3.2}
                opacity={0.42 + wi * 0.16}
              />
            ))}
            {/* 石质水闸桥墩与升降木闸门 */}
            {anchors.gate.open > 0.2 && (
              <rect
                x={anchors.gate.x - anchors.gate.w / 2 + 6}
                y={anchors.gate.topY + 215}
                width={anchors.gate.w - 12}
                height={Math.max(18, groundY - (anchors.gate.topY + 215))}
                fill="#7FD8F7"
                opacity={0.72}
              />
            )}
            <rect x={anchors.gate.x - anchors.gate.w / 2 - 22} y={136} width={24} height={458} rx={4} fill="#504238" />
            <rect x={anchors.gate.x + anchors.gate.w / 2 - 2} y={136} width={24} height={458} rx={4} fill="#504238" />
            <rect x={anchors.gate.x - anchors.gate.w / 2 - 30} y={122} width={anchors.gate.w + 60} height={24} rx={5} fill="#3D3129" />
            <rect x={anchors.gate.x - anchors.gate.w / 2} y={anchors.gate.topY} width={anchors.gate.w} height={230} rx={5} fill="#8C6443" stroke="#4D3522" strokeWidth={3} />
            <line x1={anchors.gate.x - anchors.gate.w / 2 + 12} y1={anchors.gate.topY + 55} x2={anchors.gate.x + anchors.gate.w / 2 - 12} y2={anchors.gate.topY + 55} stroke="#5D4029" strokeWidth={4} />
            <line x1={anchors.gate.x - anchors.gate.w / 2 + 12} y1={anchors.gate.topY + 165} x2={anchors.gate.x + anchors.gate.w / 2 - 12} y2={anchors.gate.topY + 165} stroke="#5D4029" strokeWidth={4} />
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

      {/* L2: 角色同平面地面 / 木栈桥 + 光锥与地面光池 + 案台 + 人物动态投影与脚步涟漪 (factor = 1.0) */}
      <g>
        {id === 'misty_pier' ? (
          <g>
            {/* 渡口木栈桥面与桥桩（右侧留出宽阔江面供草船驶过） */}
            {[160, 320, 480, 625].map((px) => (
              <rect key={`post-${px}`} x={px - 10} y={groundY - 6} width={20} height={150} fill="#5B4230" />
            ))}
            <rect x={x0 - 80} y={groundY - 10} width={960} height={30} rx={6} fill={palette.floor} stroke={palette.floorLine} strokeWidth={3} />
            <rect x={x0 - 80} y={groundY + 20} width={960} height={140} fill="#4D3829" opacity={0.45} />
            {/* 码头缆桩 */}
            <rect x={632} y={groundY - 38} width={22} height={30} rx={4} fill="#6E503B" stroke="#3F2C1E" strokeWidth={2.5} />
          </g>
        ) : (
          <g>
            <rect x={x0 - 80} y={groundY} width={width + 160} height={y1 - groundY + 120} fill={palette.floor} />
            <line x1={x0 - 80} y1={groundY} x2={x1 + 80} y2={groundY} stroke={palette.floorLine} strokeWidth={3} />
          </g>
        )}

        {/* 体积光锥与地面光池 */}
        {id === 'screening_desk' && anchors.brickHole && (
          <g transform={`translate(${anchors.brickHole.x}, ${anchors.brickHole.y})`}>
            <polygon
              points="-26,-16 4,-28 28,-8 20,22 -14,26 -30,6"
              fill={anchors.brickHole.open > 0.05 ? '#FFF3B0' : '#1E2433'}
              stroke="#6B7594"
              strokeWidth={3.5}
            />
            {anchors.brickHole.open > 0.05 && (
              <circle cx={0} cy={0} r={36 * anchors.brickHole.open} fill="#FFE57F" opacity={0.58 * anchors.brickHole.open} />
            )}
          </g>
        )}
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

        {/* 背景中置书桌/审稿台/梨园办公桌（抖动由 deskShake 实时驱动） */}
        {anchors.desk && ['screening_desk', 'pantry_hearth', 'terracotta_courtyard', 'pear_orchard'].includes(id) && (
          <g transform={`translate(${(anchors.desk.shake || 0).toFixed(2)}, 0)`}>
            <rect
              x={anchors.desk.x - anchors.desk.w / 2}
              y={anchors.desk.topY}
              width={anchors.desk.w}
              height={16}
              rx={5}
              fill="#9C7350"
              stroke="#4B3524"
              strokeWidth={2}
            />
            <rect
              x={anchors.desk.x - anchors.desk.w / 2 + 20}
              y={anchors.desk.topY + 16}
              width={anchors.desk.w - 40}
              height={groundY - anchors.desk.topY - 16}
              fill="#6D4F38"
            />
          </g>
        )}

        {/* 暮色街巷木长椅 */}
        {id === 'twilight_street' && anchors.bench && (
          <g transform={`translate(${anchors.bench.x}, ${groundY})`}>
            <rect x={-96} y={-58} width={192} height={14} rx={4} fill="#9C6F4C" stroke="#4D3423" strokeWidth={2.5} />
            <rect x={-92} y={-34} width={184} height={14} rx={4} fill="#B3825B" stroke="#4D3423" strokeWidth={2.5} />
            <rect x={-76} y={-20} width={12} height={20} fill="#4A382B" />
            <rect x={64} y={-20} width={12} height={20} fill="#4A382B" />
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
          const op = Math.max(0, 0.42 * rp.strength * (1 - rp.phase));
          return rp.wet ? (
            <ellipse
              key={`rp-${idx}`}
              cx={rp.x}
              cy={rp.y}
              rx={20 * expand}
              ry={6 * expand}
              fill="none"
              stroke="#A8F0FF"
              strokeWidth={2.2}
              opacity={op}
            />
          ) : (
            <g key={`rp-${idx}`} opacity={op}>
              <circle cx={rp.x - 14 * expand} cy={rp.y - 4 * expand} r={5 * (1 - rp.phase * 0.5)} fill="#E8D8BE" />
              <circle cx={rp.x + 14 * expand} cy={rp.y - 4 * expand} r={5 * (1 - rp.phase * 0.5)} fill="#E8D8BE" />
            </g>
          );
        })}

        {/* 环境粒子（气泡 / 雨丝 / 梨花瓣 / 蒸汽 / 微尘） */}
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
          ) : p.kind === 'petals' ? (
            <ellipse
              key={idx}
              cx={p.x}
              cy={p.y}
              rx={p.r * 1.4}
              ry={p.r * 0.8}
              transform={`rotate(${(p.rot || 0).toFixed(1)}, ${p.x.toFixed(1)}, ${p.y.toFixed(1)})`}
              fill="#FFF9F5"
              stroke="#F3C6CE"
              strokeWidth={0.8}
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
