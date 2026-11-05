# Day9 样片制作

- `render_day9.mjs`：主渲染器，沿用 Day8 房间与 Day3 主演素材；无配音输出1920×1080/30fps。
- `样片回归检查.json`：字幕逐字/重叠、16镜画面变化与27时点电视边框固定检查。运行 `node tools/day9制作/render_day9.mjs --test`。
- `媒体核验.json` / `验收记录.md`：全片解码和抽查记录。
- `sample_timing.json`：**measured=false**，49行台词的样片临时节奏与分镜；无音源、无ASR，不得用作最终字幕。
- `逐句总览_*.jpg`：所有49行的中点抽查图；发现纸张遮脸后已缩小并移至腰侧。
- `抽帧/`：可重建缓存，不入库。

## 环境与命令

Node.js；`@napi-rs/canvas` 和 `@ffmpeg-installer/ffmpeg`（支持临时安装在 `/tmp/node_render/node_modules`），项目字体在 `video-fx/assets/fonts`。

```bash
mkdir -p /tmp/node_render
(cd /tmp/node_render && npm install @napi-rs/canvas @ffmpeg-installer/ffmpeg)
node tools/day9制作/render_day9.mjs --stills --all-lines
node tools/day9制作/render_day9.mjs
```

输出 `Day9/成片/Day9_笨鱼看同类_无配音样片.mp4`。不添加静音假音轨，不用TV占位音乐。

## 素材与版权边界

观影叙事来自根目录用户上传总结。总结中的 `~/.dsh/.../source.mp4` 是另一台机器的缓存路径，本工作区没有这些原片；电视采用代码绘制的示意场景和本项目角色素材，并持续标注“非原片”。不因标注来源就宣称可任意搬运原作。

## 正式版待办

收到用户确认的连续配音后，先保存原文件名及哈希，再做词级ASR与RMS修边。字幕、cue、所有镜头边界都重新实测；跑开场门禁、逐句抽帧和全片媒体核验后再交付有声成片。

## 有声终版（最新）

音源：`Day9/配音/鲸鱼看视频_克隆配音_最终版.wav`。生产时间轴：`voice_alignment.json`、`subtitle_timing.json`，两者为实测，保留真实source/hash。

```bash
# 已有ASR缓存时可复现修边与字幕
python3 tools/day9制作/finalize_alignment.py
node tools/day9制作/render_day9.mjs --voice Day9/配音/鲸鱼看视频_克隆配音_最终版.wav --alignment tools/day9制作/voice_alignment.json --subtitle-file tools/day9制作/subtitle_timing.json
# 同一组参数后追加 --test 或 --stills --all-lines 可回归/抽帧
```

有声输出独立命名`Day9_笨鱼看同类_配音对齐版.mp4`，不覆盖无声样片。渲染前校验音频SHA256；错用音源会拒绝。验收见`有声验收记录.md`及`有声媒体核验.json`。原始ASR可用`tools/day5制作/asr_align_day5.py`重建，参数`--voice`/`--lines Day9/Day9配音台词.txt`/`--cache tools/day9制作/asr_tokens.json`/`--out tools/day9制作/asr_alignment_raw.json`。

## 发布封面

运行 `node tools/day9制作/make_day9_cover.mjs`。用本项目角色/道具及最终成片的电视镜头做代码排版，输出3:4与4:3，不调用生图。台词和发布口径见`Day9/Day9发布物料.md`。

## 整体动作改进版 v2

独立渲染器 `render_day9_v2.mjs` 与动作模块 `motion_v2.mjs`，不覆盖原版代码、音源、实测时间轴、字幕及成片。仅使用现有 Day3 角色图和项目已有蒙皮器；没有搬入外部桌宠角色、光流或 Electron。

- 实际位移驱动步态，缓入缓出，停下后不继续滑步。
- 有限动作分准备、执行、收回；按绝对时间重建，重复绘制不重启动作。
- 写码使用现有专用姿势，手部交替按键、内置桌面固定。脸部像素刚性保留，不补眼皮、不盖肤色横条。
- 交总结、带包离场、观影反应及电视内小场景重新编排；凳子不再跟着行走人物漂移。

```bash
node --test tools/day9制作/motion_v2.test.mjs
node tools/day9制作/render_day9_v2.mjs --voice Day9/配音/鲸鱼看视频_克隆配音_最终版.wav --alignment tools/day9制作/voice_alignment.json --subtitle-file tools/day9制作/subtitle_timing.json
# 同一组音频/时间轴参数可追加 --test 或 --stills --all-lines
# 检查单镜必须另指定 --out，避免短片误覆盖整片：
# ... --preview-shot C05 --out /home/user/Day9_动作检查_查岗.mp4
python3 tools/day9制作/verify_motion_v2.py
```

媒体验收脚本需 numpy、ffmpeg、ffprobe，可用环境变量 `FFMPEG` / `FFPROBE` 指定二进制。运行时依赖可装在仓库外。

输出 `Day9/成片/Day9_笨鱼看同类_动作改进版_v2.mp4`。验收见 `v2验收记录.md`、`v2媒体核验.json`、`v2回归检查.json` 和 `v2动作专项测试.txt`；总览直接取自最终编码 MP4。`v2抽帧/` 是可重建缓存，不入库。

## 背景实验回退与分镜研究

用户要求回退背景改动，已撤销背景试样与 v3/v4，恢复 `258380b` 的动作版 v2 基线。动作专项15项重新通过。本轮只研究分镜，不改配音/字幕/素材与海底环境。逐镜建议见 `参考资料/项目调研/voxel-mv_分镜构造与Day9逐镜借鉴_2026-11-03.md`（仓库根目录起）。

## 四段分镜试剪

独立脚本 `render_day9_storyboard_trial.mjs`，不修改 v2 渲染器。使用原背景与已有动作，选取 C01/C05/C09/C16 原速音频片段拼接；时间映射见 `分镜试剪_时间轴.json`，不是新的ASR估时。

```bash
node tools/day9制作/render_day9_storyboard_trial.mjs --voice Day9/配音/鲸鱼看视频_克隆配音_最终版.wav --alignment tools/day9制作/voice_alignment.json --subtitle-file tools/day9制作/subtitle_timing.json
# 追加 --test / --stills 可检查或抽帧
python3 tools/day9制作/verify_storyboard_trial.py
```

核验脚本依赖 numpy、ffmpeg、ffprobe（临时环境路径同既有媒体验收工具）。输出 `Day9/成片/Day9_四镜分镜试剪.mp4`；剪接后字幕为 `分镜试剪字幕.srt`，核验为 `分镜试剪_媒体核验.json`。`分镜试剪抽帧/` 可重建、不入库。详细边界见 `分镜试剪_验收记录.md`。

## 全片分镜试做版

独立渲染器`render_day9_storyboard_full.mjs`，核验`verify_storyboard_full.py`；[逐镜及验收](全片分镜试做_验收记录.md)。未覆盖v2及四镜试剪。

## 统一门禁修复

[使用方法](../验收/README.md) / [本次实测及历史失败](../验收/门禁修复实测_2026-11-03.md)。`gate_config.json`指向当前全片试做版；`final`累计结果为**未通过文案新规则**，不能因媒体终验单项通过就宣称可发。未重渲、未修改历史配音或台词。

## 海底联动三镜预览

新渲染器`render_day9_sea_stage.mjs`，复用`../场景/sea_stage.mjs`，独立剪辑验证`verify_sea_preview.py`。
[核对与验收](海底联动预览_核对与验收.md) / [六张对比](海底联动预览_前后对比.jpg)。本次`pre-render`用`gate_sea_preview_config.json`和独立`--report`，不替换全片配置，不将26秒试样当整集。
