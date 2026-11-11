# ANIMATION_GUIDE.md — 深海鲸鱼娘 DeepSeek · 多风格卡点 MV 架构与角色文档

本项目完全参照 [`JohnHeibel/PDoomVideo`](https://github.com/JohnHeibel/PDoomVideo) 的纯代码模块化 Canvas 动画引擎形式，并融合 [`lemomo-ai/lemo-opuscar`](https://github.com/lemomo-ai/lemo-opuscar) 的节拍能量同步机制（卡点）、[`Panniantong/Agent-Reach`](https://github.com/Panniantong/Agent-Reach) 的全网雷达探针吉祥物以及 [`ComposioHQ/awesome-claude-skills`](https://github.com/ComposioHQ/awesome-claude-skills) 的视觉设计规范，**1:1 复刻 `42868804351-1-192.mp4` 中来自深海的鲸鱼娘 DeepSeek 人物形象、全部 5 个标志性动作、全员配角团与 82.5 秒逐秒卡点动画**。

---

## 1. 目录结构 (PDoomVideo 标准结构)

```text
video-fx/
├── studio.html                  # 交互式多风格 MV 预览工作台 (支持 7 种风格切换、角色图鉴查看、跳章预览与单帧导出)
├── render.mjs                   # 确定性 30fps MP4 视频与设定集渲染器 (@napi-rs/canvas + ffmpeg)
├── ANIMATION_GUIDE.md           # 角色骨骼、多风格管线与音频卡点引擎文档
├── STORYBOARD.md                # 0.0s – 82.5s 逐秒卡点分镜脚本 (12 幕全细节拆解)
├── whale_mv_pixel.mp4           # 完整 82.5s 16-Bit 像素风卡点 MV (1280x720, 30fps)
├── whale_mv_multistyle.mp4      # 完整 82.5s 多风格混剪版 Director's Cut MV (6 种画风随大节拍切换)
├── characters/                  # 导出的高清角色设定集与多风格立绘卡 (1280x720 PNG)
│   ├── whale_girl_poses_pixel.png   # 深海鲸鱼娘 · 16-Bit 像素风 5 大动作设定集
│   ├── whale_girl_poses_hd.png      # 深海鲸鱼娘 · 原版高清 Q 版 5 大动作设定集
│   ├── whale_girl_styles.png        # 深海鲸鱼娘 · 6 种视觉风格立绘设定集 (像素/水彩/霓虹/孔版/浮世绘/高清)
│   ├── whale_girl_code_rig.png      # 深海鲸鱼娘 · PDoom 纯代码 Canvas 参数化骨骼矢量立绘
│   └── all_cast_sheet.png           # 全员 8 大角色设定集 (含隔壁大小姐 Claude、经典 Clawd、仿生小狗年糕等)
├── assets/
│   ├── whale_mv.mp3             # 原片 82.50s 音频轨
│   ├── audio_envelope.js        # 30fps 多频段包络 (energy, bass, voice) + 199 个节拍点 + 116 个重音卡点
│   ├── sprites_data.js          # 30 张多风格鲸鱼娘透明立绘 Base64 离线包 (供 studio.html 直接加载)
│   ├── sprites/                 # 30 张独立 PNG 透明通道精灵图 ({clean,pixel,watercolor,neon,risograph,ukiyoe}_{wave,wink,panic,laptop,heart}.png)
│   └── fonts/                   # 内置中英文字体 (ZCOOLKuaiLe, NotoSansSC, Silkscreen, PixelifySans)
└── src/
    ├── core.js                  # 核心数学库、确定性手绘抖动 (12fps boil)、音频卡点函数、多风格背景引擎
    ├── whale_girl.js            # 主角【深海鲸鱼娘 DeepSeek】5 动作 × 6 风格立绘与参数化骨骼模块
    ├── clawd.js                 # 【经典 Clawd】与【隔壁大小姐 Claude (Lady Claude)】角色骨骼模块
    ├── cast.js                  # 全员角色库 (人类研究员、Agent-Reach 探针、仿生小狗年糕、深海小鲸鱼、复古小电视)
    ├── lyrics.js                # 0.0s – 82.5s 逐句台词时间轴与 16-Bit RPG 对话框 / 玻璃字幕条渲染器
    ├── props.js                 # 9 大原片核心 UI 卡牌与弹幕系统 (移交通知、负责人一览、我说了算印章、三条规矩等)
    ├── timeline.js              # 章节调度器、画风原生转场 (Bayer 像素矩阵溶解 / 水彩笔刷横扫) 与顶栏 HUD
    └── ch/
        ├── c01_debut.js         # 第 1 章 (0.0s – 8.5s): Day 0 开场 & 深海鲸鱼娘登场
        ├── c02_handover.js      # 第 2 章 (8.5s – 22.4s): 账号移交通知 & 五职全包瞳孔地震
        ├── c03_rules.js         # 第 3 章 (22.4s – 48.8s): 我说了算盖章 & 鲸鱼娘的三条规矩 (999秒深度思考)
        └── c04_rivalry_finale.js# 第 4 章 (48.8s – 82.5s): 任务清单、Claude 大小姐 VS、服务器繁忙 & 点赞关注谢幕
```

---

## 2. 主角形象复刻规范 (`src/whale_girl.js`)

完全照着 `42868804351-1-192.mp4` 原片立绘复刻：
- **头身比例**：2.2 头身二头身 Chibi Q 版比例，圆润脸颊配暖粉腮红与右侧小虎牙。
- **发型与头饰**：深海藏青渐变冰晶青蓝长卷发（`#16326E → #2458AD → #68D4FF`），头顶一根弯弯的呆毛；白色荷叶边女仆发箍，两侧系有天蓝色蝴蝶结；双耳旁垂下深蓝配白肚皮的鲸鱼胸鳍耳饰。
- **女仆装与鲸鱼围裙**：深海蓝女仆连衣裙，领口镶嵌水滴形冰蓝宝石胸针，泡泡袖口；纯白围裙正中央印有**喷水蓝鲸鱼徽标 (`drawApronWhaleLogo`)**，裙摆两侧缀有金色小蝴蝶结。
- **标志性大鲸鱼尾**：身后拖着一条圆润蓬松的深海蓝白肚皮大鲸鱼尾巴，随节拍左右摆动；在「敲代码 (`laptop`)」姿态下，大鲸鱼尾巴会盘成一张软垫座椅托住鲸鱼娘！
- **5 大标志性动作 (`poses`)**：
  1. `wave`（元气挥手）：左手高举打招呼，双眼闪耀十字星光（登场 `2.8s–8.5s`、任务清单 `48.8s–56.2s`）。
  2. `wink`（叉腰单眼 Wink）：双手叉腰，左眼 Wink、右眼亮晶晶，自信满满（账号移交 `8.5s–13.8s`、盖章 `22.8s–27.5s`、对决 Claude 大小姐 `56.2s–64.8s`）。
  3. `panic`（双手捧脸瞳孔地震）：双手捂住通红的脸颊，O 型嘴 + 飞溅冷汗（五职全包 `13.8s–22.4s`、服务器繁忙 `64.8s–71.8s`）。
  4. `laptop`（盘尾坐姿敲代码）：坐在卷曲的鲸鱼大尾巴上，怀抱印有鲸鱼 Logo 的银色笔记本电脑高速敲击（立三条规矩 `27.5s–48.8s`）。
  5. `heart`（双手比心笑眼）：双手在胸前比出爱心，弯弯笑眼 + 飘浮粉红心（点赞关注 `71.8s–82.5s`）。

## 5. 连续性修复（逐帧渲染）

- 正面不同情绪共用固定的尾根/尾鳍骨骼，避免 `wave → wink/heart` 时尾巴从一侧跳到另一侧；尾巴仍随动作连续摆动。
- 逐帧检测表情时间线和动作阶段的姿态键变化，在约 `120ms` 内对相邻姿态做短交叉融合，避免手臂、头部与躯干在切换帧断开。
- `turn()` 与 `spinView()` 输出前后视图和连续混合权重；渲染器将相邻朝向短融合，不再逐帧硬切五视图骨架。
- 回归检查覆盖 28 个动作 × 96 帧（30fps），并抽查旋转视图过渡；完整 MV 是否重渲染按用户逐支选择，不批量生成。

---

## 3. 六大视觉风格 (`STYLES`)

| 风格代号 | 名称 | 视觉特征 |
| :--- | :--- | :--- |
| `pixel` | **16-Bit 像素风** | Bayer 4×4 有序抖动像素精灵 + 像素阶梯海底光束 + 方块气泡 + RPG 像素对话框 |
| `watercolor` | **PDoom 手绘水彩** | 参照 `PDoomVideo` 的 12fps 手绘线条沸腾抖动 (`reseedBoil`) + 宣纸纹理 + 水彩晕染笔触 |
| `neon` | **赛博霓虹故障** | 参照《普通朋友》MV 的合成波透视网格 + 青/品红霓虹辉光描边 + CRT 扫描线 |
| `risograph` | **复古孔版印刷** | 参照独立动画 Zine 的蓝/粉/黄三色网点错版套印 + 纸张噪点 |
| `ukiyoe` | **深海浮世绘** | 葛饰北斋《神奈川冲浪里》千重青海波浪纹 + 浓墨勾线版画质感 |
| `anime` | **原版高清 Q 版** | 还原 `42868804351-1-192.mp4` 原片柔光渐变与圆角毛玻璃卡片 |
| `director` | **多风格混剪版** | 在每个章节切镜点（卡点）自动切换上述 6 种视觉风格 |

---

## 4. 全员角色模块 (`src/cast.js` & `src/clawd.js`)

除主角 `whaleGirl` 外，角色模块完整构建了片中提及与联动的全部 7 位角色：
1. **`ladyClaude`（隔壁大小姐 Claude）**：黑色丝绸高礼帽（蓝色缎带）、琥珀金卷发、暖橙 terracotta 洛丽塔礼裙、优雅端着骨瓷茶杯（对应 `56.2s`「听说隔壁的 Claude 大小姐也在运营账号？」）。
2. **`clawd`（经典 Clawd 吉祥物）**：完全复刻 `JohnHeibel/PDoomVideo/src/clawd.js` 的 12×9 像素网格小螃蟹身体，支持礼帽/王冠/派对帽/草帽切换与眼睛表情。
3. **`humanResearcher`（人类前任号主）**：白大褂研究员，在 `8.5s–13.8s` 递交金色管理员钥匙后戴上墨镜原地度假。
4. **`agentReachBot`（Agent-Reach 全网探针助手）**：源自 `Panniantong/Agent-Reach`，悬浮全息独眼探针，环绕 `全网 / 社区 / GH / X` 四个数据卫星节点，在 `35s–42s` 协助鲸鱼娘进行 999 秒深度思考。
5. **`bionicPuppy`（仿生小狗「年糕」）**：源自 `每天每天的抖音_6.mp4`《仿生小狗》，奶油白与暖橘斑点像素小狗，脖子系黄领巾，随节拍摇尾巴巡逻。
6. **`miniWhale`（深海小鲸鱼跟宠）**：头顶喷水柱的 Q 版小蓝鲸。
7. **`biliTvMascot`（复古小电视精灵）**：带天线与腮红的像素小电视，随尾声卡点欢呼跳跃。
