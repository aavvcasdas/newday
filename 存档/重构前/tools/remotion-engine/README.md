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
- `walk_cycle_v14.mjs` + `build_walk_v14.mjs`：**v14 侧 3/4 八帧行走生成器**（AI 重绘的直立体侧立绘 → 上身/单腿切片分层 → 八姿态；一条腿切片做前腿、压暗复制做后腿，两腿绕髋**刚性旋转**严格 180° 反相，支撑腿脚底钉在 `GROUND_Y`、摆动腿抬脚离地，髋部起伏由腿倾角反推；腿层裁剪在 `legTop..GROUND_Y`，绝无灰腿鬼影 / 断膝 / 第三条腿 / 踩穿地面）；`node tools/remotion-engine/build_walk_v14.mjs` 落盘全部 9 套图集到 `assets/ai-girls/walk-v14/`
- `render_walk_video.py`：把 9 个角色渲染成**一个 MP4**（`python3 tools/remotion-engine/render_walk_video.py [--crf=20]`，1280×720 / 25fps / H.264，片头 2s + 每个角色 3s 走过舞台 + 3×3 全员 4s）→ `assets/ai-girls/walk-v14/preview/walk_all9.mp4`；直接吃 `frames/<char>/f*.png` 原始切片（比图集单格清晰），脚按 `meta.json` 的 `groundY` 踩在同一条地上。依赖 `pip install --break-system-packages imageio-ffmpeg`（自带 ffmpeg，不需要系统装）
- `white_to_alpha_frames.py`：把**白底 RGB 帧**就地转成带柔边 alpha 的 RGBA 帧（`python3 tools/remotion-engine/white_to_alpha_frames.py kimi [--force]`）；不是四格图切出来的角色（kimi）落盘时是白底 RGB，构建图集只能走 JS 的二值抠白，边上一圈就是白边，这里用同一套抠图逻辑补一次
- **白边有两半原因，两半都要治**：
  1. **抠图**：`slice_walk_sheet.py` / `white_to_alpha_frames.py` / `defringe_frames.py` 共用 `background_mask()` —— 只有**连到画面边缘**的纯白才算背景（白色蕾丝/围裙上的高光不会被抠成针眼）；紧邻背景的 `band` 像素颜色换成**里层颜色**（color decontamination），alpha 用**反混合** `a=(255-P)/(255-C)` 求，而不是按亮度拍一个坡。早先的版本斜坡判据几乎是二值，边缘一圈还是亮色，深色角色（鲸娘黑裙、zai 黑发）在夜色舞台上就是一圈光晕。
  2. **缩放**（真正让"素材干净、成片却有白边"的那一半）：PIL 的 `resize()` 对 RGBA 是四通道各自插值，而透明像素的 RGB 残留是 255，于是边缘每一像素都被白染一次。`frame_utils.resize_rgba()` 改成**预乘再缩放、缩完反预乘**，`render_walk_clips.py` / `render_walk_video.py` 全部走它。判据：素材 4× 放大看不到白边、成片 1× 却看得到 —— 就是这一半没治。
- `defringe_frames.py`：给**已有 RGBA 帧**做颜色去污（`python3 tools/remotion-engine/defringe_frames.py --all`），不动 alpha、只把最外 2 像素换成里层颜色；适合源图已丢、不方便重切的角色（gemini/kimi）
- `pack_walk_row.py`：把生成图给的**任意排布**（1×4 一排、2×4 八格）按人物包围盒重新摆成标准 2×2 四格图（`python3 tools/remotion-engine/pack_walk_row.py row1.png row2.png --out grid.png [--equal-cols 4]`）：擦跨行地面线 → 切人物 → **统一缩放系数** → 脚底对齐同一条地面线 → 白底 2×2，之后照常 `slice_walk_sheet.py`。生成图经常不听话，出 1×4 或 2×4，这个脚本负责把它摆回来
- `slice_walk_sheet.py`：**把一张 2×2 四格走路姿态图切成 4 张逐帧立绘**（`python3 tools/remotion-engine/slice_walk_sheet.py sheet.png --char whale --offset 1|5 [--pad 8] [--inset 0.01] [--keep-min 0.03]`，四象限切格 + 只擦贴格底的地面线 + 丢 <3% 的小碎块 + 出 RGBA，并把每帧 `groundY` 写进同目录 `meta.json`）→ 写进 `assets/ai-girls/walk-v14/frames/<char>/f1..f8.png` + `meta.json`；八张齐了 `build_walk_v14.mjs` 就自动改走**逐帧成品模式**（和上游 pets 一样，每帧都是画出来的全身像，不切腿不蒙皮）
- `render_walk_clips.py`：**把图集渲染成能直接看的走路片**（`python3 tools/remotion-engine/render_walk_clips.py [char…]` → `preview/<char>_walk.gif` 3s/25fps 每 120ms 换格、`preview/<char>_strip.png` 8 帧同地面线静态条带、`preview/walk_all8_sheet.png` 3×3 总览；GIF 体积较大，默认不入库，改了图集再跑一次即可）
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
  --spec Day/Day12/episode.production.spec.mjs \
  --alignment Day/Day12/voice_alignment.json \
  --subtitle-file Day/Day12/subtitle_timing.json \
  --dry-run
```
