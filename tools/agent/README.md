# 大肥鱼角色 / 魔丸人格 Agent

**身份和现行外形不变，只移植人格。** `character_id=dafeiyu`、`visual_id=whale_girl_existing`、`persona_id=mowan`。
系统提示源 `persona.py`，聊天和创作共用；不会把鲸鱼娘换成另一个魔丸角色。

## 写剧情：用创作入口

```bash
python3 tools/agent/create_episode.py --day 12 --guest 豆包 --prepare-only
python3 tools/agent/create_episode.py --day 12 --guest 豆包
```

- `prepare-only` 不调用模型，输出实际消息、七个输入的路径和 SHA256；不是生成结果。
- 创作输入包含：现行 agent.md 覆盖规则、剧情 SKILL、persona/beats/research 三个引用、上集锁稿全文、当集方向全文。不是只读记忆标题。
- 使用明确的 `creation` 模式，防止“工作不要插玩笑”把剧情写成工作汇报；准确性与事实边界照旧。
- 默认不写任何文件，不覆盖当集待审稿或上集锁稿。模型输出先跑文本结构检查；返回 `candidate` 仍需人工审读，不是用户已锁字。
- 无关/空白/Markdown 输出、网络错误、未配置模型、缺少输入文件均非零退出。mock 被拒绝为创作证据。
- 目前这份 Day12 修订稿由本轮编辑完成；测试用 CaptureProvider 检验消息装配，**不是远程模型创作质量测评**。

## 普通聊天/工作

```bash
python3 tools/agent/run.py --message "你的问题"
```

该入口维持只读记忆目录和标题检索，用于聊天/工作，不是剧情创作入口。不会自动抓取、发布或写记忆。
工作与情绪支持场景收起挑刺；不能因此把剧中魔丸人格也删掉。

## 模型配置

不设置 `MOWAN_PROVIDER` 时返回 `unconfigured`，不编假回复。
真实模型从环境注入，不要写入仓库：

- `MOWAN_PROVIDER=openai`
- `MOWAN_API_BASE`：兼容 `/chat/completions` 的端点，带 `/v1`
- `MOWAN_API_KEY`
- `MOWAN_MODEL`

聊天入口可显式用 `MOWAN_PROVIDER=mock` 做通信烟测；其 `model_configured=false`，不得冒充真实模型回复。
创作入口直接拒绝 mock。端点还受当前执行环境的网络权限约束，配置齐全不代表网络已验证。

## 只读记忆

聊天只检索 `00_运营总览/连续更新记忆.md`、`agent.md`、`00_运营总览/风格_黑话放开_2026-10-28.md` 的标题。
记录 ID 为 `ops-notes:` 加相对路径，不另建数据库。兴趣只认用户明确表达或已有的 `兴趣：` 行。
创作不依赖这些标题命中，必须加载规定的实际文件内容；失败不降级为无上下文闲聊。
