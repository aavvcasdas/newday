# 魔丸 Agent

仓库里的可运行入口：`python3 tools/agent/run.py --message "你的问题"`

基础链路：输入 → 只读现有运营笔记标题 → 组装魔丸提示 → 调模型 → 输出回复。不后台抓取，不自动发布，不写记忆。

## 剧情生成：人设和故事卡必须真的进提示

写 Day 系列时显式加载本地 skill：

```bash
python3 tools/agent/run.py \
  --skill 剧情生成 --day 12 --guest 豆包 \
  --message "重写 Day12：开头找新朋友帮忙，用求职梗接回昨天的岗位"
```

这条链路会追加读取：

1. `00_运营总览/skills/剧情生成/SKILL.md`；
2. 同目录 `references/persona.md`（稳定人设）与 `references/continuity.md`（连载方法）；
3. `Day11/Day11配音台词.txt`（上集锁定事实）、`Day12/story_card.json`（当集任务）和对应客人行为行；
4. `agent.md` 文首当前创作规则。

不会读取旧 Day12 草稿作为新稿上下文，避免山姆护照等旧梗重新锚定输出；也不会加载同行插件的主人、大肥鱼身份或浏览器行为。

剧情任务强制使用 `creative` 模式。即使上一集台词含「敲代码」，也不会误用普通工作模式的「不要插玩笑」提示。缺 skill、故事卡、上集或规则文件时返回 `skill` 错误，不能静默降级为只有人格名字的通用聊天。

## 模型

不设置 `MOWAN_PROVIDER` 时，命令返回 `unconfigured`，不会编一条假回复。

要接真实模型，在环境里设置，不要写进仓库：

- `MOWAN_PROVIDER=openai`
- `MOWAN_API_BASE`：兼容 `/chat/completions` 的地址，带 `/v1`
- `MOWAN_API_KEY`
- `MOWAN_MODEL`

没配齐时命令会返回 `unconfigured`，不会假装已经生成。只有测试链路时才显式使用 `MOWAN_PROVIDER=mock`；mock 回复不是剧情生成结果。

## 记忆

只读 `00_运营总览/连续更新记忆.md`、`agent.md`、`00_运营总览/风格_黑话放开_2026-10-28.md`。记录 ID 是 `ops-notes:` 加相对路径。不新建第二套库，不改这些文件。

兴趣只认两类：用户这句话里明确说感兴趣，或这些笔记里已有的 `兴趣：` 行。对不上就不插话。

## 验证

```bash
python3 -m unittest tools.tests.test_mowan_agent tools.tests.test_plot_skill
MOWAN_PROVIDER=mock python3 tools/agent/run.py --skill 剧情生成 --day 12 --guest 豆包 --message "测试提示链路"
```

单测检查实际发给 provider 的消息，不只检查文件是否存在。
