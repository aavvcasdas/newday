# 02 · 插件能力调研

> 来源：`dsh-bili-whale` v1.0.2 安装目录（README、`tools/bili.mjs` 命令表、`behavior/`）

## 命令总数

从 `tools/bili.mjs` 的 `map` 统计：**48 个命令**（另含 activity 相关）。

## 分组

- 看与选：feed / discover / round / batch-debrief / video / subtitles / comments / watch-video / debrief / search / covers / whois / recon / ai-share（14）
- 记与生活：life / diary / expression / corpus / night / quota / likes / stickers / behavior（9）
- 说（写）：comment / reply-draft / comment-del / dm / dm-batch / dynamic / dynamic-image / dynamic-edit / like / follow / fav（11）
- 监听复核：session / thread / check-comment / check-dynamic / check-mention / watch / comment-await / comment-digest / dm-await / notify（10）
- 运维：deps / selftest / traffic / config（4）

## 安全机制（继承）

- 写操作 `--dry` / `--go` 两段式
- 发前 `session` 确认账号
- 发后 `check-comment` / `thread` 回读
- 一次一条；风控退避（10031/12051/12015）
- 权限闸：安静时段 / 限额 / 审批队列 / 自主名单

## 与先验不一样的地方

- **新增**：功能远超「刷视频」——有生物钟、心情、分享欲、两本日记、42 张表情包。
- **加深**：安全机制不是装饰，是代码强制的。
