# tools/字幕 —— 项目统一字幕组件

**2026-10-27 用户定：字幕定死用 Day2 加更《鲸鱼选鱼》那一版，以后所有视频默认走这个。**

- `day2_style_sub.mjs`：唯一的一份实现。从 `tools/day2加更制作/video-fx源码快照/render_day2_bonus_final.mjs`
  的 `drawSubtitleBox()` / `wrapCaption()` 抽出来，尺寸、颜色、圆角、描边、说话人标签都照抄，没有另改风格。
- 新增视频（Day4 起）直接 `import` 它，**不许再各写一版**；要改样式只改这一个文件。

## 规格（改之前先读）

| 项 | 值 |
|---|---|
| 一屏内容 | 一个**短分句**（按标点分，不按字数硬切；也不做逐字点亮） |
| 分句过短 | 去标点后 <3 字的屏并到**后一屏**（「哦，」+「原来不是…」要连着读）；已是最后一屏则并到前一屏 |
| 显示时长 | 一屏显示到下一屏开始为止，最后一屏到该 cue 结束 |
| 对话条 | 填充 `rgba(9,22,54,0.92)`、描边 `#48C8FF` 1.6px、圆角 12 |
| 说话人标签 | `#1E40AF` 底 + `#FACC15` 描边 + `#FDE68A` 800 字，贴在对话条左上角、上移 14px |
| 正文 | 白色 `#FFFFFF`，800 字重，28px 起，宽度上限 1040，放不下自动缩字号（最小 15），仍放不下才换行；带 `rgba(6,20,44,0.92)` 深色描边 |
| 位置 | 底边距 76px（`bottomInset`），双行时自动上移 |
| 字体 | `NotoSansSC` 优先（ZCOOL 快乐体是海报体，「圈」这类封闭笔画会糊成方块） |

## 用法

```js
import { createDay2Subtitle, speakerFor } from '../字幕/day2_style_sub.mjs';

const SUB = createDay2Subtitle({
  fontOf: (size, weight) => `${weight} ${size}px "NotoSansSC", sans-serif`,
  measureCtx: createCanvas(8, 8).getContext('2d')   // 只用来量字宽
});

// 每帧：
const segs = SUB.clauses(cueText, cueCharsTimed, cueStart, cueEnd); // 有字级时间就更准
const seg  = SUB.segmentAt(segs, t);
SUB.draw(ctx, { lines: SUB.wrap(seg.text), speaker: '鲸鱼娘', vis, W, H });
```

`speakerFor({ isClaude })` 给的是本项目统一口径：变色成大小姐的段落标「Claude 大小姐」，其余标「鲸鱼娘」。

## 历史对照

`DAY3_SUB_STYLE=karaoke` 可以切回逐字（卡拉OK）版，`plain` 切回整句一屏版 —— 只为复现历史版本与对照，
**默认不要用**。
