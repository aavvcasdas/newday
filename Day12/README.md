# Day12 修复入口

**当前：已生成33.43秒无声四段导演样片；未制作本集有声正片，`measured=false`。**

[播放样片](样片/Day12_四段导演样片_无声.mp4) · [样片自检与复现](样片/README.md) · [机器检查报告](../tools/day12制作/sample_check.json)

新音源接收记录：[voice_intake.json](../tools/day12制作/voice_intake.json)。推送时才发现远端上传，正常合并，未覆盖/改字节；当前播放的仍是先前生成的无声版本。

## 先看哪份

- [完整文案与人格/因果自检](Day12文案.md)
- [纯口播台词](Day12配音台词.txt)
- [当前方向、估时与资产边界](Day12方向.md)
- [九镜导演版（当前分镜权威）](Day12分镜_导演版.md)
- [导演spec（planning）](../tools/day12制作/episode.spec.mjs)
- [导演结构检查](../tools/day12制作/storyboard_check.json)
- [剧情 skill](../00_运营总览/skills/剧情生成/SKILL.md)
- [创作 Agent 使用说明](../tools/agent/README.md)
- [剧情修复记录](../tools/day12制作/修复验收.md)
- [导演修复验收与阻塞项](../tools/day12制作/导演修复验收.md)

## 修了什么

| 原问题 | 根因 | 本轮改动 |
|---|---|---|
| 人设像没应用，身份也变了 | 系统提示写“你不是大肥鱼”，运行时断言还禁止这个身份 | 身份、视觉、人格分层；大肥鱼/鲸鱼娘仍在，只有魔丸人格被移植，默认自称本鲸 |
| 有 Agent 却不参与剧情生成 | 聊天入口只检索标题；没专门装载剧情 skill 与上集全文 | 新增 create_episode.py，共用人格提示，明确 creation 模式，加载七项创作输入并记录哈希 |
| 旧剧情像清单，梗是插播 | 依靠复制上集原句过关，朋友翻车后任务没有变化 | 同一摞岗位：请人→提前开录取通知→追问拆穿→翻纸继续筛→圈出疑点，留下下集具体任务 |
| 正常请人动机会被门禁误杀 | 旧检查把第一次出现上集原句当第三拍起点，提前截断梗段 | 从邀请后定位梗，再检查其后的承接信号；允许开头说明请人原因，取消二十四行承接窗口 |
| 规则互相打架 | agent.md 与 README 有“呆萌覆盖率”和“去掉大肥鱼身份”的旧活动指针 | 更新第27–31条、根入口、运营记忆和 skill；旧集文本/成片不改 |

## 本集结构

1. 找新朋友来帮忙；笨鱼带岗位回归，回评论拿不准就 @豆包。本鲸拆台：以为开窍，原来是摇人。
2. 问能不能投，她直接开录取通知；追问夸口后道歉。笨鱼仍认下她作帮手，本鲸发现虽然不太聪明，但不需要米饭——招同事还是护食？
3. 本鲸不只拒绝：把通知翻面用来筛选；笨鱼把要求推给豆包，帮手继续圈出不确定项。
4. 保留老大的选择权与“可能”状态，具体待核问题接下集；“不吃米饭，也不能吃大饼”回扣，不宣称真实录取。

魔丸不是新立绘或新演员。性格落在具体反问和补救动作，不是给她贴“坏笑”的形容词。

## 导演修复

默认相机稳定，轻呼吸可关；镜头以可见事件、景别与结果停留驱动，不靠持续晃动。九镜导演表覆盖现行25行口播，旧六镜规划不再作分镜依据。原角色位图和字体已从固定上游恢复，四段无声样片已编码并检查；C07采用同落点正反面切镜，未实现手掌翻纸。新上传音源已收到并保留，尚未建立实测词轴；C05/C08接触和完整九镜仍待制作；spec保持planning。

## 验证

```bash
npm ci --prefix tools/engine
node --test tools/engine/*.test.mjs
node tools/engine/check_storyboard.mjs --spec tools/day12制作/episode.spec.mjs --script Day12/Day12配音台词.txt
python3 tools/agent/create_episode.py --day 12 --guest 豆包 --prepare-only
python3 tools/剧本/剧情.py --prev Day11/Day11配音台词.txt --txt Day12/Day12配音台词.txt --guest 豆包
python3 tools/gate.py --day 12 --stage script
python3 -m unittest discover -s tools/tests -v
```

本轮补齐隔离环境的numpy/ffmpeg/ffprobe后，Python 44项全部通过（包括此前跳过的5项媒体集成测试）。
Node引擎/导演测试30项全部通过；九镜规划结构检查通过但productionReady=false。
script 门禁通过只表示文本结构、红线及已存在导演计划的结构，不代表远程模型、配音、动态观影或成片 final 通过。

本工作区从用户指定上游提交导入轻量源码/文档，未全量同步历史音视频；本轮仅按固定blob恢复四张原角色PNG和三份字体（清单/恢复脚本在tools/day12制作），详见 [SOURCE_IMPORT.md](../SOURCE_IMPORT.md)。

用户已要求后续每次修改检查后提交并推送当前分支；发布平台评论/视频不在此授权范围。
