# 《椰子水很甜 - 把回忆拼好给你（纯享Beat）》 — 56-Shot Storyboard & Emotion Arc

## 1. Audio & Beat-Sync Specification
- **Audio Source**: `椰子水很甜 - 把回忆拼好给你（纯享Beat）.mp3` (`320 kbps`, `44.1 kHz`, stereo)
- **Envelope Module**: `assets/ba_huiyi_pinhao_gei_ni_audio.js`
- **Duration**: `142.11s` (`4263` frames @ `30 fps`, `1280×720`)
- **Tempo**: `94.85 BPM` (`1 beat = 0.6326s`, `1 bar = 4 beats = 2.5304s`, `first downbeat OFF = 0.415s`)
- **Shot Density**: **56 Storyboard Shots** (`1 shot per bar = 2.5304s`), plus intra-shot focus pulls on Chorus/Coda bars.
- **Lyric Attribution**: Authentic lyrics of **《把回忆拼好给你》** (作词：童子-T / Shingo.S / 一只然).

## 2. Character Rig, Cast & 31-Emotion Transition Engine
- **Protagonist**: `whaleGirl` (`src/whale_girl_rig_data.js` + `src/whale_girl.js`), 7-bone articulated pixel-grid rig (`backHair`, `tail`, `legL`, `legR`, `torso`, `armR`, `head`) with unified non-split legs (`legL: gx = -10..-4`, `legR: gx = 7..15`, extended up to `gy = -21` under the skirt hem) and 5 dense perspective-warped turnaround views (`front`, `q`, `side`, `qback`, `back`).
- **Guest Co-Stars (`src/cast.js`)**:
  - **`ladyGemini` (`双子星 Gemini 大小姐`)**: Astral twin-tailed AI noblewoman with golden 4-point star tiara, cyan/magenta dual-tone twin-tails, and heterochromia eyes (`#38BDF8` & `#FACC15`).
  - **`ladyClaude` (`隔壁 Claude 大小姐`)**, **`clawd` (`Clawd 吉祥物`)**, **`miniWhale` (`深海小蓝鲸`)**, and **`bionicPuppy` (`仿生机械小狗`)**.
- **Seamless 31-Emotion Transitions (`WHALE.emotions(lt, [[0, emoA, emA], [0.85, emoB, emB], [1.70, emoC, emC]])`)**:
  - Every 2.53s shot transitions smoothly across **3 distinct emotions** from `characters/whale_girl_emotions_31.png`, with an anticipatory blink/squint (`squint`) over `[-0.08s .. +0.15s]`, a squash-and-stretch reaction `take`, interpolated head tilt, and `backOut` overhead emote pop.

## 3. Bar-by-Bar 56-Shot Table (`0.00s – 142.11s`)

| Shot / Bar | Time (`s`) | Set | Action & Props | 3-Stage Emotion Arc | Authentic Lyric (`zh`) |
|---|---|---|---|---|---|
| **S01 (B00)** | `0.20–2.95` | Starlit Beach | `walkRight` + Lantern | `idle -> curious -> sparkle` | 《把回忆拼好给你》 · 椰子水很甜 |
| **S02 (B01)** | `2.95–5.48` | Starlit Beach | `kneelPick` + Puzzle #1 | `curious -> gasp -> happy` | 词：童子-T / Shingo.S / 一只然 |
| **S03 (B02)** | `5.48–8.01` | Observatory | `tailSit` + StarJar + Lady Gemini | `think -> excited -> proud` | 深海鲸鱼娘 · 记忆拼图剧场 |
| **S04 (B03)** | `8.01–10.54` | Starlit Beach | `spinTurn` (5 views) + StarJar | `zen -> shy -> love` | 星光落在海面 泛起旧日涟漪 |
| **S05 (B04)** | `10.54–13.07` | Observatory | `walkLeft` + Puzzle #3 | `determined -> wink -> happy` | 拾起散落的碎片 拂去岁月微尘 |
| **S06 (B05)** | `13.07–15.60` | Observatory | `jumpJoy` + Crown + Lady Gemini | `sparkle -> laugh -> love` | 每一片微光 都藏着我们的曾经 |
| **S07 (B06)** | `15.60–18.13` | Sunset Station | `walkRight` + Lantern + Puppy | `sigh -> worry -> sad` | 晚风轻轻吹过 海边的旧站台 |
| **S08 (B07)** | `18.13–20.66` | Starlit Beach | `presentHeart` + Halo + Lady Gemini | `shy -> love -> determined` | 把散落的温柔 一一拼回你掌心 |
| **S09 (B08)** | `20.66–23.19` | Observatory | `walkRight` + Puzzle #1 + Lady Gemini | `happy -> love -> shy` | 我们之间的回忆 |
| **S10 (B09)** | `23.19–25.72` | Observatory | `kneelPick` + StarJar + Puzzle #3 | `curious -> determined -> proud` | 全部都小心地收集 |
| **S11 (B10)** | `25.72–28.25` | Rain Bus Stop | `umbrellaStand` + Umbrella + Puppy | `sad -> cry -> plead` | 我总是偷偷地哭泣 |
| **S12 (B11)** | `28.25–30.78` | Clocktower | `runRight` (`smear`) + Origami Birds | `worry -> panicked -> sad` | 像倦鸟失了归期 |
| **S13 (B12)** | `30.78–33.31` | Cosmic Galaxy | `spinTurn` + Halo + Lady Gemini | `plead -> hope -> love` | 但愿我相信的爱情 |
| **S14 (B13)** | `33.31–35.84` | Cosmic Galaxy | `jumpJoy` + Crown + Lady Claude | `determined -> proud -> excited` | 结局紧握在我手心 |
| **S15 (B14)** | `35.84–38.37` | Clocktower | `walkLeft` + Lantern + Lady Gemini | `think -> zen -> happy` | 时光匆匆却没有遗失过去 |
| **S16 (B15)** | `38.37–40.90` | Observatory | `presentHeart` + Puzzle #1/#3 | `sparkle -> love -> wink` | 时光匆匆却没有遗失过去 |
| **S17 (B16)** | `40.90–43.43` | Dawn Hill | `walkRight` + Flower + Lady Gemini | `happy -> excited -> proud` | 希望我们 有光明的未来 |
| **S18 (B17)** | `43.43–45.96` | Starlit Beach | `jumpJoy` + Wizard Hat + StarJar | `sparkle -> gasp -> love` | 还有能够装下星空的期待 |
| **S19 (B18)** | `45.96–48.49` | Rain Bus Stop | `tailSit` + Rain Puddles | `bored -> sleepy -> sigh` | 可现实为何让我感到如此懈怠 |
| **S20 (B19)** | `48.49–51.02` | Autumn Ginkgo | `duetWalk` + LoveLetter + Lady Gemini | `shy -> happy -> love` | 总怀念相遇时我们无视落叶和人海 |
| **S21 (B20)** | `51.02–53.55` | Autumn Ginkgo | `jumpJoy` + Crown + Lady Claude | `scared -> determined -> proud` | 是你让我勇敢不再像颗尘埃 |
| **S22 (B21)** | `53.55–56.08` | Greenhouse | `waterBonsai` + Bonsai + WateringCan | `zen -> happy -> love` | 是你常帮我照料装着梦的盆栽 |
| **S23 (B22)** | `56.08–58.61` | Greenhouse | `spinTurn` + Cat Ears + Bonsai | `laugh -> wink -> excited` | 每一天我们都是如此愉快 |
| **S24 (B23)** | `58.61–61.14` | Sunset Station | `runRight` (`smear`) + Departing Train | `worry -> sad -> plead` | 一直到天色渐晚看着落日无奈离开 |
| **S25 (B24)** | `61.14–63.68` | Stamp Study | `tailSit` + StampAlbum + Lady Gemini | `curious -> laugh -> bored` | 我知道你爱集邮爱笑甚至爱发呆 |
| **S26 (B25)** | `63.68–66.21` | Firefly Forest | `runLeft` (`smear`) + Night Yokai | `scared -> shock -> panicked` | 我知道你怕草虫还有夜晚的妖怪 |
| **S27 (B26)** | `66.21–68.74` | Stamp Study | `walkRight` + StampAlbum + Lady Gemini | `confused -> shy -> smug` | 我喜欢你有一点心不在焉的状态 |
| **S28 (B27)** | `68.74–71.27` | Autumn Ginkgo | `jumpJoy` + Party Cone + StarJar | `mischief -> laugh -> excited` | 看起来像个回到七岁时候的小孩 |
| **S29 (B28)** | `71.27–73.80` | Starlit Beach | `presentHeart` + LoveLetter + Lady Gemini | `shy -> pout -> love` | 该如何将我这份感情向你告白 |
| **S30 (B29)** | `73.80–76.33` | Cosmic Galaxy | `spinTurn` + LoveLetter + StarJar | `worry -> gasp -> sparkle` | 喜欢却又不敢爱 直到整个宇宙 |
| **S31 (B30)** | `76.33–78.86` | Cosmic Galaxy | `runRight` (`smear`) + Puzzle #3 | `dizzy -> panicked -> determined` | 在为我焦虑失神慌张之中醒来 |
| **S32 (B31)** | `78.86–81.39` | Dawn Hill | `jumpJoy` + Halo + Sunrise Rays | `gasp -> sparkle -> happy` | 就像是黑暗过后黎明盛开 |
| **S33–S40 (B32–39)** | `81.39–101.63` | Chorus 2 Sets | Duet Walk, Kneel, Umbrella, Galaxy Leap | All 31 Emotions (`3 per bar`) | Chorus 2 (`我们之间的回忆...`) |
| **S41–S48 (B40–47)** | `101.63–121.87` | Coda 1 Sets | Solo Search, Rain Kneel, Bonsai & Ginkgo | `sad/cry/angry/dead -> love` | Coda 1 (`独自收集两个人之间的回忆...祝你余生动听啊`) |
| **S49–S56 (B48–55)** | `121.87–142.11` | Finale Sets | 9/9 Puzzle Assembly & Full Cast Sunrise | `cry/determined -> love/sparkle/wink` | Finale (`独自收集两个人之间的回忆...把回忆拼好给你`) |
