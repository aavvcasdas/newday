# 通用动态 Remotion 舞台与动画引擎 (`tools/remotion-engine/`)

本目录提供与具体剧本/歌曲彻底解耦的 **数据驱动 Remotion 渲染引擎**，同时支持：
1. **番外歌词 MV 模式 (`--mode mv`)**：由任意声明式 `mv.spec.mjs`（例如 `tools/mv_dayu/mv.spec.mjs`）驱动，告别将分镜与坐标写死在单文件 JSX 中的旧做法；
2. **Day 正传单集模式 (`--mode episode`)**：通过 `tools/engine/remotion_episode_adapter.mjs` 直接消费任意 `episode.spec.mjs` / `episode.production.spec.mjs` + `voice_alignment.json` + `subtitle_timing.json`，支持 `--auto-sets` 自动跨镜切换动态舞台。

## 设计要点（融合 `lintsinghua/paint-mv-skills` 与 `Win-Hao/music-mv`）

- **纯帧号确定性求解 (`frame_evaluator.mjs`)**：每一帧完全由 `t = frame / fps` 纯函数求出（相机、动态舞台、多光源、10 骨骼角色动作、手部挂点 `handAt`、手持道具交接、环境触发器与动机转场），天然支持 Remotion 并发分片渲染与时间轴任意拖动预览。
- **单一世界相机 (`components/WorldCamera.jsx`)**：1800×920 超宽世界空间内统一承载视差远景、中景建筑机关、体积光锥、地面接触阴影、脚步水波/尘土、角色与道具，杜绝人物与背景脱节漂移；字幕与歌词独立固定在屏幕安全区 (`components/LyricAndSubtitleLayer.jsx`，按全局新规默认零右上角水印，支持 `--no-subtitles` 渲染纯净封面底板)。
- **多舞台响应式环境 (`components/StageSetView.jsx`)**：与 Canvas 共享 `tools/场景/stage_sets_core.mjs` 的 12 套可切换舞台预设，实时响应 `open_door`、`open_gate`、`slam_desk`、`window_ripple`、`pin_note`、`toggle_lamp`、`dawn_shift` 等人物/剧情触发器。
- **骨骼与切图双模角色 (`components/RiggedCharacter.jsx`)**：优先加载仓库真实角色抠图（`assets/ai-girls/` 与既有姿态图）并施加全身呼吸、挤压拉伸、姿态叠化与受光边缘高光（严禁篡改原图五官）；无位图角色或伴舞支持关节骨骼矢量木偶全身步态与手部动作。
- **反 PPT 静态审计 (`auditRemotionPropsActivity`)**：对标 `music-mv` 的 `video_rhythm.py`，在 `--dry-run` 阶段扫描全片时间轴，自动拦截连续 `>= 1.0s` 的静态冻结幻灯片区间。

## 目录结构

- `entry.jsx` / `UniversalComposition.jsx`：Remotion Root 注册与通用舞台合成组件
- `frame_evaluator.mjs`：纯 ESM 逐帧世界与骨骼交互求解器（浏览器 Bundle 与 Node 单测共用）
- `mv_adapter.mjs`：歌词 MV 声明式规格适配器
- `walk_rig_builder.mjs`：**8 帧步态 / 待机图集注册表与构建器**（`WALK_FRAMES = 8`，8 帧 × 120ms = 0.96s 双步周期，对齐 `tqlearning/ai-girl-chatgpt-pets` 的 `running-right`；仓库内 `assets/ai-girls/walk-v14/*.png` 有预烘成品时优先直接读取）
- `walk_cycle_v14.mjs` + `build_walk_v14.mjs`：**v14 侧 3/4 八帧行走生成器**（AI 重绘的直立体侧立绘 → 上身/左右腿分层 → 抬脚·前后摆·脚掌微转八姿态 → 裙摆裁剪，绝无灰腿鬼影 / 断膝 / 第三条腿）；`node tools/remotion-engine/build_walk_v14.mjs whale gpt` 落盘到 `assets/ai-girls/walk-v14/`
- `walk_preview.mjs`：走路图集审阅台（`node tools/remotion-engine/walk_preview.mjs --port 8099`，120ms 逐帧播放 + 单帧定格）
- `render_cli.mjs`：支持 `--bundle-check`、`--dry-run`、本地静态资源 HTTP 服务与 MP4/PNG 渲染的统一 CLI
- `components/`：`WorldCamera.jsx`、`StageSetView.jsx`、`RiggedCharacter.jsx`、`InteractivePropsLayer.jsx`、`TransitionOverlay.jsx`、`LyricAndSubtitleLayer.jsx`

## 常用验证命令（无需重渲成片即可验证底层）

```bash
npm ci --prefix tools/remotion-engine

# 1. 验证 Remotion Webpack 打包完整性（零 Node 内置模块泄漏）
NODE_PATH=$PWD/tools/engine/node_modules node tools/remotion-engine/render_cli.mjs --bundle-check

# 2. 验证《我怀疑大禹治水》7 舞台声明式 MV 规格与反 PPT 动态审计
NODE_PATH=$PWD/tools/engine/node_modules node tools/mv_dayu/remotion/render.mjs --dry-run

# 3. 验证 Day12 生产分镜直接运行在通用 Remotion 引擎上（可选 --auto-sets 开启自动多舞台切换）
NODE_PATH=$PWD/tools/engine/node_modules node tools/remotion-engine/render_cli.mjs \
  --mode episode \
  --auto-sets \
  --spec tools/day12制作/episode.production.spec.mjs \
  --alignment tools/day12制作/voice_alignment.json \
  --subtitle-file tools/day12制作/subtitle_timing.json \
  --dry-run
```
