# RPG 试剪说明

当前方向：鲸鱼娘是勇者、GPT 龙娘是恶龙、豆包是公主。旧非 RPG 试剪和其中的 Gemini 公主已被本方向替代。

这段是制作中的 14 秒测试，不是全曲。参考 Lemo-Opuscar 的 `styles/pixel-rpg/STYLE.md`：用 320×180 小画布绘制，最近邻放大到 960×540，24 fps；增加状态栏、头像对话框、任务栏、瓦片环境和逐帧行走。原片约 20–34 秒的音轨按 AAC 整包复制，验证 603 个音频包与源一致，原速未混新音乐。

**未完成：**文字是剧情提示而不是对齐歌词的字幕，未经过人工听审或动态审片；目前使用缩小的既有立绘，不是完整逐像素重绘；没有严格索引色/32 色限制、战斗菜单、完整地图及全曲。画面是试剪，不表示已达到风格库成片质量。连线仅是剧情示意，不表示人物手部接触。

本版本不依赖缺失的系统 FFmpeg 和浏览器：安装 Python 的 `av` 和 `Pillow`，运行 `python tools/mv_dalabengba/render_rpg_sample.py`，读取仓库根目录原片及现有角色素材。中文字体是 ZCOOL KuaiLe 的本项目字符子集，字体许可证见 `tools/mv_dalabengba/fonts/OFL.txt`，源文件来自 google/fonts 的 `ofl/zcoolkuaile`。
