# v4 渲染说明

v4 使用 Day12 高清鲸鱼娘，Claude、GPT、Gemini、Kimi 改用 `JAdpp/dsh-whale-galgame` 的透明立绘；千问使用 `shuaizenge/ai-girls` 来源的抠图，豆包使用本仓库既有素材。具体来源与权利边界分别见 `assets/ai-girls/galgame/README.md`、`assets/ai-girls/extra-guests/SOURCE.md`、`assets/ai-girls/doubao/NOTICE.md` 和 `production_assets_v4.json`。人物动作采用本项目骨骼变形和节拍编舞，不是上游原生动画。视觉参考了 `xiaosia/voxel-mv` 和 `Nyankomintsu/world-execute-me-lyric-mv`；未拷贝 voxel-mv 的未核实权属角色帧。

准备：先按 `tools/mv_extra/setup.py` 的要求准备来源素材，再运行 `.venv/bin/python tools/mv_extra/v4/setup_v4.py`；在 `tools/engine` 下执行 `npm ci`，Python 环境需要 `imageio-ffmpeg`。缓存不纳入 Git。

- `node tools/mv_extra/v4/film.mjs stills`：角色和分镜预览。
- `node --expose-gc tools/mv_extra/v4/film.mjs render`：输出完整 1080p30 成片，原始 AAC 直接复制。
- `node --test tools/mv_extra/v4/planning.test.mjs tools/mv_extra/v4/film.test.mjs`：规划和镜头采样运动测试。测试不能替代对成片的视觉和字幕审阅。

作品为非官方同人；公开或商业发布前须独立核实歌曲和各角色素材权利。
