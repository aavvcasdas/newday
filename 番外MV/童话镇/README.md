# 《童话镇》像素童话 MV

按 249.58 秒参考歌曲 MV 重制的轻像素立体书动画：八位项目 AI 娘出演童话角色，鲸鱼娘是全片主角与地图图标，Claude 大小姐是唯一公主，GPT 龙娘是恶龙/大灰狼，豆包是红披风小红帽而非公主。

## 交付物

- `tonghuazhen.mp4` — 1920×1080、24fps、249.58 秒；保留原曲，加入轻量时间轴音效，零颗粒。
- `tonghuazhen.srt` — 与 `src/timeline.js` 歌词 cue 同源。
- `poster.jpg`、`character_sheet.jpg` — 主海报和八角色像素设定表。
- `封面/童话镇MV_封面_3比4.png`、`封面/童话镇MV_封面_4比3.png` — 无水印双比例发布封面；`封面_验收.json` 保存尺寸、文本安全区与哈希信息。
- `TREATMENT.md` — 完整角色映射、节奏原则与分镜设计。
- `src/` — 双分辨率像素画引擎、角色精灵、场景、字幕和唯一时间轴。

参考音视频为仓库根目录的 `童话镇.mp4`。本目录不自动发布，也不合并 PR。

## 重建

在仓库根目录执行：

```sh
sh .claude/skills/pixel-mv-remake/scripts/bootstrap.sh
node .claude/skills/pixel-mv-remake/scripts/bake_glyphs.mjs "番外MV/童话镇"
sh "番外MV/童话镇/build.sh"
```

`build.sh` 先跑 `readcheck.mjs` 字幕可读性门禁，再导出音效 cue、封面和设定表，混音至 `out/mix.wav`，渲染母版并以 `grain=0` 完成封装。独立运行 `mix.py` 也会从时间轴读取歌词与音效 cue，并写出 `tonghuazhen.srt`。

## 节奏与视觉约束

- 开场不到两秒即入书，主角从第一帧起就运动。
- 八十一个短镜头贯穿全部段落；纯音乐间奏和长吟唱同样拆镜推进。
- 场景使用河流、建筑、花木、船、怀表瀑布、齿轮、水闸、灯笼、剧场和星座等多层道具；地图主角始终是鲸鱼娘。
- 不绘制水印、持久角标、播放/点赞/粉丝数、KPI、进度/加载/音量条或频道式结束卡。
