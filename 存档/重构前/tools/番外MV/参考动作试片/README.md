# 参考分支动作方向试片（未完成全片）

这是 12 秒的方向试片，不是新成片。沿用用户指定的 `arena/e9e1d8ec-newday`（2b981a9）分层纸艺舞台、16 镜节奏和镜头代码；采用固定格、脚底基准和毫秒持帧，不使用整图跳动，也不使用该分支未确认再分发权限的 pets 原始图集。歌词取原曲 11.8–23.8 秒，试片音频为截取后重新编码，不是完整歌曲的原始 AAC。

人物用本项目已有的 Day12 鲸娘、Day12 Claude 和本项目的生成角色；Z.AI 是根据参考分支角色图鉴和现有 Q 版视觉生成的新图。五个配角和 Z.AI 的眨眼图由各自原图的眼部局部与 AI 闭眼编辑合成，身体像素不变。鲸娘和 GPT 取现有图集里固定基线的睁眼/闭眼格。**目前只是眨眼和纸艺环境、镜头事件；没有完成逐帧行走、肢体演技或配角编舞**。不要将这段当成动作已完成，也不把它视为完整 MV 或原版 pets 动画。

## 重建

先安装 Python Pillow、NumPy、imageio-ffmpeg，运行 `python tools/mv_extra/v8/setup_v8.py` 恢复有哈希校验的 Day12 和字体缓存；然后：

```sh
python tools/番外MV/参考动作试片/build_assets.py
cd tools/番外MV/参考动作试片
npm ci
PYTHON=/path/to/python node --expose-gc render.mjs
```

需要 `@sparticuz/chromium` 所支持的 Linux 环境。`data/timeline.json` 中的歌词时间来自参考分支；成片如最终重做，仍需保留全长 1681 帧、原 AAC 并重新验收。参考分支与上游授权及现有素材说明见仓库各历史版本的 README；人物形象为非官方同人，AI 生成不自动解决底层形象权属，发布前需另行核实。
