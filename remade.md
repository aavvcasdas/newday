# 番外 MV 资产重构与 Day 系列集成说明 (Remade)

## 1. 资产重构概览
本次重构基于番外 MV v11 全身舞步版（`把回忆拼好给你_v11全身舞步版.mp4`），将角色与动作资产提取为标准化模块，以便在后续 Day 系列（Day13+）中直接调用，无需重新生成。

## 2. 核心资产表（已验收）
| 资产类别 | 路径 | 状态 | 说明 |
| :--- | :--- | :--- | :--- |
| **成品视频** | `番外MV/把回忆拼好给你/成片/把回忆拼好给你_v11全身舞步版.mp4` | ✅ 通过 | 1681 帧，1920×1080@30fps，AAC 拷贝 |
| **角色精灵** | `assets/ai-girls/dance-v11/*.png` | ✅ 通过 | 8 位角色（鲸娘/克劳德/双包/GPT/奇米/千问/载/双子） |
| **动作元数据** | `tools/番外MV_全身舞步/data/sprites.json` | ✅ 通过 | 包含 `dance`/`kick`/`sadDance` 循环定义 |
| **关键帧抽查** | `tools/mv_extra/cache/v11_stills.png` | ✅ 通过 | 16 镜头（S01-S16）视觉校验图 |

## 3. Day 系列直接调用指南
在下一个 Day（如 Day13）中，无需重新运行 `build_dance.py`，直接引用以下路径和结构：

### A. 角色引用 (Characters)
```javascript
// 示例：在 Day 系列渲染脚本中直接引用
const characters = {
  whale: { file: 'projectassets/ai-girls/dance-v11/whale.png', cellW: 384, cellH: 416, footY: 408, standPx: 400 },
  gemini: { file: 'projectassets/ai-girls/dance-v11/gemini.png', cellW: 384, cellH: 416, footY: 408, standPx: 400 },
  doubao: { file: 'projectassets/ai-girls/dance-v11/doubao.png', cellW: 384, cellH: 416, footY: 408, standPx: 400 },
  kimi: { file: 'projectassets/ai-girls/dance-v11/kimi.png', cellW: 384, cellH: 416, footY: 408, standPx: 400 },
  qwen: { file: 'projectassets/ai-girls/dance-v11/qwen.png', cellW: 384, cellH: 416, footY: 408, standPx: 400 },
  claude: { file: 'projectassets/ai-girls/dance-v11/claude.png', cellW: 384, cellH: 416, footY: 408, standPx: 400 },
  gpt: { file: 'projectassets/ai-girls/dance-v11/gpt.png', cellW: 384, cellH: 416, footY: 408, standPx: 400 },
  zai: { file: 'projectassets/ai-girls/dance-v11/zai.png', cellW: 384, cellH: 416, footY: 408, standPx: 400 }
};
```

### B. 动作引用 (Animations)
- **标准循环 (dance/kick)**：16 帧，1.7s 总时长（平均 ~106ms/帧）。
- **悲伤循环 (sadDance, 仅鲸娘)**：16 帧，2.56s 总时长（160ms/帧）。
- **层级逻辑**：左右腿分层交替外摆（`build_dance.py` 逻辑），上身与手臂同步倾斜。

### C. 渲染复用
- **输入源**：`《把回忆拼好给你》.mp4`（原音轨）+ `assets/ai-girls/dance-v11/*.png`（角色）。
- **输出目标**：`番外MV/把回忆拼好给你/成片/把回忆拼好给你_v{N}版.mp4`。
- **校验脚本**：`python3 tools/番外MV_全身舞步/verify.py`（确保帧数 1681 与 AAC 哈希一致）。

## 4. 不修改项（严禁变动）
- 目录 `tools/番外MV_全身舞步/` 及其内部 `data/`, `src/`, `build_dance.py`, `verify.py`。
- 资产目录 `assets/mv-extra/` 及 `assets/ai-girls/dance-v11/`。
- 历史成品 `番外MV/把回忆拼好给你/成片/` 下的旧版本文件（v3-v12）。

## 5. 下一个 Day 的操作流程
1. **读取** `agent.md` 中的角色与动作清单。
2. **引用** `sprites.json` 中的动画结构。
3. **合成** 新的 Day 场景（如 Day13），复用上述角色贴图与动作循环。
4. **校验** 最终输出帧数与音频（若涉及全片重渲染）。
5. **记录** 结果至本文件（`remade.md`）的后续章节。

---
*重构完成：2026-11-06 | 分支：arena/4b6175d5-newday*
