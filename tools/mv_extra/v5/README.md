# v5 Q 版 MV

主角仍是 Day12 鲸鱼娘；Claude 使用既有 Q 版多姿态图，豆包、Gemini、GPT、Kimi、千问使用根据已有角色参考生成的 Q 版图，详见 `assets/ai-girls/chibi-v5/README.md`。主角采用分镜对应的姿态及走步切换，Claude 切换已有姿态，其他人物使用较轻的身体和手部骨骼动作，不是逐帧手绘。只在个别高点使用跳步。

对照本仓库原视频抽帧，开头改为灰调拼图；约 17.4 秒提前回到雨天长椅及薄荷伞，并补充伞骨和伞缘；歌词底条改为浅色纸卡。其他内容沿用并调整 v4 场景，不声称逐像素复刻，人物在长椅前站立，并非原片的坐姿。

参考的 [ai-girl-chatgpt-pets](https://github.com/tqlearning/ai-girl-chatgpt-pets) 固定提交 `3afe14603b40e24c75e87e097cbfee1bfc10290d` 有两位角色、九种多帧状态；其 `RIGHTS.md` 明确 PNG/GIF 美术未获统一开放许可，使用修改或再分发前需确认授权。本版没有复制其图集，仅参考动作分类和帧节奏；也未将它的鲸娘替换 Day12 主角。

运行：在 `tools/engine` 执行 `npm ci`，Python 环境安装 `imageio-ffmpeg`，然后运行 `.venv/bin/python tools/mv_extra/v5/setup_v5.py`。`node --expose-gc tools/mv_extra/v5/film.mjs render` 输出完整成片，`node --expose-gc tools/mv_extra/v5/film.mjs stills` 生成图片。测试：`node --expose-gc --test tools/mv_extra/v5/film.test.mjs tools/mv_extra/v5/planning.test.mjs`。
