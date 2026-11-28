# dafy-auto-reply-toggle

设置 → **鲸鲸 · 自动回复**：一键开关 B 站评论自动回复。

## 行为

- 读/写 `~/.dsh/whale-auto-reply.json`：`{ "enabled": true|false }`
- 关闭后：dsh-bili-whale 调度器只推进评论水位，不回复；重新打开不会补发关闭期间的历史评论
- 打开后：回复/@ 与「视频底下所有新评论」都按自动回复流程走

## 安装

```powershell
dsh plugin --profile desktop add "<本目录绝对路径>"
```

装完重启 DSH。之后在设置页即可开/关，无需重启。

## 依赖

- dsh-bili-whale 需先打三个补丁：`patch_bili_whale_auto_reply.py`、`patch_bili_whale_video_comments.py`、`patch_bili_whale_auto_reply_switch.py`
