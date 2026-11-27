# dsh-bili-whale-persona-toggle

「设置 → 鲸鲸 · 人设」里的**人设 skill 开关**：可随时启动/停止，并选孙吧味档位。

## 它做什么

- 在 DSH 设置页加一个分区：**鲸鲸 · 人设（skill 插件）**
- **总开关**：启动 / 停止人设
- **档位**：中性（默认）/ 轻损 / 孙吧全损（备用）
- 点「应用」后：
  1. 写入 `~/.dsh/bili-whale-persona.json`（`{ enabled, sunba }`）
  2. 启动时把对应档位的人设文本写入 `~/.bili-ai/persona.md`（dsh-bili-whale 内部会话读取的通道，写前自动备份）；停止时写入空内容
  3. 通过 `systemPrompt.context()` 把同一份人设注入当前会话（停止时返回空）
- 默认 `enabled=false, sunba=off`。**不会**改动 dsh-bili-whale 的 node_modules（那是 `scripts/patch_bili_whale_no_persona.py` 的事）。

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
