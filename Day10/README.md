# Day10 当前入口：鲸鱼架空配音＋BGM版

## 当前成片

- **当前交付：`成片/Day10_鲸鱼架空_配音BGM版.mp4`**：完整八镜、二十三行、二十五字幕屏，指定配音原速＋Day1 同源轻快芯片伴奏；1920×1080 / 30fps / 1784帧 / 约59.467秒。
- `成片/Day10_鲸鱼架空_配音对齐版.mp4`：上一版干声基片，原样保留；本轮只替换音轨，视频流完全相同。
- 独立纯伴奏：`配音/Day10_轻快芯片伴奏.flac`；讲话时 ducking，音乐淡入淡出，不改对白。
- 源音频：根目录 `鲸鱼架空_克隆配音_最终版.wav`，59.2秒、40000Hz双声道，原文件不改。SHA256 `ffd3f521901aaaab0fbcaaa4df869891a721d35df3e138d6e94220cd51ac3ddc`。
- `Day10配音台词.txt` / `Day10文案.md`：用户指定二十三行，前十二行锁定，不改字。
- `Day10分镜_新版规划.md` 已更新为实际构造与实施说明；旧配音前规划保存在 `历史/Day10分镜_23行配音前规划.md`。
- 封面文案、标题和简介：`Day10发布物料.md`。**封面图片已补齐**：`封面/Day10封面_3比4.png`（1080×1440）、`封面/Day10封面_4比3.png`（1440×1080），复用项目代码素材，不用生图。
- 封面生成：`node tools/day10制作/make_day10_cover.mjs`；检查报告 `../tools/day10制作/封面_验收.json`。

## 正式制作与验收入口

- `../tools/day10制作/render_day10_full.mjs`
- `voice_alignment.json` / `subtitle_timing.json`（measured=true）及 `字幕/Day10字幕.srt`
- `asr_tokens.json` / `asr_alignment_raw.json` / `asr_unconstrained.json` / `finalize_alignment.py` 留识别与修边依据。
- `gate_config.json`、`有声_final门禁.json` / `gate_media_report.json` 仍指**干声基片**，仅证明基片画面/字幕/原配音通过，不冒充 BGM 版验收。
- **最终混音检查**：`mix_day10_bgm.py` / `BGM混音_验收.json`；核验预期人声＋BGM混音、扣除已知伴奏后的人声、原速零偏移、视频流哈希、帧数/时长、声道、采样峰值、音乐存在和全片解码。
- `有声成片抽帧/`、`Day10_有声分镜总览.jpg` 与 `有声_渲染自检.json` 记录镜头样本及接触。不能把解析接触或自动检查当完整OCR/审美批准。

```sh
node tools/day10制作/render_day10_full.mjs --stills
node tools/day10制作/render_day10_full.mjs
PYTHONPATH=/tmp/day10-python python3 tools/gate.py --day 10 --stage final --report tools/day10制作/有声_final门禁.json
# 必须最后补混并核验；若已有基片、只补音乐，可直接执行下面一步。
PYTHONPATH=/tmp/day10-python python3 tools/day10制作/mix_day10_bgm.py
```

/tmp 依赖不会随 Git 保存；Python 需 numpy，ASR重跑另需 vosk/中文模型；Node 需 Canvas/Resvg 与 ffmpeg，安装方法沿用 `../tools/互动元素/README.md`。重渲前先读 agent.md 第17/20/21/22条及当集验收，不拿新文案套旧音频。

## 历史保留

- `成片/Day10_词点互动_无声结构样片.mp4`（提交 b8184d4）：十九秒技术样片，未覆盖；旧规划轴仍为 measured=false，不用于正式字幕。
- 二百零一字验收选题稿在 `历史/`，报告在 `../tools/day10制作/历史_201字稿/`，不是当前文字。
- 当前二百零五字稿的配音前估时和规划测试保留，状态由本页实测版本覆盖；此前“缺音频/没有 full renderer”均为当时状态。
