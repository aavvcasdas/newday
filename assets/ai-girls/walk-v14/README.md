# walk-v14 · 8 帧行走 / 待机图集（侧 3/4 视角）

对标 [`tqlearning/ai-girl-chatgpt-pets`](https://github.com/tqlearning/ai-girl-chatgpt-pets) 的
`running-right` / `running-left` 规格：**8 帧、每帧 120ms、一轮 0.96s = 一个双步周期**，
单格固定、不逐帧裁切、不逐帧重新居中。

## 目录

```
walk-v14/
  source/                     本轮重新生成的侧 3/4 立绘（AI 生成，白底，8 位角色各一张）
  <atlas>.png                 8 格 × 384×416 成品图集（透明 PNG）
  preview/walk_v14_preview.png 两套图集的 8 帧总览图
```

单格：`384 × 416`，脚底基线 `y = 406`，角色高度 `372px`，水平居中。
图集宽度固定 `8 × 384 = 3072`，第 0 列起顺序播放，循环。

## 已切换的图集（全部 8 位角色）

| 角色 | walk | idle | 立绘来源 |
| --- | --- | --- | --- |
| 鲸鱼娘 | `whale_walk_side_2leg` | `whale_idle_side_pet` | `source/whale.png` |
| 龙女 GPT | `gpt_walk_2leg` | `gpt_idle_pet` | `source/gpt.png` |
| Gemini | `gemini_walk_2leg` | `gemini_idle_pet` | `source/gemini.png` |
| Claude | `claude_walk_2leg` | `claude_idle_pet` | `source/claude.png` |
| Kimi | `kimi_walk_2leg` | `kimi_idle_pet` | `source/kimi.png` |
| Qwen | `qwen_walk_2leg` | `qwen_idle_pet` | `source/qwen.png` |
| Z.AI | `zai_walk_2leg` | `zai_idle_pet` | `source/zai.png` |
| 豆包 | `doubao_walk_side_2leg` | `doubao_idle_side_pet` | `source/doubao.png` |

情绪变体 `whale_walk_happy_2leg` / `whale_walk_sad_2leg` / `whale_idle_happy_pet` / `whale_idle_sad_pet`
与上表鲸鱼娘同体同帧（情绪差异交给表演层与 emoji 气泡，不再换一套体型不一致的立绘）。

仍走 v13 蒙皮的三个图集（姿势特殊、暂未重绘）：`whale_seat_side_bench`（坐长椅）、
`gpt_push_walk_2leg` / `gpt_push_idle_pet`（双手推山）。

## 两套下半身驱动模式

| 模式 | 适用 | 做法 |
| --- | --- | --- |
| `split` | 立绘里两条腿本来就分开、能看见缝（whale / gpt / claude / kimi） | 按"腿间山谷列"劈成左右腿两层，各自以髋为支点抬脚 + 前后摆 + 脚掌微转，180° 反相 |
| `block` | 立绘里两腿并拢成一整块（gemini / qwen / zai / doubao 的长裙、长裤、长发） | 下半身整块以髋为支点**斜切（shear）**摆动 + 轻微抬落。剪切不会撕出缝隙，读感是 chibi 小碎步，绝不破裙 |

两种模式都把腿层统一裁剪在裙摆线以下：抬腿时腿自然"滑进"裙子，几何上不可能出现悬空残鞋。

## 生成方式

```bash
# 1. 重新烘图集（改 source/ 或调参后跑）
node tools/remotion-engine/build_walk_v14.mjs            # 全部 8 位
node tools/remotion-engine/build_walk_v14.mjs whale gpt  # 只做指定角色

# 2. 审阅：120ms 逐帧播放，可点单帧定格
node tools/remotion-engine/walk_preview.mjs --port 8099
```

算法在 `tools/remotion-engine/walk_cycle_v14.mjs`：

1. **抠图**：只对与画布边缘连通的浅色背景做 flood fill，白裙 / 白袜 / 白发不会被吃掉。
2. **分层**：上半身（含裙摆、尾巴、长发）一层；腿像素按脚底重心 `cx` 与脚踝轮廓自动定横向范围，
   尾巴 / 披风这类偏蓝紫附属物判为非腿像素，不跟着腿摆动。
3. **步态**：8 个固定姿态；`lift` 抬脚、`swing` 前后摆、`toe` 脚掌微转；
   上半身起伏 `bodyBob` 由 4π 相位算出（每轮两次重心下沉）。
4. **遮罩**：腿层统一裁剪在裙摆线以下。

## 与 v13 的三个关键修正

- **帧数对齐**：v13 生成 16 格图集，引擎按 `_2leg` 只播 8 列，等于每轮只播到前 4 个姿态
  （0,0,1,1,2,2,3,3）→ 看上去是抖腿不迈步。v14 一律 8 格 8 姿态，`WALK_FRAMES = 8`；
  `_bench` 图集也纳入 8 列判定。
- **列数推导**：`character_motion.mjs` 过去只在写了 `atlas` 时才按名字推列数，
  仅由 `locomotion` 预设推导时会退回 16 列 → 抽到画布外的空格子。现在按"预设解析后的真实图集名"判定。
- **腿与裙的关系**：不再把整条腿切出来做双骨骼蒙皮（会露关节缝、灰腿鬼影、悬空鞋）。

## 素材来源

`source/*.png` 为本轮由 AI 图像生成、按各角色既有设定重新绘制的**侧 3/4 全身立绘**
（挺背直立、双腿可见、白底），不是上游 pets 仓库的 PNG/GIF，也不含其美术文件。
上游仓库仅作为**帧数、节拍、图集布局**的规格参考。
