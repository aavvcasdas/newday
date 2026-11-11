---
name: film-template
description: 用仓库的通用模板（three.js 3D 世界 + 像素纸片人 + Remotion）制作或修改 Day 口播片与歌词 MV。用户提到做新一集、做 MV、改镜头、对齐配音 / 歌词、出片、渲染、分镜、卡点时使用。这是仓库里唯一现行的制作 skill；存档里的旧 skill 已全部废除。
---

# 通用模板做片流程

事实依据只有两处：`通用模板/README.md`（用法与规矩）和 `AGENTS.md`（交付与红线）。`存档/` 里的任何流程都已废除，不要照着做，也不要从里面 import 代码。

## 0. 开工前

```bash
npm ci && pip install --user numpy pillow      # 没装过才需要
npm run film -- info <作品目录>                  # 确认作品能加载、看时间轴
```

`info` 最后一行会说「仓库里的成片是不是现在这份源码渲的」。不一致就意味着成片已经过期。

## 1. 判断是哪种活

| 用户要的 | 走哪条 |
|---|---|
| 新一集口播 | `npm run new -- day Day/DayNN "标题"` → 第 2 节 |
| 新一部 MV | `npm run new -- mv 番外MV/歌名 "歌名"` → 第 3 节 |
| 改已有作品的镜头 / 台词 | 直接改作品目录里的 `shots/`、`台词.txt` / `歌词.srt`、`project.tsx` |
| 配音 / 原曲到位了 | `align` → `full`（第 4 节） |
| 引擎缺功能（新道具、新造型、新字幕样式） | 改 `通用模板/engine/`，然后 `npm test && npm run typecheck`，并对 `番外MV/童话镇` 跑一次 `sheet` |

## 2. 口播片（Day）

1. 写 `台词.txt`：一行一句 = 一屏字幕，≤22 字；行首可写 `gpt:`、`whale/p_whale_think:`；数字写汉字。
2. `npm run film -- plan <目录>` 估规划轴（`measured=false`）。
3. 分镜：每个镜头盖哪几句，写进 `project.tsx` 的 `planShots`（`cue` 从 0 数）。一个镜头别超过 12 秒；台词密的段落多切几刀。
4. 写 `shots/*.ts`。室内道具在 `@tpl/props`；谁在说话就 `.talk(T, line === 句号)`。
5. `npm run film -- sheet <目录>` 看总览图 → 逐格检查构图（人有没有出画、被字幕条挡住没有、道具穿没穿帮）→ 改 → 再看。
6. `npm run film -- full <目录>` 出无声样片，交给用户过分镜。
7. 配音到位后见第 4 节。

## 3. MV

1. 原曲放 `素材/`，`film.json` 加 `audio`；换 `歌词.srt`。
2. `npm run film -- align <目录>`：实测拍点、歌词起点吸附到实拍。看输出里的「平均移动 / 最大移动」，最大移动接近半拍说明歌词时间本身不准。
3. 排镜：一句一镜为主，长句中间再切；前奏 / 间奏 / 尾声用 `at` 或 `after`。
4. 写镜头：动作卡 `bt.pulse` / `bt.idx`；重拍 `bt.down`。
5. `sheet` → 改 → `full`。

## 4. 出成片

```bash
npm run film -- align <目录>     # 换了音源必须重跑
npm run film -- full <目录>      # frames → encode → mux → qa → sheet
```

- `full` 开头就会检查卡点是不是按当前音源实测的，不是就直接停。
- 看 `成片/qa.json`：`frames.problems`、`timing.problems`、`final.problems` 都应为空；`final.audio_lag_vs_source_samples` 应为 0。
- 成片 >100 MB 推不上 GitHub：调低 `film.json` 的 `video.bitrate`。

## 5. 写镜头时最容易犯的错

- 在逐帧函数里用了 `Math.random()` / 累加变量 → 跳帧渲染和连续渲染结果不同。用 `hash(n)`。
- `track([[0, A], [0.5, B], [1, B]])` 后半段两个关键帧一样 → 镜头冻住，qa 报「画面冻住」。
- 角色某一帧没摆 → 回到默认站姿、原点位置。
- 忘了 `.flip()`：两人对谈时右边的人要翻转才面朝左。
- 人物贴着画面底边 → 被字幕条挡住。字幕条占画面底部约 18%。
- 造型名写错 → `set()` 抛错（这是对的，别 try/catch 掉）。

## 6. 汇报

分开写三件事：

1. **机器查过的**：qa.json 的结论、帧数、时长、音画偏移、文件大小与 SHA256。
2. **我看过的**：看了哪些静帧 / 总览图，发现并改了什么。
3. **没人做过的**：整片连续观看、听审。没做就写没做。

然后提交、推送到当前会话分支，给出真实提交号。

## 红线（违反即返工）

零水印零角标；不出现粉丝数 / 播放量 / 进度条 / 数据图表 / 账本表格；不画假手；Day 不加片尾卡；不新增生图；缺素材不许回退；`measured=false` 的东西不许叫成片。
