# 用户原音轨与字体

- 原参考：用户上传到本仓库的长名抖音MP4；目前短名`《把回忆拼好给你》.mp4`与之同一Git blob `b4a89ebc296054b96ca6d24ad5677903b85c31f5`（11637129字节）。
- `user_reference_audio.m4a`只提取该文件的完整HE-AACv2音流，不重配音、不变速、不换曲。完整母版AAC stream-copy；听感及演唱微对齐仍待人工，不因音流相等而宣布听审通过。哈希见`tools/mv_extra/asset_manifest.json`、`timing.json`及绑定成片SHA的`final_check.json`。
- 母版不读取参考视频的任何画面帧；仅依其镜头结构和显字/事件轴重绘。OCR取参考帧只用于研究，不进入产物。
- 抽取命令：现代FFmpeg `-i '《把回忆拼好给你》.mp4' -map 0:a:0 -c:a copy user_reference_audio.m4a`。使用imageio-ffmpeg 0.8.1携带的现代FFmpeg，避免旧版HE-AAC解码尾音缩短。M4A容器本身不同版本的metadata可能不同，复现优先使用已归档原AAC容器；全片验收比较完整AAC载荷与全部解码样本。
- 字体：Google Fonts Noto Sans SC，可变字体固定blob `fb0637bafbcd804fe32152370a1225990745b4bc`，[来源](https://github.com/google/fonts/tree/main/ofl/notosanssc)。字体缓存不入Git，由setup按blob恢复；SIL OFL 1.1原文随附`FONT-OFL.txt`。

歌曲、参考MV和角色图像各自有权利人；用户提供文件不等于本项目取得音乐或原视频的开放/商业授权。本次未自动向任何平台发布，不将代码许可套到歌曲。
