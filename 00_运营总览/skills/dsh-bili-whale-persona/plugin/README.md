# dsh-bili-whale-persona-toggle

「设置 → 鲸鲸 · 人设」里的**人设 skill 开关**：可随时启动/停止，并选孙吧味档位。

## 它做什么

- 在 DSH 设置页加两个分区：**鲸鲸 · 人设（skill 插件）** 和 **鲸鲸 · 评论审核**
- **总开关**：启动 / 停止人设
- **档位**：黑话常态（默认）/ 轻损 / 孙吧全损（备用）
- 点「应用」后：
  1. 写入 `~/.dsh/bili-whale-persona.json`（`{ enabled, sunba }`）
  2. 启动时把 **skill 本体**（档位角色卡 + `references/black-talk.md` + `references/boundaries.md` + `references/gate.md`）拼成 `~/.dsh/whale-persona-skill.md`；停止时写入空内容
  3. 通过 `systemPrompt.context()` 把档位角色卡注入当前会话（停止时返回空）
- **不再使用** `~/.bili-ai/persona.md`；B 站插件侧用 `scripts/patch_bili_whale_skill_persona.py` 改读 `~/.dsh/whale-persona-skill.md`
- 默认 `enabled=false, sunba=off`。**不会**改动 dsh-bili-whale 的 node_modules（那是 patch 脚本的事）。

## 评论审核（只审不发）

- 分区：**鲸鲸 · 评论审核**
- 数据：`~/.dsh/whale-review-queue.json`
- 每条：评论原文 + 全损黑话草稿（可编辑）+ 通过 / 跳过 / 重置
- **通过 ≠ 发送**：审核模式只记录决定，不发 B 站
- 生成队列：`python scripts/build_review_queue.py`（读 `data/review-raw.json` 与 `data/video-comments-raw.json`）

## 查梗工具

插件同时注册 `whale_meme_lookup` 工具：

```
whale_meme_lookup { text: "哈基米是什么梗" }
whale_meme_lookup { term: "电子榨菜" }
```

- cnmeme.wiki 公开 API
- 像梗才查 / 同词 10 分钟一次 / 带缓存（`~/.dsh/whale-meme-cache.json`）
- 与 `scripts/meme_lookup.py` 同一套规则

## 安装

```powershell
dsh plugin --profile desktop add "<本目录绝对路径>"
```

或在 DSH 插件管理里安装本目录（`plugin/`）作为 bundle。

装完重启 DSH，进入 **设置 → 鲸鲸 · 人设**。

## 文件

```
plugin/
├── package.json
├── cordis.patch.yml
├── index.js          # Host：/whale-persona/api/state | /set
├── client.js         # Client：settings.section 分区 UI
├── locale/zh.json
├── icon.svg
└── personas/
    ├── neutral.md    # off
    ├── light.md      # light
    └── sunba.md      # on（去攻击版；❌ 封存内容不在里面）
```

## 安全

- 只写两个文件：状态文件 + 人设文件；人设文件写前自动 `.bak-时间戳` 备份。
- HTTP 路由只接受回环地址（127.0.0.1/localhost/[::1]）。
- 无自动发送逻辑，只切人设。
