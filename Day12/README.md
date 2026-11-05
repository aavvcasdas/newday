# Day12｜鲸鱼摇人：指定原音源有声重做

## 直接交付

- **[播放完整有声BGM版](成片/Day12_鲸鱼摇人_有声BGM版.mp4)**：104.300秒，1920×1080，30fps，3129帧。
- [3:4封面](封面/Day12_封面_3比4.png) · [横版封面](封面/Day12_封面_横版.png)
- **[标题、简介、话题](发布文案.md)**
- [本轮实测音画双栏与逐镜表](Day12有声分镜.md)
- [本轮完整验收报告](../tools/day12制作/final_check.json)

这不是给原33.43秒无声样片贴音轨：按用户指定的根目录`鲸鱼摇人_克隆配音_最终版.wav`重新编排/完整渲染九镜。旧无声样片及报告仍留在[样片](样片/README.md)，仅作历史，不代表本轮有声验收。

## 本轮改动

- **关闭聚光灯**；开场用平面双行高对比钩子横幅（不是光束）保证可读性，合规角标另有深底；不持续推拉、不原地大抖；idleMotion=0，只有显式走位/反应。仅结尾一次0.7秒拉远，其后固定。
- 实跑Vosk中文ASR（231词），用原稿拼音序列映射修正文案。41个事件绑定**真实整词区间**，不按字数均分，不称逐字音素强制对齐。错词/邻词不确定项公开保留。
- @豆包、通知递入、入职先排、夸口后道歉、拉向笨鱼的帮手条、护碗、划掉敲代码、标记距离/熬人、翻面、推要求、圈疑点、候选递回老大、末句实体大饼与拒绝斜线，都有词点可见事件。C08旧标记与新疑点分行保留，避免出现空圈。
- 豆包只有标牌/帮手纸，不新增脸或声线。角色仍用固定上游原PNG；道具移位/翻面是2D演示，**未冒称完整手掌接触动画**。
- 程序化128 BPM轻芯片风BGM，按对白ducking；仅4处显式轻音效，不另加默认片头撞击。对白段伴奏平均低约20.86 dB；源音频原速完整保留。
- 封面复用现有原角色、中文安全边界检查；未生成新角色脸。只制作发布素材，未发布/代发评论。

### 为什么字幕是24行

原25行锁稿`Day12配音台词.txt`不改。实际音源开头直接说“笨鱼又回来了”，**没有读“找新朋友来帮忙。”**。
本片另用[24行视频字幕稿](Day12视频字幕台词.txt)，不补录、不把缺失首句硬塞进0秒。
ASR保留未编辑输出与置信度；自动拼音映射不是真人听审，声线身份未核验。

源文件WAV头帧数异常；真实解码为104.3秒，不是旧接收记录误读的26843秒。原字节SHA256始终为`4782532083e1eb18f17a10dbe3956a439633f338a1d0c62607b13f632b035f00`。

### 尾段不造假

末句RMS界为103.575秒；原音源本来就有0.725秒低能量尾段。为保留完整指定原源，明确使用`--preserve-source-tail`例外：必须整片与原源等长、尾段≤1秒、10ms RMS峰值低于−45dB，实际为−53.46dB。没有延长cue、没有新增尾卡。其他影片默认0.15–0.35秒尾段规则不变。

## 验收与限制

|项目|证据|
|---|---|
|原源SHA、24行逐句/逐屏文本、1080p30、完整解码、原速零偏移人声|[dry_media_check.json](../tools/day12制作/dry_media_check.json)|
|伴奏独立stem、视频基本流复制、减stem恢复人声、增益/峰值/ducking|[bgm_check.json](../tools/day12制作/bgm_check.json)|
|41个词绑定、24行均有事件、3129帧几何检查、固定机位/不压眼口/桌脚安全区|[production_check.json](../tools/day12制作/production_check.json)|
|3129帧实际编码解码，无黑/平帧；28张关键帧对照当前渲染器|[encoded_check.json](../tools/day12制作/encoded_check.json)|
|51屏中点、气口、换屏边界；最终BGM片复查|[final_subtitle_check.json](../tools/day12制作/final_subtitle_check.json)|
|前两秒可见事件与合成画面|[opener_check.json](../tools/day12制作/opener_check.json)|
|原稿未改、全部报告绑定同一成片SHA、测试|[final_check.json](../tools/day12制作/final_check.json)|

字幕色框/帧差检查不是OCR；ASR词区间不是音素对齐；静帧抽看不是完整真人实时观影/听审。手纸真实接触没有冒称通过。旧`episode.spec.mjs`、旧导演表、旧planning报告是历史25行无声方案，本片权威为`episode.production.spec.mjs`与本轮有声分镜。没有把旧spec直接改ready绕门禁；本轮ready方案有独立音源/字幕/语义轨和实际编码验证。

## 复现

依赖：Node、`npm ci --prefix tools/engine`；Python独立虚拟环境内`numpy pillow vosk pypinyin`；可用的FFmpeg/FFprobe（可通过`FFMPEG`、`FFPROBE`环境变量指定）。

```bash
# gh已配置的GitHub连接；只恢复固定原blob并校验SHA，不执行上游脚本、不生成替代脸
python tools/day12制作/restore_sample_assets.py --manifest tools/day12制作/production_assets.json
# 若重跑ASR，先自行取得Vosk中文模型并指定绝对路径；缓存模型权重不入Git
python tools/音频/transcribe_vosk.py --voice 鲸鱼摇人_克隆配音_最终版.wav --model /实际模型目录 --out tools/day12制作/asr_words.json
python tools/day12制作/align_production.py
# 下列完整流程：渲染→实际干声验收→混音→最终字幕/解码/开场→封面→单测→SHA汇总
python tools/day12制作/finish_day12.py --render
# 已有本轮干声基片则省去渲染（混音/所有实际验收仍重跑）
python tools/day12制作/finish_day12.py
```

模型镜像固定`jimy7945/vosk-model-cn@c3eca5074b0ac967ecd6dd107e0dd64d9a7c5e28`；仅权重，非执行其来源脚本；未擅自声明模型许可。原始识别/模型来源/不确定项见`asr_words.json`、`alignment_review.json`；字与词映射过程在`align_production.py`。

干声基片、stem和检查抽帧可重建，按.gitignore不重复入Git；正式BGM片与两张封面入库。入口没有调用旧25行planning的累计final门禁冒充BGM验收，指定原音源版用上述显式流程，干声与混音分别验证。

## 文案与人格历史

[原锁稿](Day12配音台词.txt) · [原文案/因果自检](Day12文案.md) · [剧情skill](../00_运营总览/skills/剧情生成/SKILL.md)。大肥鱼/鲸鱼娘仍是主角，魔丸只是人格移植；Day11锁稿不变。
