# STORYBOARD｜Day14 视频 v10 / Paper Pop-up Book（人物层修订，分镜背景不变）

> 用户第十次反馈：「现在整体分镜的画面是够了，有几个问题1：有部分的图人物的脚少一只的，不要使用这些。
> 2.当前画面的动作很不符合，增加点互动吧，不要用这么多的人物形象，人物形象的动作不符合画面的状态。」
> 因此 **9 张关键帧的背景、纸片舞台、电视、字幕与 v9 相同**；只把人物换成 8 张双脚可见白名单、
> 每镜 2–3 位、一次性语义姿态，并加厚 24 次道具交接。v8 的 RPG 画风早已被否决，本轮不重问画风。
> 9 张图都由仓库 `render_day14_video.py` + `day14_v10_scenes.py` 真实渲染，不是 MV 真帧、不是库 demo 截图。

## 一、9 张真实关键帧（DIRECTOR.md §5 / §11）

| 镜 | 时间 | 剧本场景 | layout / 摄影机 | 2–3 位本名 | 纸片道具交接 | 文件 |
|---|---|---|---|---|---|---|
| M01 | 2.5s | 焦痕检查角 | `charred_corner` / `static` | 豆包／本鲸 | 豆包→本鲸：cloth | `01_M01_charred_corner_3.79s_L01.png` |
| M03 | 11.9s | 红皮书舞台 | `book_stage` / `push` | 本鲸／大小姐 | 本鲸→大小姐：book | `02_M03_book_stage_5.70s_L03.png` |
| M04 | 18.7s | 夜色城堡走廊 | `castle_night` / `pan_l` | 龙娘／豆包／本鲸 | 龙娘→豆包：ribbon | `03_M04_castle_night_5.52s_L04.png` |
| M07 | 36.5s | 王座厅名字框 | `throne` / `push` | 本鲸／大小姐 | 本鲸→大小姐：name_strip | `04_M07_throne_8.16s_L07.png` |
| M08 | 46.9s | 山洞口金笼 | `cave` / `tilt_up` | Kimi／豆包／本鲸 | Kimi→豆包：lantern | `05_M08_cave_5.37s_L08.png` |
| M12 | 63.5s | 暂停倒带操作台 | `rewind` / `pan_l` | 本鲸／Gemini | 本鲸→Gemini：reel | `06_M12_rewind_3.89s_L12.png` |
| M17 | 83.0s | 胶片墙放映室 | `film_wall` / `pull` | 大小姐／本鲸 | 大小姐→本鲸：paper | `07_M17_film_wall_4.08s_L17.png` |
| M22 | 109.9s | 收伞门厅 | `hallway` / `pan_r` | 智谱／本鲸 | 智谱→本鲸：umbrella | `08_M22_hallway_4.50s_L22.png` |
| M24 | 123.9s | 昵称框修补台 | `name_bench` / `push` | 本鲸／豆包 | 本鲸→豆包：glyph_block | `09_M24_name_bench_6.50s_L24.png` |

拼板：[`storyboard_sheet.jpg`](storyboard_sheet.jpg)；风格对照：[`skill_reference_sheet.jpg`](skill_reference_sheet.jpg)；
模型表：[`model_sheet.jpg`](model_sheet.jpg)；0.2s 动作条：[`action_test_sheet.jpg`](action_test_sheet.jpg)、
[`action_test_L03.jpg`](action_test_L03.jpg)、[`action_test_L08.jpg`](action_test_L08.jpg)。
`poster.jpg` 是审看海报，不进成片；成片不含标题卡、气泡、评级、HP/分数 UI、进度条、表格、角标或尾卡。

## 二、8 张安全图集白名单（回答「脚少一只」）

| 本名 | 图集键 | 核验帧 | 底部最少独立段数 | 最大 alpha 均值差 |
|---|---|---|---|---|
| 本鲸 | `v10_whale_letter` | 11/11 | 2 | 0.0 |
| 龙娘 | `v10_gpt_heart` | 11/11 | 5 | 0.0 |
| 豆包 | `v10_doubao_cup` | 11/11 | 2 | 0.421 |
| 大小姐 | `v10_claude_letter` | 11/11 | 3 | 0.0 |
| Kimi | `v10_kimi_photo` | 11/11 | 2 | 1.112 |
| Gemini | `v10_gemini_shell` | 11/11 | 4 | 0.0 |
| 智谱 | `v10_zai_read` | 11/11 | 4 | 0.0 |
| 千问 | `v10_qwen_lantern` | 11/11 | 2 | 0.535 |

`day14_v10_scenes.verify_safe_sheets()` 在每次渲染启动时逐帧检查：四角透明、图集底部不裁切、
11 帧 alpha 轮廓基本不变（手里道具轻微位移允许 <2/255）、底部 `392–410` 行至少两段独立脚/裙摆轮廓。
任何一张不合格就 `AssertionError`，不会悄悄出片。实际演出只取 `SAFE_FRAMES=(0,3,7,10)` 做一次性动作条。
v9 用过的 33 张侧身单鞋 idle / 迈步 / 蹲坐 / 桌面 / 泳姿 / reach 图集全部停用。

## 三、v10 互动：24 句 24 次道具交接（DIRECTOR.md §9）

| 句 | 道具 | 交接 | give / receive 语义状态 |
|---|---|---|---|
| L01 | cloth | 豆包 → 本鲸 | `offer` / `inspect` |
| L02 | cable | 智谱 → 本鲸 | `offer` / `set` |
| L03 | book | 本鲸 → 大小姐 | `open` / `raise` |
| L04 | ribbon | 龙娘 → 豆包 | `swoop` / `yield` |
| L05 | reins | Gemini → 本鲸 | `offer` / `accept` |
| L06 | key | 千问 → 本鲸 | `offer` / `open` |
| L07 | name_strip | 本鲸 → 大小姐 | `hold_up` / `question` |
| L08 | lantern | Kimi → 豆包 | `raise` / `warn` |
| L09 | flame | 龙娘 → 本鲸 | `breathe` / `scorch` |
| L10 | cloth | 豆包 → 本鲸 | `offer` / `selfcheck` |
| L11 | blank_book | 大小姐 → Kimi | `show_blank` / `hover_pen` |
| L12 | reel | 本鲸 → Gemini | `press` / `reverse` |
| L13 | book | 龙娘 → 本鲸 | `shrug` / `point_blank` |
| L14 | note | 龙娘 → 本鲸 | `replay` / `write` |
| L15 | placard | 本鲸 → 大小姐 | `point` / `name` |
| L16 | lantern | Kimi → 本鲸 | `raise` / `look` |
| L17 | paper | 大小姐 → 本鲸 | `show_empty` / `look` |
| L18 | film_cell | Gemini → 本鲸 | `advance` / `inspect` |
| L19 | paper | 本鲸 → 千问 | `flip` / `hand_next` |
| L20 | clip | 大小姐 → 本鲸 | `separate` / `hold` |
| L21 | charred_paper | 本鲸 → 豆包 | `pick` / `clip` |
| L22 | umbrella | 智谱 → 本鲸 | `fold` / `switch_off` |
| L23 | rice_bowl | 千问 → 本鲸 | `place` / `keep` |
| L24 | glyph_block | 本鲸 → 豆包 | `return` / `close` |

道具坐标由两位本名 `_hand_xy()` 手掌位置按实测词点缓动插值；交接期间新增两掌到道具的连线、
给出者掌心渐显 / 接收者掌心渐隐的纸片回响、到达时一次性 8 向火花，双方按同一词点同步倾身/抬手/回弹。
所有名字都来自当句定点互动表，不新增第九位角色、不让角色横穿全场、不切第三套 reaction 姿态。

## 四、风格不变量与电视锁定

- 背景：暖纸底 + 三层 pop-up 纸片（远山 / 中景 / 前景波边）+ 24 套主色族 + 24 个剧本专属结构；
  摄影机用 LANCZOS 平滑推拉/横移/纵摇，电视外壳随后固定贴上，特效后再逐像素贴回。
- 人物：固定 `x` 点位；0.35s 短距入场；预备 → 词点一次性动作 → 回弹 → 结果停留；每人一张纸片、双脚可见。
- 电视：`TV_OUTER=(1400,96,1840,372)` / `SCREEN=(1428,124,1808,338)`，`tv_at()` / `CLIP_SECOND` /
  `TRIPLE` / 定格 / 黑屏 / 三连 / 开机渐亮与 v3 全等；最终代码 3756 帧 `tv_at` 比对 0 差异、9 个特效帧电视矩形 maxdiff=0。
- 音画轴：WAV `124.970s`、24 cue、63 屏、1080p30、3756 帧、`125.200s`、`TAIL_PAD=0.25`、Day2 字幕不变。
- **不做**：新 BGM/音效重混、24fps、60fps、对话框字幕、片尾卡、进度/音量/加载条、数据曲线、账本表。

## 五、流程偏差

- 用户说「分镜画面够了」，没有单独风格帧批准，也没有 6–9 张 storyboard 的停等批准；按历史要求一次交付。
- Playwright / Chrome 浏览器渲染器在本沙箱不可用；用仓库 Python + Pillow + ffmpeg 复刻所选视觉语法，
  不复制库代码，不声称通用引擎绿灯。
- 字幕核验是颜色/帧差抽样，不是 OCR；未做连续带声全片人工播放，未获真人观影批准，未发布，未合并 PR。
- v9 文档的「DEMO.md 全篇读毕」「最终代码 cross-seed 一致」属于过度声明；v10 已全篇读毕 229 行并在最终代码重跑
  `PYTHONHASHSEED=0/42/1`，像素和均为 `7610483 / 7594008 / 8070603 / 7025007 / 7664550`。
