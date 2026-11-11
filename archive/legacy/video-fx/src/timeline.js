// src/timeline.js — Chapter registry, style resolver, HUD, and subtitle compositor.
// Modeled directly on JohnHeibel/PDoomVideo (src/timeline.js) and ClaudeAnimationBase.

(function (root) {
  const CORE = root.CORE || (typeof require !== 'undefined' ? require('./core.js') : {});
  const LYRICS = root.LYRICS || (typeof require !== 'undefined' ? require('./lyrics.js') : {});
  const PROPS = root.PROPS || (typeof require !== 'undefined' ? require('./props.js') : {});
  const CAST = root.CAST || (typeof require !== 'undefined' ? require('./cast.js') : {});

  const {
    W, H, clamp, reseedBoil, resolveStyle, setActiveStyle, applyMediumOverlay
  } = CORE;

  const CH = [];
  function chapter(name, start, end, shots) {
    const idx = CH.findIndex(c => c.name === name);
    if (idx >= 0) CH.splice(idx, 1);
    CH.push({ name, start, end, shots });
    CH.sort((a, b) => a.start - b.start);
  }

  function renderFrame(ctx, t, requestedStyle = 'pixel', o = {}) {
    t = clamp(t, 0, CORE.DURATION);
    reseedBoil(t);

    const activeStyle = resolveStyle(requestedStyle, t);
    setActiveStyle(activeStyle);

    if (o.viewMode && o.viewMode !== 'mv') {
      CAST.renderCharacterSheet(ctx, t, o.viewMode, activeStyle);
      return;
    }

    const ch = CH.find(c => t >= c.start && t < c.end) || CH[CH.length - 1];
    if (ch && ch.shots && ch.shots.length) {
      let i = 0;
      while (i + 1 < ch.shots.length && t >= ch.shots[i + 1][0]) i++;
      const t0 = ch.shots[i][0];
      const tEnd = (i + 1 < ch.shots.length) ? ch.shots[i + 1][0] : ch.end;
      ch.shots[i][1](ctx, t, t - t0, tEnd - t0, activeStyle);
    }

    applyMediumOverlay(ctx, activeStyle);

    if (!o.hideHud) {
      PROPS.drawTopHud(ctx, t, activeStyle);
    }
    if (!o.hideSubtitles) {
      LYRICS.drawSubtitleBar(ctx, t, activeStyle);
    }
  }

  const TIMELINE = {
    CH,
    chapter,
    renderFrame
  };

  root.TIMELINE = TIMELINE;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TIMELINE;
  }
})(typeof window !== 'undefined' ? window : globalThis);
