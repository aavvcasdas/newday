# v8 歌词动作版 MV

在完整 v7 时间轴与 32 个镜头上，为七位出镜角色接入固定格图集 `animation.mjs`：鲸娘使用 Day12 及本轮同画布姿态；Claude 使用 Day12 现有多姿态；豆包、Gemini、GPT、Kimi、千问使用各自既有 Q 版站姿/挥手和新增展示拼片或比心姿态。状态帧依指定毫秒播放；展示动作播放一次并停留，不让拼片每秒无缘无故反复出现。动作安排见 `direction.mjs` 和 `番外MV/把回忆拼好给你/分镜/v8_歌词动作导演表.md`。

动作是关键姿态、持帧和少量闭眼帧的组合，不是每人都拥有手绘连续中间帧：普通配角仍主要是站姿、挥手和展示三个姿态；Day12 的旧姿态来自不同图片，切换时可能出现造型/位置跳变。鲸娘举仙女棒及相机是持姿，雨中依旧站在伞下；场景道具未做手部接触标定。镜头采样测试不能证明全片任何时刻所有角色均在屏幕内或足够流畅。

本次修改的是**番外 MV 中**的 Day 角色动作及可复用图集，未改写 Day0–Day12 的历史成片、台词或共享剧集制作入口。参考 Pet 仓库的状态组织，但不嵌入其未确认授权的美术图集；来源及边界见 `assets/ai-girls/lyric-v8/README.md`、`tools/mv_extra/whale_pet_study/README.md`。

## 命令

安装 `tools/engine` 的 npm 依赖，Python 需 Pillow、numpy、imageio-ffmpeg；运行 `.venv/bin/python tools/mv_extra/v8/setup_v8.py` 恢复并验证共享素材和图集。重建图集可运行 `.venv/bin/python tools/mv_extra/v8/build_lyric_atlas.py`。完整成片 `node --expose-gc tools/mv_extra/v8/film.mjs render`，预览 `node --expose-gc tools/mv_extra/v8/film.mjs stills`。

自动测试：`node --expose-gc --test tools/mv_extra/v8/animation.test.mjs tools/mv_extra/v8/film.test.mjs tools/mv_extra/v8/planning.test.mjs`；音轨和帧数 `.venv/bin/python tools/mv_extra/v8/check_v8.py`。交付的短动作预览取自编码后成片，切片时音轨重新编码，不是原 AAC 的逐包拷贝；完整版音轨为原始 AAC 流拷贝。
