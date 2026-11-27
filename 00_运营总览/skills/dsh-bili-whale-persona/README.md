# 鲸鲸 · B 站鲸鱼人设 skill

> 本体：[dsh-bili-whale](https://github.com/Alterssss/dsh-bili-whale)（MIT）
> 方法论：[nuwa-skill](https://github.com/alchaincyf/nuwa-skill)（MIT）
> 热梗素材：[geng-skill](https://github.com/MonloHua/geng-skill)（MIT，SSS/SS/S）

一套**完整人设 skill**：她把 dsh-bili-whale 的全部功能（刷片、看片、写评论、私信、动态、日记、记忆、生物钟）继承下来，并套上「鲸鲸」的人格与表达 DNA；孙吧味是**档位开关**，默认关闭。

## 目录

```
dsh-bili-whale-persona/
├── SKILL.md                  # 核心（每次加载）
├── FIDELITY.md               # 自检与验收记录
├── README.md                 # 本文件
├── references/
│   ├── capabilities.md       # 继承的全部命令（48 个）
│   ├── boundaries.md         # 伦理红线 + 审核标记（✅/⚠️/❌）+ 反模式
│   ├── sunba-tier.md         # 孙吧味三档（默认 off）
│   ├── gate.md               # 发言三态门禁
│   ├── voice.md              # 原话库
│   ├── casebook.md           # 案例库
│   ├── demo.md               # 三档效果预览
│   └── research/             # 调研底稿（女娲口径）
├── data/hot_memes.json       # SSS/SS/S 热梗素材（635 条，备用）
├── scripts/
│   ├── build_hot_memes.py            # 重新生成热梗素材
│   ├── check_comment.py              # 发言前自检
│   └── patch_bili_whale_no_persona.py# 去掉 B 站插件的人设卡（幂等）
└── plugin/                           # skill 插件：人设总开关 + 档位
```

## 怎么用

1. **读 SKILL.md**：先读 `SKILL.md`（人设与规则），再按场景读 `references/`。
2. **跑自检**：`python scripts/check_comment.py --text "..." --tier off`
3. **开关人设**：`plugin/` 已安装；在「设置 → 鲸鲸 · 人设」里启动/停止、选档。
4. **去掉 B 站插件的人设卡**：`python scripts/patch_bili_whale_no_persona.py`（重装插件后重跑）
5. **看效果**：`references/demo.md` 有三档对照；`references/sunba-tier.md` 有「中性 vs 轻损」逐项对比。

## 孙吧味档位

| 档位 | 值 | 说明 |
|---|---|---|
| 中性（默认） | `off` | 损友但友好，不阴阳、不设局 |
| 轻损 | `light` | 加鉴定体，损事不损人 |
| 孙吧全损（备用） | `on` | 只加载去攻击子集；❌ 封存档不加载 |

## 合规

`references/boundaries.md` 里有完整的**审核标记**：✅ 过审 / ⚠️ 有条件 / ❌ 过不了审（待确认）。
❌ 档默认全部封存、不启用。

## 许可

本 skill 自身 MIT。上游 dsh-bili-whale、nuwa-skill、geng-skill 各自 MIT，见各自仓库的 LICENSE/NOTICE。
