# 番外 MV 角色与动作资产（v11 全身舞步版）

## 1. 快速验收结果
- **技术全片校验**：已通过（`verify.py`）。1920×1080 @ 30fps，1681 帧，AAC 位流哈希 `1058f033592b6188f21f5d13bbe6f09680f36019e9ea0c1a0323ee0d18c18387` 完全一致。
- **动作层级校验**：已通过（`test_dance.py`）。8 位角色左右腿、上身及循环时长（16 格 / 1.7s）符合预期。
- **渲染输出**：成品已存在于 `番外MV/把回忆拼好给你/成片/把回忆拼好给你_v11全身舞步版.mp4`（约 20.38 MiB）。
- **关键帧抽查**：16 镜头（S01-S16）对应抽帧已在 `tools/mv_extra/cache/v11_stills.png` 中。

## 2. 角色资产清单（可直接用于 Day 系列）
以下角色及其动作定义已提取自 `tools/番外MV_全身舞步/data/sprites.json`。

| 角色名 | 预览路径 | 舞步文件路径 | 动画类型 | 帧数/时长 | 备注 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **whale** (鲸娘) | `projectassets/ai-girls/animated-v10/whale.png` | `projectassets/ai-girls/dance-v11/whale.png` | `dance` / `kick` / `sadDance` | 16 帧 / 1.7s | 包含悲伤舞步（S08 饭盆动作） |
| **gemini** (双子) | `projectassets/ai-girls/animated-v10/gemini.png` | `projectassets/ai-girls/dance-v11/gemini.png` | `dance` / `kick` | 16 帧 / 1.7s | |
| **doubao** (双包) | `projectassets/ai-girls/animated-v10/doubao.png` | `projectassets/ai-girls/dance-v11/doubao.png` | `dance` / `kick` | 16 帧 / 1.7s | |
| **kimi** (奇米) | `projectassets/ai-girls/animated-v10/kimi.png` | `projectassets/ai-girls/dance-v11/kimi.png` | `dance` / `kick` | 16 帧 / 1.7s | |
| **qwen** (千问) | `projectassets/ai-girls/animated-v10/qwen.png` | `projectassets/ai-girls/dance-v11/qwen.png` | `dance` / `kick` | 16 帧 / 1.7s | |
| **claude** (克劳德) | `projectassets/ai-girls/animated-v10/claude.png` | `projectassets/ai-girls/dance-v11/claude.png` | `dance` / `kick` | 16 帧 / 1.7s | |
| **gpt** (GPT) | `projectassets/ai-girls/animated-v10/gpt.png` | `projectassets/ai-girls/dance-v11/gpt.png` | `dance` / `kick` | 16 帧 / 1.7s | |
| **zai** (载) | `projectassets/ai-girls/animated-v10/zai.png` | `projectassets/ai-girls/dance-v11/zai.png` | `dance` / `kick` | 16 帧 / 1.7s | |

## 3. 动作结构说明（Day 系列直接复用）
- **基础循环**：两拍一轮（1.7 秒），16 格循环。
- **动作类型**：
  - `dance`：侧步点地（标准循环）。
  - `kick`：幅度更大抬脚（高强度循环）。
  - `sadDance`（仅鲸娘）：悲伤镜头减幅动作（160ms/帧）。
- **层级结构**：左右腿分层交替外摆与抬脚，配合手臂和上身重心轻倾。
- **文件路径**：
  - 角色贴图：`assets/ai-girls/dance-v11/{name}.png`
  - 元数据：`tools/番外MV_全身舞步/data/sprites.json`

## 4. 渲染指令参考（用于下一个 Day 快速复现）
```bash
# 1. 准备环境（已完成）
python3 tools/mv_extra/v8/setup_v8.py
python3 tools/番外MV_全身舞步/build_dance.py
python3 tools/番外MV_全身舞步/test_dance.py

# 2. 渲染全片（已完成，成品路径见上）
cd tools/番外MV_全身舞步
# 环境变量可根据需要调整：MV_START, MV_FRAMES, MV_OUTPUT
NODE_OPTIONS="--max-old-space-size=8192" node --expose-gc render.mjs

# 3. 验收
python3 verify.py
```

## 5. 下一个 Day 的复用指南
- **人物引用**：直接读取 `assets/ai-girls/dance-v11/{name}.png`。
- **动作复用**：在 Day 系列脚本中，将 `sprites.json` 中的 `dance`/`kick` 动画结构（16 帧/1.7s）作为基础循环，配合 `build_dance.py` 中的层级逻辑（左右腿/上身/手臂）进行合成。
- **不修改项**：保留 `tools/番外MV_全身舞步` 目录及 `assets/mv-extra` 资产不变。

---
*生成时间：2026-11-06 | 分支：arena/4b6175d5-newday*
