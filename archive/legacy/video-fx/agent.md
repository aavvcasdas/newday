# AGENT.md — DeepSeek Whale Maid Girl (`深海鲸鱼娘`) Animation & MV Engine

This repository implements a deterministic 30fps HTML5 Canvas + Node (`@napi-rs/canvas` + `ffmpeg`) character animation and music-video production studio, modeled after:
- **[JohnHeibel/PDoomVideo](https://github.com/JohnHeibel/PDoomVideo)** & **[JohnHeibel/ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase)**
- **[tuzhechen2005/opus-video-skills](https://github.com/tuzhechen2005/opus-video-skills)**
- **[YunYueSama/codex-deepseek-pet](https://github.com/YunYueSama/codex-deepseek-pet)** (`你这只吃白饭的蓝色大肥鱼.jpg` desktop pet action & story system)
- **[roseion/dsh-dayu-fish-skin](https://github.com/roseion/dsh-dayu-fish-skin)** (`🐟 DSH 大肥鱼皮肤：吃白饭的蓝色大肥鱼可爱主题`)

---

## 1. Project Architecture & Core Modules

| File / Directory | Purpose |
|---|---|
| `src/core.js` | Deterministic math (`clamp`, `lerp`, `seg`, `ease`, `easeIn`, `easeOut`, `backOut`, `kf`, `arcPt`), hand-drawn line boil (`setBoil`, `boilFrame`), camera rig (`camBegin`, `camEnd`, `toScreen`, `shakeXY`), and theatrical transitions (`iris`, `curtains`, `brushWipe`, `smokeWipe`, `spotDark`). |
| `src/whale_girl_rig_data.js` | **7-Bone Articulated `104×102` Pixel-Grid Rig** (`WHALE_GIRL_PIXEL_RIG`) extracted from `42868804351-1-192.mp4`, with 5 canonical poses (`wave`, `wink`, `panic`, `laptop`, `heart`), 5 dense perspective-warped turnaround views (`front`, `q`, `side`, `qback`, `back`), unified non-split legs (`legL: gx = -10..-4`, `legR: gx = 7..15` extended to `gy = -21`), and 16-bit cast sprites (`ladyClaude`, `ladyGemini`, `researcher`). |
| `src/whale_girl_actions.js` | **28-Action Character Choreography, Prop & Story Micro-Drama Engine** (`WHALE_ACTIONS`) integrating all actions, props, physics, and 4-stage story animations from `YunYueSama/codex-deepseek-pet` and `roseion/dsh-dayu-fish-skin`, plus `drawFatFish()` (`吃白饭的蓝色大肥鱼` Q-version companion/transformation). |
| `src/whale_girl.js` | Protagonist renderer `whaleGirl(ctx, x, y, u, opts)`, 31 acted emotions (`EMO` + `feel()`), smooth multi-stage emotion transition engine (`emotions(t, keys, opts)`), 28 rich physical actions (`opts.action`), locomotion helpers (`move`, `turn`, `spinView`), 13 hats (`HATS`), and 16-bit overhead emotes (`EMOTES`). |
| `src/cast.js` | Full 8-character cast (`whaleGirl`, `ladyClaude`, `ladyGemini` (`双子星 Gemini 大小姐`), `clawd`, `researcher`, `agentReachBot`, `miniWhale`, `bionicPuppy`, `biliTvMascot`) and model sheet generators (`renderEmotionsSheet`, `renderViewsSheet`, `renderCharacterSheet`, `renderActionsSheet`). |
| `src/mv_ba_huiyi_pinhao_gei_ni.js` | **Benchmark Multi-Set Storyboard Director** for 《椰子水很甜 - 把回忆拼好给你（纯享Beat）》 (`142.11s`), featuring non-repeating bespoke painted environments per shot, 28 `codex-deepseek-pet` / `dsh-dayu-fish-skin` character actions, 31-emotion transitions, and 100% acoustically aligned lyrics (`0.24s–142.11s`). |
| `src/mv_pengyou_de_jiu.js` | 《李晓杰 - 朋友的酒》 `188.25s` MV director (`mv_pengyou_de_jiu_whale_girl.mp4`) with 100% authentic `.lrc` timestamps (`[00:18.31] 昨日一去不复回哦也` through `[03:06.16] 就像朋友的这杯烈酒烫我心上`). |
| `src/mv_chaoxi.js` | 《傅梦彤 - 潮汐》 `31.84s` MV director (`mv_chaoxi_whale_girl.mp4`) rebuilt with non-repeating multi-set ocean/sunset/abyss scenes, rich `whaleGirl` actions, and 100% audio-verified lyrics (`当海面迎来汹涌的潮汐` -> `退守的爱情`). |
| `src/mv_douyin_6.js` | 《仿生小狗》(深海鲸鱼娘·年糕篇) `46.70s` MV director (`mv_douyin_6_whale_girl.mp4`) upgraded with non-repeating bespoke sets per shot and rich physical actions. |
| `src/mv_qunian_xiatian.js` | 《去年夏天》 `78.20s` MV director (`mv_qunian_xiatian_whale_girl.mp4`). |
| `src/mv_pack_short.js` | **5 Short MVs Replicated from `mv/`** (`ba_huiyi_56`, `lianai_ing`, `jimo_yanhuo`, `xinqiang`, `ribuluo`) rebuilt on the `mv_ba_huiyi_pinhao_gei_ni` non-repeating multi-set architecture with 28 character actions and prominent bottom karaoke subtitles on every MV (including `mv_lianai_ing_whale_girl.mp4`). |
| `src/mv_pack_long.js` | **4 Full-Length MVs Replicated from `mv/`** (`huainvhai`, `feng`, `meiguihua`, `suyan`) rebuilt on the `mv_ba_huiyi_pinhao_gei_ni` non-repeating multi-set architecture with 28 character actions, rich scene details, and `[他]/[她]/[合]` karaoke sweeps. |

---

## 2. Recorded MV Issue Audit Log & Remediation Status (`问题记录清单与修复验证`)

> Per user directive (`将以下问题先进行记录然后更新项目动作之后在进行修复`), all MV issues audited across the repository were formally recorded first, followed by upgrading the project action system (`src/whale_girl_actions.js`, 28 actions + `drawFatFish`) and rebuilding + re-rendering all MVs (`✅ 已全部修复并重新渲染验证`):

### 2.1 Benchmark & Subtitle/Action Issues in Root MVs

1. **`mv_ba_huiyi_pinhao_gei_ni_whale_girl.mp4` (`src/mv_ba_huiyi_pinhao_gei_ni.js`, `142.11s`) — ✅ 已修复并重新渲染验证**
   - **Audit**: Best overall visual/structural benchmark (`明确是最好的动作什么的都是... 唯一一个场景不重复的`), and all other MVs must reference how this MV builds unique non-repeating scenes per shot (`其他的参考下mv_ba_huiyi_pinhao_gei_ni_whale_girl.mp4是如何作的`).
   - **Recorded Issues**:
     1. **Lyrics and subtitles do not match the audio (`歌词和字幕不匹配`)**: Previously used invented intro prose (`0–20s`) and Verse 1 lyrics that did not match the actual vocal arrangement of `椰子水很甜 - 把回忆拼好给你（纯享Beat）.mp3`.
     2. **Too few distinct character actions (`但是动作太少了`)**: Characters mostly walked or bobbed in place without rich prop/story actions.
   - **Implemented Fix**:
     - Aligned all 56 bar-synced cues (`BAR_T(0..55)`, `1 bar = 2.5304s`) to the exact Vosk + RMS verified vocal structure of `椰子水很甜 - 把回忆拼好给你（纯享Beat）.mp3`:
       - `Bars 00–07 (0.20s–20.66s)`: Verse 2A (`那天你在雨后街角答应接受我的爱` -> `我已经不再期待其他什么东西`).
       - `Bars 08–15 (20.66s–40.90s)`: Verse 2B (`我们也经常争执互相不接电话` -> `寂寞时让我把快乐拼起来吧`).
       - `Bars 16–23 (40.90s–61.14s)`: Chorus 1 (`我们之间的回忆 全部都小心地收集` -> `把回忆拼好给你`).
       - `Bars 24–31 (61.14s–81.39s)`: Chorus 2 (`独自收集两个人之间的回忆` -> `祝你余生动听啊`).
       - `Bars 32–39 (81.39s–101.63s)`: Instrumental Bridge (`间奏 · 蓝色大肥鱼与星海剧场`).
       - `Bars 40–47 (101.63s–121.87s)`: Verse 2A Reprise (`那天你在雨后街角答应接受我的爱` -> `我已经不再期待其他什么东西`).
       - `Bars 48–55 (121.87s–142.11s)`: Verse 2B Reprise (`我们也经常争执互相不接电话` -> `寂寞时让我把快乐拼起来吧`).
     - Expanded `MASTER_SET_POOL` to **28 distinct painted environments** + 7 atmospheric variants, exported `renderMasterMVShot(ctx, t, opts)` for all other MVs to share, and choreographed all **28 `codex-deepseek-pet` & `dsh-dayu-fish-skin` actions** + `drawFatFish` across the 56 shots.

2. **`mv_pengyou_de_jiu_whale_girl.mp4` (`src/mv_pengyou_de_jiu.js`, `188.25s`) — ✅ 已修复并重新渲染验证**
   - **Audit**: Visuals are good, but lyrics and subtitles do not match the audio (`画面不错但是歌词和字幕不匹配`).
   - **Recorded Issues**:
     - Previously mixed in lyrics from 刀郎《永远的兄弟》 (`人生几何能够得到知己...`) at `16.2s–32.2s` and truncated long lines inside `drawSubtitle`.
   - **Implemented Fix**:
     - Replaced `SUBTITLES` with the exact 33 Vosk-verified official `.lrc` cues of **李晓杰《朋友的酒》** (`[00:18.31] 昨日一去不复回 哦也` through `[03:06.16] 就像朋友的这杯烈酒烫我心上`), fixed `drawSubtitle` to display the full lyric line with a progressive golden karaoke sweep, replaced `CAST.researcher` with `CAST.ladyGemini`, and wired all 28 character actions + `drawFatFish`.

3. **`mv_chaoxi_whale_girl.mp4` (`src/mv_chaoxi.js`, `31.84s`) — ✅ 已修复并重新渲染验证**
   - **Audit**: Both visuals and subtitles are poor / mismatched (`mv_chaoxi_whale_girl.mp4不好甚至字幕对不上`).
   - **Recorded Issues**:
     - Subtitles came from a different song (`枯树还没发芽 就被逼着开花...`) and visuals used a repetitive dark grid.
   - **Implemented Fix**:
     - Replaced lyrics with the exact 11 Vosk-verified cues (`0.30s–31.84s`) of **傅梦彤《潮汐》** (`当海面迎来汹涌的潮汐` -> `退守的爱情`), and rebuilt all 11 shots on `MV_BA_HUIYI.renderMasterMVShot` with 11 non-repeating coastal/sunset/abyss sets, 11 distinct actions, `drawFatFish`, and `ladyGemini`.

### 2.2 Scene Repetition, Detail Deficit & Subtitle Issues Across the Remaining MVs

4. **`mv_ba_huiyi_56_whale_girl.mp4` (`src/mv_pack_short.js` `ba_huiyi_56`, `56.03s`) — ✅ 已修复并重新渲染验证**
   - **Audit**: Rated the worst MV (`mv_ba_huiyi_56_whale_girl.mp4是最垃圾的`).
   - **Recorded Issues**: Used a flat background with a small character and floating tiles instead of rich full-screen environments and expressive character acting.
   - **Implemented Fix**: Completely rebuilt `renderBaHuiyi56Frame` on `MV_BA_HUIYI.renderMasterMVShot` with 20 non-repeating painted sets, 20 distinct `codex-deepseek-pet` / `dsh-dayu-fish-skin` actions, `drawFatFish`, `ladyGemini`, top ransom-note puzzle tiles, and bottom karaoke subtitles.

5. **`mv_lianai_ing_whale_girl.mp4` (`src/mv_pack_short.js` `lianai_ing`, `54.73s`) — ✅ 已修复并重新渲染验证**
   - **Audit**: Loops a few scenes with too few details AND has no bottom subtitles (`mv_lianai_ing_whale_girl.mp4也是并且没有字幕`).
   - **Recorded Issues**: Only rendered a single static rooftop scene and lacked a bottom MV subtitle bar.
   - **Implemented Fix**: Split into 19 dense shots (`~2.8s` per shot), rendered every shot on a distinct non-repeating set via `MV_BA_HUIYI.renderMasterMVShot` with 19 character actions + `drawFatFish` + `L-O-V-E` neon letters, and added a prominent bottom karaoke subtitle bar on every frame.

6. **`mv_douyin_6_whale_girl.mp4`, `mv_jimo_yanhuo_whale_girl.mp4`, `mv_xinqiang_whale_girl.mp4`, `mv_ribuluo_whale_girl.mp4`, `mv_feng_whale_girl.mp4`, `mv_huainvhai_whale_girl.mp4`, `mv_meiguihua_de_zangli_whale_girl.mp4`, `mv_suyan_whale_girl.mp4` — ✅ 已修复并重新渲染验证**
   - **Audit**: Loop only a few scenes repeatedly with too few environmental details and character actions (`拉一直循环几个画面细节太少`).
   - **Implemented Fix**:
     - Upgraded all 8 MVs (`src/mv_douyin_6.js`, `src/mv_pack_short.js`, `src/mv_pack_long.js`) to use `MV_BA_HUIYI.renderMasterMVShot` / `drawMasterEnvironment` (28 non-repeating painted sets + 7 atmospheric variants), 28 `codex-deepseek-pet` / `dsh-dayu-fish-skin` actions, `drawFatFish`, `ladyGemini`, and continuous shot advancement during instrumental bridges.

---

## 3. Character Action & Prop System (`src/whale_girl_actions.js`)

Referenced from **[YunYueSama/codex-deepseek-pet](https://github.com/YunYueSama/codex-deepseek-pet)** and **[roseion/dsh-dayu-fish-skin](https://github.com/roseion/dsh-dayu-fish-skin)**:

### 3.1 Signature DeepSeek Pet & Fat-Fish Actions (28 Named Actions)

| # | Action ID | Name / Reference Source | Kinematics, Props & Visual Effects |
|---|---|---|---|
| 1 | `eat_white_rice` | **吃白饭 (`你这只吃白饭的蓝色大肥鱼`)** (`dsh-dayu-fish-skin` `character-sheet.webp` / `codex-deepseek-pet` `meal-break`) | Holds giant overflowing white rice bowl with blue whale emblem + moving chopsticks, puffed chewing cheeks, rice grain on cheek, steam puffs, `"我不是吃白饭的！"` badge. |
| 2 | `eat_onigiri` | **啃海苔大饭团** (`codex-deepseek-pet` `eat` / `story-meal`) | 4-phase (`reach -> lift -> bite -> chew`) holding giant triangular nori onigiri (`🍙`), happy closed eyes, flying rice crumbs. |
| 3 | `coin_hug` | **抱大金币 (`爱金币的小肥鱼`)** (`dsh-dayu-fish-skin` `character-sheet.webp` & `fatfish-success`) | Cradles giant gleaming gold whale coin (`🪙 ¥`), star-eyes, orbiting gold coins and `+100 金币` popups. |
| 4 | `hum_working_song` | **哼唱工作歌 (`Let me go~`)** (`codex-deepseek-pet` `01-working-song.png` & `story-hum`) | 4-stage story micro-drama (`prepare -> hum -> notice -> recover`): clasps hands singing `"Let me go~"` with music notes, gets pointed at (`"你怎么唱起歌来了"`), blushes in shock, and shyly recovers. |
| 5 | `token_wordle_sneak` | **偷吃Token / 玩中文Wordle** (`codex-deepseek-pet` `03-token-wordle-comic.png` & `story-token`) | 3-stage story micro-drama (`sneak -> puzzle -> caught`): sneaks glowing blue `TOKEN` candy from dispenser, plays 5×5 `Wordle` grid, startled by red alert (`⚠️ 这、这是性能测试！`). |
| 6 | `drag_ahoge` | **拎海浪呆毛悬空** (`codex-deepseek-pet` `drag`) | Suspended mid-air by cursor hand pinching her wave-shaped ahoge (`呆毛`), flailing arms and kicking legs (`"呆毛！别碰歪了！"`). |
| 7 | `sleep_curl` | **蜷尾侧睡流口水** (`codex-deepseek-pet` `inbetween-sleep` & `dsh-dayu-fish-skin` `whale-sleepy`) | Curled on her plump blue whale tail pillow, snot/sleep bubble expanding and contracting, floating `Zzz` + dream bubble of white rice. |
| 8 | `wake_stretch` | **睡醒伸懒腰** (`codex-deepseek-pet` `wake` & `stretch`) | Rubs eyes, arches back raising both arms high overhead with yawning/refreshed expression. |
| 9 | `ciallo_wink` | **Ciallo~(∠・ω< )⌒☆ 比耶眨眼** (`codex-deepseek-pet` `01-ciallo-wink.png`) | Head tilt 12°, right hand V-peace sign (`✌️`) by cheek, crisp wink, rainbow star arc `Ciallo~☆`. |
| 10 | `playful_fists` | **双拳傲娇抗议 (`智械危机放你一马`)** (`codex-deepseek-pet` `02-playful-retort.png` & `protest`) | Puffed pout cheeks, dual clenched fists bobbing in front of chest, alternating foot stomp, angry steam puffs. |
| 11 | `confident_hips` | **叉腰得意小肥鱼** (`codex-deepseek-pet` `03-confident-tease.png` & `proud`) | Both hands on hips, proud chest bounce, smug wink (`"可爱的小肥鱼"`), golden sparkle aura. |
| 12 | `idol_mic_sing` | **双手张开握麦高歌** (`codex-deepseek-pet` `04-open-arms-cheer.png`) | Vintage stage mic in right hand, left arm flung open, rhythmic singing with soundwave rings. |
| 13 | `fatfish_working` | **狂敲代码打工鱼 (`要努力才有饭吃！`)** (`dsh-dayu-fish-skin` `fatfish-working-0..5` & `whale-review`) | Leans over glowing laptop + mechanical keyboard, rapid typing motion blur, flying `JSON`/`CODE` particles and sweat drops. |
| 14 | `fatfish_transform` | **召唤/变身吃白饭蓝色大肥鱼** (`dsh-dayu-fish-skin` `fatfish-idle` / `fatfish-hover`) | Summons chubby round blue whale-fish (`drawFatFish`) bouncing in water splashes with maid headband and rice bowl! |
| 15 | `tail_wag_dance` | **摇尾欢快偶像舞步** (`codex-deepseek-pet` `dance` & `story-tail`) | 4-beat idol step-clap-sway with huge sweeping whale tail and flapping fin ears. |
| 16 | `jump_joy` | **蓄力高跳摘星** (`codex-deepseek-pet` `jump` & `land`) | 4-phase (`prepare -> airborne -> compress -> recover`) parabolic jump catching a glowing star/heart. |
| 17 | `peek_curious` | **探头放大镜观察** (`codex-deepseek-pet` `peek` / `review` & `whale-curious`) | Leans forward 22° holding giant magnifying glass with sparkling curious eyes and floating `?`. |
| 18 | `shy_fidget` | **害羞对手指扭捏** (`dsh-dayu-fish-skin` `whale-shy` & `codex-deepseek-pet` `sorry`) | Pigeon-toed stance, index fingers poking together (`👉👈`), rosy blush, tail curling shyly. |
| 19 | `shock_petrify` | **石化震惊掉下巴** (`codex-deepseek-pet` `shock` & `whale-surprised`) | Vertical grey petrification lines, hands on cheeks, ahoge standing straight up like a lightning rod. |
| 20 | `cry_fountain` | **暴风哭泣喷泉泪** (`codex-deepseek-pet` `sad` & `dsh-dayu-fish-skin` stickers) | Dual anime waterfall tear-fountains arcing from eyes into a puddle with a floating mini-whale. |
| 21 | `toast_cheers` | **举杯畅饮碰杯** (`《朋友的酒》` / Tavern & Banquet scenes) | Raises foaming golden mug with splashing droplets and warm lantern sparkles. |
| 22 | `umbrella_stroll` | **撑鲸鱼伞漫步听雨** (`《把回忆拼好给你》《心墙》《枫》`) | Holds translucent sky-blue whale umbrella over shoulder while catching raindrops with free hand. |
| 23 | `camera_shutter` | **举拍立得定格拼图** (`《把回忆拼好给你》《去年夏天》《日不落》`) | Snaps retro polaroid camera with shutter flash and floating memory puzzle pieces. |
| 24 | `guitar_strum` | **抱鲸鱼木吉他弹唱** (`《恋爱ing》《寂寞烟火》《素颜》`) | Strums whale-shaped guitar strapped across apron with glowing chord rings. |
| 25 | `rose_bouquet` | **捧红玫瑰凝望落瓣** (`《玫瑰花的葬礼》《坏女孩》`) | Cradles crimson rose bouquet with wind-blown falling petals. |
| 26 | `sparkler_firework` | **挥舞双仙女棒烟花** (`《寂寞烟火》《把回忆拼好给你》`) | Waves two blazing golden sparklers in figure-8 light trails. |
| 27 | `walk_brisk` | **16帧轻快迈步走** (`codex-deepseek-pet` `inbetween-walk`) | Full-body articulated walk gait with opposite arm-leg swing and tail counter-balance. |
| 28 | `run_sprint` | **全力冲刺奔跑** (`dsh-dayu-fish-skin` `whale-run-left`/`right`) | Forward-leaning sprint (`rot=0.18`), high knee lift, speed lines and dust puffs. |

---

## 4. CLI Rendering Commands

```bash
# 1. Regenerate all character model sheets including 28-action sheet (docs/actions.png & characters/whale_girl_actions_sheet.png)
node render.mjs --sheets

# 2. Render 《把回忆拼好给你》 (142.11s benchmark MV)
node render_ba_huiyi_pinhao_gei_ni.mjs

# 3. Render 《朋友的酒》 (188.25s), 《潮汐》 (31.84s), 《仿生小狗》 (46.70s), 《去年夏天》 (78.20s)
node render_pengyou_de_jiu.mjs
node render_chaoxi.mjs
node render_douyin_6.mjs
node render_qunian_xiatian.mjs

# 4. Render all 9 MVs in mv/ (ba_huiyi_56, lianai_ing, jimo_yanhuo, xinqiang, ribuluo, huainvhai, feng, meiguihua, suyan)
node render_mv_folder.mjs all
node render_mv_folder.mjs sheet
```

## 5. User correction: single protagonist, directed scenes, one rebuild

See [`docs/DIRECTION_AND_CHARACTER_FIX.md`](docs/DIRECTION_AND_CHARACTER_FIX.md) for the reference review, scope locks, and this correction's implementation. Key correction: the benchmark MV now renders Whale Maid Girl alone; cast modules are not placed in the film, and `drawFatFish` is limited to its dedicated action rather than appearing in every shot. The character rig has added whale-apron, gold hem, and blue fin-ear bow details inspired by the two fish references. The benchmark renderer keeps only lyric subtitles and removes cast/action/puzzle HUD clutter. This pass rebuilds only `mv_ba_huiyi_pinhao_gei_ni_whale_girl.mp4`; other MVs remain untouched.

**Single-MV verification (2026-10-24):** rebuilt only `mv_ba_huiyi_pinhao_gei_ni_whale_girl.mp4` at 1280×720, 30 fps, 142.10s; decoded all 4,263 H.264 frames and AAC audio. The benchmark render path contains no co-star drawing calls. Only the benchmark storyboard and locomotion review sheet were regenerated alongside that one MP4. No other MV was rendered or modified.

## 6. Selected continuation: 《潮汐》 only

The user has now requested a focused rerender of exactly two videos: `mv_chaoxi_whale_girl.mp4` and `mv_pengyou_de_jiu_whale_girl.mp4`; no other MVs. For 《潮汐》, lyric cue onsets remain Vosk-verified, props sourced from the shared shot plan are disabled, intrusive hand-prop actions are replaced with clear gestures, and the lead is enlarged with a reduced whale-tail footprint. For 《朋友的酒》, the heroine is the solo lead, enlarged, and the mug props are staged at the far table edges; extra cast, the extra fat-fish sprite, and the top-right HUD badge are removed. Both storyboards are regenerated and approved internally; MP4 rerenders and media validation remain to be completed.
