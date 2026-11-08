# walk-v14 · 8 帧行走 / 待机图集（侧 3/4 视角）

对标 [`tqlearning/ai-girl-chatgpt-pets`](https://github.com/tqlearning/ai-girl-chatgpt-pets) 的
`running-right` / `running-left` 规格：**8 帧、每帧 120ms、一轮 0.96s = 一个双步周期**，
单格固定、不逐帧裁切、不逐帧重新居中。

## 目录

```
walk-v14/
  source/                     本轮重新生成的侧 3/4 立绘（AI 生成，白底，8 位角色各一张）
  frames/<char>/f1..f8.png    逐帧成品立绘（走路的每一帧都是画出来的，和上游 pets 一致）
  <atlas>.png                 8 格 × 384×416 成品图集（透明 PNG）
  preview/<char>_strip.png     8 帧并排、脚底同一条地面线（静态审阅）
  preview/<char>_walk.gif      3s/25fps 走过舞台（每 120ms 换格，`render_walk_clips.py` 生成，默认不入库）
  preview/walk_all8_sheet.png  3×3 汇总（每角色取第 4 帧）
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

第九套是特例：`gpt_push_walk_2leg` / `gpt_push_idle_pet`（双手推山，`source/gpt_push.png`，
压低重心、双手前推，步幅系数 0.8 走"发力慢挪"的节奏）。

长椅坐姿（`whale_seat_side_bench` / `sit_bench`）已整体下线：代码、预设、模板、MV 规格、
指标表里都不再有这个名字。

## 两种出图模式（优先逐帧成品）

上游 `ai-girl-chatgpt-pets` 的 `running-right` 是**每一帧单独画一张全身像**：
8 格每格的 bbox 几乎完全一样（38,37,153,203），腿是画出来的、不是切出来的，
所以迈步时腿和身体始终是同一条轮廓。

v14 现在也支持这条路，并且**优先用它**：

| 模式 | 触发条件 | 做法 |
| --- | --- | --- |
| **逐帧成品**（推荐） | `frames/<char>/f1.png … f8.png` 八张齐全 | 抠白 → 按身高归一到 `ART_H`（每帧同高）→ 脚底贴 `GROUND_Y` → 上半身重心对到单元格中线 → 直接拼成 8 格图集。不切腿、不蒙皮、不做任何形变 |
| 单腿切片骨架（过渡） | 没有 `frames/` 的角色 | 取一条腿的切片做前腿、压暗复制做后腿，绕髋反相刚性旋转 |

当前状态：**kimi 已切到逐帧成品**；其余 8 套仍在单腿切片骨架上，
逐帧立绘补齐一张就自动切换一张（`build_walk_v14.mjs` 会自动检测，不需要改代码）。

### 逐帧立绘怎么来

一次生图稳定出 4 个姿态，所以每个角色只要 **2 张 2×2 四格图 = 8 帧**：

```bash
# 第一张四格图（左上/右上/左下/右下 → f1..f4）
python3 tools/remotion-engine/slice_walk_sheet.py sheet_a.png --char whale --offset 1
# 第二张（另外半套相位）→ f5..f8
python3 tools/remotion-engine/slice_walk_sheet.py sheet_b.png --char whale --offset 5
# 拼图集（自动走逐帧成品模式）
node tools/remotion-engine/build_walk_v14.mjs whale
```

切片器会擦掉每格底部那条地面线、并按 `--inset` 内缩躲开格子之间的串味。

## 下半身驱动：单腿切片 + 髋关节反相摆动（仅过渡角色）

八个角色共用一套腿的驱动方式（不再是早期的 `split` 劈腿 / `block` 斜切两种模式）：

1. **取一条腿**：在脚掌带（`GROUND_Y-34 .. GROUND_Y-2`）里把腿遮罩按列切成连通段，
   最靠前（右）的那段就是"前腿"，连同上方的腿身一起切成一条腿的竖直切片；
   两腿在画面上粘成一片时按 0.6 宽度从最前缘切一条（宽度上限 66px）。
2. **前腿 + 后腿**：后腿用同一份切片压暗到 0.82 倍先画，前腿用原色后画。
   侧视角里后腿本来就该比前腿暗一档，两条腿叠在一起才分得清。
3. **姿态**：绕髋关节做**刚性旋转**（不缩放、不拉伸像素），两腿严格 180° 反相
   （`legPose(f)` / `legPose(f+4)`）。最大摆角 `0.30 × stride` 弧度 ≈ 17°。
4. **贴地**：支撑腿的脚底永远压在 `GROUND_Y`；支撑腿越斜髋越低，
   整体起伏 `hipDrop = legLen × (1 − cos θ)` 就是每轮两次的重心下沉。
5. **抬脚**：只有"往前迈"的半个周期抬脚（`swing` 权重），
   抬升量 = 抵消髋部下沉 + `0.14 × legLen × swing` 的离地间隙。
6. **裁剪**：腿层只画在 `legTop`（裙摆下沿再往下一小段）到 `GROUND_Y` 之间；
   裙摆底部那几行阴影留在上半身，不跟着腿转（否则会变成一块浮空深色方块）。
   裁剪矩形画在单元格坐标里，所以整体下沉也不会让脚踩到地面线以下。

## 生成方式

```bash
# 1. 重新烘图集（改 source/ 或调参后跑）
node tools/remotion-engine/build_walk_v14.mjs            # 全部 8 位
node tools/remotion-engine/build_walk_v14.mjs whale gpt  # 只做指定角色

# 2. 审阅 A：把每个人的走路渲染成"走过舞台"的 GIF + 8 帧静态条带 + 3×3 总览
python3 tools/remotion-engine/render_walk_clips.py              # 全部 9 套
python3 tools/remotion-engine/render_walk_clips.py whale kimi   # 只做指定角色
#   → preview/<char>_walk.gif（3s / 25fps，每 120ms 换一格）
#   → preview/<char>_strip.png（8 帧并排、脚底同一条地面线，静态看抬腿与落脚）
#   → preview/walk_all8_sheet.png

# 3. 审阅 B：网页里 120ms 逐帧播放，可点单帧定格
node tools/remotion-engine/walk_preview.mjs --port 8099
```

算法在 `tools/remotion-engine/walk_cycle_v14.mjs`：

1. **抠图**：只对与画布边缘连通的浅色背景做 flood fill，白裙 / 白袜 / 白发不会被吃掉。
2. **分层**：上半身（含裙摆、尾巴、长发）一层，腿层一条腿的切片一份；
   腿像素按脚底重心 `cx` 与脚踝轮廓自动定横向范围，
   尾巴 / 披风这类偏蓝紫附属物判为非腿像素，不跟着腿摆动。
3. **步态**：8 个固定姿态，全部绕髋关节刚性旋转 + 竖直补偿（见上节）；
   上半身起伏 `bodyBob` 由 `hipDrop` 算出（每轮两次重心下沉）。
4. **遮罩**：腿层裁剪在 `legTop..GROUND_Y`，绝不破裙、绝不踩穿地面线。

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
