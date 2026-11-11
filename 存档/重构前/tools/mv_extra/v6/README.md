# v6 分镜动作版

在 v5 的 Q 版形象基础上增加五位配角的生成式挥手姿态，并在影片里按镜头分配走步、挥手、展示、舞动、待机、漂浮等动作。Day12 鲸鱼娘及 Claude 使用各自已有多姿态；其他五位在站姿/挥手姿态之间切换，结合分帧骨骼形变。它们不是新画的完整逐帧跑步动画，极短的姿态切换和服装变化仍可能可见。

## 参考项目

`tqlearning/ai-girl-chatgpt-pets`（核对提交 `3afe14603b40e24c75e87e097cbfee1bfc10290d`）有两张 8×11 透明图集，动作包括待机、左右跑、招手、跳跃、受挫、等待、工作、复查以及 16 个视线方向。动作按各状态的每帧时长播放，单格保持固定坐标，不逐帧重新裁切。该仓库说明帧是 AI 辅助生成后整理；并未提供完整生成流程或视频动画源工程。

该项目 `RIGHTS.md` 明确图像素材不在 MIT 许可范围内，修改或再分发前需确认授权。本版**没有复制或嵌入其 PNG/GIF 图集**，而是参考状态与帧时长的设计，自行制作姿态及动作曲线。用户若希望直接使用其原始角色图集，需先确认相应素材用于本片的授权。

## 复现和验证

安装 `tools/engine` 的 npm 依赖以及 Python `imageio-ffmpeg`，执行 `.venv/bin/python tools/mv_extra/v6/setup_v6.py`。完整渲染：`node --expose-gc tools/mv_extra/v6/film.mjs render`；画面预览：`node --expose-gc tools/mv_extra/v6/film.mjs stills`。

测试：`node --expose-gc --test tools/mv_extra/v6/actions.test.mjs tools/mv_extra/v6/film.test.mjs tools/mv_extra/v6/planning.test.mjs`；音轨/帧数检查：`.venv/bin/python tools/mv_extra/v6/check_v6.py`。测试不等于人工审美或逐帧审核。素材来源及授权范围见 `assets/ai-girls/chibi-v5/README.md` 和 `assets/ai-girls/chibi-v6/README.md`。
