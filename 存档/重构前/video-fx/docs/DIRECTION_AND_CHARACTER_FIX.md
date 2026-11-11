# Direction & Whale Maid Girl Fix

This correction pass implements the user's scope before rebuilding **one** MV only. The other videos must not be regenerated unless explicitly requested.

## What the references contribute

- **JohnHeibel/PDoomVideo**: beat-aware chapter direction, staged anticipation/action/follow-through, motivated camera reframing, pose-specific acting, and full environments instead of character cards. Learn its directing grammar; do not import Clawd or the Researcher into this film.
- **lemomo-ai/lemo-opuscar**: one timeline drives cuts, action, sound and subtitles; use animated environments, varied framing, action-linked details, and a deliberate visual medium. Its many style demos are references, not an invitation to change the protagonist or assemble a cast.
- **YunYueSama/codex-deepseek-pet** and **roseion/dsh-dayu-fish-skin**: refine the existing sole protagonist's DeepSeek whale-maid identity: blue whale tail and fin ears, wave ahoge, blue ear bows, navy-and-white maid dress, whale-marked white apron, gold skirt embroidery, and action acting informed by walking, sleep/wake, jump/land, wave, work, eat, sneak, dance, and multi-stage story poses. `drawFatFish` is a dedicated, occasional action gag, not an always-present companion.

Reference URLs:
- https://github.com/JohnHeibel/PDoomVideo
- https://github.com/lemomo-ai/lemo-opuscar
- https://github.com/YunYueSama/codex-deepseek-pet
- https://github.com/roseion/dsh-dayu-fish-skin

## Scope locks

1. The protagonist is **only the Whale Maid Girl**. Do not render Lady Gemini, Lady Claude, Clawd, bionic puppy, mini whale, or other co-stars in this replicated MV. Character modules may remain available elsewhere in the project.
2. Keep a single lead silhouette and the visual identity from the supplied character reference video; the two fish projects inform costume details and action vocabulary, not additional cast members.
3. Construct scenes as full environments with readable foreground/midground/background, motivated camera motion, moving atmosphere, physical props/gags, and changing character actions. No static character cards or repeated loops.
4. Keep subtitle and audio timing as previously verified. Do not alter/rebuild other MVs in this correction pass.
5. Render one video: `mv_ba_huiyi_pinhao_gei_ni_whale_girl.mp4` only. It remains the benchmark MV.

## Implemented in this correction pass

- Added whale-apron emblem, gold skirt details, and blue fin-ear bows to the articulated pixel rig; maintained connected walk legs and existing five-view rig.
- Routed action-engine underlays, overlays, and head transforms through the protagonist renderer; walking and sprinting now have ground contacts, dust, and speed streaks, while sleep has a small head-following breath motion.
- Removed permanent fish sidekick and every guest character from the benchmark shot renderer; the fat fish appears only during its own action.
- Removed action/cast/puzzle HUD clutter from the benchmark. Lyric captions remain the sole screen overlay.
- Kept the 28-action catalog and varied full environment set pool; rebuild and verify only the benchmark MV.
