# v11 · 全身舞步版

## 这次的动作

以用户指定参考分支 `arena/e9e1d8ec-newday@2b981a9` 的分层纸艺和固定画布方法为基础，在 Day12 鲸娘和其余七位角色上分离左右腿、上身与手臂，制成两种 16 格循环：侧步点地与幅度更大的抬脚。左右腿交替摆动，另一只脚保持支撑；上身围绕腰部小幅倾斜，手臂同步动作。两拍一轮（1.7 秒），人物略有错相；悲伤镜头使用较缓的动作。S08 鲸娘沿用先前七状态样片的饭盆动作。

这是**程序合成的二维纸偶舞步**，不是逐格手绘，不是原 pets 图集，也不是侧向行走。舞步由两种短句循环组成，尚非复杂的整首歌曲独立编排；局部遮罩、裙摆交叠和脚部接触仍可能有瑕疵。技术测试与动态抽帧只能确认有动作，不能替代人工对连贯性和美术效果的审看。

## 来源与再制作

人物及既有手臂分层来自 `assets/ai-girls/animated-v10/`；腿后补画、Claude 双脚站立编辑是从现有素材生成的局部合成辅助图，源文件保存在 `assets/ai-girls/dance-v11/source/`。角色形象及二创素材的权利范围见前版说明；未打包上游 pets 原始美术，发布前仍需核实权利。

```sh
python tools/mv_extra/v8/setup_v8.py   # 固定来源字体和 Day12 缓存
python tools/番外MV/全身舞步/build_dance.py
python tools/番外MV/全身舞步/test_dance.py
cd tools/番外MV/全身舞步
npm ci
PYTHON=/path/to/python node --expose-gc render.mjs
/path/to/python verify.py
```

Python 需要 Pillow、NumPy、imageio-ffmpeg。完整视频为 1920×1080、30fps、1681 帧；音轨从原曲直接复制。`MV_START`、`MV_FRAMES`、`MV_OUTPUT` 可用于小段试渲染，试段音频重编码而非原始完整 AAC。`test_dance.py` 验证每人的双腿和上身都有变化、循环时长正确，不验证主观自然度。
