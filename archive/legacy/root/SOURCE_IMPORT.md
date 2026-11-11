# 上游分支导入说明

按用户要求从 `https://github.com/aavvcasdas/ai-yunying/tree/arena%2F9941452f-ai-yunying` 拉取并检查。

- 上游提交：`d7f1f16b62eed65ba05cac908ec000246c0eae5c`。
- 本会话仍工作于 `arena/d4e2b5da-newday`，没有切换、创建或推送上游分支。
- 当前仓库初始只有 README；本轮将上游文档、文本、源码与配置导入当前工作分支，便于持续修改与测试。
- 导入四百五十二个轻量文件，共约 7.23 MB；未复制视频、音频、位图、字体和其他二进制媒体，不为本次修稿引入大量历史成片。原始媒体仍在上游提交中。
- 因此旧 README/制作记录里提及的历史媒体路径是上游归档，不表示当前工作区已下载或可直接重渲。本轮只验证文本/代码流程，不声称历史视频或 final 门禁通过。
- 导入扩展名：md/txt/py/js/mjs/cjs/json/yaml/yml/toml/ini/cfg/html/css/svg/sh/srt/gitignore，加无扩展名 LICENSE；单文件不超过 2 MB。
- 本轮实际修改入口：`Day/Day12/`、剧情 skill、`tools/agent/`、`tools/剧本/剧情.py`、相关回归测试与根入口/运营记忆。Day11 文案和台词保持上游字节不变。

## 无声样片的定向素材恢复

本轮用户要求先看样片后，从同一固定提交按Git blob取回四张原角色PNG和三份字体（约8.47MB），逐个核对Git blob SHA1与SHA256。没有全量拉取历史媒体，也没有取旧集配音代替Day12。清单为 `tools/day12制作/sample_assets.json`，恢复入口为 `restore_sample_assets.py`；媒体缓存按.gitignore排除，Git保留当前实际样片与自检报告。
