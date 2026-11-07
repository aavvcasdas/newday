import React from 'react';
import { clamp, backOut } from '../../engine/timeline_core.mjs';

function LyricCharPop({
  text,
  start,
  end,
  t,
  charsTimed = null,
  activeColor = '#FFF9EB',
  dimColor = '#C9D8E8',
}) {
  const chars = Array.from(text || '');
  const span = Math.max(0.2, (end ?? start + 1.8) - start);
  const step = Math.min(0.065, (span * 0.58) / Math.max(1, chars.length));

  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1px' }}>
      {chars.map((ch, idx) => {
        const timed = charsTimed?.[idx];
        const chStart = timed?.start ?? (start + idx * step);
        const age = t - chStart;
        const p = clamp(age / 0.22);
        const popScale = age < 0 ? 0.92 : backOut(p, 1.75);
        const active = age >= 0;
        return (
          <span
            key={idx}
            style={{
              display: 'inline-block',
              opacity: age < -0.04 ? 0.62 : clamp(0.68 + p * 0.32),
              transform: `translateY(${(active ? (1 - p) * 8 : 3).toFixed(1)}px) scale(${popScale.toFixed(3)})`,
              color: active ? activeColor : dimColor,
              textShadow: active ? '0 3px 12px rgba(8, 18, 34, 0.88)' : '0 1px 4px rgba(8, 18, 34, 0.55)',
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
 *   - Lyric MV 模式：常驻「非官方同人 / AI生成」角标 + 前半句/反转句双段逐字 backOut 弹入高亮
 *   - Day Episode 模式：Day2 风格说话人字幕条 + 开场钩子横幅 + 「非官方同人 · AI生成 · 剧情演绎」合规角标
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

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        fontFamily: 'NewdayNoto, Noto Sans CJK SC, PingFang SC, sans-serif',
      }}
    >
      {/* 常驻合规角标（Day 系列与同人 MV 全程开启） */}
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

      {/* 底部字幕 / 歌词安全区（严格位于底部安全带，绝不遮挡人物五官与主道具） */}
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                padding: '12px 38px',
                borderRadius: 999,
                backgroundColor: 'rgba(11, 23, 41, 0.78)',
                border: '2px solid rgba(255, 236, 179, 0.42)',
                boxShadow: '0 8px 26px rgba(0, 0, 0, 0.38)',
                fontSize: 42,
                fontWeight: 900,
                letterSpacing: '2px',
                maxWidth: 1680,
              }}
            >
              {activeScreen.top && activeScreen.bottom ? (
                <>
                  <LyricCharPop
                    text={activeScreen.top}
                    start={activeScreen.vocalStart ?? activeScreen.start}
                    end={activeScreen.pivot ?? (activeScreen.start + activeScreen.end) * 0.5}
                    t={t}
                    activeColor="#FFFDF7"
                  />
                  <span style={{ color: 'rgba(255, 224, 130, 0.55)', fontSize: 32 }}>·</span>
                  <LyricCharPop
                    text={activeScreen.bottom}
                    start={activeScreen.pivot ?? (activeScreen.start + activeScreen.end) * 0.5}
                    end={activeScreen.end}
                    t={t}
                    activeColor="#FFE082"
                    dimColor="#D9D2BE"
                  />
                </>
              ) : (
                <LyricCharPop
                  text={activeScreen.text}
                  start={activeScreen.vocalStart ?? activeScreen.start}
                  end={activeScreen.end}
                  t={t}
                  charsTimed={activeScreen.chars_timed}
                />
              )}
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
