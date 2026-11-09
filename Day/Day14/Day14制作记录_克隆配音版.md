# Day14 制作记录｜克隆配音版成片（`measured=true`）

> 2026-11-09：用户给定 [`鲸鱼MV重看_克隆配音_最终版.wav`](../../鲸鱼MV重看_克隆配音_最终版.wav)
> （分支 `arena/689c1837-newday`，提交 `4a6a000 Add files via upload`），要求「现在根据这个生成视频」。
> 本记录只写**实际做过的事与可复现命令**；没做的列在最后一节，不冒称。

---

## 一、输入与来源

| 项 | 值 |
|---|---|
| 音源 | `鲸鱼MV重看_克隆配音_最终版.wav`（仓库根目录，按 `.gitignore` 约定 `/*.wav` **不入库**） |
| 取回命令 | `git show origin/arena/689c1837-newday:鲸鱼MV重看_克隆配音_最终版.wav > 鲸鱼MV重看_克隆配音_最终版.wav` |
| 规格 | 单声道 / `40000 Hz` / `16-bit PCM` / `4998800` 帧 / **124.970 s** / `9,997,644` 字节 |
| SHA256 | `86223c9fb2c34078e2077af8807b34f357ee74508c2e2b4a48e23003ae220ff3` |
| 台词 | [`Day14配音台词_达拉崩吧版_待审.txt`](Day14配音台词_达拉崩吧版_待审.txt)（v6，24 行 / 440 汉字，八位本名） |
| 画面素材 | `番外MV/达拉崩吧/dalabengba.mp4`（本仓库已交付成片，`132.77s`，零水印） |
| 剧本 / 分镜 | [`Day14剧本_达拉崩吧承接_待审.md`](Day14剧本_达拉崩吧承接_待审.md) · [`Day14分镜_电视机版_待审.md`](Day14分镜_电视机版_待审.md) |

**同一分支上还有 `Day14规划轴_达拉崩吧版.planning.json`（`measured=false`，规划 149.012s）**：
那是无音源时的估算轴，用于分镜排布；**成片一律以本轮实测轴 124.97s 为准**，两份不要混用。
估算比实测长约 24s，属语速估算偏差，不是改词。

---

## 二、实测轴（不是估算、不是伪造词时间）

```sh
# 1) 词级 ASR：离线 Vosk 中文小模型，逐词时间戳原样落盘
python3 tools/音频/transcribe_vosk.py \
  --voice 鲸鱼MV重看_克隆配音_最终版.wav \
  --model /tmp/vosk-model-cn/vosk-model-small-cn-0.22 \
  --out tools/day14制作/asr_words.json
# 2) 逐字对齐 + 5ms RMS 边界修整 + 拆字幕屏
python3 tools/音频/align_voice.py \
  --voice 鲸鱼MV重看_克隆配音_最终版.wav \
  --script Day/Day14/Day14配音台词_达拉崩吧版_待审.txt \
  --words tools/day14制作/asr_words.json \
  --out tools/day14制作/voice_alignment.json \
  --subs-out tools/day14制作/subtitle_timing.json
```

- ASR 模型：`vosk-model-small-cn-0.22`（GitHub `jimy7945/vosk-model-cn` 的三个 `zip.part*` 分卷拼回，
  仅本机 `/tmp` 使用，**不入库、不写进仓库依赖**）；`vosk` Python 包按需 pip 安装。
- 识别输出 **281 个词**，有大量同音错字（「本金」＝本鲸、「几米」＝Kimi、「质朴」＝智谱、「千万」＝千问、
  「龙羊」＝龙娘、「都包」＝豆包），但**词序与 24 行逐句对应**；`align_voice.py` 用 `difflib`
  把台词字符落到当时那截声音上，听错的字也归到该词，不整段丢给上一词。
- 产物：`voice_alignment.json`（`measured:true`，24 cue，每字带 `chars_timed`，音源 SHA 一致）、
  `subtitle_timing.json`（`measured:true`，**63 屏**，单屏 ≤15 字，逐字与台词一致）。
- **顺手修了通用工具两个真 bug**（`tools/音频/align_voice.py`）：
  ① 原来把一行里超过 15 字的多块字幕共用同一段 `start/end`，`validate_timing` 判「字幕时间重叠」；
  改成先切块再按块长比例分配时间。
  ② 切块后可能只剩一个纯标点块（如本集 L06 的「，」、L08 的「」。」），它没有声音：
  前者会被 `check_subtitle_sync.py` 判「静音弹字」，后者会在画面上弹一条只有引号的空字幕；
  改成「块内没有任何文字字符就并回前一块」（中文引号不在 `PUNCT` 里，用 `isalnum()` 判断更稳）。
  修完 65 → **63 屏**，无纯标点屏，逐屏 10ms 峰值均 > −50dB。
- `validate_timing` / `开场体检.py`：**通过**（事件落地 `0.020s`，前 5 秒 15 字，结尾承诺句「下一集」）。

---

## 三、电视画中画抽帧（成片真帧）

```sh
npm install --no-save --no-package-lock @ffmpeg-installer/ffmpeg @ffprobe-installer/ffprobe
FF=node_modules/@ffmpeg-installer/linux-x64/ffmpeg
$FF -v error -ss 0.00 -i 番外MV/达拉崩吧/dalabengba.mp4 -t 6.00 \
  -vf "fps=10,scale=960:540:flags=lanczos" -q:v 4 \
  tools/day14制作/tv_frames/BOOK/%04d.jpg
# 共 10 段，见 Day14分镜_电视机版_待审.md 第 1 节「成片实测片段清单」
```

- 本环境**没有系统 ffmpeg**；按 `tools/验收/media_common.py` 与 `tools/engine/room_base.mjs`
  已有的查找约定安装 `@ffmpeg-installer` / `@ffprobe-installer`，二进制落在被忽略的 `node_modules/`。
- 抽得 **10 段 / 442 张 `960×540` JPG / 47MB**，贴在稳定屏幕矩形 `560,180–1480,697`（`920×517`）。
  目录 `tools/day14制作/tv_frames/` 已加进 `.gitignore`（中间产物可重生成）。
- **按成片真实画面重定位**：`TREATMENT.md` §5 的 `S01–S26` 秒区间与交付成片不同步
  （计划里 `128.33–132.77` 写「龙焰＋石碑」，成片那里是名字方块；喷焦在 `128.4–129.6`）。
  本轮逐 `0.5s` 扫过成片后改用实测片段 `BOOK/DRAGON/MAP/SIGNUP/CHEST/NAME/MOON/CAGE/FIRE/END`；
  成片里**没有**「十三块石碑砸落」画面，不虚构。
- 成片中段自带游戏 HUD（`LV/GOLD/心形血条`）：属片中片内容，本集渲染器**没有**新增任何
  进度条／音量条／数字看板；为减少占比只取 `CHEST`/`MOON` 各 2–3 秒，避开 `85–101s` 的升级长段。
- 画中画**静音**：不混入番外原曲与 96 处音效；成片音轨只有用户给定的克隆配音。

---

## 四、渲染与成片

```sh
python3 tools/day14制作/render_day14_video.py \
  --out Day/Day14/成片/Day14_重看昨天那支片子_克隆配音版.mp4
# 抽查静帧：python3 tools/day14制作/render_day14_video.py --stills 8
```

渲染器 `tools/day14制作/render_day14_video.py`（本轮新增，入库）：

- `1920×1080 @ 30fps`（仓库统一规格，`verify_episode.py` 要求 1080p30），`3756` 帧，
  音源实测 `124.970s`；末句 cue 结束在 `124.94s`，按终验要求留 `0.25s` 收尾 →
  输出 `125.195s`，音频用 `apad` 补到同长、不切尾音。
  画面 `libx264 / CRF 21 / yuv420p`，音轨 `AAC 192k / 44.1kHz / 立体声`，`-movflags +faststart`。
- 电视外：既有海底房间 + 浅青桌面 + 稳定电视外框；本鲸用 `assets/ai-girls` 立绘（焦黑调），
  按行分四组姿态（看屏幕／暂停翻纸／低头写／收尾），带轻微呼吸；纸面笔迹随行累加，
  烤焦那张单独夹出，歪伞在 L22 起收进抽屉。
- 字幕：**按用户定死的项目统一 Day2 样式**（`tools/字幕/README.md`、`day2_style_sub.mjs` 的 `DAY2_SUB`）
  逐项复刻：深蓝 `rgba(9,22,54)` 对话条、`#48C8FF` 青色描边、圆角、左上角
  `#1E40AF`/`#FACC15` 说话人小标签、白色 `NotoSansSC-Bold` 正文（28px 逻辑 ×1.5）。
  按实测 63 屏切换，外部字幕不随电视缩放；字体取自 `google/fonts`，放在被 `.gitignore` 忽略的
  `video-fx/assets/fonts/`。第一版曾误用白字深描边，已按仓库规范改回，不另写一版风格。
- **零角标／零水印／无进度条／无音量条／无表格／无片尾卡／无目标数字**；
  「暂停／倒带」靠切片段与定格表达，不画屏幕控件。

成片：[`成片/Day14_重看昨天那支片子_克隆配音版.mp4`](成片/Day14_重看昨天那支片子_克隆配音版.mp4)

---

## 五、已跑的验收

| 检查 | 结果 |
|---|---|
| `validate_timing`（`media_common.py`） | **通过**：24 cue / 63 屏 / `measured=true` / SHA 一致 / 字幕不抢跑 |
| `tools/剧本/开场体检.py` | **通过**：事件落地 `0.020s`、前 5 秒 15 字、结尾承诺句「下一集」 |
| `gate --day 14 --stage audio --config Day/Day14/gate_config.json` | **通过**（见 `gate_audio_report.json`） |
| `tools/剧本/画面红线体检.py` 点查 | **通过**（渲染器不画禁用控件） |
| 关键帧抽查（`--stills 8` + 成片抽帧） | 电视边框稳定、屏内完整场景、字幕不随电视缩放、脸/手无遮挡 |
| `tools/验收/verify_episode.py` 媒体终验 | **通过**：1080p30 / 双声道 / 全片解码 / 原声零偏移相关 `0.999996` / 尾挂 `0.255s` / 63 屏字幕抽样通过 |
| `tools/验收/check_opener_visual.py` 前 2 秒体检 | **通过**：运动 `1.718`、上半屏亮部 `0.416`、全帧亮部 `0.419` |
| `画面红线体检.py` 点查（渲染器与三份文档） | **通过**；`.mjs` 探针仍能拦下 `volumeBar/progressBar` |
| Python 19 单测 + 音频 2 单测 / `day14_plan.test.mjs` | **21 OK** / **3 pass + 1 skip** |

### 成片实测（最终渲染）

| 项 | 值 |
|---|---|
| 文件 | [`成片/Day14_重看昨天那支片子_克隆配音版.mp4`](成片/Day14_重看昨天那支片子_克隆配音版.mp4) |
| 大小 / SHA256 | `15,426,393` 字节 / `d319cc9d287f8406ef76e0e1c88fe65c3fe6283d2d3d99beeb96b8992464d869` |
| 视频 | `h264` `1920×1080` `30/1` `3756` 帧 `125.200s` |
| 音频 | `aac` `44100Hz` 双声道 `125.195s`（源 `124.970s` + `0.25s` 收尾） |
| 尾挂 / PCM 相关 | `0.255s` / `0.999996053` |
| 完整规格 | [`成片/Day14_成片规格.txt`](成片/Day14_成片规格.txt) |

> 字幕核验是色彩/帧差抽样，**不是 OCR**，不证明字幕文字内容或音素同步；动态观感仍需人工看片。

---

## 六、还没做（不许写成已完成）

- **未获真人观影批准**：好不好笑／像不像／节奏／动态观感仍需你审；门禁与自检不等于批准。
- 未写本集 `episode.spec.mjs`，所以**没跑** `check_storyboard.mjs`、`gate --stage pre-render` / `final`；
  `tools/engine/engine.test.mjs` 仍因缺 `@napi-rs/canvas` 起不来。
- 没做 BGM／原曲混音、竖版导出、多平台版本、字幕单独 SRT 交付、发布或上传。
- 音源是用户上传的克隆配音：声音 likeness 与番外原曲／字体（OFL-1.1）／上游人物图像的再分发授权，
  发布前另行确认，本轮无新授权结论。
- 旧《两只沙漏》标准稿、`Day14配音台词.txt` 与 Day13 成片/SHA **一个字未改**；
  `gate --stage script` 默认仍指向旧标准文件名，本轮用显式 `--config` 指向待审稿。
