# STORYBOARD｜Day14 v5 / Lemo-Opuscar 16-bit Pixel RPG

> 配套 [`TREATMENT.md`](TREATMENT.md)、[`CREDITS`](CREDITS)、
> [`storyboard_sheet.jpg`](storyboard_sheet.jpg) 与主仓库
> [`Day14分镜_台词匹配版_待审.md`](../Day14分镜_台词匹配版_待审.md)。
> 语言：中文。风格：样片已交付的 16-bit Pixel RPG。电视内 v3 内容不变。

## 9 张关键帧（DIRECTOR.md §5：shot number / framing / duration / line）

| # | 成片秒 | 对应 WAV | 样片 S 镜 / 歌词 | framing / camera | 这一格要看见什么 |
|---:|---:|---|---|---|---|
| 1 | `2.50s` | L01 / M01 | S26 · 样片 `130.08s` | wide+shake / shake · 3.79s | 焦黑自报：让观众看见「被烤成黑炭」的是谁 |
| 2 | `11.90s` | L03 / M03 | S02 · 样片 `9.35s` | wide / tilt_up · 5.70s | 书页翻开、城堡从书页里长出来 |
| 3 | `18.70s` | L04 / M04 | S03 · 样片 `24.27s` | two_shot / push · 5.52s | 龙娘俯冲、豆包被抓走、天一下子暗了 |
| 4 | `36.50s` | L07 / M07 | S09–S10 · 样片 `53.01s` | medium / push · 8.16s | 名字太长塞不进框、大小姐追着问 |
| 5 | `46.90s` | L08 / M08 | S20 · 样片 `111.35s` | medium / push · 5.37s | Kimi 月光照洞口、豆包在笼里喊小心后面 |
| 6 | `63.50s` | L12 / M12 | S06 · 样片 `35.12s` | overworld / pan_r · 3.89s | 按下暂停、倒回去、一段一段看 |
| 7 | `83.00s` | L17 / M17 | S13 · 样片 `72.52s` | wide / pan_r · 4.08s | 反转：电视里全演过了，只是没人把它写下来 |
| 8 | `109.90s` | L22 / M22 | S26 · 样片 `129.95s` | wide / static · 4.50s | 电视关掉、歪伞收进抽屉、今天不拍雨了 |
| 9 | `123.90s` | L24 / M24 | S10–S11 · 样片 `56.85s` | insert / static · 6.50s | 下一集把装不下的名字一个字一个字塞回框 |

拼板文件：`storyboard_sheet.jpg`（由 `$LIB/core/render/sheet.py` 用仓库真实渲染帧拼成）。
每张下面带镜号、景别、时长与台词行；不是手绘示意图。
编码后另从最终 MP4 每 5 秒抽 1 帧做全片等距目检、在 L03 词点按 2fps 抽 10 帧查起势/冻结
（审看材料在 Gitignored 的 `tools/day14制作/review_frames/`，不进成片）。

## 完整镜头表

24 句逐镜卡见主仓库 `Day14分镜_台词匹配版_待审.md` 第三节与第四节。
每镜字段：`id / fromLine / toLine / framing / focus / entry / action / trigger(实测词点) /
result / reaction / hold≥0.35s / exit / transition / continuity.in-out / 样片S镜与歌词 / 电视v3原样`。

## 最没把握的一项

前景是本仓库既有的 AI娘动作图集（较细腻的立绘），背景是样片 320×180 整数像素真帧；
两者并置是否够统一、人物是否真的「跟样片互动」而不是贴图，必须看连续动态成片。
静帧拼板、结构检查、媒体终验都不能代替你这一项人工判断。

## 审批状态

Skill 流程建议「先交拼板、等批准再生产」。用户本轮要求「全面重新修改分镜」且前几轮均直接交付成片，
所以本轮同时给出拼板与重渲 MP4；**不写成已获批准**，好不好笑/像不像/节奏/融合度仍待真人看片。
