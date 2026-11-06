---
name: day-series-director
description: >-
  为本仓库DayN视频设计、检查与修复分镜。用户提到视频抖动、人物原地晃、分镜不动、
  镜头重复、画面跟不上台词、重做视频、增加动作、加强运镜或丰富每个镜头时使用。
  读取当集锁定台词、实测轴（如有）、姿态/道具/接触注册表，先输出音画双栏导演表，
  再更新episode.spec.mjs及结构检查；不把文字规划或占位预览当作成片验收。
compatibility: Node.js 22 and Python 3; run npm ci --prefix tools/engine for engine checks.
---

# Day Series Director

## Day13+ 口径（2026-11-06，优先于本文件其余旧引擎描述）

用户要求日更系列 **Day12 以后** 的分镜与人物统一改纸艺 Q 版，动作参照 pets 项目，且 **同屏最多 2 人**。
历史 Day0–Day12 不改不重渲。见 `agent.md` 第33条、`tools/角色Q版库/README.md`、`tools/engine/README.md`。

- spec 写 `paperVersion:1`，渲染器 `tools/engine/render_paper_episode.mjs`，契约 `paper_contract.mjs`。
- **每镜 actors 最多 2 个**；要第三人就拆镜或让角色退场，不得缩小塞满画面。
- 动作只能引用 `tools/角色Q版库/pets/<id>/pet.json` 里真实存在的状态；未生成必须报错，不许冒充。
- 有 `walk` 必须配 `walk-*` 真步态；禁止 `idleMotion/livingBody/bodyEvents` 与 bounce/hop/sway。
- `framing` 要真的改变构图；逐镜构造字段照旧写全（focus/entry/action/trigger/result/reaction/exit/transition/continuity）。
- 新动作先补 `generations/<id>/<pose>.png` → 登记 `cast.json` → `build_pets.mjs --check` → 出动作目录目检，才能在分镜里引用。
- 无指定音源只能 planning/measured=false 无声结构样片（`--silent-planning`）。

## 开始前

1. 读根目录 `agent.md` 覆盖规则和 `AGENTS.md`。需要改剧情才调用 `00_运营总览/skills/剧情生成/SKILL.md`，导演任务不擅改锁字。
2. 读当集文案/TXT、当前 `episode.spec.mjs`、最近验收与用户纠正。Day12使用回归/@豆包/米饭大饼稿，不换回山姆护照旧稿。
3. 用户要先看样片但缺指定音源时，可以走独立 `createPlanningPreview`/`tools/day12制作/render_sample.mjs` 无声入口，保持planning/measured=false，持续标识无声/规划/节选；不得把spec改成ready或捏造词轴来绕过生产门禁。先恢复并核验原素材，不能用占位脸。
4. 有指定音源则读哈希、实测 `voice_alignment.json`、字幕轴；没有则 `measured=false`、`status=planning`，不造正式cue或拿SRT猜词时。
5. 读 `tools/engine/README.md`、`camera_plan.mjs`、`schema_validator.mjs`、`prop_registry.mjs` 与 `tools/互动元素/actor_contacts.mjs`。
6. 区分既有 `whale_poses.mjs` 视觉姿态、八种已校准接触姿态、另一套28个历史语义动作。先看素材可用性；不把姿态换名说成动作已实现，不随意解禁侧脸/闭眼/接触。

## 核心规则

- 默认镜头固定；使用framing七种预设。每镜最多一个显式push，可推/拉/平移，结束后锁住，不叠全局正弦。开场也不隐式强制三段推拉。
- 角色只保留极轻连续呼吸；可用 `idleMotion:0` 完全关闭。呼吸、尾摆、整体弹跳和相机移动都不算事件。不能靠测试要求“位移越大越好”。
- 每镜必须有可见事件：走入/交接/错误道具/判断反应/纠偏/结果。允许稳定的反应近景和道具特写，不为满足密度硬加敲碗或接触。
- 动作按准备→接触/触发→结果→反应→停留。词点对应台词动词/重音；一个主视觉，其余延迟出现。
- 通过景别拆信息：wide建立空间，two_shot建立关系，medium演动作，close演判断，insert看纸/岗位/名牌。相邻镜头不能景别、中心、人物排列全部相同。不是每句强切，不设每镜三秒/图片占比等新配额。
- 重要结果成形后至少留0.35秒，结尾结果规划留0.6–0.9秒；音源到位后用词级时间复核，不够就改动作规划，不能静默改台词、音源或语速。停留可在末句内完成，不擅加片尾卡或覆盖尾部授权。
- 手掌/指尖必须有真实校准；未校准姿态只可作视觉表演。缺翻纸/持物素材可用明确的连续性切镜，不画假手，不伪造完整动画。
- 不擅自生成新脸、换风格、加乌鸦/剪影或食物特效，不拿非实测比率背书。本引擎Canvas画帧、ffmpeg编码；未发现zoompan时不把它写成既定根因。

## 每镜导演字段（directorVersion=1）

`id/fromLine/toLine/framing` 与 `direction`：
第一视觉focus、入镜entry、主动作action、类型kind、触发trigger/wordLine/wordChar、结果result/resultLine/resultChar、成形耗时settleSeconds、停留holdSeconds、反应reaction、出镜exit、下一镜transition、continuity.in/out。

先写 `DayN/DayN分镜_导演版.md` 的口播/画面双栏与导演卡，再把同一方案写入 `tools/dayN制作/episode.spec.mjs`。绑定 `sourceScriptSha256`；任何改字后旧分镜必须失败，不能悄悄套旧台词。

## 检查和交付

```bash
npm ci --prefix tools/engine
node --test tools/engine/*.test.mjs
node tools/engine/check_storyboard.mjs --spec tools/day12制作/episode.spec.mjs --script Day12/Day12配音台词.txt --report tools/day12制作/storyboard_check.json
python3 tools/gate.py --day 12 --stage script
```

样片生成后用ffprobe核验参数、ffmpeg全片解码，再检查元数据的固定/单运镜、显式走位、同落点切镜和字幕，并抽取**编码后的帧**目检；静止脸部ROI的像素检查要排除显式表情切换/运镜，不把环境动效算人物抖动。

输出导演表、spec、结构检查及待检关键帧清单。结构通过不等于视觉/音频/final通过。
先检查开场、错误发生、纠偏、结尾四段，素材和指定音源到位才做有声试剪→人工动态审看→推广整集；不得把合成占位图/GIF当正片。
只有资产和接触审核完成后才移除spec的planning状态；正式渲染仍须指定音频SHA256、measured轴、词级触发/停留、字幕与全片门禁。

完成实际修改与检查后，按用户偏好提交并推送当前固定工作分支，报告真实提交号；不自动发布平台内容。
