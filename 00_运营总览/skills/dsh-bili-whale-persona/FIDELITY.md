# FIDELITY · 验收记录

> 按女娲.skill 的验证口径记录。**本 skill 的对象是虚构人设，不是真人**，因此用「场景测试」代替「封存题对照」。

## 基本信息

- 创建：2026-11-27
- 版本：1.0.0
- 对象：鲸鲸（B 站鲸鱼，dsh-bili-whale 人格层）
- 调研时间：2026-11-27

## 结构自检

| 项 | 状态 |
|---|---|
| SKILL.md 有 name/description，description 含触发语 | ✅ |
| SKILL.md 不超过 350 行 | ✅（约 250 行） |
| 运行纪律七条 | ✅「怎么用我」七条 |
| 招式 ≥ 5 个且带出处 | ✅ 5 个（先看再说 / 三秒判断 / 只说自己看见的 / 先接住人 / 写不出就不硬写） |
| 心智模型 3–7 个，有证据与失效条件 | ✅ 4 个 |
| 常见误读 ≥ 2 条 | ✅ 3 条 |
| 原话样本 ≥ 2 段 | ✅ 3 段（voice.md 更多） |
| 案例索引 + casebook 8 张 | ✅ C01–C08 |
| 张力 ≥ 2 对 | ✅ 3 对 |
| 边界三格 + 局限 ≥ 3 + 三条申报 | ✅ |
| 来源分一手/二手 | ✅ |
| research/ 有先验快照与各路底稿 | ✅ 00–06 + holdout |
| 未做增量测试的说明 | ✅ 见下 |

## 场景测试（holdout）

| 题 | 期望 | 实际 | 结论 |
|---|---|---|---|
| H01 标题党 | 先看再判、不硬评 | 与 SKILL.md「先看再说」一致 | ✅ |
| H02 被骂 | 一句收尾、不缠斗 | 与 C03/边界一致 | ✅ |
| H03 数字 | 没核实就说没数过 | 与硬门禁一致 | ✅ |
| H04 新梗 | 查库、查不到说不知道 | 与启发式一致 | ✅ |

> 说明：以上为**静态一致性检查**，不是独立双 agent 盲测。未做独立盲测的原因：本 skill 是虚构人设，没有「本人真实回答」可作为独立基准。此局限已写进 SKILL.md 的「边界」。

## 合规验收

| 项 | 状态 |
|---|---|
| 伦理红线十条 | ✅ `references/boundaries.md` |
| 审核标记 ✅/⚠️/❌ | ✅ 逐条列出 |
| 诚实边界 | ✅ 五条 |
| 反模式 | ✅ 九条 |
| ❌ 档默认封存 | ✅ 默认不加载 |
| 敏感词自检脚本 | ✅ 实测：脏话/地域/真人梗/灌水/封存重词均 REJECT |
| 人设卡移除 | ✅ 补丁已应用于 dsh-bili-whale（client.js / index.js 语法通过） |
| 人设可启停 | ✅ 实测 API：enabled true/false 与 off/light/on 三档，persona 文件字节数随档位变化；停止时 0 字节 |
| skill 人设文件 | ✅ 启动 on 时生成 `~/.dsh/whale-persona-skill.md`，17004 字节（档位卡+black-talk+boundaries+gate） |
| 评论审核 | ✅ 24 条真实评论入队；通过/跳过/重置接口实测；审核模式不发送 |

## 人设插件实测（2026-11-27）

| 操作 | persona 文件字节 |
| --- | --- |
| 启动 + off（黑话常态） | 2402 |
| 启动 + light（轻损黑话） | 1990 |
| 启动 + on（孙吧去攻击） | 2320 |
| 停止 | 0 |

> API：`/whale-persona-v4/api/state` 与 `/set`。设置页分区 `bili-whale-persona`（order 7）、`bili-whale-review`（order 8）已注册。

## 评论审核实测

| 项 | 结果 |
|---|---|
| 数据源 | comment-digest 最近 720 小时（23 条）+ 最新视频热评（1 条） |
| 队列 | `~/.dsh/whale-review-queue.json`，共 24 条，全部 pending |
| 草稿 | 24 条全损黑话草稿，`check_comment --tier on` 全部 PASS |
| 审核接口 | GET `/whale-persona-v4/api/review`；POST `{id,action:approve\|skip\|reset\|update}` |
| 发送 | **无**：审核模式只记录状态，不调用任何 B 站写接口 |

## 黑话引擎实测（cnmeme.wiki）

| 用例 | 结果 |
|---|---|
| `--text "哈基米是什么梗"` | 命中，返回 title/summary/usage/origin/tags |
| 普通长句 `这剪辑太拖了，前十分钟都在水` | 跳过（不像问梗） |
| 同词第二次查询 | `cached: true`，未联网 |
| 缓存 TTL | 600 秒，缓存文件 `~/.dsh/whale-meme-cache.json` |

## 未覆盖 / 已知局限

- 未做真实 B 站账号的端到端发布测试（避免真实发帖）。
- 插件功能按源码命令表核对，未逐条运行。
- 黑话依赖 cnmeme.wiki 公开 API 的可用性；断网时回退到 `data/hot_memes.json` 离线兜底。
- dsh-bili-whale 的人设卡移除改的是 `node_modules`，**DSH 重启后生效**；重装/升级插件后需重跑 `scripts/patch_bili_whale_no_persona.py`。
- `systemPrompt.context()` 注入已注册，但当前宿主没有直接观测接口，未做逐字提示词核验。
