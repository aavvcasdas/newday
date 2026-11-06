# 主角鲸娘 · 参考 Pet 动作样片

## 参考项目实际公开了什么

核查来源：[`tqlearning/ai-girl-chatgpt-pets`](https://github.com/tqlearning/ai-girl-chatgpt-pets)，提交 `3afe14603b40e24c75e87e097cbfee1bfc10290d`，重点查看 `README.md`、`FORMAT.md`、鲸娘 `pet.json`、整帧联系表以及待机/工作 GIF。

- 作者描述：动作帧由 AI 辅助重新生成，再整理为透明精灵图；没有公开完整提示词、建帧过程、模型或生成源工程，不能断言其用了何种具体软件或骨骼技术。
- 透明图集 1536×2288，8 列×11 行，单格 192×208。9 行动作，共 57 格；另有 16 个方向姿态，15 格透明。
- 每一行代表一个状态，使用对应的逐帧时长循环播放。位置始终使用固定单格，而不是把每格各自裁紧、居中后再缩放。鲸娘的 `running` 是工作／干饭，左右跑动是另两个独立状态。
- 它是素材仓库，不包含 Pet 客户端；方向姿态是离散选择，不保证连续旋转。
- 原项目 MIT 许可只覆盖文档及布局元数据，不覆盖图片或角色设定。已保留参考元数据的许可副本 `REFERENCE_LICENSE.txt`；参考项目美术素材没有打包、复制或重分发。

## 本次试作

本项目以 Day12 鲸娘为主角，沿用已生成的抱饭姿态，新增半闭眼、挥手左右两姿、下蹲、跳起、失落、等待和低头检查姿态；统一画布后生成 `assets/ai-girls/whale-pet-study/whale.png`。**7 个动作状态、41 个播放格**，单格 384×416：

1. 待机：睁眼→半闭→闭眼→睁眼，尾巴在两种形态间摆动。
2. 挥手：左右两姿交替。
3. 跳跃：下蹲→腾空→落地；腾空帧还做了少量竖直位移。
4. 受挫：空饭盆与失落表情。
5. 等待：观望与眨眼。
6. 工作：抱饭→舀饭→送入口中→舀饭。
7. 检查：低头看饭盆。

每个状态的帧数和逐帧时长对应参考项目的同名状态；图像是本次制作，不是参考项目图像。为保持自然不会对每帧独立裁切。部分画面在多个播放格中复用；吃饭只有三个关键姿态、摆尾两姿，动作仍可能跳帧，不是完整的手绘中间帧或无缝复刻。左右奔跑和 16 个视线方向**尚未实现**。本轮没有重渲染完整 MV。

[观看 24.2 秒无声样片](../../../番外MV/把回忆拼好给你/样片/主角动作复刻_七状态.mp4)。

## 复现与验证

- 依赖：`tools/engine` 的 npm 依赖；Python Pillow；渲染 MP4 需要 ffmpeg（或 `imageio-ffmpeg`）。共享源姿态位于 `assets/ai-girls/pet-v7/source`，本轮新增姿态位于 `assets/ai-girls/whale-pet-study/source`。
- 构图：`.venv/bin/python tools/mv_extra/whale_pet_study/build_atlas.py`。
- 测试：`node --test tools/mv_extra/whale_pet_study/player.test.mjs`。检查布局、透明空格、帧时长循环及关键部位实际像素差异，不能替代主观动画质量评估。
- 样片：`FFMPEG=$(python -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())') node tools/mv_extra/whale_pet_study/render_demo.mjs`。若已在 PATH 安装 ffmpeg，可省去 `FFMPEG=...`。

原形象与衍生素材的权利边界见 `assets/ai-girls/pet-v7/README.md`；此试作不代表取得第三方角色或歌曲的发布授权。
