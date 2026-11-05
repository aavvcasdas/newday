# 番外 MV · 可播放审片室

本轮新增的是**审片入口，不是重新渲染的 MV**。当前挂载已有的 v2 连续有声试剪，仍为原音 19.033333–38.833333 秒、19.8 秒、594 帧。旧 v1 已否决，页面不挂载它，也不在失败时回退到旧片。

## 启动（不需要 npm / 字体下载 / 外部 CDN）

仓库根目录执行：

```bash
python3 tools/mv_extra/review/serve.py --port 8000
```

服务器监听 `0.0.0.0`，支持 Arena 的代理预览。浏览器与媒体均同源相对 URL，没有浏览器侧 localhost 请求，不设阻断代理 Host 的白名单，不加阻断 iframe 的响应头。仅暴露列明的公开制作资产，不开放仓库根目录、`.git` 或写文件接口。

## 使用

- **当前试剪 / 原片对应段**：同一个 video 元素切换，保留对应的原片时刻，不会双音轨播放。原片限定在同一试剪范围；不是原片全片播放器。
- **11 镜定位**：镜头起止从原 594 帧 `performance_trace.json` 的实际执行记录提取，不按歌词长度估算。可循环当前镜头。
- **16 句歌词**：始终读取 `v2/lyrics.txt`，第二句为“祈愿小世界里不只有挫败”。仅第 6–11 句可定位；其他 10 句禁用并标“仅规划”，不会冒充全片已制作。
- **帧检查**：暂停后用上一帧 / 下一帧，或不在输入框内时按左右方向键。空格播放 / 暂停。按 30fps 的帧中心定位；浏览器媒体 seek 不是离线确定性画帧证明。循环依赖浏览器媒体事件，不声称音频 sample-accurate。
- **形象 / 分镜 / 相位图**：直接看已有原图；相位图来自编码后抽帧，不替代连续看听。
- **本地便签**：仅保存在浏览器 localStorage；可导出 TXT，不发送到服务器，也不写入“方向批准”。禁用本地存储时仍可导出。
- **下载**：直接下载 v2 样片和 SRT；导演表和制作边界另有入口。

读取数据时检查锁稿 SHA 及当前视频 SHA 与 v2 报告一致；媒体不匹配则 API 返回 503，不拿旧报告为变化后的片子背书。原片缺失时禁用对照按钮；样片缺失则明确报错。

## 检查

无外部依赖的回归：

```bash
node --test tools/mv_extra/review/timeline.test.mjs
python3 -m unittest discover -s tools/mv_extra/review -p 'test_*.py' -v
```

实际媒体复验（依赖放在忽略的 cache / .venv 内）：

```bash
.venv/bin/pip install imageio-ffmpeg
npm install --prefix tools/mv_extra/cache/probe @ffprobe-installer/ffprobe@2.1.2
export FFPROBE="$(node -p "require('./tools/mv_extra/cache/probe/node_modules/@ffprobe-installer/ffprobe').path")"
.venv/bin/python tools/mv_extra/review/verify_media.py
```

原片和样片均须全解码无错；样片重新核参数、帧数和哈希。`media_check.json` 是本次复验，不覆盖任何旧报告，不声称重做了 OCR、ASR、全部音画同步或真人听审。

可选浏览器实测（先启动服务）：

```bash
npm install --prefix tools/mv_extra/cache/browser playwright-core@1.64.1 @sparticuz/chromium@153.0.0
node tools/mv_extra/review/browser_check.mjs
```

无系统 NSS/NSPR 库的精简 Linux 需要准备 Chromium 依赖；本工作区用 npm 包内 `al2023.tar.br` 解出的 `lib/`，运行测试时设置 `LD_LIBRARY_PATH`，不修改系统库。浏览器二进制/中间解压目录不入库。一般带完整 Chromium 的机器也可将测试脚本 launch 的 executablePath 换成本机浏览器。实际安装版本以 `browser_check.json` 为准。

浏览器检查覆盖实际 MP4 播放推进、原片/试剪切换、逐帧、循环、原片越界回收、本地便签及桌面/手机布局。**浏览器播放通过不等于人耳已听、动画自然或用户批准。**

## UI 字体

为避免精简环境中文显示成方框，页面自带约 65KB 的 UI 子集字体 `review-sans.woff2`，来源和 SHA 见 `font-source.json`，OFL 完整许可在 `FONT-OFL.txt`。由 Noto Sans SC Regular 子集化并改名为 Whale Review Sans，仅用于审片网页，**没有替换原片渲染字体或更改角色**。要重建：

```bash
.venv/bin/pip install fonttools brotli
.venv/bin/python tools/mv_extra/review/build_font.py
```

新增 UI 中文文案后需重建子集；用户任意便签文字由系统字体回退。包和字体原文件留在忽略的 cache 中。参考仓库许可与角色素材边界仍见番外 `README_v2.md` 及原来源文件。

## 当前仍未完成

- 其余 36.2 秒的 v2 画面尚未执行；不解除原 `film.mjs` 的 full 阻断。
- 无电脑坐姿、完整伸手入盒仍是缺口，不以试剪中的屈膝/连续性剪辑冒充。
- 当前字幕仍是原片显字参考轴 ±0.25 秒，不是 ASR / 音素轴。
- 等用户实际观看判断方向，再将已认可的动作/场景方法扩展到其余镜头。本轮不修改 Day12、共享渲染器或锁定歌词，不发布视频。
