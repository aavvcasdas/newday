import React from 'react';
import { semanticStateAt, clamp, lerp, ease, easeOut, backOut } from '../../engine/timeline_core.mjs';
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
            <text x={0} y={-14} textAnchor="middle" fontSize={13} fontWeight="800" fill="#2C3A4E" fontFamily="Noto Sans CJK SC, sans-serif">
              {title}
            </text>
          )}
        </g>
      );
    }
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
 * InteractivePropsLayer — 世界道具、handAt 手持道具、语义翻转纸张与接触冲击波层
 */
export function InteractivePropsLayer({
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
              <text x={0} y={-track.h / 2 + 28} textAnchor="middle" fontSize={18} fontWeight="800" fill="#243447" fontFamily="Noto Sans CJK SC, sans-serif">
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
          <text x={0} y={7} textAnchor="middle" fontSize={22} fontWeight="900" fill="#FFF8E7" fontFamily="Noto Sans CJK SC, sans-serif">
            {openerStamp.text}
          </text>
        </g>
      )}
    </svg>
  );
}
