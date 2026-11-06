# 《把回忆拼好给你》番外 MV 版本导航与 v1 历史记录

> **【当前最新完整交付：v4】**：[v4 说明](README_v4.md) ｜ [完整成片](成片/把回忆拼好给你_v4完整复刻版.mp4) ｜ [人物一览](分镜/v4_全阵容形象与动作盘点.jpg)
>
> **【v3 历史完整版本】**
> - **v3 主说明与验收报告**：[README_v3.md](README_v3.md)
> - **v3 全曲成片（原音无损 `-c:a copy`）**：`成片/把回忆拼好给你_v3完整复刻版.mp4`
> - **v3 副歌烟花与时差有声试剪（15.77s）**：`样片/v3_副歌烟花与时差_有声试剪.mp4`
> - **v3 完整 5 幕 32 镜分镜总表**：[STORYBOARD.md](STORYBOARD.md) ｜ **完整代码渲染提示词**：[PROMPT_v3.md](PROMPT_v3.md)
> - **v3 视觉核验图**：`分镜/v3_32镜成片接触表.jpg`、`分镜/v3_16句逐句帧条.jpg`、`分镜/v3_全阵容形象与动作盘点.jpg`、`封面/v3_封面_16比9.jpg`、`封面/v3_封面_3比4.jpg`
>
> **【历史版本归档】**
> - `v2` 中段 19.8 秒动作有声试剪（19.033–38.833s 试点存档）：见 [README_v2.md](README_v2.md) 与 `tools/mv_extra/v2/`。
> - `v1` 旧方案（410575d，已被用户否决退役）：以下仅保留早期探索历史记录，不作为当前交付。

## v1历史入口

- 完整有声候选：`成片/把回忆拼好给你_歌词卡点版.mp4`
- 关键有声试剪：`样片/烟花与时差_有声试剪.mp4`，原片时间31.4–44.6秒，13.2秒；最终审计会从本轮母版抽取替换，非另一版镜位。
- `分镜/35段分镜总览.jpg`、`分镜/逐段导演表.md`
- `字幕/歌词.srt`（画面已烧录字幕，此文件供复核）
- `封面/封面_16比9.jpg`、`标题与简介.md`（未发布）
- 生产代码：`tools/mv_extra/film.mjs`；字幕/编辑依据：`timing.json`；实际编码检查：`final_check.json`，只对其中SHA绑定的母版有效。

## 本轮范围与真实状态

工作区没有保留前一轮未提交的`lyrics_v2/`，因此这是恢复原素材后的**新代码重建**，不是声称找回了旧35段代码的同一像素输出。按用户“重新渲染并推送”执行整片，旧Day12文件不改。

1920×1080、30fps、1681帧，视频约56.033秒；原HE-AACv2音轨约56.005秒，原速原音，完整母版stream-copy。画面以原片的拼图→星球→相遇与大海→共同日子→雨棚与拨云→收集/淘汰→夜城烟花→海中回忆→双钟→纸带放下→回到自己的结构由Canvas重绘。**不搬参考视频画面，不整理相册**。35项含同机位事件/反应/结果，不冒称35个独立机位。

技术通过与人工通过分开：以`final_check.json`的实际结果为准；即使自动检查通过，`humanDynamicApproved`与`musicMicrotimingApproved`仍为false。请实际听看全片后判断唱词落点、客串停留和节奏。静帧、OCR、全画面差分都不能冒充动态审美或人耳批准。

### 歌词与卡点边界

原旧歌词TXT已丢失。本轮`tools/mv_extra/lyrics.txt`依据会话已知用户字样及参考原片重建；“有你在的日子”“快乐全都收集”保留用户记录，不静默套原片的“日子里”“全部收集”。**不能声称旧TXT哈希或全16行逐字锁稿验收已恢复**，需对照原用户文本复核。

时间轴恢复自会话记录的原片显字起点，有约160ms编辑前置并量化到30fps，误差口径±0.25秒；新增原片OCR证据只验证文本，不是音频ASR。谱流为实测音乐瞬态候选，不能把它包装成演唱音素边界。动作在“拨开/收集/淘汰/烟花/时差/放下/自己”附近触发；逐句微调仍待人耳。

### 形象与素材能力

像素鲸鱼娘使用已有wave睁眼骨架、原尾巴比例，无自动口型眨眼、不刷脸ROI运动。豆包使用仓库已有全身抠图，不是鲸鱼PNG换名；不是官方原生全身，来源沿用原NOTICE。Claude为已有透明读书原图；Gemini/Kimi/GPT/Qwen是完整带背景参考截帧，以画框展示，不能声称它们是新透明3D演员。没有笨鱼立绘。没有真实手接触/坐下动作时采用构图与连续性切镜，不生成假手。

## 复现

在仓库根目录运行，Node依赖沿用已有锁文件。需GitHub `gh`可读取固定原素材blob；无需提供令牌到聊天。

```bash
python3 -m venv .venv
.venv/bin/pip install -r tools/mv_extra/requirements.txt
npm ci --prefix tools/engine
.venv/bin/python tools/mv_extra/setup.py
.venv/bin/python tools/mv_extra/setup.py --verify-only
node --test tools/mv_extra/film.test.mjs > tools/mv_extra/node_tests.tap
node tools/mv_extra/film.mjs stills
node tools/mv_extra/generate_docs.mjs
export FFMPEG=$(.venv/bin/python -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())')
node tools/mv_extra/film.mjs sample
node tools/mv_extra/film.mjs render
```

`setup.py`恢复固定原图和字体、验证原AAC，并从完整现代解码生成48kHz PCM缓存。缓存/无声基片/抽帧不入Git。样片从完整PCM切音频，避免HE-AAC输入seek导致节选音轨短约0.1秒；完整母版不重编码原AAC。

完整媒体验收另需ffprobe与RapidOCR：

```bash
npm install --prefix tools/mv_extra/cache/media-tools @ffprobe-installer/linux-x64
.venv/bin/pip install rapidocr_onnxruntime==1.4.4
# 无桌面环境要用headless，避免libGL.so.1缺失：
.venv/bin/pip uninstall -y opencv-python
.venv/bin/pip install --force-reinstall --no-deps opencv-python-headless==5.0.0.93
export FFPROBE="$PWD/tools/mv_extra/cache/media-tools/node_modules/@ffprobe-installer/linux-x64/ffprobe"
.venv/bin/python tools/mv_extra/check_final.py
```

审计检查：渲染输入未变化、全片现代解码、分辨率/30fps/1681帧、原AAC全载荷相同、全部解码浮点样本相同、首尾时长、16条**实际编码帧**字幕OCR、样片396帧/13.2秒音画与全片/去角标字幕区域差分诊断。差分只作诊断，允许有意结果停留；不设大运动门槛。审计会重建母版节选并更新其SHA。

版权与署名见`assets/mv-extra/SOURCE.md`、`assets/ai-girls/extra-guests/SOURCE.md`、`assets/ai-girls/doubao/NOTICE.md`；参考研究和固定快照见`tools/mv_extra/参考研究与资产盘点.md`。音乐及同人素材不因代码可用而取得商用授权。本轮只提交推送固定工作分支，不合并主分支、不向平台发布。

## 本轮实际检查结果

- 母版SHA-256：`8dc5e53177bb7b9f54d0684461c3b5a867bc740fdbffb4e3d26378978877f79a`；4,327,762字节。
- 全片解码通过，视频56.033333秒/1681帧，音轨56.005011秒，音画均从0开始。
- 完整AAC载荷和全部解码浮点样本与用户原音轨一致；没有变速或截尾。
- Node 10/10通过。16条字幕联合核对：OCR严格通过15条；第4条OCR漏“袤”，保留原失败结果，已实际查看编码帧确认“广袤无垠”完整，静态复核绑定母版与该帧SHA。不是把OCR失败改写为成功。
- 母版31.4–44.6秒试剪：396帧、音画各13.200秒，全片解码通过；SHA-256 `fe0fec0f6d351720614e24883063834f5e5f0fedd26169dd5d259f63d60af730`。
- 已实际查看编码后的长椅、烟花、结尾与第4条字幕帧；不能因此声称完整动态观影/听审通过。全部诊断与待确认项见报告。
