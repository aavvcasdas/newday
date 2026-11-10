# STORYBOARD｜Day14 视频 v9 / Paper Pop-up Book 纸片立体书（Lemo-Opuscar 导演流程）

> 用户第九次反馈「没用说要rpg画风，换个画风啊，并且渲染视频推送分支」：
> v8 的 8 色 Bayer / 整数像素 / 砖墙 / 拱窗 / 火把 pixel-rpg 语法**已被否决**。
> v9 从 `styles/README.md` 选 **Materials & 3D → Paper Pop-up Book / 纸片立体书**：
> 暖棉纸、纸纤维、米白纸边、灰纸板边、深棕墨线、软投影、三层 pop-up 纸片、每镜一个主色族。
> 9 张图都由仓库 `render_day14_video.py` + `day14_v9_scenes.py` 真实渲染，不是 MV 真帧、不是库 demo 截图。

## 一、9 张真实关键帧（DIRECTOR.md §5 / §11）

| 镜 | 时间 | 剧本场景 | layout / 摄影机 | 2–3 位本名 | 纸片道具交接 | 文件 |
|---|---|---|---|---|---|---|
| M01 | 2.5s | 焦痕检查角 | `charred_corner` / `static` | 龙娘／本鲸／豆包 | 豆包→本鲸：cloth | `01_M01_charred_corner_3.79s_L01.png` |
| M03 | 11.9s | 红皮书舞台 | `book_stage` / `push` | 本鲸／大小姐／Gemini | 本鲸→大小姐：book | `02_M03_book_stage_5.70s_L03.png` |
| M04 | 18.7s | 夜色城堡走廊 | `castle_night` / `pan_l` | 龙娘／豆包／本鲸 | 龙娘→豆包：ribbon | `03_M04_castle_night_5.52s_L04.png` |
| M07 | 36.5s | 王座厅名字框 | `throne` / `push` | 大小姐／本鲸／豆包 | 本鲸→大小姐：name_strip | `04_M07_throne_8.16s_L07.png` |
| M08 | 46.9s | 山洞口金笼 | `cave` / `tilt_up` | Kimi／豆包／本鲸 | Kimi→豆包：lantern | `05_M08_cave_5.37s_L08.png` |
| M12 | 63.5s | 暂停倒带操作台 | `rewind` / `pan_l` | 本鲸／Gemini／智谱 | 本鲸→Gemini：reel | `06_M12_rewind_3.89s_L12.png` |
| M17 | 83.0s | 胶片墙放映室 | `film_wall` / `pull` | 本鲸／龙娘／大小姐 | 大小姐→本鲸：paper | `07_M17_film_wall_4.08s_L17.png` |
| M22 | 109.9s | 收伞门厅 | `hallway` / `pan_r` | 本鲸／智谱／豆包 | 智谱→本鲸：umbrella | `08_M22_hallway_4.50s_L22.png` |
| M24 | 123.9s | 昵称框修补台 | `name_bench` / `push` | 大小姐／本鲸／豆包 | 本鲸→豆包：glyph_block | `09_M24_name_bench_6.50s_L24.png` |

拼板：[`storyboard_sheet.jpg`](storyboard_sheet.jpg)；风格对照：[`skill_reference_sheet.jpg`](skill_reference_sheet.jpg)；
模型表：[`model_sheet.jpg`](model_sheet.jpg)；0.2s 动作条：[`action_test_sheet.jpg`](action_test_sheet.jpg)、
[`action_test_L03.jpg`](action_test_L03.jpg)、[`action_test_L08.jpg`](action_test_L08.jpg)。
`poster.jpg` 是审看海报，不进成片；成片不含标题卡、气泡、评级、HP/分数 UI、进度条、表格、角标或尾卡。

## 二、v9 互动：24 句 24 次道具交接（DIRECTOR.md §9）

| 句 | 道具 | 交接 |
|---|---|---|
| L01 | cloth | 豆包 → 本鲸 |
| L02 | cable | 智谱 → 本鲸 |
| L03 | book | 本鲸 → 大小姐 |
| L04 | ribbon | 龙娘 → 豆包 |
| L05 | reins | Gemini → 本鲸 |
| L06 | key | 千问 → 本鲸 |
| L07 | name_strip | 本鲸 → 大小姐 |
| L08 | lantern | Kimi → 豆包 |
| L09 | flame | 龙娘 → 本鲸 |
| L10 | cloth | 豆包 → 本鲸 |
| L11 | blank_book | 大小姐 → Kimi |
| L12 | reel | 本鲸 → Gemini |
| L13 | book | 龙娘 → 本鲸 |
| L14 | note | 龙娘 → 本鲸 |
| L15 | placard | 本鲸 → 大小姐 |
| L16 | lantern | Kimi → 本鲸 |
| L17 | paper | 大小姐 → 本鲸 |
| L18 | film_cell | Gemini → 本鲸 |
| L19 | paper | 本鲸 → 千问 |
| L20 | clip | 大小姐 → 本鲸 |
| L21 | charred_paper | 本鲸 → 豆包 |
| L22 | umbrella | 智谱 → 本鲸 |
| L23 | rice_bowl | 千问 → 本鲸 |
| L24 | glyph_block | 本鲸 → 豆包 |

道具坐标由两位本名 `_hand_xy()` 手掌位置按实测词点缓动插值；交接期间有纸屑轨迹、暖色纸晕、
视线弧与墨线，末词点再切 reaction 图集。所有名字都来自当句定点互动表，不新增第九位角色、不让角色横穿全场。
姿态用 `Image.blend` 平滑缓动，不再用 v8 的 Bayer 掩膜；每位角色与每件道具都套 cut-paper 白边/纸板边/软投影。

## 三、风格不变量与电视锁定

- 背景：暖纸底 + 三层 pop-up 纸片（远山 / 中景 / 前景波边）+ 24 套主色族 + 24 个剧本专属结构；
  摄影机用 LANCZOS 平滑推拉/横移/纵摇，电视外壳随后固定贴上。
- 人物：固定 `x` 点位；0.35s 短距入场；预备抬身 → 词点动作 → 短回弹 → 第二位角色反应 → 结果停留。
- 电视：`TV_OUTER=(1400,96,1840,372)` / `SCREEN=(1428,124,1808,338)`，`tv_at()` / `CLIP_SECOND` /
  `TRIPLE` / 定格 / 黑屏 / 三连 / 开机渐亮与 v3 全等；特效后逐像素贴回。番外真帧只在电视 PiP。
- 音画轴：WAV `124.970s`、24 cue、63 屏、1080p30、3756 帧、`125.200s`、`TAIL_PAD=0.25`、Day2 字幕不变。
- **不做**：新 BGM/音效重混、24fps、60fps、对话框字幕、片尾卡、进度/音量/加载条、数据曲线、账本表。

## 四、流程偏差

- 没有单独风格帧批准，也没有 6–9 张 storyboard 的停等批准；用户要求直接「渲染视频推送分支」，
  本轮把审看材料与 MP4 一次交付。
- Playwright / Chrome 浏览器渲染器在本沙箱不可用；用仓库 Python + Pillow + ffmpeg 复刻所选视觉语法，
  不复制库代码，不声称通用引擎绿灯。
- 字幕核验是颜色/帧差抽样，不是 OCR；未做连续带声全片人工播放，未获真人观影批准，未发布，未合并 PR。
