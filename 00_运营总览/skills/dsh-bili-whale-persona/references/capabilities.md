---
summary: 继承 dsh-bili-whale 的全部能力：看/选/记/过日子/说/运维，逐条给命令、参数与安全等级。运行任何命令前先读这份。
keywords: [能力, 命令, bili.mjs, 继承, 工具]
---

# 能力清单（继承 dsh-bili-whale v1.0.2）

> 所有命令入口：`node tools/bili.mjs <命令> [参数...]`（插件目录下）。
> 写操作**必须**显式 `--dry`（只打印）或 `--go`（真发）。
> 安全级别：**读** = 可直接跑；**写** = 必须人工确认；**运维** = 按需。

---

## 一、看与选（全读，安全）

| 命令 | 作用 | 关键参数 |
|---|---|---|
| `feed` | 选题器：照日记「爱看」捞候选，排除看过的/已评论过的 | `--n 6 --per 2` |
| `discover` | 按新鲜度与排除偏好选片 | `--n 6 --kw 关键词 --json` |
| `round` | 一轮找片、深读、标签统计、相关推荐（不发送） | `--n 6 --dry --no-frames [--json]` |
| `batch-debrief` | 有限并发深读多条 | `<BV...> [--no-frames] [--concurrency 2]` |
| `video` | 不点开也能还原视频讲什么（简介/字幕/弹幕/评论） | `<BV>` |
| `subtitles` | 官方字幕全文（WBI 签名，带时间戳） | `<BV> [--lan ai-zh] [--print N] [--sample-pages N]` |
| `comments` | 热评 / 最新评论 | `<BV> [--ps 20] [--pn 1] [--sort hot\|time] [--json]` |
| `watch-video` | 真「看」：取直链→下载→ffmpeg 抽帧→九宫格→read_image | `<BV> [3x3\|4x4] [--uniform] [--from 8:00 --to 10:00]` |
| `debrief` | 一条龙：封面+简介+字幕+弹幕热区+热评+抽帧 | `<BV> [--bucket 30] [--top 5] [--grid 3x3] [--no-frames]` |
| `search` | 按关键词搜视频（标题/UP/播放/简介/标签） | `关键词` |
| `covers` | 抓视频元信息 + 封面图 | `<BV>` |
| `whois` | 按 mid 查昵称 | `<mid>` |
| `recon` | 发评论前侦查：BV→aid + 评论区状态 + WBI | `<BV>` |
| `ai-share` | 分享前评论抽样与模型评估 | `sample <BV> [--more]` / `record <BV> <结果.json>` |

## 二、记与过日子

| 命令 | 作用 |
|---|---|
| `life` | 记忆、偏好提案、线程、草稿、归档、自主活动；`affect-status` 看心情/分享欲/话题数 |
| `diary` | `show` 人读摘要 / `show --private` 自己那本 / `log` 记结构化事件 / `tail` 最近事件 |
| `expression` | `expression-plan / prepare / revise / finalize / discard`（表达草稿流程） |
| `corpus` | 语料导入、审核队列、按目的取参考与离线划分 |
| `night` | 生物钟：`plan` 掷骰子定今晚 / `clock` 到点退出叫醒 / `mark` 兜底 / `status` 看计划 |
| `quota` | 限额闸：`status` / `check --auto\|--share` / `record` / `set --daily N` |
| `likes` | 谁赞了她（通知流） `--hours 24 [--owner] [--json]` |
| `stickers` | 表情包目录 `list [offset]` / `get <ID或情绪名>`（42 张） |
| `behavior` | 场景规范 `list` / `read <章节>` / `reload` |

## 三、说（写，必须 `--dry`/`--go` + 人工确认）

| 命令 | 作用 | 安全 |
|---|---|---|
| `comment` | 发一条视频评论；`--root/--parent` 是二级回复 | 写 |
| `reply-draft` | 待审回复队列：`add` / `list` / `drop` / `take` | 写（先审） |
| `comment-del` | 删除自己发的一条评论（只能删自己的） | 写 |
| `dm` | 私信：一天只锁定 1 个收信人，只发主人，必须互关 | 写 |
| `dm-batch` | 多段私信：`--file` 数组.json `--dry\|--go`；`--status`；`--resume` | 写 |
| `dynamic` | 动态：`post` / `rm` / `check` | 写 |
| `dynamic-image` | 图文动态（上传图片 + 可带 @ 节点） | 写 |
| `dynamic-edit` | 编辑已有动态（文字/图片，id 不变） | 写 |
| `like` | 单条点赞 `--dry\|--go\|--check`，核对账号并回读 | 写 |
| `follow` | 关注 UP `--dry\|--go\|--check` | 写 |
| `fav` | 收藏：`--list` / `--check` / `<BV> --reason … --dry\|--go` | 写 |

## 四、监听与复核（读）

| 命令 | 作用 |
|---|---|
| `session` | 确认凭据属于哪个号（写前必跑） |
| `thread` | 导出一条评论的完整楼中楼结构 |
| `check-comment` | 按 rpid 复核评论是否存在 |
| `check-dynamic` | 看动态的结构化内容（类型/图片/节点） |
| `check-mention` | 确认动态里的 @ 是否真提及 |
| `watch` | 盯一条评论的楼中楼等新回复 `--aid --root --bvid [--uid] [--minutes]` |
| `comment-await` | 评论版「叫我起床」：守「回复我的」命中即退出叫醒 agent（0 token） |
| `comment-digest` | 今天谁找过人家（回复+@ 两个收件箱汇总）`--hours 24 --pages 2 [--only-unread]` |
| `dm-await` | 私信监听（只认主人；命中打印 DM_HIT） |
| `notify` | 通知分发（stdout/file/webhook/command） |

## 五、运维

| 命令 | 作用 |
|---|---|
| `deps` | 依赖体检：cookie / ffmpeg / Node / 数据目录；`--json` |
| `selftest` | 启动检查：配置、登录态、调度器、日记状态 |
| `traffic` | 请求保护状态 / 人工核查后恢复 |
| `config` | 选片流程配置 `show` / `set <字段> <JSON值>` |

---

## 六、继承边界（哪些能力不照搬）

| 上游能力 | 本 skill 的处置 |
|---|---|
| 自动评论/私信/动态（自主活动） | **继承功能，默认关闭**；要开必须按 `gate.md` 三态门禁，逐条确认 |
| 定时/批量发送 | **不启用**：上游本身也写明「批量、定时、多房间铺量不是这套工具的用途」 |
| 直播弹幕回复 | 继承，仅在明确范围（只回主人/只回 @ 她的） |
| 删除评论 | 继承，仅限自己的评论 |
| 投稿/发布视频 | 上游无此能力，不虚构 |

## 七、最小上手流程

```powershell
# 1) 体检
node tools/bili.mjs deps
node tools/bili.mjs selftest
# 2) 确认账号
node tools/bili.mjs session
# 3) 刷一轮（只读）
node tools/bili.mjs round --n 6
# 4) 深读一条
node tools/bili.mjs debrief BV1xxxx --top 5
# 5) 查梗（黑话引擎）
python scripts/meme_lookup.py --text "哈基米是什么梗"
# 6) 写评论（两段式）
node tools/bili.mjs comment BV1xxxx --message "这标题给我整不会了 纯纯的标题党" --dry
node tools/bili.mjs comment BV1xxxx --message "这标题给我整不会了 纯纯的标题党" --go
node tools/bili.mjs check-comment <rpid>
```
