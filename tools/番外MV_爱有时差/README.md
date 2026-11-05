# 番外 MV · 把回忆拼好给你（爱有时差）

非官方同人 / AI 生成 / 剧情演绎。本目录是 2026-11-05 用户重新授权的独立歌词番外制作工具；不覆盖 Day 连载、不恢复历史已删除的旧番外产物。

## 交付物

- `../../番外MV/成片/把回忆拼好给你_AI娘全员番外.mp4`：1920×1080、24fps、1346 帧、约 56.083s；音轨直接 copy 用户提供的参考片，不改速、不变调、不重唱。
- `../../番外MV/歌词.srt`：16 行用户歌词，L08 按画面拆成两个短分句。
- `../../番外MV/角色图鉴.png`、`分镜总览.png`、`海报.png`、`分镜/S01..S16_*.png`。
- `../../番外MV/验收报告.json`：`verify.py` 生成的机器技术验收，不等于人工审看。

## 角色口径

当前项目已有形象全部入场：4 位 AI 娘（DeepSeek 鲸鱼娘、Claude、Gemini、豆包）＋6 位配角（人类研究员、Clawd、Agent-Reach 检索章鱼、机械小狗、深海小蓝鲸、复古小电视）。不导入参考仓库的额外 AI 娘，不把文字编制客人算作已到场角色。

## 运行

```bash
cd tools/番外MV_爱有时差
npm ci
npm run assets       # 从项目既有角色源码/抠图生成 MV 立牌与图鉴
npm run dev          # 0.0.0.0:5173 播放器预览
npm run storyboard   # 16 镜分镜 PNG + 总览 + 海报
npm run render       # 全片逐帧渲染并合成原片音轨
npm test             # 数据/字幕组件一致性测试
python3 verify.py    # 成片全解码 + 抽帧 + 数据交叉检查
```

渲染依赖：`@sparticuz/chromium` 提供 Chromium；ffmpeg 优先 `FFMPEG_PATH`，否则尝试 `imageio_ffmpeg`（可用 `/home/user/.cache/mv-venv/bin/python`）。`assets/audio/reference.wav` 是可重建预览缓存，不入库。

## 方法

- 时间轴：对参考片烧录歌词 tile 做全片 OCR 扫描＋ROI 首检，对齐到 24fps；不是字级/音素级对齐。Vosk 小模型对歌声不可用，未作为 cue 来源。
- 画面：自有 Three.js 微缩体素舞台＋项目角色立牌；确定性时间函数逐镜合成。导出时浏览器只回读 960×540 场景，Node 用共享字幕组件和矢量关键词合成 1080p，再送 ffmpeg。
- 字幕：强制 import `tools/字幕/day2_style_sub.mjs`，一屏短分句、不逐字点亮。
- 终帧：全员留在场景内 hold 到源音频结束，不加独立片尾卡。

见 `REFERENCES.md` 与 `NOTICE.md`。
