# v12 · 剧情动作版

## 动作设计

回应“不要一直挥手摆腿”：不再全员、全片使用 v11 的统一舞步。根据歌词切镜，安排鲸娘拍照、看信、举烟花及原有舀饭；Gemini 展示贝壳，豆包举杯，Claude 举信，Qwen 提灯，Kimi 展示照片，Z.AI 翻页，GPT 看信和手势爱心。动作按角色错时播放一次，结束后停留；S05、S08 的 GPT 和 S10 的 Gemini、Kimi 在庆祝场景短暂沿用 v11 舞步。群像镜头增加局部回忆特写。

**局限：**这不是完整的手绘逐帧演出。多为新生成的固定姿势加局部裁片、旋转、平移或眼部/翻页局部切换；鲸娘拍照用闭眼与镜头闪光表现，GPT 的信件和爱心主要是道具变化，部分动作细小且会停住。并非每位角色都有完全独立、自然的全身表演；画面中可能有接缝和局部混合痕迹。没有将这些效果称为真实行走、自然逐格动画或连续手绘。

## 图像生成进度

`assets/ai-girls/actions-v12/生成进度.md` 记录每批数量：共生成 20 张（含动作姿势、衔接及补画）覆盖 8 人；另从 v8 复用 GPT 手势爱心图。首版 Z.AI 翻页与棋盘格底图弃用，重做图用于合成。

角色素材、既有鲸娘舀饭、参考 16 镜及字体沿用 v10/v11 及此前项目。图像均为生成或项目原有素材，不嵌入原 pets 美术；角色形象及二创素材的权利范围见前版说明，发布前应核实授权。

```sh
python tools/mv_extra/v8/setup_v8.py       # 获取项目缓存字体
python tools/番外MV_剧情动作/build_actions.py
python tools/番外MV_剧情动作/test_actions.py
cd tools/番外MV_剧情动作
npm ci
PYTHON=/path/to/python node --expose-gc render.mjs
/path/to/python verify.py
```

Python 依赖 Pillow、NumPy、imageio-ffmpeg。输出 1920×1080、30fps、1681 帧，完整音频从原曲复制。局部动作测试检查像素、脚底、循环标记和绿幕残留，不代表人工自然度验收。
