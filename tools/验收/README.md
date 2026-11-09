# 统一制作门禁

## 四阶段入口

```bash
python3 tools/gate.py --day 10 --stage script
python3 tools/gate.py --day 10 --stage audio
python3 tools/gate.py --day 10 --stage pre-render
python3 tools/gate.py --day 10 --stage final
```

- `script`：先读 `agent.md`。Day11 及以前仍跑 `呆萌体检.py`，只作旧集对照，不据此改锁定稿。Day12 起跑 `tools/剧本/剧情.py`；**2026-11-09 五类文案门禁（三拍顺序、一天一客、逐字接上集原句、零句尾语气词、零阿拉伯数字）已删除**，现在只查自称口径 / 黑名单 / 笨鱼对白。12/15/18/20/25/201 字也不再退稿。参考见 `00_运营总览/skills/剧情生成/SKILL.md`。
- `audio`：源文件SHA256、实际时长、`measured is True`（cue及字幕）、台词逐句全等、字幕逐字及逐行归属、时间有效/无重叠、单屏十五字上限、抢跑/尾挂检查；开场启发式或明确event cue，末三句或最后八秒检查承诺。声明的cue不存在即失败。启发式事件不能证明语义事件真的发生。
- `pre-render`：当集生产模块/外置文本红线、配置指定动作单测、生产渲染器`--test`。不是扫描所有资料JSON；仅提取已知字幕schema，避免把秒数与哈希当台词。
- `final`：**累计重跑全部四阶段**，即便文案失败仍继续收集其他检查，但最终退出码保持非零；检查1080p30、双声道、音视频长度、全片解码、源音轨零偏移PCM相关>0.999、末句后0.15–0.35秒结束、字幕在屏/气口/换屏/10ms RMS完全静音抽验。任何依赖、输入、配置或子检查失败均不通过。报告`tools/dayN制作/gate_*_report.json`含命令、退出码、日志、输入哈希。

`audio`和`pre-render`单独通过不代表前序文案已通过；只有`final`累计结果可作技术交付门禁。人工动态观影、事实及许可核实仍必须完成。

## 配置

文案阶段没有配置文件时读取 `DayN/DayN配音台词.txt`，不要求还没制作的音源存在。其他阶段先建立`tools/dayN制作/gate_config.json`，或用`--config`指定：

```json
{
  "script": "Day/Day10/Day10配音台词.txt",
  "voice": "Day/Day10/配音/用户指定文件.wav",
  "alignment": "tools/day10制作/voice_alignment.json",
  "subs": "tools/day10制作/subtitle_timing.json",
  "renderer": "tools/day10制作/render_day10.mjs",
  "video": "Day/Day10/成片/当前待验版本.mp4",
  "tests": ["tools/day10制作/motion.test.mjs"],
  "rate": 3.35,
  "seconds": 60,
  "event_cue": "L01"
}
```

这里Day10路径仅是文档示例，实际必须存在，不会自动复制Day9或假装测试通过。渲染器需支持`--voice/--alignment/--subtitle-file/--test`接口；不支持的旧渲染器应写适配器而不是跳过。`tests`不得为空。目标时长/语速是制作前的明确预算，不能事后为过审篡改；特殊长篇应先获确认并留依据。Day9配置刻意保留新默认预算，未为既有长片设豁免。

## 工具与兼容

Python≥3.10、numpy，Node.js与`@napi-rs/canvas`，FFmpeg/FFprobe。优先读取`FFMPEG`/`FFPROBE`环境变量，再查PATH，再查仓库或`/tmp/node_render/node_modules`的安装器。显式环境变量无效直接失败。可用：

```bash
python3 -m pip install numpy
npm install @napi-rs/canvas @ffmpeg-installer/linux-x64 @ffprobe-installer/linux-x64
python3 -m unittest discover -s tools/tests -v
node --test tools/day9制作/motion_v2.test.mjs
```

不要提交node_modules或临时编码素材。集成测试生成短视频，自动清理。缺numpy/媒体工具时集成测试标记skip，不可把skip宣传成媒体验收已跑。

- `tools/day5制作/check_subtitle_sync.py`兼容旧命令，转至通用实现，`--subs`必须显式给出，兼容`line`/`id`，没有片尾`+1.6s`参照帧。
- `tools/day9制作/verify_storyboard_full.py`兼容原全片入口，调用通用终验。
- 四镜版仍使用独立剪辑表验证器，不能拿连续整集PCM假设去验原声剪辑；其FFmpeg查找也已共用化。
- 允许常驻合规角标，禁止独立片尾卡；已统一agent.md与红线文档。

## 检测边界（重要）

字幕检测以Day2组件为前提：编码与缩放会混合细描边，所以不能RGB精确相等，也不能说百分之百准确。现在以蓝青色相、同一横行框边像素数、正文区域帧差抽查每屏中点/足够长气口/上屏附近。能拦无字幕、卡住的字幕、整段静音弹字，不做OCR，不能证明文字内容、细小错字或音素级对齐。换样式/同色背景/字幕动画需要复核阈值和抽帧，不得静默忽略失败。

Day9动作自检隔离人物层：不把电视、字幕、背景或相机变动计作人物动作，裁取手/下半身区域；头部像素变化也不能独自满足。包含老大行走，但**只能证明该区域有变化**，不能证明每个说话人都有语义动作或动作幅度足够。素材与逐镜动态观影门禁不被替代。旧v2的C14在新采样下会失败，不改阈值强放行。

### 独立版本与共享场景

`gate.py --report <路径>`可分开保存不同试样报告，不覆盖正式基线记录。画面红线扫描已包含`tools/场景/*.mjs`共享生产模块（排除`.test.mjs`）；仅写import而不扫被引入模块会漏防，因此共享场景也必须检查。Day9海底三镜用独立配置，只适用pre-render；分段音源拼接用`verify_sea_preview.py`，不符合通用连续整集的final假设。


## 导演规划结构检查（本轮新增）

Day12起若存在 `tools/dayN制作/episode.spec.mjs`，script阶段在文本剧情检查后追加 `tools/engine/check_storyboard.mjs` 并记录spec哈希。先 `npm ci --prefix tools/engine`。无指定音源时只能返回规划结构结论，productionReady=false；不能据此报audio/pre-render/final通过。
新spec使用directorVersion=1，固定相机合法、每镜最多一次主运镜，稳定反应/道具特写不强塞无关接触；结果驻留必须在实测词时到位后再查。planning不可生产渲染；缺词级时间不把句首回退冒充实测。
