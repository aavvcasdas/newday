import React from 'react';
import { clamp, backOut } from '../../engine/timeline_core.mjs';

function LyricCharPop({
  text,
  start,
  end,
  t,
  charsTimed = null,
  activeColor = '#FFF9EB',
  dimColor = 'rgba(220, 232, 245, 0.52)',
}) {
  const chars = Array.from(text || '');
  const span = Math.max(0.25, (end ?? start + 1.5) - start);
  // 按真实演唱时长均匀铺开逐字亮起节奏（覆盖本句前 78% 时长，留尾音稳定驻留）
  const step = (span * 0.78) / Math.max(1, chars.length);

  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2px' }}>
      {chars.map((ch, idx) => {
        const timed = charsTimed?.[idx];
        const chStart = timed?.start ?? (start + idx * step);
        const age = t - chStart;
        const p = clamp(age / 0.16);
        const popScale = age < 0 ? 0.94 : backOut(p, 1.65);
        const active = age >= 0;
        return (
          <span
            key={idx}
            style={{
              display: 'inline-block',
              opacity: active ? 1 : 0.58,
              transform: `translateY(${(active ? (1 - p) * 6 : 2).toFixed(1)}px) scale(${popScale.toFixed(3)})`,
              color: active ? activeColor : dimColor,
              textShadow: active ? '0 3px 12px rgba(8, 18, 34, 0.92)' : '0 1px 4px rgba(8, 18, 34, 0.5)',
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
 *   - Lyric MV 模式：分前半句（立典故）与后半句（反转梗）严格按演唱帧轴切换，逐字按真实唱速亮起，不提前剧透包袱
 *   - Day Episode 模式：Day2 风格说话人字幕条 + 开场钩子横幅 + 合规角标
 */
export function LyricAndSubtitleLayer({
  mode = 'day-episode',
  screens = [],
  cues = [],
  speaker = '本鲸',
  opener = null,
  complianceBadge = null,
  planningPreview = false,
  t = 0,
}) {
  const activeScreen = screens.find((s) => t >= s.start && t < s.end)
    || cues.find((c) => t >= c.start && t < c.end)
    || null;

  const badgeText = complianceBadge ?? (mode === 'lyric-mv' ? '非官方同人 / AI生成' : '非官方同人 · AI生成 · 剧情演绎');

  const renderMvPhrase = () => {
    if (!activeScreen) return null;
    if (activeScreen.top && activeScreen.bottom && activeScreen.pivot != null) {
      const inPunchline = t >= activeScreen.pivot;
      const phraseStart = inPunchline ? activeScreen.pivot : (activeScreen.vocalStart ?? activeScreen.start);
      const phraseEnd = inPunchline ? activeScreen.end : activeScreen.pivot;
      const phraseText = inPunchline ? activeScreen.bottom : activeScreen.top;
      const pillPop = backOut(clamp((t - phraseStart) / 0.18), 1.35);

      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '12px 42px',
            borderRadius: 999,
            backgroundColor: inPunchline ? 'rgba(18, 25, 44, 0.86)' : 'rgba(11, 23, 41, 0.80)',
            border: inPunchline ? '2.5px solid rgba(255, 214, 102, 0.78)' : '2px solid rgba(186, 224, 255, 0.48)',
            boxShadow: '0 8px 26px rgba(0, 0, 0, 0.42)',
            fontSize: 46,
            fontWeight: 900,
            letterSpacing: '2.5px',
            transform: `scale(${pillPop.toFixed(3)})`,
            maxWidth: 1640,
          }}
        >
          <LyricCharPop
            text={phraseText}
            start={phraseStart}
            end={phraseEnd}
            t={t}
            activeColor={inPunchline ? '#FFE066' : '#FFFDF7'}
          />
        </div>
      );
    }

    return (
      <div
        style={{
          padding: '12px 40px',
          borderRadius: 999,
          backgroundColor: 'rgba(11, 23, 41, 0.82)',
          border: '2px solid rgba(255, 236, 179, 0.45)',
          boxShadow: '0 8px 26px rgba(0, 0, 0, 0.38)',
          fontSize: 44,
          fontWeight: 900,
          letterSpacing: '2px',
          maxWidth: 1640,
        }}
      >
        <LyricCharPop
          text={activeScreen.text}
          start={activeScreen.vocalStart ?? activeScreen.start}
          end={activeScreen.end}
          t={t}
          charsTimed={activeScreen.chars_timed}
        />
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        fontFamily: 'NewdayNoto, Noto Sans CJK SC, PingFang SC, sans-serif',
      }}
    >
      {/* 常驻合规角标 */}
      {badgeText && (
        <div
          style={{
            position: 'absolute',
            right: 42,
            top: 22,
            padding: '7px 20px',
            borderRadius: 999,
            backgroundColor: 'rgba(12, 25, 46, 0.78)',
            border: '1.5px solid rgba(196, 224, 245, 0.35)',
            color: '#E2EEF5',
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: '0.8px',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
          }}
        >
          {badgeText}
        </div>
      )}

      {/* Day 系列开场顶部钩子横幅 */}
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

      {/* 底部字幕 / 歌词安全区 */}
      {activeScreen && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 28,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          {mode === 'lyric-mv' ? (
            renderMvPhrase()
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
