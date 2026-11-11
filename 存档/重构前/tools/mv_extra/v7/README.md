# v7：参考 Pet 图集组织的角色动态

## 实际查看到的参考项目

`tqlearning/ai-girl-chatgpt-pets` 提交 `3afe14603b40e24c75e87e097cbfee1bfc10290d` 发布了两个透明 PNG 图集，以及 `pet.json`、待机/工作 GIF 和联系表。每张图集固定为 8 列×11 行，单格 192×208；73 格有内容、15 格透明。前 9 行是待机、左右跑、招手、跳跃、受挫、等待、工作、复查等状态；最后两行是 16 个视线方向。`running` 是工作而不是移动，鲸娘工作状态是干饭。运行时按状态的每帧时长切换，且整个格子保留共同坐标，不逐帧裁切或重新居中。项目本身不包含播放器客户端、可复现的生成工作流或源工程，仅称美术为 AI 辅助生成后整理；不能据此推断其使用了某种骨骼插件或手绘流程。

项目 `RIGHTS.md` 明确 PNG/GIF 等美术不包含在 MIT 许可范围内、开放许可未确认。本版没有复制或嵌入参考项目图集、GIF 或联系表；状态布局与时长格式参考其 MIT 文档。若需使用其原始美术进入作品，应先核实必要授权。原创图及角色参考说明见 `assets/ai-girls/pet-v7/README.md`。

## 本版做了什么

自制 384×416 固定帧格的两个图集，播放器 `pet.mjs` 按状态和每帧毫秒数播放，而不是给整张图做周期性上下位移：

- 龙娘：白发、紫眸、角、翅膀、尾巴；思考姿势、眨眼、两种尾巴形态。
- Day12 鲸娘：蓝发鲸尾、抱金属饭盆；待机眨眼、**一整套 8 格干饭动作**（舀饭/抬勺/送到嘴边/嚼/咽/舔嘴/再舀）、空盆失落。
- 其他配角仍使用 v6 的姿态切换与骨骼动作，未声称其都具有 Pet 那样的逐帧图集。新增两人的图集也只有两个／三个状态，不是复制参考项目的全套 9 状态和 16 视线方向。

原始姿态由图像生成和局部编辑得到，共同画布保持一致。尾巴只有两种形态。干饭不再重复使用三个站姿：`build_eat_frames.py` 从 `assets/ai-girls/pet-v7/sheet/whale_eat_{a,b}.png` 两张四格图切出 8 个连续不同的姿态，图集第 1 行 8 格全用满。两帧之间不做自动补帧。视频中对应故事镜头使用这些状态，其他镜头继续使用 Day12 多姿态。

## 复现与验证

1. 安装 `tools/engine` npm 依赖及 Python `pillow`、`numpy`、`imageio-ffmpeg`。
2. `.venv/bin/python tools/mv_extra/v7/setup_v7.py` 下载并校验 Day12 等共享素材，检查图集及清单哈希。
3. 可选：`python3 tools/mv_extra/v7/build_eat_frames.py`（把两张干饭四格图切成 `source/eat/f1..f8.png`）→ `python3 tools/mv_extra/v7/build_atlas.py` 根据已提供的源姿态构造固定格图集。
4. `node --expose-gc tools/mv_extra/v7/film.mjs render` 渲染完整视频；`FFMPEG=<ffmpeg路径> node --expose-gc tools/mv_extra/v7/pet_preview.mjs` 渲染独立 13 秒动作演示。
5. `node --expose-gc --test tools/mv_extra/v7/pet.test.mjs tools/mv_extra/v7/actions.test.mjs tools/mv_extra/v7/film.test.mjs tools/mv_extra/v7/planning.test.mjs`；`.venv/bin/python tools/mv_extra/v7/check_v7.py` 检查帧数与音轨。

动作测试核查每个状态的图集、时长、透明空格，以及眼睛、尾巴、勺和空盆区域的像素差异；这些测试不是对动作观感或全片每帧的人工保证。
