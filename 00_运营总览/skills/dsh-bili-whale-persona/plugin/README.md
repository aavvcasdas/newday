# dsh-bili-whale-persona-toggle

「设置 → 鲸鲸 · 人设」里的孙吧味档位开关。

## 它做什么

- 在 DSH 设置页加一个分区：**鲸鲸 · 人设**
- 三个档位：中性（默认）/ 轻损 / 孙吧全损（备用）
- 点「应用档位」后：
  1. 写入 `~/.dsh/bili-whale-persona.json`（`{"sunba": "off"|"light"|"on"}`）
  2. 把对应人设文本写入 `~/.bili-ai/persona.md`（dsh-bili-whale 实际读取的文件，写前自动备份）
- 默认 `off`。**不会**改动 dsh-bili-whale 的 node_modules。

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
