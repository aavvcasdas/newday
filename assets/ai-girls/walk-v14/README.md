# walk-v14 · 8 帧行走 / 待机图集（侧 3/4 视角）

对标 [`tqlearning/ai-girl-chatgpt-pets`](https://github.com/tqlearning/ai-girl-chatgpt-pets) 的
`running-right` / `running-left` 规格：**8 帧、每帧 120ms、一轮 0.96s = 一个双步周期**，
单格固定、不逐帧裁切、不逐帧重新居中。

## 目录

```
walk-v14/
  source/                     本轮重新生成的侧 3/4 立绘（AI 生成，白底）
    whale.png gpt.png ...     384×416 单元格归一化前的原图
  <atlas>.png                 8 格 × 384×416 成品图集（透明 PNG）
```

单格：`384 × 416`，脚底基线 `y = 406`，角色高度 `372px`，水平居中。
图集宽度固定 `8 × 384 = 3072`，第 0 列起顺序播放，循环。

## 本轮已切换的图集

| 图集 | 素材 | 说明 |
| --- | --- | --- |
| `whale_walk_side_2leg` | `source/whale.png` | 鲸鱼娘侧 3/4 八帧步态 |
| `whale_idle_side_pet` | 同上 | 同体呼吸待机，走停零跳变 |
| `whale_walk_happy_2leg` / `whale_walk_sad_2leg` | 同 `whale_walk_side_2leg` | 步态与体型完全一致，情绪差异交给表演层 |
| `whale_idle_happy_pet` / `whale_idle_sad_pet` | 同 `whale_idle_side_pet` | 同上 |
| `gpt_walk_2leg` | `source/gpt.png` | 龙女 GPT 八帧步态 |
| `gpt_idle_pet` | 同上 | 同体呼吸待机 |

其余角色（gemini / claude / kimi / qwen / zai / doubao）暂时仍走 `walk_rig_builder.mjs` 的
v13 蒙皮步态，等待按同一「腿可见」规格重画侧面立绘后再切换。

## 生成方式

```bash
# 1. 重新烘图集（改 source/ 或调参后跑）
node tools/remotion-engine/build_walk_v14.mjs whale gpt

# 2. 审阅：120ms 逐帧播放，可点单帧定格
node tools/remotion-engine/walk_preview.mjs --port 8099
```

算法在 `tools/remotion-engine/walk_cycle_v14.mjs`：

1. **抠图**：只对与画布边缘连通的浅色背景做 flood fill，白裙 / 白袜 / 白发不会被吃掉。
2. **分层**：上半身（含裙摆、尾巴）一层；下半身按脚底重心 `cx` 切成左右两腿，
   尾巴这类偏蓝紫的附属物判定为非腿像素，不会跟着摆动。
3. **步态**：8 个固定姿态，左右腿 180° 反相；`lift` 抬脚、`swing` 前后摆、`toe` 脚掌微转，
   站立腿不动、抬起的腿离地。上半身起伏 `bodyBob` 由 4π 相位算出（每轮两次重心下沉）。
4. **遮罩**：腿层统一裁剪在裙摆线以下，抬腿时腿自然「滑进」裙摆里，绝不破裙、绝不出现第三条腿。

## 与 v13 的两个关键修正

- **帧数对齐**：v13 生成 16 格图集，但引擎按 `_2leg` 判定只播 8 列，
  等于每轮只播到前 4 个姿态（0,0,1,1,2,2,3,3），看上去就是「抖腿不迈步」。
  v14 一律 8 格 8 姿态，`walk_rig_builder.mjs` 的 `WALK_FRAMES` 也同步改为 8。
- **腿与裙的关系**：不再把整条腿切出来做双骨骼蒙皮（会露关节缝、灰腿鬼影、悬空鞋），
  改为「整层腿 + 裙摆裁剪」，几何上不可能出现残腿。

## 素材来源

`source/*.png` 为本轮由 AI 图像生成、按各角色既有设定重新绘制的**侧 3/4 全身立绘**
（挺背直立、双腿可见、白底），不是上游 pets 仓库的 PNG/GIF，也不含其美术文件。
上游仓库仅作为**帧数、节拍、图集布局**的规格参考。
