# v9 · Day12 纸艺完整版

## 参考与范围

基于用户指定的 `arena/e9e1d8ec-newday` 最新提交 `2b981a9d8f498db99d2c793f87609dfef914109b` 的 16 镜分场、歌词时间、Canvas2D 分层纸艺、镜头运动及画面事件重新渲染。相比参考分支，主角改为本项目 Day12 鲸娘，Claude 采用 Day12 造型，并加入本项目 Q 版角色和新生成的 Z.AI；这里不打包或使用原始 pets 图集，其 RIGHTS.md 不开放美术修改/再分发。

## 角色运动的真实范围

所有角色固定画布和脚底。鲸娘普通与举手的两个姿态只在镜头切换时选择；每人有眨眼，以及手、尾巴或书周围的局部小幅形变：它们是程序生成的有限动画格，**不是手绘逐帧，也不是原版 pets 的真逐帧表演**。没有行走脚步、坐姿、准确交接或完整舞蹈编排；雨站角色仍是站姿，姿态固定基线不是坐在椅子上的骨骼动画。歌词关联由纸艺场景与道具事件表达，不能把它们冒充角色动作。动作强度和表演自然度需要人工审看；配角编舞要求仍未完全满足。

完整原曲使用原始 AAC 直接复制，不改速度与音高；画面 1920×1080 / 30fps / 1681 帧。字幕与画面歌词时间来自参考分支逐句时间，不表示词级对齐。

## 重新制作 / 校验

需要 Python 的 Pillow、NumPy、imageio-ffmpeg。`python tools/mv_extra/v8/setup_v8.py` 恢复并校验固定 Day12 及字体缓存。试片素材已入库：

```sh
python tools/番外MV/参考动作试片/build_assets.py
python tools/番外MV/完整版/build_motion.py
python tools/番外MV/完整版/test_motion.py
cd tools/番外MV/完整版
npm ci
PYTHON=/path/to/python node --expose-gc render.mjs
/path/to/python verify.py
```

`check_stills.mjs` 可渲染 16 镜缩略总览到 gitignored 缓存，结构测试不代表审美或动作自然度验收。参考分支代码与分镜来自用户仓库；上游 pets、角色形象以及生成的二创形象均有各自权利边界，非官方同人使用不自动获得发布、再分发或商业授权，应另行核实。详见 `assets/ai-girls/reference-motion/README.md`、`assets/ai-girls/lyric-v8/README.md`。
