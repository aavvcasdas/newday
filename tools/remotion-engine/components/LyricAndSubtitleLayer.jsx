import React from 'react';
import { clamp, backOut } from '../../engine/timeline_core.mjs';

function LyricCharPop({ text, start, end, t, charsTimed = null }) {
  const chars = Array.from(text || '');
  const span = Math.max(0.2, (end ?? start + 2) - start);
  const step = Math.min(0.06, (span * 0.55) / Math.max(1, chars.length));

  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1px' }}>
      {chars.map((ch, idx) => {
        const timed = charsTimed?.[idx];
        const chStart = timed?.start ?? (start + idx * step);
        const age = t - chStart;
        const p = clamp(age / 0.22);
        const popScale = age < 0 ? 0.65 : backOut(p, 1.8);
        const active = age >= 0;
        return (
          <span
            key={idx}
            style={{
              display: 'inline-block',
              opacity: age < -0.05 ? 0.22 : clamp(0.35 + p * 0.65),
              transform: `translateY(${((1 - p) * 10).toFixed(1)}px) scale(${popScale.toFixed(3)})`,
              color: active ? '#FFF9EB' : '#BFD6E6',
              textShadow: active ? '0 3px 14px rgba(10, 22, 42, 0.85)' : 'none',
            }}
          >
            {ch === ' ' ? '\u00A0' : ch}
          </span>
        );
      })}
    </span>
  );
}

/**
 * LyricAndSubtitleLayer — 屏幕空间安全区字幕与合规角标层（不随世界相机缩放晃动）
 *   - Lyric MV 模式：逐字 backOut 弹入高亮（参考 Win-Hao/music-mv/templates/lyrics-layer.js）
 *   - Day Episode 模式：Day2 风格说话人字幕条 + 开场钩子横幅 + 「非官方同人 · AI生成 · 剧情演绎」合规角标
 */
export function LyricAndSubtitleLayer({
  mode = 'day-episode',
  screens = [],
  cues = [],
  speaker = '本鲸',
  opener = null,
  planningPreview = false,
  t = 0,
}) {
  const activeScreen = screens.find((s) => t >= s.start && t < s.end)
    || cues.find((c) => t >= c.start && t < c.end)
    || null;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', fontFamily: 'Noto Sans CJK SC, PingFang SC, sans-serif' }}>
      {/* Day 系列强制合规角标 */}
      {mode === 'day-episode' && (
        <div
          style={{
            position: 'absolute',
            right: 46,
            top: 18,
            padding: '7px 20px',
            borderRadius: 8,
            backgroundColor: 'rgba(12, 25, 46, 0.94)',
            color: '#B9CECB',
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: '0.5px',
          }}
        >
          非官方同人 · AI生成 · 剧情演绎
        </div>
      )}

      {/* Day 系列开场顶部钩子横幅（仅在 0..openerEnd 内显示） */}
      {mode === 'day-episode' && opener && t < (opener.openerEnd ?? 2.8) && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 26,
            transform: `translateX(-50%) scale(${backOut(clamp(t / 0.28), 1.4).toFixed(3)})`,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '10px 28px',
            borderRadius: 14,
            backgroundColor: 'rgba(11, 27, 52, 0.93)',
            border: '2px solid rgba(118, 212, 232, 0.68)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
          }}
        >
          {opener.badge && (
            <span
              style={{
                padding: '4px 12px',
                borderRadius: 8,
                backgroundColor: '#F4B860',
                color: '#16253B',
                fontSize: 21,
                fontWeight: 900,
              }}
            >
              {opener.badge}
            </span>
          )}
          <span style={{ color: '#F2F7FA', fontSize: 29, fontWeight: 900 }}>
            {opener.headlinePrefix}
            <span style={{ color: '#FFE082' }}>{opener.headlineHighlight}</span>
          </span>
        </div>
      )}

      {planningPreview && (
        <div
          style={{
            position: 'absolute',
            left: 20,
            top: 16,
            padding: '8px 18px',
            borderRadius: 8,
            backgroundColor: 'rgba(9, 22, 54, 0.9)',
            color: '#FFE8A3',
            fontSize: 20,
            fontWeight: 800,
          }}
        >
          规划预览样片 · 非实测成片
        </div>
      )}

      {/* 底部字幕 / 歌词安全区（严格位于底部 15% 区域 y >= 915px / 1080p） */}
      {activeScreen && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 34,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          {mode === 'lyric-mv' ? (
            <div
              style={{
                padding: '12px 34px',
                borderRadius: 999,
                backgroundColor: 'rgba(12, 24, 42, 0.62)',
                backdropFilter: 'blur(4px)',
                fontSize: 42,
                fontWeight: 900,
                letterSpacing: '2px',
              }}
            >
              <LyricCharPop
                text={activeScreen.text}
                start={activeScreen.start}
                end={activeScreen.end}
                t={t}
                charsTimed={activeScreen.chars_timed}
              />
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '12px 32px',
                borderRadius: 14,
                backgroundColor: 'rgba(9, 22, 54, 0.92)',
                border: '2.5px solid #48C8FF',
                boxShadow: '0 8px 22px rgba(0, 0, 0, 0.42)',
                maxWidth: 1560,
              }}
            >
              <span
                style={{
                  padding: '3px 12px',
                  borderRadius: 8,
                  backgroundColor: '#48C8FF',
                  color: '#081836',
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {speaker}
              </span>
              <span style={{ color: '#FFFFFF', fontSize: 36, fontWeight: 800, letterSpacing: '0.8px' }}>
                <LyricCharPop
                  text={activeScreen.text}
                  start={activeScreen.start}
                  end={activeScreen.end}
                  t={t}
                  charsTimed={activeScreen.chars_timed}
                />
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
