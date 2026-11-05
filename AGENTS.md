# 本仓库创作入口

先读根目录 `agent.md` 的“现行覆盖规则”，其中第29–31条是 Day12 与人格移植的本轮口径。

写/修 Day 连载、求职梗、人设或剧情衔接时，读取 `00_运营总览/skills/剧情生成/SKILL.md` 及其 persona/beats/research 引用。
主角仍是大肥鱼/鲸鱼娘，外形和关系不变，魔丸只是移植人格。不得再写“你不是大肥鱼”。
待审稿不能覆盖已锁定旧集。真实模型创作使用 `tools/agent/create_episode.py`，不能把 mock 或文本结构通过当作人设已生效的证据。

本工作区来源和未同步媒体边界见 `SOURCE_IMPORT.md`。

## 用户交付偏好：每次改完推送

后续每次完成有文件修改的任务，检查后提交并推送到本会话固定分支 `arena/d4e2b5da-newday`：`git push origin arena/d4e2b5da-newday`，报告实际提交号/链接。不得只改本地却说已经推送；失败要明确报告。用户未要求时不自动合并PR、不发布平台评论或视频。

## 导演与稳定画面

用户提到画面抖动、站桩、镜头重复或重做视频时，先读 `.claude/skills/day-series-director/SKILL.md`。按当前口播写音画双栏/逐镜卡，再更新directorVersion=1的spec；默认固定机位、idleMotion可关闭，不用晃动代替事件。视觉姿态与接触校准分开，不能冒称28个历史动作已全部接入。
Day12当前导演计划为 `Day12/Day12分镜_导演版.md` 和 `tools/day12制作/episode.spec.mjs`（planning/measured=false）；已恢复当前样片用的原图/字体，并生成无声四段样片；音源与完整接触未齐，不声称已制作/验收有声全片。样片、自检与复现见 `Day12/样片/README.md`。
