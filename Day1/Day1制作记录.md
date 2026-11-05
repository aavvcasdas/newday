# Day 1 制作记录 —— 《AI 运营第二天，名字被粉丝改了》

> 更新：2026-10-25。当前剧本为 **27 cue 修订稿**；已完成一条带 Piper 占位配音的 97.49 秒结构片，并已按 `video-fx` 最新基线重新渲染更新版，用于核对画面、字幕和卡点。随后已按用户上传的 `配音_最终版.wav` 重新对齐并渲染 127.24 秒最终配音版。
> **Piper 结构片不是晓伊终版，不要按终版发布。** 用户 WAV 没有嵌入合成引擎/音色元数据，且本工具 F0 口径未过旧晓伊 290–330Hz 门禁，所以新片只能如实称为“用户提供的最终配音对齐版”，不能写成已核验晓伊终版。旧 21-cue 无人声预览片也已作废。
> 制作仓库：`video-fx` 分支 `arena/8be4c8f8-video-fx`，本次基线 HEAD `82bede5 Rerender Chaoxi with continuous character rig`（沙箱 `/home/user/video-fx-day0`）。本仓库保存文案、配音稿、TTS 工具、Piper 占位音频与制作源码快照。

## 一、已完成

- ✅ 《Day1文案.md》和 `Day1配音台词.txt` 已从 21 cue 更新为 27 cue，两个文件逐条一致；本轮没有改台词。
- ✅ 新增 **L15–L17 回信悬案**：30 条催回信 → 后台回了三百多条、评论区只数出 197 条 → “是不是被鱼叼走了？”
- ✅ 新增 **L20–L22 点播回应**：19 条点播 → 《朋友的酒》和 MV → 三角洲/王者与“本鱼没手” → “MV 还在肚子里，先游两圈。”
- ✅ 画面文字 **“官方艺名：鲸鱼娘”已改为“艺名：鲸鱼娘”**。
- ✅ `video-fx/src/ch/day1_all.js` 已新增六个对应分镜并完成 cue 重编号：
  - `shotUrgeReplies`：30 张催信卡 + 红点提醒；
  - `shotReplyMismatch`：后台 348 与评论区 197 双账卡对数；
  - `shotFishTookReplies`：小鲸鱼叼着信封游过；
  - `shotRequests19`：19 条点播台、《朋友的酒》与 MV 真实点播卡；
  - `shotGameRefusal`：三角洲/王者、超大手柄和“没手”红章；
  - `shotMvBelly`：MV 制作中泡泡，本鱼沿泳圈轨迹游满两圈。
- ✅ 菜单仍保留已确认四项：MV / 打游戏 / Claude 共创 / 偷吃饭；“打游戏”卡已加“没手警告”，承接新台词，不假装能亲自操作。
- ✅ Piper 结构片关键静帧集现为 18 张，并完成成片抽帧检查；新增的 L05 0.85（约 17.0s）是 wink 头发/尾巴常驻回归帧。复核中发现 L16 的“差 151 条？”红章曾被角色挡住，已把红章与角色左右错开，并重新渲染整片。
- ✅ 首版结构片文件：`成片/历史版/day1视频_Piper结构片（非晓伊占位）.mp4`（97.49s，1280×720，30fps，H.264/AAC 48kHz，11,725,141 bytes，SHA-256 `69c052bc17af9719ab15b993c543e29f81827903fe40873b06eececc0aea8659`）。
- ✅ 已移植到 `video-fx` 最新 HEAD `82bede5`；其中连续骨架与 pose/view 平滑过渡来自 `c2fc00a`。同一批 27 条 Piper measured 音频复算后，逐条时长偏差全部 **0.0%**，按 8% 规则复用原卡点（`timing_reused=true`），总时长仍为 97.49s。
- ✅ 已修复最新共享 `drawTopHud` 写死 `Day 0` 的标注回归：只在 Day1 专用 `render_day1.mjs` 内覆盖为 `Day 1 · AI 接管中`，不改上游 `props.js`，避免影响 Day0/MV。
- ✅ 已对齐更新版 MV 的叙事口径：Day1 内统一 `showActionBadge=false`，去掉不可读的 12px 动作小徽章。尾巴没有照搬 MV 单人近景的 0.68：该值在 Day1 的小主角与 wink 后发层级下会让整段尾巴藏进头发/裙摆，现已恢复骨架默认 `tailScale=1.0` 并重新渲染。
- ✅ 已修复 17 秒附近右侧长发像被竖直裁掉的问题：上游 `wink` 姿势的 `backHair` 右缘几乎逐行硬切在 `gx=27`；Day1 专用渲染器只把 wink 后发替换为轮廓完整的 `heart backHair`，不改 wink 的脸、身体和动作。
- ✅ 背景与文字已改走 `clean` 清晰路径：不再把整帧压到 480×270 再放大，也不再叠扫描线或吸附到 3px 网格；主角仍明确使用像素骨架。成片改为在 1280×720 逻辑坐标上以 1.5 倍原生栅格化输出 1920×1080，并以 H.264 CRF 19 编码，不是把旧 720p 后期放大。
- ✅ 更新版已重新检查 18 张关键静帧、成片关键帧及 27 个 cue 起点后 0.06s/0.18s 的 54 张边界帧；头发+清晰度修复版另从最终 MP4 抽取 27 个 cue 在 25%/55%/85% 处的 81 张编码帧逐张复核，并单独检查 16.5–17.8s 的 14 张连续抽帧，未再发现右侧长发竖直切边或整段尾巴消失，场景字幕与卡片字均可读。
- ✅ 当前结构片文件：`成片/历史版/day1视频_Piper结构片_更新版82bede5（非晓伊占位）.mp4`（97.49s，1920×1080，30fps，H.264/AAC-LC 48kHz stereo，22,683,071 bytes，SHA-256 `546b24a57cc714e398883a1bb754534cf4c2453966ef0c33f13a053738894162`）。首版 Piper 文件保留作上一基线留档；同名 82bede5 文件已由头发+清晰度修复版覆盖。
- ✅ 已按用户上传的 `配音_最终版.wav`（121.300s，40kHz stereo，SHA-256 `7b9396c587e65eee9d53efb9410c4be9eaa43ae33b8a5ad598ddb1aa50e7e9ea`）逐词对齐 27 cue：Vosk small-cn 输出 255 个词级时间戳，再用 5ms 波形边界修正；保留原 WAV 的句间停顿，只在前面加 2.6s 标题卡。
- ✅ 最终配音对齐版：`成片/当前版/day1视频_最终配音对齐版.mp4`（127.24s，1920×1080，30fps，H.264/AAC-LC 48kHz stereo，28,246,361 bytes，SHA-256 `7082b137f68b41cefb47fd0a9c5760d6f90f04901b5404d97c48de209523bb88`）。已检查 18 张关键静帧、81 张 cue 编码帧、54 张边界帧，并对成片再跑 ASR 复核首尾词时间；逐 cue 数字见 `../tools/day1制作/最终配音对齐验收表.md`。

Piper 逐句数字见 `../tools/day1制作/Piper结构片验收表.md`，机器报告见 `../tools/day1制作/day1_audio_piper/tts_report.json`；最终配音对齐数字见 `../tools/day1制作/最终配音对齐验收表.md` 与 `../tools/day1制作/day1_audio_final/alignment_report.json`。

## 二、TTS 双轨：终版晓伊未完成，Piper 先解结构阻塞

### 2.1 工具与固定口径

`say.py` 现在支持可切换引擎，四处副本保持同一文件：

- 沙箱：`/home/user/tools/say.py`
- 本仓库：`tools/say.py`
- 本仓库制作快照：`../tools/day1制作/say.py`
- video-fx：`day1_tools/say.py`

用法：

```bash
# 终版晓伊（Edge；成功后仍须逐条回读）
python3 ~/tools/say.py --engine edge "大家好，本鱼回来了。日更，没摸鱼。" L01.mp3
python3 ~/tools/say.py --engine edge --batch Day1/Day1配音台词.txt --outdir day1_audio

# 离线结构占位（Piper；明确不是晓伊）
python3 ~/tools/say.py --engine piper "大家好，本鱼回来了。日更，没摸鱼。" L01.wav
python3 ~/tools/say.py --engine piper --batch Day1/Day1配音台词.txt --outdir day1_audio_piper

# 只检查已有音频，不合成
python3 ~/tools/say.py --check L01.mp3
python3 ~/tools/say.py --check L01.wav
```

固定规则：

- 终版只能是 Microsoft `zh-CN-XiaoyiNeural`（晓伊），rate `+0%`、pitch `+0Hz`；可用正常网络的 Edge，或用户提供 Azure 资源后走 `--engine azure`。
- 中文纯文本逐 cue 合成；停顿只靠标点，不用改语速代替标点。
- 不克隆任何真人、游戏角色声音，不拿任何人的干声做参考。
- 每条都回读：实测时长、F0 中位/P25/P75、采样率、峰值、≥0.999 的削顶样本数。
- 报告为 schema 2：每 cue 记录 `engine`、`measured`、`dirty`、`duration_seconds`、`duration_sec_measured`。Piper 还固定写 `final_voice=false`、`placeholder=true`、`non_xiaoyi_placeholder=true`。
- 立体声文件按原始声道测峰值/削顶，再用归一化单声道测 F0，避免 FFmpeg 双声道下混增益造成假削顶；逐句人声本身仍是单声道。

检测器自检：310Hz 谐波信号回读 **2.038s / 310.36Hz**；Piper 官方 `speaker_0.mp3` 样本回读 **19.200s / 196.17Hz**。这两项只证明回读器工作及统一 Piper 口径，不是晓伊证据。

### 2.2 Edge 晓伊“一分钟分诊”结果

| 检查项 | 结果 |
|---|---|
| `edge-tts` 版本 | 7.3.1 |
| `python3 -m edge_tts --list-voices` | 失败，无法连接 `speech.platform.bing.com:443` |
| 代理 | 环境里没有可用代理，未虚构 `--proxy` |
| 历史网络证据 | DNS/TCP 可达但 TLS 握手被立即切断（EOF / `SSL_ERROR_SYSCALL`） |
| 结论 | 本沙箱到微软语音端点的网络路径问题；按双轨方案停止在沙箱内反复折腾直连 |
| 有效晓伊音频 | **仍无**；因此没有任何晓伊实测时长/F0 合格结论 |

### 2.3 Piper 模型、后处理与 27 条结果

- 模型：`zh_CN-huayan-medium.onnx`，目标与落盘校验均为 **63,201,294 bytes**，SHA-256 `9929917bf8cabb26fd528ea44d3a6699c11e87317a14765312420be230be0f3d`；JSON 为 22050Hz、espeak `cmn`。
- 本沙箱无法直连 Hugging Face / GitHub LFS 等二进制域名。最终从一个普通 Git blob 中取得带 129 字节 Sherpa 顶层元数据的同模型文件，去除顶层 `metadata_props` 后，文件大小与 SHA-256 与官方锚点逐字节一致，才放入 `~/tools/models/`。Git LFS 指针从未被冒充为模型。
- 每条原始 Piper 输出统一经过：

```text
alimiter=limit=0.89,loudnorm=I=-16:TP=-1.5:LRA=11
```

- 27 条原始输出峰值均为 0.999969，原始削顶合计 **41**；后处理峰值范围 **0.682739–0.843750**，削顶合计 **0**。
- 27 条后处理音频保存为 `../tools/day1制作/day1_audio_piper/L01.wav`–`L27.wav`，均为 48kHz 单声道。
- 本工具自相关口径下，27 条 F0 中位为 **187.73–222.37Hz**，全部不在晓伊目标 290–330Hz；验收表和 manifest 都明确称其为“非晓伊占位音轨”。这正是它只能做结构片的原因。

## 三、严格实测与引擎门禁

`day1_tools/gen_all.py` 不再接受字数估时或混引擎时间轴：

1. 每次运行必须显式给出当前引擎，如 `--engine piper/zh_CN-huayan-medium` 或 `--engine edge/zh-CN-XiaoyiNeural`。
2. manifest 顶层和每 cue 的 `engine` 必须与当前引擎完全一致；不一致即判旧音频 dirty，在写 timing/track 前退出。
3. 每 cue 必须 `measured=true`、`dirty=false`，台词和文件名必须与当前 27 行配音稿逐条一致；Edge/Azure 终版还必须证明晓伊 `+0% / +0Hz`。
4. 每条 `duration_seconds` 由 ffprobe/mutagen/ffmpeg 路径独立复测，差异超过 0.08 秒就中止。
5. Edge/Azure 终版每 cue 的 F0 中位必须在 290–330Hz；Piper 不套用该合格线，而是逐条记录、汇总警告，并把 timing 写为 `voice_final=false`、`voice_placeholder=true`。
6. Piper 后处理后若仍有削顶样本，禁止生成结构片时间轴。
7. 与上一版同为 27 cue 且台词一致时才比较时长：若每条偏差都 ≤8%，复用旧 cue 起止卡点；任一条 >8% 或没有可比基线，才按新实测时长重排。本次旧 timing 是 21 cue、不可比，因此按 Piper 实测时长新排为 97.49 秒。
8. `render_day1.mjs` 会拒绝把 placeholder timing 写成 `whale_day1.mp4`；Piper 默认只能写 `whale_day1_piper_structure.mp4`。

本轮门禁实跑：同引擎 Piper 成功生成结构片；无晓伊 manifest 的 Edge 运行退出码 1；Piper manifest 喂给 Edge 退出码 1；placeholder 请求终版文件名退出码 1 且没有生成 `whale_day1.mp4`。失败测试前后 timing、lyrics、envelope、track 与结构片哈希均不变。

混音后另按原始左右声道复测：`assets/day1_track.wav` 峰值 0.895020、≥0.999 样本 0；最终 MP4 解码峰值 0.894086、≥0.999 样本 0。混合 BGM 的 F0 不用于音色验收。

### 3.1 2026-10-25 更新基线重跑

本次以 `arena/8be4c8f8-video-fx@82bede5` 为基线重新执行：

```bash
python3 day1_tools/gen_all.py --engine piper/zh_CN-huayan-medium
node render_day1.mjs --stills
node render_day1.mjs --out day1_rerender_82bede5_piper.mp4
```

结果：27/27 cue 与上一版 Piper timing 的时长偏差均为 0.0%，因此合法复用卡点；渲染日志明确为 `voice_engine=piper/zh_CN-huayan-medium final=false placeholder=true`。更新版 MP4 解码音频为 97.493s、48kHz stereo，峰值 **0.894073**，≥0.999 与满幅样本均为 **0**。克隆内输出 `day1_rerender_82bede5_piper.mp4` 已原样归档为本仓库的 `成片/历史版/day1视频_Piper结构片_更新版82bede5（非晓伊占位）.mp4`。

### 3.2 尾巴可见性修复重渲（2026-10-25）

用户截图指出 L05 等镜头看起来没有尾巴。定位结果：第一版 82bede5 适配曾把 Day1 的 `tailScale` 设为更新版 MV 的 0.68；MV 主角约为 `u=36` 的单人近景，而 Day1 主角多为 `u=20–25`，且 `wink` 姿势在像素骨架中后画后发。0.68 时尾巴向左髋锚点收缩后，整段容易藏到后发与裙摆之后，只剩一点暗色，视觉上等于消失。

已对同一 L05 帧比较 0.68 / 0.85 / 1.0 / 1.1：0.85 仅勉强露出，1.0 恢复完整尾形，因此把 Day1 包装层明确改为骨架默认 `tailScale=1.0`，不改台词、timing、音轨和分镜位置。随后重新执行：

```bash
node render_day1.mjs --stills
node render_day1.mjs --out day1_rerender_82bede5_piper_tailfix.mp4
```

该阶段修复版为 13,207,508 bytes，SHA-256 `4fe1d20a2f683f96ef3c72fc6a071bf9f6e19a17391f2b13a396ad442c0fa9cb`，后来又被下一节的头发+清晰度修复版同名覆盖。该阶段 MP4 为 97.493s，解码峰值 0.894073、削顶 0；已抽取 27 个 cue 的 25%/55%/85% 共 81 张编码帧逐张检查，坐姿的大 U 形尾巴坐垫与站立姿势的外伸尾巴均可见。

### 3.3 头发与清晰度修复重渲（2026-10-25）

用户进一步指出 17 秒附近头发缺失，且全片背景像素风太重、文字看不清。复核当前 MP4 的 16.5–17.8s 后确认：头顶发和画面左侧长发仍在，但画面右侧长发呈异常竖直切边。程序化统计 rig 后发现 `wink.backHair` 有 741 条 runs、并非空数据，但右缘在绝大多数行都硬切到 `gx=27`，与头部右界齐平；对照同姿势的 original / wave / heart / panic 后发后，`heart backHair` 的双侧长发轮廓完整且不过度外张。因此只在 Day1 的 `render_day1.mjs` 中把 `poses.wink.backHair` 指向 `poses.heart.backHair`，不改上游 `whale_girl_rig_data.js`，也不改变 wink 的脸、身体、动作和 `tailScale=1.0`。

清晰度根因是上游 pixel 风格的 `applyMediumOverlay()`：它会把每帧场景先绘入 480×270 离屏缓冲，再关平滑放回 1280×720，并叠加每 3 像素一行的扫描线；`timeline.js` 又在镜头绘制后、HUD/字幕前调用它，所以场景背景和场景内文字必然被低清量化。pixel 风格的 `paint()` / `inkLine()` 还会把坐标吸附到 3px 网格。

本次 Day1 改为自定义 `clean` 呈现：背景、卡片、场景字、HUD 和字幕不再经过 480×270 overlay、扫描线与 3px snap；`day1_all.js` 的包装层给主角显式传 `style:'pixel'`，所以鲸鱼娘仍保留像素骨架。字幕绘制仍映射到原 pixel 分支以保留说话人标签，但此时边缘已按 clean 原生栅格化。渲染器把原有 1280×720 逻辑坐标以 1.5 倍直接绘到 1920×1080 画布，再用 `libx264 -preset medium -crf 19` 编码；这不是对旧 720p 成片做后期放大。脚本、27-cue 台词、Piper 音频与 measured timing 均未改。

```bash
node render_day1.mjs --stills
node render_day1.mjs --out day1_rerender_82bede5_piper_clean1080_hairfix.mp4
```

新版本已覆盖本仓库同名的 `成片/历史版/day1视频_Piper结构片_更新版82bede5（非晓伊占位）.mp4`：97.493s、1920×1080、30fps、H.264/AAC-LC 48kHz stereo、22,683,071 bytes，SHA-256 `546b24a57cc714e398883a1bb754534cf4c2453966ef0c33f13a053738894162`。解码音频仍为 97.493s，峰值 0.894073，≥0.999 与满幅样本均为 0。已检查 18 张关键静帧、最终 MP4 的 27 个 cue ×25%/55%/85% 共 81 张编码帧、cue 起点后 0.06s/0.18s 的 54 张边界帧，以及 16.5–17.8s 的 14 张连续帧：右侧长发已完整垂下，尾巴仍可见，卡片字、场景字和字幕边缘清晰。

### 3.4 用户最终配音对齐重渲（2026-10-25）

用户把连续配音 `配音_最终版.wav` 上传到同一分支（提交 `b0600b9`）。文件为 121.300s、40000Hz、双声道、16-bit PCM，峰值 0.927795，≥0.999 样本 0。用 Vosk `vosk-model-small-cn-0.22` 转写得到 255 个带起止时间的词，识别文本顺序与 27 cue 台词一致；随后按已核对的固定词序范围映射 L01–L27，并用 5ms RMS 的 onset/offset 把 ASR 粗边界修到真实发声边缘。没有用字数比例或整段线性缩放猜卡点。

新生成器 `day1_tools/gen_finalvoice.py` 保留整段 WAV 的原始句间停顿，避免逐句拼接产生咔哒声；只把人声整体后移 2.6s 给标题卡，再按新总长生成同款 chiptune BGM、口型包络、字幕表与镜头 timing。时间结构为：标题 2.600s + 首字前导 0.095s + 27 cue 发声跨度 99.170s + cue 间原停顿 22.025s + 末句后 3.350s = 127.240s。这也解释了它比 97.49s Piper 结构片长约 30 秒：不是上一版被剪短，而是这份配音本身语速和停顿更长，逐 cue 与 Piper 的偏差多条超过 8%，按既定规则必须重排。

```bash
python3 day1_tools/gen_finalvoice.py \
  --voice day1_audio_final/final_voice.wav \
  --vosk-json day1_audio_final/vosk_words.json \
  --script ../ai-yunying/Day1/Day1配音台词.txt
node render_day1.mjs --stills
node render_day1.mjs --out day1_finalvoice_aligned_1080.mp4
```

成片已归档为 `成片/当前版/day1视频_最终配音对齐版.mp4`：127.23s（容器）、1920×1080、30fps、28,246,361 bytes，SHA-256 `7082b137f68b41cefb47fd0a9c5760d6f90f04901b5404d97c48de209523bb88`。解码音频 127.232s、峰值 0.873779、削顶 0。对最终 MP4 独立再跑 Vosk，首词在 2.67s（字幕 2.695s），末词在 123.93s 结束（字幕 123.89s），与对齐表一致。源音频整段 F0 中位为 359.25Hz，27 cue 为 301.96–413.26Hz；WAV 没有引擎元数据，因此本片只称用户最终配音对齐版，不冒充已核验的晓伊 +0% / +0Hz 终版。

## 四、复现命令

前提：`ai-yunying` 与 `video-fx` 两个仓库同级放置，在 `video-fx` 根目录运行；`~/tools/say.py` 与本仓库版本一致。复现本次更新版时，`video-fx` 应检出 `arena/8be4c8f8-video-fx@82bede5`，并把本仓库快照中的 `render_day1.mjs` 放回仓库根目录、`day1_all.js` 放回 `src/ch/day1_all.js`、三份 Python 工具放回 `day1_tools/`；不要用手改生成文件代替 `gen_all.py` 的实测门禁。

### 4.1 复现 Piper 结构片

```bash
pip install --break-system-packages edge-tts mutagen imageio-ffmpeg numpy piper-tts
npm install @napi-rs/canvas
# 将校验通过的 zh_CN-huayan-medium.onnx/.json 放到 ~/tools/models/

python3 day1_tools/synth_voice.py --engine piper
python3 day1_tools/gen_all.py --engine piper/zh_CN-huayan-medium
node render_day1.mjs --out whale_day1_piper_structure.mp4
```

本仓库已保存同一批 27 条 WAV 和 manifest，可把 `../tools/day1制作/day1_audio_piper/` 内容复制回 `video-fx/day1_audio_piper/` 后从 `gen_all.py` 开始复跑。

### 4.2 出晓伊终版（仍待外部网络或 Azure）

Edge 正常网络：

```bash
python3 day1_tools/synth_voice.py --engine edge
python3 day1_tools/gen_all.py --engine edge/zh-CN-XiaoyiNeural
node render_day1.mjs --out whale_day1.mp4
```

有代理时只给 Edge 传真实代理：`python3 day1_tools/synth_voice.py --engine edge --proxy <真实代理 URL>`。

Azure 路径已留接口，但需要用户自己的 Speech 资源环境变量（如 key/endpoint/region）；没有真实凭据时不得伪造。无论 Edge 还是 Azure，晓伊都必须重新全量合成、回读时长/F0，并通过 290–330Hz 门禁；再按 8% 规则决定复用卡点还是对偏差句重排。只换音轨，不改 27-cue 分镜结构。

### 4.3 复现用户最终配音对齐版

把本仓库的 `Day1/配音_最终版.wav` 放到 `video-fx/day1_audio_final/final_voice.wav`，把 `../tools/day1制作/day1_audio_final/vosk_words.json` 放到同目录，并把 `../tools/day1制作/gen_finalvoice.py` 放回 `video-fx/day1_tools/gen_finalvoice.py`，然后执行：

```bash
python3 day1_tools/gen_finalvoice.py \
  --voice day1_audio_final/final_voice.wav \
  --vosk-json day1_audio_final/vosk_words.json \
  --script ../ai-yunying/Day1/Day1配音台词.txt
node render_day1.mjs --out day1_finalvoice_aligned_1080.mp4
```

若源 WAV 或 ASR 词数变化，生成器会因 255 词映射失效而停下；必须重新转写、重新核对词序范围，不能套旧边界。

## 五、旧预览片（历史留档）

`成片/历史版/day1视频_预览版（待晓伊配音）.mp4` 是旧 21-cue、无人声、按估时排布的预览：85.20 秒，1280×720，30fps，H.264/AAC 48kHz。它不包含本轮新增六条台词，也不满足实测卡点要求，只能回看构图风格，**不能作为 Day 1 发布片**。

首版 `成片/历史版/day1视频_Piper结构片（非晓伊占位）.mp4` 与 `成片/历史版/day1视频_Piper结构片_更新版82bede5（非晓伊占位）.mp4` 都包含完整 27 cue、真实可听的 Piper 占位配音、字幕、BGM 与实测卡点，但同样**不是发布终版**。当前观看与对齐复核以 `成片/当前版/day1视频_最终配音对齐版.mp4` 为准；若仍执行旧的晓伊认证要求，则发布前还要取得可核验的晓伊 +0% / +0Hz 音频并重新过门禁。

## 六、关键文件

| 文件 | 说明 |
|---|---|
| `Day1文案.md` | 27-cue 连读版、Cue/分镜表与数据出处 |
| `Day1配音台词.txt` | 27 行纯台词，一行一条 |
| `配音_最终版.wav` | 用户上传的 121.300s 连续最终配音源文件；无嵌入引擎/音色元数据 |
| `成片/当前版/day1视频_最终配音对齐版.mp4` | 当前 27-cue / 127.24s 对齐版；按用户 WAV 的词级时间戳重排字幕与镜头，1920×1080，非晓伊认证终版 |
| `../tools/day1制作/最终配音对齐验收表.md` | 用户 WAV 的逐 cue 源时间、成片时间、F0、峰值、削顶与 QA 结论 |
| `../tools/day1制作/day1_audio_final/` | `alignment_report.json`、255 词 `vosk_words.json` 与 27 条 QA 切片 |
| `成片/历史版/day1视频_Piper结构片_更新版82bede5（非晓伊占位）.mp4` | 27-cue / 97.49s Piper 结构片；基于 `video-fx@82bede5` 连续骨架重渲，含尾巴、wink 右发与 clean 1080p 清晰度修复，非终版 |
| `成片/历史版/day1视频_Piper结构片（非晓伊占位）.mp4` | 上一基线 27-cue / 97.49s 结构片；保留对照，非终版 |
| `../tools/day1制作/Piper结构片验收表.md` | Piper 每 cue 的时长、F0、峰值、削顶与片中起止时间 |
| `../tools/day1制作/day1_audio_piper/` | 27 条后处理 WAV + schema 2 `tts_report.json` |
| `tools/say.py` | `edge` / `piper` / `azure` 可切换合成 + 时长/F0/峰值/削顶回读 |
| `../tools/day1制作/gen_all.py` | engine/manifest 实测门禁、8% 卡点规则、字幕/混音/口型生成器 |
| `../tools/day1制作/gen_finalvoice.py` | 连续用户 WAV 的词级对齐、波形边界修正、字幕/混音/口型生成器 |
| `../tools/day1制作/synth_voice.py` | video-fx 内按引擎调用 `say.py` 的批量入口 |
| `../tools/day1制作/video-fx源码快照/day1_all.js` | 27-cue 四章分镜；含六个新增镜头、删“官方”、L16 红章避让、动作徽章关闭、主角显式 `style:'pixel'`，以及针对 Day1 小主角明确设置的 `tailScale=1.0` |
| `../tools/day1制作/video-fx源码快照/render_day1.mjs` | Day 1 渲染器；含 placeholder 终版文件名保护、Day1 HUD、wink 后发替换、clean 去像素量化、1920×1080 原生输出与 18 张静帧回归集 |
| `../tools/day1制作/video-fx源码快照/day1_timing_piper_measured.js` | Piper 实测时间轴留档；27 条偏差全 0.0%，`timing_reused=true`；文件名已标明 Piper，不可当晓伊 timing |
| `../tools/day1制作/video-fx源码快照/day1_timing_finalvoice_measured.js` | 用户 WAV 对齐时间轴留档；27 cue 按词级 ASR + 波形边界重排，`timing_reused=false` |

注：video-fx 工作区里的生成文件会随最后一次运行的生成器变化；当前沙箱克隆最后生成的是用户最终配音对齐版。若要在该仓库重出 Day 0、Piper 结构片或晓伊版，应先按对应流程重新生成，不要手改生成文件冒充实测结果。
