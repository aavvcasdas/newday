# Day8 制作入口

## 当前生产文件

| 文件 | 用途 |
|---|---|
| `render_day8.mjs` | 手机GIF、角色、饭碗与字幕渲染；成片强制要求 measured=true |
| `prepare_day8.py` | 解码 `Day8/素材/GIF`；同时重建样片估时，写入 `样片归档/`，不会覆盖终版时间轴 |
| `asr_tokens.json` | 当前音频的逐字识别缓存 |
| `asr_alignment_raw.json` | 原始ASR对齐输出，保留跨句误匹配供审核 |
| `finalize_alignment.py` | 波形气口修边、修正3处跨句、生成屏级字幕及SRT |
| `voice_alignment.json` | 当前音频的实测句级时间轴、音源SHA256、修边依据 |
| `subtitle_timing.json` | 当前音频86屏字幕，按标点分屏，LEAD=0 |
| `样片归档/` | 无配音阶段临时排布，不得用于带配音成片 |

## 复现

依赖：Python `numpy vosk pillow`；Node `@napi-rs/canvas @ffmpeg-installer/ffmpeg`。中文Vosk模型与依赖安装方式沿用 `tools/day5制作/asr_align_day5.py` 开头说明。

```bash
python3 tools/day8制作/prepare_day8.py
python3 tools/day5制作/asr_align_day5.py \
  --voice Day8/配音/鲸鱼查岗_克隆配音_最终版.wav \
  --lines Day8/Day8配音台词.txt \
  --cache tools/day8制作/asr_tokens.json \
  --out tools/day8制作/asr_alignment_raw.json
python3 tools/day8制作/finalize_alignment.py
node tools/day8制作/render_day8.mjs \
  --cues tools/day8制作/voice_alignment.json \
  --subs tools/day8制作/subtitle_timing.json \
  --audio Day8/配音/鲸鱼查岗_克隆配音_最终版.wav \
  --out Day8/成片/Day8_查岗_配音对齐版.mp4
```

注意：当前ASR缓存、人工修边仅对应当前音源。更换音频必须换缓存并重新审查修边点，不能直接沿用。

## 画面修正

- 手机边框固定；句间空隙保留上一句，避免抽动。
- 去掉前景所有长条假手臂／指向杆，防止看成巨大筷子并遮脸。
- 添饭筷子仅26逻辑像素长、1.8像素粗，固定在碗附近，低于脸部。
- GIF原文件不改；顶部与底部源HUD在画面中遮挡。
- “大米饭”任务仍在手机外演绎，饭碗来自Day3实现。
- 少量画面气泡不作为额外配音，原口播不改字。

字幕使用逐字ASR与10ms RMS发声段。英文coding/bug按所在实测段整体保留；未识别汉字采用邻字插值。不是每个字符都有独立可靠识别。3处句首跨句修正依据写在 voice_alignment.json。最后一句说完+0.2秒结束，无片尾卡。

解码PNG缓存位于仓库外 `../day8-gif-cache/`，不纳入Git。验收及最终逐句抽帧汇总放在本目录。

## 发布封面

`node tools/day8制作/make_day8_cover.mjs`：使用正片同款角色与上传GIF首帧，独立排版输出3:4和4:3；不调用生图，不改成片。发布物料见 `Day8/Day8发布物料.md`。
