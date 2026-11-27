# 鲸鲸 · B 站鲸鱼人设 skill

> 本体：[dsh-bili-whale](https://github.com/Alterssss/dsh-bili-whale)（MIT）
> 方法论：[nuwa-skill](https://github.com/alchaincyf/nuwa-skill)（MIT）
> 黑话查梗：[cnmeme.wiki](https://cnmeme.wiki) 公开 API（API 行为对齐 [dsh-memewiki](https://github.com/thawline/dsh-memewiki)，MIT）

一套**满口黑话的完整人设 skill**：她把 dsh-bili-whale 的全部功能（刷片、看片、写评论、私信、动态、日记、记忆、生物钟）继承下来，并套上「鲸鲸」的黑话人格与表达 DNA；说话前会用 cnmeme.wiki 实时查梗（像梗才查、同词 10 分钟一次、带缓存）；孙吧味是**档位开关**，默认关闭。

## 目录

```
dsh-bili-whale-persona/
├── SKILL.md                  # 核心（每次加载）
├── FIDELITY.md               # 自检与验收记录
├── README.md                 # 本文件
├── references/
│   ├── capabilities.md       # 继承的全部命令（48 个）
│   ├── black-talk.md         # 黑话说话法 + 查梗引擎 + 句式库
│   ├── boundaries.md         # 伦理红线 + 审核标记（✅/⚠️/❌）+ 反模式
│   ├── sunba-tier.md         # 孙吧味三档（默认 off）
│   ├── gate.md               # 发言三态门禁
│   ├── voice.md              # 原话库（黑话版）
│   ├── casebook.md           # 案例库
│   ├── demo.md               # 三档效果预览
│   ├── sealed-sunba-original.md # 原始孙吧人设（封存，不加载）
│   └── research/             # 调研底稿（女娲口径）
├── data/hot_memes.json       # 离线兜底热梗（635 条；主用 API）
├── scripts/
│   ├── meme_lookup.py                # cnmeme.wiki 查梗（像梗才查/10分钟/缓存）
│   ├── check_comment.py              # 发言前自检（含黑话密度）
│   ├── build_review_queue.py         # 生成评论审核队列（只审不发）
│   ├── patch_bili_whale_no_persona.py   # 去掉 B 站插件的人设卡（幂等）
│   ├── patch_bili_whale_skill_persona.py# 让 B 站插件改读 skill 生成的人设（幂等）
│   └── build_hot_memes.py            # 重新生成离线兜底
└── plugin/                           # skill 插件：人设开关 + 评论审核
```

## 怎么用

1. **读 SKILL.md**：先读 `SKILL.md`（人设与规则），再按场景读 `references/`。
2. **查梗**：`python scripts/meme_lookup.py --text "哈基米是什么梗"`（像梗才查；同词 10 分钟一次；带缓存）。
3. **跑自检**：`python scripts/check_comment.py --text "..." --tier off`（含黑话密度检查）。
4. **开关人设**：`plugin/` 已安装；在「设置 → 鲸鲸 · 人设」里启动/停止、选档。
5. **评论审核**：在「设置 → 鲸鲸 · 评论审核」里逐条看评论和全损黑话草稿，**只审不发**；队列用 `python scripts/build_review_queue.py` 生成。
6. **去掉 B 站插件的人设卡 / 改用 skill 人设**：`python scripts/patch_bili_whale_no_persona.py` 与 `python scripts/patch_bili_whale_skill_persona.py`（重装插件后重跑）
7. **看效果**：`references/demo.md` 有三档对照；`references/black-talk.md` 有黑话句式库。

## 孙吧味档位

| 档位 | 值 | 说明 |
|---|---|---|
| 黑话常态（默认） | `off` | 满口黑话，损友但友好，不阴阳、不设局 |
| 轻损黑话 | `light` | 黑话 + 鉴定体，损事不损人 |
| 孙吧全损（备用） | `on` | 黑话拉满，只加载去攻击子集；❌ 封存档不加载 |

## 合规

`references/boundaries.md` 里有完整的**审核标记**：✅ 过审 / ⚠️ 有条件 / ❌ 过不了审（待确认）。
❌ 档默认全部封存、不启用。

## 许可

本 skill 自身 MIT。上游 dsh-bili-whale、nuwa-skill、geng-skill 各自 MIT，见各自仓库的 LICENSE/NOTICE。
