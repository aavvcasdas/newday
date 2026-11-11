# 存档

**这里的一切都已废除。** 只留档，不使用，不维护，不修改。

2026-11 项目按《童话镇》立体童话书复刻的源码整体重构，现行做法在 `通用模板/`。重构之前仓库里的全部内容——成片、样片、引擎、模板、制作脚本、门禁、skill、旧的工作规矩——原样移到了 `重构前/`，目录结构保持不变（原来在仓库根的 `X/`，现在在 `存档/重构前/X/`）。

## 里面有什么

| 路径（在 `重构前/` 下） | 原来是什么 |
|---|---|
| `Day/Day0` … `Day/Day14` | Day 系列各集的文案、口播稿、分镜、方向稿、状态页。**没有任何一集的成片或配音在仓库里**（当年就没入库） |
| `番外MV/达拉崩吧/`、`番外MV/童话镇/`、`番外MV/童话镇-paper-popup/` | 三部像素 MV 的源码与成片（旧 2D 画法） |
| `番外MV/把回忆拼好给你/`、`番外MV/我怀疑大禹治水/` | 两部歌词 MV 的成片、样片、分镜 |
| `达拉崩吧.mp4` | 原曲素材 |
| `tools/remotion-engine/`、`tools/engine/`、`tools/mv_extra/`、`tools/mv_dayu/` | 旧的 Remotion 引擎与各片的制作代码 |
| `tools/音频/`、`tools/字幕/`、`tools/验收/`、`tools/gate.py`、`tools/剧本/` | 旧的对齐、混音、门禁、剧本体检脚本 |
| `video-fx/` | 更早的 Canvas 特效引擎 |
| `assets/` | 旧的角色立绘、动作图集、步态图集（约 590 MB） |
| `旧_claude_skills/` | 旧 skill：`day-series-director`、`pixel-mv-remake`、`lemo-opuscar` |
| `00_运营总览/skills/` | 旧 skill：`剧情生成`（人设、求职梗、剧情衔接）、`dsh-douyinxiaoqi` |
| `旧_AGENTS.md`、`旧_agent.md`、`旧_README.md`、`SOURCE_IMPORT.md` | 旧的工作规矩与项目说明 |
| `旧_gitignore.txt`、`package-lock.json` | 旧的仓库配置（改名是为了不让它在存档目录里继续生效） |
| `video-fx/旧_AGENT.md`、`video-fx/旧_agent_小写同名副本.md` | 原来的 `AGENT.md` 与 `agent.md`：两份内容完全相同，文件名只差大小写，在不区分大小写的系统上会互相覆盖，所以都改了名 |

## 哪些东西被新模板接了过去

- **角色**：旧 MV 的像素角色数据（`番外MV/童话镇/src/sprites_data.js` 等）复制到了 `通用模板/cast/source/`，是新图集的唯一来源。
- **字体**：ZCOOL KuaiLe 复制到了 `通用模板/engine/assets/fonts/`。
- **规划轴的估法**：`plan` 命令沿用旧项目的公式（3.36 字/秒），并有测试保证拿存档里的 Day14 台词重估出来的结果与 `Day/Day14/planning.json` 逐句一致。
- **配乐**：`audio_mix.py` 的芯片风配乐与压低逻辑照搬自 `tools/音频/mix_episode_bgm.py`。
- **画面红线、选角锁定、交付规矩**：并入了根目录的 `AGENTS.md`。

其余的——旧引擎、旧的逐集制作脚本、门禁、动作图集、立绘——**没有**接过去。

## 规矩

- 不改、不删、不往里加文件。
- 不从这里 import 代码。需要旧素材就复制出去用，并写明出处。
- 这里的 README、状态页、「当前入口」「现行口径」之类的说法全部过期，不代表项目现状。
