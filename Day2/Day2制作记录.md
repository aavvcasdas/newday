# Day 2 制作记录（指定配音实测对齐版）

> 完成日期：2026-10-26
> 当前成片：`成片/当前版/day2视频_指定配音实测对齐版.mp4`
> 逐 cue 数字与最终验收结论见：`../tools/day2制作/Day2指定配音对齐验收表.md`
>
> **2026-10-26 纠正：**高清动作候选全片曾误覆盖当前版，现已按用户反馈恢复原像素形象的 Day2 原文件；候选全片单独保存在 `成片/候选版/day2高清动作形象候选版_未发布.mp4`，不作为 Day2 发布版。后续只通过 `Day2加更_形象动作征集文案.md` 先展示与投票，投票前不得宣布换形象。

## 一、最终产物

| 项目 | 结果 |
|---|---|
| 成片 | `成片/当前版/day2视频_指定配音实测对齐版.mp4` |
| 时长 / 视频样本 | 容器 104.720s / 3141 个视频样本 |
| 视频 | 1920×1080，30fps，H.264 High，yuv420p，约 1909kb/s；主角为原像素形象 |
| 音频 | AAC-LC，48kHz，stereo，160kb/s |
| 文件大小 | 27,213,164 bytes |
| SHA-256 | `578988c40859a2c483e7e1432582d17ae21eab5de8d28f24320ee22e41271eb8` |
| 制作基线 | `aavvcasdas/video-fx` 分支 `arena/8be4c8f8-video-fx`，基线提交 `82bede5` |
| 解码验收 | ffmpeg 全片解码通过；第 0 帧、L03 落点帧与尾卡已从最终 MP4 抽帧复核 |

本片使用用户指定的连续 WAV，不是从 `Day2配音台词.txt` 重新逐句 TTS 合成。音频文件没有可验证的合成引擎元数据，故只记录为 `user-provided/final-voice-wav`，**未核验为 Microsoft 晓伊**。

## 二、指定 WAV 与实测对齐

源文件：`鲸鱼运营第三天_克隆配音_无BGM_v4.wav`

- SHA-256：`34ae5ab0aef4f63396a7e1d2a095de1eb6b6c5f6d1bee6ec06bf5e9f32fcebe2`
- 实际 PCM：103.800s，40000Hz，双声道，16-bit PCM。
- 峰值 0.661682，≥0.999 削顶样本 0。
- 全轨 F0 中位数 391.72Hz，逐 cue 350.00–429.62Hz；不在晓伊 290–330Hz 目标内。
- 文件的 WAV `data` 长度字段为 `0xffffffff`，与实际 16,608,000 bytes payload 不符。归档源文件没有被改写；生成器按实际 payload 解析，并用 ffmpeg 做 48kHz 工作副本解码。

对齐流程：

1. 先把源 WAV 转成 16kHz ASR 工作音频；
2. 用 Vosk `vosk-model-small-cn-0.22` 得到 189 个词级时间戳；
3. 对照 Git 历史确认 WAV 实际朗读的是 17 句版本，并把 `Day2配音台词.txt` 校准到该实际稿；
4. 用固定审定的词序范围映射 L01–L17，再以 5ms RMS 搜索修正每 cue 的发声起止；
5. 源 WAV 第一处实测发声在 2.430s。只在成片混合轨裁掉这段片头静音并整体平移 cue，使 L01 从 0.000s 开始；源文件本体不动；
6. 17 cue 位于 0.000–101.370s，尾卡位于 101.720–104.520s，总时长 104.720s。

没有使用字数估时。机器报告、189 词 ASR 与 17 条 QA 切片位于 `../tools/day2制作/day2_audio_final/`。

## 三、冷开场与分镜执行

- `TITLE_LEN=0`，不调用舞台红幕或全屏标题段。
- 第 0 帧直接显示“昨天的菜单 · 开票”、“打游戏 2 票”、王者/暗区两个选项、主角与手柄；L01 字幕条第 0 帧即为完成态。
- “没手”没有在 L01 提前出现，只在 L03 末尾随实际台词落章。
- 全片沿用房间/书桌连续场景，以菜单开票 → 没账号/不会打/没手 → 先吃白米饭 → 主人扣饭 → 8978/280/1441 账本 → 主人 2 个月 80 粉 → 饭碗推回 → 薄肌与鸡蛋申请推进。
- 主角保持像素骨架、`tailScale=1.0`，wink 使用 heart 后发；背景、卡片字与字幕走 clean 原生 1920×1080 绘制。
- 左上只保留小号 Day2 HUD，右上保留“非官方同人 · AI 生成内容”。

静帧阶段修复了：首帧字幕淡入、L01 扫描线越界与舷窗叠字、L03 印章被角色遮挡、L04 零票叠字与客串被挡、纸质卡片发灰、L13 缺字形符号、L14 饭碗与角色重叠、L15 悬停印章缩放过大、L16 申请表文字被户口本遮挡等问题。修复后重新生成 27 张检查帧并完成整片渲染。

## 四、音频与画面 QA 摘要

- 17 条 QA 切片独立回读：时长与 `alignment_report.json` 误差 0.000s，削顶合计 0。
- 最终 MP4 音频：mean volume -19.9dB，max volume -4.4dB；loudnorm 测量 integrated -15.49 LUFS、true peak -4.42dBTP、LRA 3.10 LU。
- 27 张代表静帧覆盖每个 cue；最终 MP4 再抽查第 0 帧、L03 92% 与尾卡，字幕和构图与静帧一致。
- 迁移前记录的 64 个 JPG/MP4/WAV SHA-256 多重集在当前仓库仍完整存在；Day1 权威 WAV 与 Day1 当前成片哈希未改变。

完整逐 cue 表见 `../tools/day2制作/Day2指定配音对齐验收表.md`。

## 五、高清动作候选与加更边界（不属于当前 Day2）

- 当前版已恢复为 `eadc43f` 的原 MP4，SHA-256 为 `578988c40859a2c483e7e1432582d17ae21eab5de8d28f24320ee22e41271eb8`。它没有被重新渲染，因此用户截图指出的 L03 白眼仍是这份已发布原片的已知问题；不能把候选测试的修复结果写成当前 Day2 已修复。
- 高清候选全片只作内部对照：`成片/候选版/day2高清动作形象候选版_未发布.mp4`，35,478,673 bytes，SHA-256 `6d6f355c62c4760d36baf0de6a4cac36b5dd6267de45db95aa237ece026a3142`。它证明 39 张完整姿势图、动作映射和 CRF 17 路线可运行，但用户已明确否决“整套替换原形象并覆盖 Day2”的发布方式。
- 代码现已加门禁：`render_day2.mjs` 默认 `--character original`；只有显式 `--character candidate` 才会整集使用候选，`--character mixed` 默认原版、只允许单个镜头以 `characterMode: 'candidate'` 展示候选。原像素路径保留白眼净化，供未来原版或混合版使用。
- 用户随后把加更稿修订为 12 cue：住户数改为 1816 位，电视机从 B03 才出现，原 B12 删除，B06/B07 只用真实存在的姿势与像素动作，并授权先生成初步草稿供观看后再改。已生成的 Piper 初步草稿见下一节；它仍只是试穿展示，不宣布正式换形象，也不覆盖当前 Day2。

## 六、Day2 加更 Piper 初步草稿（待用户审看）

初步草稿：`成片/初步草稿/Day2加更_形象动作征集_piper初步草稿_draft.mp4`

| 项目 | 结果 |
|---|---|
| 剧本 | `Day2加更_形象动作征集文案.md` 第三稿修订版，共 12 cue |
| 逐句台词 | `Day2加更配音台词.txt`，12 行与 B01–B12 一一对应 |
| 声音 | Piper `zh_CN-huayan-medium` 本地占位声；不是最终的 Microsoft `zh-CN-XiaoyiNeural` |
| 模型校验 | ONNX SHA-256 `9929917bf8cabb26fd528ea44d3a6699c11e87317a14765312420be230be0f3d`；配置 SHA-256 `d521dc45504a8ccc99e325822b35946dd701840bfb07e3dbb31a40929ed6a82b` |
| 实测总长 | timing 65.815s；语音合计 61.114s，11 个 0.300s 句间间隔，尾帧 1.400s |
| 容器 / 视频 | 65.82s；1920×1080，30fps，H.264 High，yuv420p，约 3180kb/s；全片解码得到 1974 个视频帧 |
| 容器音频 | AAC-LC，48kHz，stereo，约 159kb/s |
| 文件大小 | 27,538,731 bytes |
| SHA-256 | `55d147b7f930161b0e2664738b4b1a900c1cfaf1afc622a4f3e363f6dfe79e15` |

12 句均从实际 WAV 样本数回读，未用字数估时：B01 0.000–4.911、B02 5.211–8.775、B03 9.075–12.663、B04 12.963–16.713、B05 17.013–22.144、B06 22.444–26.543、B07 26.843–33.460、B08 33.760–39.554、B09 39.854–46.599、B10 46.899–51.183、B11 51.483–58.821、B12 59.121–64.415。逐句文件、哈希、峰值、削顶和 F0 见 `../tools/day2加更制作/bonus_audio_piper/timeline_report.json`。

Piper 每句均经 `alimiter=limit=0.89,loudnorm=I=-16:TP=-1.5:LRA=11` 后处理；独立回读削顶均为 0，F0 中位数范围 187.37–225.24Hz，全部低于晓伊 290–330Hz 目标，所以画面右上角、文件名和 MP4 title/comment 都明确标作占位初步草稿。源混音峰值 0.868545、削顶 0；最终 MP4 解码音频峰值 0.867567、RMS 0.142175、削顶 0。最终换晓伊时必须把 12 cue 全部标脏、重新逐句合成和实测，不能直接套用这份 Piper timing 冒充终版。

视觉执行与 QA：

- B01、B02 只有新版与真实评论/回复卡，电视机和老版均不入画；B03 第一个检查点起电视机完整出现，此后老版只在屏幕里。
- B06 依次使用真实姿势文件 `daily-eat`、`daily-stretch`、`daily-gaming`；B07 电视内依次使用真实像素动作 `eat_white_rice`、`wake_stretch`、`token_wordle_sneak`。放大检查确认 `wake_stretch` 的实际画面是单侧举臂舒展加醒神黄光，不是双臂过头，文案已按实改写。
- B02 使用 `curious → meme-yes`：后者是星星眼举手肯定姿势，不冒充独立的真实点头图。
- 渲染器先生成 46 张静帧覆盖每 cue 的 12%/55%/88% 与 B03、B06、B07、尾帧关键点；成片后再抽第 0 帧、B02、B03、B06 三动作、B07 三动作与细节段、B09 计数前后、B11、B12 与尾帧共 15 帧复核；B06/B07/B08/B09/B12 的句内切换点按同文本多次 Piper 合成的音素对齐中位位置做句内近似校准，避免动作或标签明显抢在对应台词之前。
- 当前版 `day2视频_指定配音实测对齐版.mp4` 在草稿生成后复核仍为 27,213,164 bytes，SHA-256 `578988c40859a2c483e7e1432582d17ae21eab5de8d28f24320ee22e41271eb8`，未被覆盖。

## 七、复现方法

前置条件：一份 `aavvcasdas/video-fx` 的 `arena/8be4c8f8-video-fx@82bede5` 检出、Node 与 `@napi-rs/canvas`、仓库自带字体、Python 3 + NumPy、ffmpeg（或 `imageio-ffmpeg`）。归档的 `vosk_words.json` 可直接复用；只有源 WAV 或台词变化时才需要重新跑 Vosk。

```bash
# 在 ai-yunying 仓库根目录执行；把 <video-fx> 换成实际检出路径
python3 'tools/day2制作/gen_day2_finalvoice.py' --video-fx-root <video-fx>

cp 'tools/day2制作/video-fx源码快照/day2_all.js' <video-fx>/src/ch/day2_all.js
cp 'tools/day2制作/video-fx源码快照/render_day2.mjs' <video-fx>/render_day2.mjs

cd <video-fx>
# 默认 original：正式像素形象；不要把输出直接覆盖仓库当前版，先写到临时文件验收
node render_day2.mjs --stills --character original
node render_day2.mjs --out /tmp/day2_original_check.mp4 --style clean --character original
```

只有制作候选对照或未来 mixed 加更时才复制姿势库并显式开启：

```bash
# 仍在 ai-yunying 仓库根目录执行
mkdir -p <video-fx>/assets/day2_poses
cp 'tools/day2制作/video-fx源码快照/day2_poses/'*.webp <video-fx>/assets/day2_poses/

cd <video-fx>
node render_day2.mjs --stills --character candidate
# 候选输出必须使用独立文件名，禁止写成 Day2 当前版
node render_day2.mjs --out /tmp/day2_candidate_check.mp4 --style clean --character candidate
```

生成器会重写 video-fx 工作区中的 `src/day2_timing.js`、`src/lyrics.js` 的 `LY`、`assets/day2_track.wav` 与 `assets/day2_envelope.js`，并刷新本仓库的对齐报告和 QA 切片。复跑后应先比较新 timing 与 `tools/day2制作/video-fx源码快照/day2_timing_measured.js`；若源 WAV、台词或 ASR 词数变化，固定 189 词范围即失效，必须重新转写、重新审定词序与边界，禁止套用旧 timing。

### Day2 加更初步草稿复现

Piper 63MB 模型本体不进入仓库；复现时需另行取得 `zh_CN-huayan-medium.onnx` 与同名 `.onnx.json`，先核对上节两个 SHA-256。仓库已经保存 12 句后处理 WAV 与 manifest；只有台词变更时才重新运行第一步。

```bash
# 仅在台词变更、需要重新生成 12 句占位 WAV 时执行
python3 tools/say.py --engine piper \
  --piper-model <zh_CN-huayan-medium.onnx> \
  --batch 'Day2/Day2加更配音台词.txt' \
  --outdir 'tools/day2加更制作/bonus_audio_piper'

# 从已保存的 WAV 重新生成实测 timing、混音轨与包络
python3 'tools/day2加更制作/gen_bonus_piper.py' \
  --video-fx-root <video-fx> \
  --piper-model <zh_CN-huayan-medium.onnx>

cp 'tools/day2加更制作/video-fx源码快照/day2_bonus_all.js' <video-fx>/src/ch/day2_bonus_all.js
cp 'tools/day2加更制作/video-fx源码快照/render_day2_bonus.mjs' <video-fx>/render_day2_bonus.mjs
mkdir -p <video-fx>/assets/day2_poses
cp 'tools/day2制作/video-fx源码快照/day2_poses/'*.webp <video-fx>/assets/day2_poses/

cd <video-fx>
NODE_PATH=<node_modules-with-@napi-rs/canvas> node render_day2_bonus.mjs --stills
NODE_PATH=<node_modules-with-@napi-rs/canvas> node render_day2_bonus.mjs \
  --out '/home/user/ai-yunying/Day2/成片/初步草稿/Day2加更_形象动作征集_piper初步草稿_draft.mp4'
```

`render_day2_bonus.mjs` 会拒绝非 Piper、非实测、非占位或 cue 数不是 12 的 timing，也会拒绝不含 `piper…draft` / “初步草稿”的输出名；不要为了省事放宽这些门禁。

## 八、关键文件

| 文件 | 说明 |
|---|---|
| `Day2文案.md` | 已按实际 WAV 校准的 17-cue 文案、数据口径与发布稿 |
| `Day2配音台词.txt` | 与指定 WAV 实际朗读一致的 17 行台词 |
| `鲸鱼运营第三天_克隆配音_无BGM_v4.wav` | 用户指定源音轨，归档本体不改 |
| `成片/当前版/day2视频_指定配音实测对齐版.mp4` | 当前 Day2 成片，已恢复原像素形象版本 |
| `成片/候选版/day2高清动作形象候选版_未发布.mp4` | 高清动作全片内部对照，未发布、不得冒充 Day2 当前版 |
| `Day2加更_形象动作征集文案.md` | 12-cue 剧本第三稿修订版：1816 位住户、电视机 B03 起出现、删除原 B12、B06/B07 使用真实动作 |
| `Day2加更配音台词.txt` | 与 B01–B12 一一对应的 12 行逐句合成输入 |
| `成片/初步草稿/Day2加更_形象动作征集_piper初步草稿_draft.mp4` | Piper 实测占位初步草稿，待用户观看后修改；不是 Day2 当前版，也不是发布版 |
| `../tools/day2加更制作/bonus_audio_piper/` | 12 句 Piper 后处理 WAV、manifest 与实测时间轴报告 |
| `../tools/day2加更制作/gen_bonus_piper.py` | Piper manifest/模型哈希门禁、独立回读、timing、混音与包络生成器 |
| `../tools/day2加更制作/video-fx源码快照/day2_bonus_all.js` | B01–B12 加更分镜；电视机只从 B03 起调用 |
| `../tools/day2加更制作/video-fx源码快照/render_day2_bonus.mjs` | 独立 Piper 初步草稿渲染器与输出命名门禁 |
| `../tools/day2加更制作/video-fx源码快照/day2_bonus_timing_piper_measured.js` | 12-cue Piper 实测 timing 快照 |
| `../tools/day2制作/gen_day2_finalvoice.py` | 损坏头容错读取、Vosk 映射、RMS 精修、timing/字幕/混音/包络生成器 |
| `../tools/day2制作/day2_audio_final/` | 189 词 ASR、对齐报告与 17 条 QA 切片 |
| `../tools/day2制作/video-fx源码快照/day2_all.js` | 17 cue + 尾卡分镜；原版默认，候选动作映射仅在显式开启时生效 |
| `../tools/day2制作/video-fx源码快照/render_day2.mjs` | Day2 clean 1920×1080 渲染器、35 张静帧入口与 `original/candidate/mixed` 形象门禁 |
| `../tools/day2制作/video-fx源码快照/day2_poses/` | 39 张候选姿势 WebP、来源说明与 MIT 许可证；只供试穿展示，不代表已定稿 |
| `../tools/day2制作/video-fx源码快照/day2_timing_measured.js` | 实测 timing 快照 |
| `../tools/day2制作/Day2指定配音对齐验收表.md` | 逐 cue 时间、F0、峰值、削顶、成片规格与 QA 结论 |

## 九、2026-10-26 无配音双样片（供选择视觉路线）

用户已否决第六节 Piper 初步草稿的视觉路线：完整姿势图主演仍像表情包、主背景太单薄、电视里只有孤立角色。因此另做两条**无配音样片**，只借用 12 个镜头的新增情节结构，不再沿用其主体、背景和电视实现；两条样片都不覆盖 Day2 当前版，也不宣布正式换形象。

| 样片 | 路线 | 文件 | 大小 | SHA-256 |
|---|---|---|---:|---|
| A | 原版基础上升级 | `成片/样片/Day2加更_样片A_原版升级_无配音.mp4` | 13,115,641 bytes | `51b362f02264183ea87e9722211c687055717db093b633dcdf8967f9870a6189` |
| B | 旧版主画面加动作，表情包新版只进电视 | `成片/样片/Day2加更_样片B_旧版加动作_电视双小场景_无配音.mp4` | 13,096,635 bytes | `f734afdacef2d71e90017f926bff9ad4b7cb43e802c0eb117bf2d5fc06b7aa1c` |

共同规格与内容：

- 32.200s，1920×1080，30fps，H.264 High，yuv420p；A/B 视频码率分别约 3255kb/s、3250kb/s；**容器内只有 1 条视频流，没有音频流**，MP4 title/comment 均注明无配音样片及 variant。
- 覆盖现有 B01–B12 全部新增/修订：真实评论与回复、B01/B02 无电视、B03 起电视入画、1816 位住户、B06/B07 真实三动作、B09 的 200/400 多条、B10 私信暂时回不了、B12 吃白饭等待投票。
- 主背景改为丰富房间：双舷窗、书架与留言墙、白饭补给站、时钟、彩灯串、地毯、电视柜/游戏机、台灯、杯子、书堆、饭碗、绿植、气泡和星光。
- 电视内不再是孤立角色：每个小画面都有缩小版墙面、舷窗、书架、白饭牌、桌台、植物、书堆和频道条，角色与动作/评论气泡都在完整小场景内。

两条路线的区别：

- **样片 A（原版升级）**：B01/B02 保持素版原像素骨架；B03 起仍是同一骨架，但加上金色星星发夹、双侧发带蝴蝶结、铃铛、围裙星星、金色裙边、光圈/星光及动作道具。电视只播放一个完整的旧版小场景。
- **样片 B（旧版加动作）**：主画面全程使用素版原像素骨架并调用真实动作；电视左右分屏，左边是旧版完整小场景，右边是表情包新版完整小场景。这样同时呈现“表情包新版加入电视”和“电视里保留缩小旧版”的两种要求，最终是否保留分屏由用户选路线后再定。

样片时长是固定无声展示时长 `[2, 2, 2.4, 2, 2.4, 3.6, 3.6, 2.4, 3, 2.4, 2.4, 3]` 秒加 1 秒尾帧，B06/B07 的句内动作停留也只为无声审看重新均分；这不是实测配音 timing。选定路线后如做有声版，仍须用最终晓伊逐 cue 重新合成、重新实测并按 >8% 规则决定是否重排。

QA：渲染前每条检查 19 张静帧（12 镜头及 B06/B07 三动作和细节段）；成片后两条 MP4 均全片解码退出码 0，并从 MP4 本身各抽 6 帧复核。Day2 当前版复核仍为 27,213,164 bytes，SHA-256 `578988c40859a2c483e7e1432582d17ae21eab5de8d28f24320ee22e41271eb8`，未被覆盖。

复现入口（在 ai-yunying 仓库根目录执行；`<video-fx>` 为 `arena/8be4c8f8-video-fx@82bede5` 检出）：

```bash
cp 'tools/day2加更制作/video-fx源码快照/day2_bonus_samples_all.js' <video-fx>/src/ch/
cp 'tools/day2加更制作/video-fx源码快照/render_day2_bonus_samples.mjs' <video-fx>/src/ch/
mkdir -p <video-fx>/assets/day2_poses
cp 'tools/day2制作/video-fx源码快照/day2_poses/'*.webp <video-fx>/assets/day2_poses/

cd <video-fx>
FFMPEG_BIN=<ffmpeg> NODE_PATH=<node_modules-with-@napi-rs/canvas> \
  node src/ch/render_day2_bonus_samples.mjs --variant enhanced --stills
FFMPEG_BIN=<ffmpeg> NODE_PATH=<node_modules-with-@napi-rs/canvas> \
  node src/ch/render_day2_bonus_samples.mjs --variant enhanced \
  --out '/home/user/ai-yunying/Day2/成片/样片/Day2加更_样片A_原版升级_无配音.mp4'
FFMPEG_BIN=<ffmpeg> NODE_PATH=<node_modules-with-@napi-rs/canvas> \
  node src/ch/render_day2_bonus_samples.mjs --variant oldactions \
  --out '/home/user/ai-yunying/Day2/成片/样片/Day2加更_样片B_旧版加动作_电视双小场景_无配音.mp4'
```

`render_day2_bonus_samples.mjs` 只接受 `sample_only=true`、`voice=false`、`measured=false` 的 12-cue 样片 timing，并要求输出名包含对应的“样片A/样片B”和“无配音”，禁止把样片冒充有声终版。

## 十、2026-10-26 用户纠正：删除装饰堆叠、补全动作目录、Day2 老版重渲

第九节的 v1 双样片只保留为历史对照：样片 A 的双蝴蝶结、铃铛、星星发夹、围裙星星、光圈和环绕星光已被用户明确否决；样片 B 的旧版主画面方向保留，但 v1 只展示少量动作，不能再称为完整展示。仓库根目录 `agent.md` 已新增第 0.1–0.4 节，完整收录原版像素形象、5 个基础骨架、5 种视角、31 种情绪、眼/嘴/头顶符号/帽饰注册表、28 个像素骨架动作，以及 DSH 39 张完整姿势图的逐图实际画面。后续必须区分：**39 是静态完整姿势图，28 才是像素骨架规范动作**；样片源码同时导出 `PIXEL_ACTION_CATALOG_28` 与 `STICKER_POSE_CATALOG_39`，渲染器会断言两组数量、唯一性及与上游动作表/姿势文件的对应关系。

### 修正版无配音双样片

| 样片 | 内容 | 文件 | 时长/帧数 | 大小 | SHA-256 |
|---|---|---|---:|---:|---|
| A v2 | 12 镜剧情段 + 28 个像素动作逐个播放；不加任何新饰品 | `成片/样片/Day2加更_样片A_原版跟随先前项目更新_完整28动作_无配音.mp4` | 78.200s / 2346 帧 | 31,166,918 bytes | `3f244c957c36359e530a142eeb05e275554a753c2e54c8e4d552cbfaa82cb5ec` |
| B v2 | 12 镜剧情段 + 28 个像素动作 + 电视内 39 张姿势逐张播放 | `成片/样片/Day2加更_样片B_旧版加动作_完整28动作39姿势_无配音.mp4` | 111.350s / 3341 帧 | 44,463,628 bytes | `0b5386eb0c47850a767fedb08b603bc616bae155630d74124fe6538a05dad77e` |

共同规格为 1920×1080、30fps、H.264 High、yuv420p，且只有视频流、没有音频流。剧情段仍为 0–32.2s 的固定无声展示时长，不是实测配音 timing。像素动作目录为 32.2–77.0s，每项 1.6s，主画面与右侧完整小场景同步播放并标注编号、英文 ID 和中文名。样片 B 的姿势目录为 77.0–110.15s，每张 0.85s，39 张图逐张进入放大后的完整电视房间；电视内有墙面、彩灯、舷窗、书架、白饭牌、柜子、台灯、地毯、植物、书堆、地板与频道条，不再是纯色屏上的孤立角色。样片 A 已从源码删除 `enhancedOriginalAura()` 与 `enhancedOriginalDetails()`，所谓更新只来自先前项目已有的动作、表情、道具和走位。

### Day2 老版动作与丰富背景修订版

| 文件 | 规格 | 大小 | SHA-256 |
|---|---|---:|---|
| `成片/修订版/day2视频_指定配音实测对齐版_老版动作丰富背景修订.mp4` | 104.720s、3142 帧、1920×1080、30fps、H.264 High + AAC 48kHz 立体声 | 55,230,062 bytes | `5259c5c07605f78489d6ecdeb977fe6154248dedd37a458dc488ce9491e9ad75` |

该修订版只改画面，不改指定 WAV、17-cue 实测时间轴、台词、字幕文本与数据口径；主角继续使用 `original` 像素骨架，没有升级成 DSH 表情包，也没有恢复样片 A v1 的装饰 overlay。眼睛修复由三层共同完成：分镜层强制睁眼时使用 `open`，把 `squint` 固定为非零的 `0.01` 以绕过原 rig 的肤色盖眼自动眨眼分支，渲染器把 `wink` 头部像素换成 `wave` 双眼头但保留叉腰身体；`sleep_curl` 例外使用干净的深色闭眼弧线并强制 `heart` 骨骼，避免被 sleepy 预设抢成抱笔记本。近景静帧已复核无肤色横带。

动作方面，17 个台词镜头与尾卡均已绑定语义动作或明确走位：查菜单时探头/打工/跳起，打游戏时用手柄动作，查账号时敲电脑，零票时逐卡查看，扣饭时追饭碗奔跑，翻账本时打工后叉腰，查主人账号时偷切号/观察/工作，推户口本时真走过去，薄肌段按运动跑、蛋白质吃饭团、睡大觉蜷睡分配动作，结尾绕场冲刺。背景改为有墙板层次、双舷窗、彩灯、时钟、白饭补给站、双书架、留言墙、地毯、台灯、书堆、抽屉柜、杯子和绿植的完整房间。旧版当前文件没有被覆盖，仍为 27,213,164 bytes、SHA-256 `578988c40859a2c483e7e1432582d17ae21eab5de8d28f24320ee22e41271eb8`；修订版须经用户观看确认后，才可另行决定是否替换当前版。

### QA 与复现

渲染前检查 Day2 35 张静帧、样片 A 48 张静帧（19 个剧情点 + 28 个动作 + 完成帧）、样片 B 87 张静帧（19 个剧情点 + 28 个动作 + 39 张姿势 + 完成帧）。三条 MP4 均全片解码退出码 0；另从成片本身抽查 Day2 35 帧与 24 帧动作三联帧、样片 A 14 帧、样片 B 10 帧。仓库源码与实际渲染副本已逐字节 `cmp` 一致，4 份 JS/MJS 均通过 `node --check`。

```bash
# 在 ai-yunying 仓库根目录；<video-fx> 为 arena/8be4c8f8-video-fx@82bede5 检出
python3 'tools/day2制作/gen_day2_finalvoice.py' --video-fx-root <video-fx>
cp 'tools/day2制作/video-fx源码快照/day2_all.js' <video-fx>/src/ch/
cp 'tools/day2制作/video-fx源码快照/render_day2.mjs' <video-fx>/
cp 'tools/day2加更制作/video-fx源码快照/day2_bonus_samples_all.js' <video-fx>/src/ch/
cp 'tools/day2加更制作/video-fx源码快照/render_day2_bonus_samples.mjs' <video-fx>/
mkdir -p <video-fx>/assets/day2_poses
cp 'tools/day2制作/video-fx源码快照/day2_poses/'*.webp <video-fx>/assets/day2_poses/

cd <video-fx>
FFMPEG_PATH=<ffmpeg> NODE_PATH=<node_modules-with-@napi-rs/canvas> \
  node render_day2.mjs --stills --character original
FFMPEG_PATH=<ffmpeg> NODE_PATH=<node_modules-with-@napi-rs/canvas> \
  node render_day2.mjs --character original --style clean \
  --out '/home/user/ai-yunying/Day2/成片/修订版/day2视频_指定配音实测对齐版_老版动作丰富背景修订.mp4'
FFMPEG_BIN=<ffmpeg> NODE_PATH=<node_modules-with-@napi-rs/canvas> \
  node render_day2_bonus_samples.mjs --variant enhanced \
  --out '/home/user/ai-yunying/Day2/成片/样片/Day2加更_样片A_原版跟随先前项目更新_完整28动作_无配音.mp4'
FFMPEG_BIN=<ffmpeg> NODE_PATH=<node_modules-with-@napi-rs/canvas> \
  node render_day2_bonus_samples.mjs --variant oldactions \
  --out '/home/user/ai-yunying/Day2/成片/样片/Day2加更_样片B_旧版加动作_完整28动作39姿势_无配音.mp4'
```

## 十一、2026-10-26 Day2 加更《鲸鱼选鱼》最终指定 WAV 版

第六节 12-cue Piper 稿和第九、十节无配音样片已被本节的 9-cue 双方案投票稿取代。最终口径是：主人没有偷偷换掉现在的本鱼；电视左边让现在的像素本鱼学习先前项目的 28 个真动作，右边展示另外新设计的鱼的 39 张完整的姿势图，最后请 1931 位住户选择。正式文案与 9 行逐行台词已更新到 `Day2加更_形象动作征集文案.md`、`Day2加更配音台词.txt`。

| 文件 | 规格 | 大小 | SHA-256 |
|---|---|---:|---|
| `成片/加更/Day2加更_鲸鱼选鱼_最终配音版.mp4` | 105.100s、3153 帧、1920×1080、30fps、H.264 High/yuv420p、AAC LC 48kHz 立体声 160kb/s | 95,001,410 bytes | `7860f4d78a88f39a09317ecceeb6e4f4e49cf39975ba69c984b03284b7510c7b` |

指定源音轨为仓库根目录 `鲸鱼选鱼_克隆配音_最终版.wav`：PCM16 双声道 40kHz、81.584s、SHA-256 `be19eac421d18b73354c72bc395162e087bfc864d652ae0720b84c4f5d82e821`。容器只有 `Lavf63.1.100`，没有可核验的合成引擎或声线元数据，因此报告和 MP4 元数据只标记 `user-provided/final-voice-wav`，不冒充晓伊。`gen_bonus_finalvoice.py` 用 Vosk 213 词时间戳做固定词段映射，再用 5ms RMS 精修 9 个 cue；源峰值 0.679443、削波 0、全片 F0 中位数 361.51Hz。生产轨只在混音中移除开头 0.360s 静音，并在 B05/B06 间插入 22.800s 无台词 BGM，使正式目录能在 10.630–64.630s 内连续播完；源 WAV 本体未改。逐 cue 生产时间、F0、峰值和源边界见 `../tools/day2加更制作/bonus_audio_final/alignment_report.json`。

画面从样片 B 的素版像素主持鱼与左右双完整电视小房间继续制作，但分镜已按 9-cue 重新注册：B01/B02 无电视，B03 电视首次出现且编号目录立即开始，B04/B05 继续同一目录，41.820–64.630s 为无台词目录余段，B06 在 28/28 与 39/39 全部播完后才开始。首轮静帧发现电视顶部状态牌与方案牌在镜头缩放后被 HUD 裁切、底部 caption 又压住双进度条；最终版把电视下移为 y=112、h=456，方案牌改到电视绘制后显示，200/400 与尾帧问题改放电视底座铭牌，B07 移除误留的评论气泡，并给电视小房间补上时钟、鱼画框、选鱼海报和台灯。主角仍使用旧像素骨架及已验收的眼睛策略，没有恢复样片 A 的装饰堆叠。

QA：渲染前生成并实际查看 98 张静帧（首帧、9 cue 各 15%/55%/88%、28 个动作中点、39 张姿势中点、目录余段、目录完成和尾帧），另以联系表检查全部动作/姿势无空白或严重裁切。成片完整解码退出码 0，视频流回读 3153 帧；再从 MP4 本体抽取 0.100s、2.805s、11.607s、41.900s、64.830s、65.300s、89.418s、104.300s 共 8 帧复核。生产 WAV 峰值 0.889374、削波 0；MP4 解码音频峰值 0.901093、削波 0，`volumedetect` mean/max 为 -17.8/-0.9dB，`loudnorm` 分析的输入综合响度为 -12.62 LUFS、真峰值 -0.90dBTP、LRA 17.90。48kHz 单声道 5ms RMS 包络与生产轨互相关最佳偏移为 0.000s（相关系数 0.999965），未发现可测音画偏移。按正式默认台词路径向临时目录重跑生成器后，timing、生产轨、包络、对齐报告和 9 个 cue 切片均与本次渲染输入逐字节一致；对应 SHA-256 分别为 `8498990dcb0700ca06926cae23e07549ffa037cc89d37610f33cb811f490e8c0`、`375cec0a363c99d5637296379900eac30fe000ec11ff1154190e712a2458070f`、`6b983bc841f359e7317a23b581f18cb3318753d47802a121eed7323b66cad72f`、`d2ce71d299da2479e327bfaa4a8b7f0e23f72ebe911c86c870bf5ae0015c8d17`。

复现入口（在 ai-yunying 仓库根目录执行；`<video-fx>` 为 `arena/8be4c8f8-video-fx@82bede5` 检出）：

```bash
python3 'tools/day2加更制作/gen_bonus_finalvoice.py' --video-fx-root <video-fx>
cp 'tools/day2加更制作/video-fx源码快照/day2_bonus_final_all.js' <video-fx>/src/ch/
cp 'tools/day2加更制作/video-fx源码快照/render_day2_bonus_final.mjs' <video-fx>/
mkdir -p <video-fx>/assets/day2_poses
cp 'tools/day2制作/video-fx源码快照/day2_poses/'*.webp <video-fx>/assets/day2_poses/
cp 'tools/day2制作/video-fx源码快照/day2_poses/ATTRIBUTION.md' <video-fx>/assets/day2_poses/
cp 'tools/day2制作/video-fx源码快照/day2_poses/LICENSE-DSH-WHALE-MUSUME.txt' <video-fx>/assets/day2_poses/

cd <video-fx>
npm install @napi-rs/canvas --ignore-scripts --no-audit --no-fund
FFMPEG_BIN=<ffmpeg> node render_day2_bonus_final.mjs --stills
FFMPEG_BIN=<ffmpeg> node render_day2_bonus_final.mjs \
  --out '/home/user/ai-yunying/Day2/成片/加更/Day2加更_鲸鱼选鱼_最终配音版.mp4'
```

`render_day2_bonus_final.mjs` 要求 9-cue timing 必须为 `measured=true`、`voice=true`、`voice_engine=user-provided/final-voice-wav`、首 cue 0.000s，并拒绝样片/无配音/Piper/draft 输出名。归档 timing 快照为 `../tools/day2加更制作/video-fx源码快照/day2_bonus_final_timing.js`。

## 十二、2026-10-26 用户复核修正：嘴部净化、分句字幕、补 ID、取消 41 秒后停顿

第十一节的 105.100s 文件已由本节修正版同路径覆盖，第十一节只保留为上一版制作与 QA 历史，当前成片以本节规格为准。

| 文件 | 规格 | 大小 | SHA-256 |
|---|---|---:|---|
| `成片/加更/Day2加更_鲸鱼选鱼_最终配音版.mp4` | 82.300s、2469 帧、1920×1080、30fps、H.264 High/yuv420p、AAC LC 48kHz 立体声 160kb/s | 76,533,531 bytes | `64ec411b9f5cc506e51eaf444544e11265ad6e22cb38b87801744795ba010871` |

用户截图中的两处嘴部异物已经定位：第一张是 B01 后半 `thinking` 笔记本姿势的 `flat` 嘴，第二张是 `peek_curious` 好奇表情的 `o` 嘴。旧 pixel rig 对这两类嘴型先在固定下巴坐标刷肤色矩形，再叠红色块，倾斜或坐姿时就像嘴巴/下巴上多了一个小物件。最终场景的 `safePixelOptions()` 现在统一强制 `mouth='smile'`、`talking=false`，只保留原像素头自带的小嘴，删除 `o/waveO/flat/pout/cat/smirk` 及交替唇形贴片；动作本身的饭碗、麦克风、放大镜等有叙事作用的道具不属于这类贴片，仍按动作保留。开场评论卡已在标题下补上视觉来源 `@用户3400921604841`，口播和对白字幕仍不出现该 ID。

字幕不再把整 cue 包装进全宽黑条。生成器按批准字幕的标点拆成 39 个分句，并用同一组 Vosk 词时间戳给每个分句定界；两处 ASR 未单独识别的“诶？”使用报告中的 RMS 复核源边界。生成器会断言分句拼接后与批准字幕逐字一致，渲染器则以 Day 视频式短句对白框一次只显示当前分句。所有 cue 与分句时长仍来自实测音频/ASR 时间，不按字数估算。

41 秒后的长停顿已删除：生产轨不再插入 22.800s 无台词段，B06 从旧版 65.080s 提前到源 WAV 原有节奏的 42.280s，B07–B09 同步回位到 52.825s、60.260s、72.565s。电视目录改为 10.630–52.630s 共 42.000s，左侧 28 个动作每项 1.500000s、右侧 39 张姿势每项 1.076923s；它在 B06 台词下方继续播放，并于 B06/B07 的实测间隔内完成。B06 镜头不再用 `peek_curious/shock_petrify/curious/failure` 覆盖目录项目，只叠加评论气泡、计数牌与电视底座计数。

QA：渲染前生成并实际查看 138 张静帧（首帧、9 cue 各三点、39 个分句字幕中点、28 个动作中点、39 张姿势中点、B05/B06 衔接、B06 目录重叠、目录完成和尾帧），另对 B01 的 `thinking` 与多处 `peek_curious` 做脸部近景放大，确认红色嘴部方块和下巴横线贴片消失。成片完整解码退出码 0，视频流回读 2469 帧；再从 MP4 本体抽取 0.100s、2.805s、4.488s、13.650s、41.700s、42.500s、47.455s、52.730s、65.000s、81.500s 共 10 帧复核。生产 WAV 峰值 0.889236、削波 0；MP4 解码音频峰值 0.881927、削波 0，`volumedetect` mean/max 为 -17.1/-1.1dB，`loudnorm` 输入综合响度 -12.92 LUFS、真峰值 -1.09dBTP、LRA 2.90。48kHz 单声道 5ms RMS 包络最佳偏移 0.000s（相关系数 0.999967）。新 timing、生产轨、包络和对齐报告 SHA-256 分别为 `a62213af5c059d6eec07abb5aa8cbb3fcec8419c9dd33b56ea4094b3de2fef3a`、`9946c074eb82cbf17b5b04a907b57c8a1244091e994fd0e80363b4030822c60b`、`7d2523ed47c0f1952dd8f3d3f460cfd8cfcac8d3089ab0a8e84632d4316f7f2c`、`e8bfb4bdb247ee8daa943df4c81c133503eee21d5c489204edda8767eb24bc41`。复现命令同第十一节，渲染器现额外拒绝 `insert_duration != 0`、缺少分句字幕或 `script_pause_inserted != false` 的旧 timing。

## 十三、2026-10-27 按指定 WAV 重渲：说话人换高清立绘，电视目录保持原素材

用户要求「按仓库根目录 `鲸鱼选鱼_克隆配音_最终版.wav` 重新生成带配音的视频」，并确认画面方案为
**说话人换新版高清立绘、电视里那 28/39 个目录项保持原素材**（那正是片子里“旧画质”的对照组）。

### 1. 音源核对

`鲸鱼选鱼_克隆配音_最终版.wav` 的 SHA-256 为 `be19eac421d18b73354c72bc395162e087bfc864d652ae0720b84c4f5d82e821`，
与 `tools/day2加更制作/bonus_audio_final/alignment_report.json` 记录的 `source_sha256` 完全一致——
第十二节那版成片本来就是这支 WAV 渲的。本轮重跑 `gen_bonus_finalvoice.py` 得到同一份 9-cue 实测 timing
（B01 0.000 / B02 5.685 / B03 10.280 / B04 19.965 / B05 28.795 / B06 42.280 / B07 52.825 / B08 60.260 / B09 72.565，
尾保 80.700–82.300），没有任何时间被重算成估算值。

### 2. 说话人：像素 rig → 高清立绘 + 10 骨骨架

老场景统一用 `WHALE_GIRL.whaleGirl(ctx, x, y, u, o)` 画鲸鱼娘，`o.action` 就是 `ACTION_LIST` 的旧动作 id。
新增 `tools/day3制作/whale_girl_src/hd_speaker_pack.mjs`，保持同一签名，把内部实现换成
Day3 的高清立绘 + 10 骨骨架（`drawRigged`），动作映射沿用 `MAIN_POSE_TO_PIXEL`（`peek_curious / jump_joy /
confident_hips / eat_white_rice / wake_stretch / token_wordle_sneak / shock_petrify / shy_fidget`）。
`render_day2_bonus_final.mjs` 在 require 场景之前替换 `WHALE_GIRL.whaleGirl`（场景是解构取值，必须抢在前面），
每帧把时间写进 `globalThis.__HD_T` 供骨骼动画取时钟；`DAY2_HD_SPEAKER=0` 可退回像素版做对照。

两处坐标口径要换算，否则人物会跑到画面外或脚下悬空：

- `drawRigged` 的 `x` 是**立绘左缘**，场景给的 `x` 是人物**中线** → 按内容包围盒 `bbox.x + bbox.w/2` 反推；
- 像素 rig 的 `u` 与高清立绘不同量级，`spriteH` 取 **8.6u** 才和原构图等高（人物站姿高度、脚底线、影子都回到原位）。

电视左右两格（28 个动作 / 39 张姿势）继续用 `assets/day2_poses/dsh-whale-state-*.webp`，一张没换。

### 3. 重渲结果

```bash
cp tools/day2加更制作/video-fx源码快照/{day2_bonus_final_all.js} video-fx/src/ch/
cp tools/day2加更制作/video-fx源码快照/render_day2_bonus_final.mjs video-fx/
cp tools/day2制作/video-fx源码快照/day2_poses/*.webp video-fx/assets/day2_poses/
/tmp/venv/bin/python tools/day2加更制作/gen_bonus_finalvoice.py --video-fx-root video-fx
FFMPEG_BIN=<ffmpeg> node render_day2_bonus_final.mjs --out 'Day2/成片/加更/Day2加更_鲸鱼选鱼_最终配音版.mp4'
```

| 文件 | 规格 | 大小 | SHA-256 |
|---|---|---:|---|
| `成片/加更/Day2加更_鲸鱼选鱼_最终配音版.mp4` | 82.300s、2469 帧、1920×1080、30fps、H.264 High/yuv420p 7656kb/s、AAC LC 48kHz 立体声 160kb/s | 80,509,007 bytes | `01b6ad96c51f9b0bef412977e43402e2d6629ab4bd2235394eb359ab439888de` |

### 4. QA

- 全片 `ffmpeg -f null -` 解码退出码 0；`blackdetect=d=0.05:pix_th=0.10` 命中 **0** 处；
- 视频流回读 2469 帧、`Duration 00:01:22.30`，音轨 48kHz 立体声；
- 抽出成片音轨的 PCM（48kHz/16bit/立体声）与第十二节旧成片逐样比对，**md5 完全相同**（`f8a2525…`），
  证明重渲没有动过配音轨；
- 静帧复核 B01/B03/B04/B05/B06/B08/B09/尾保共 138 张，说话人已是高清立绘，动作对得上台词
  （B05「白饭碗都还在」时正抱着饭碗、B09 边吃边等）。

重渲前的像素版成片只保留为历史，不再作为交付文件。

