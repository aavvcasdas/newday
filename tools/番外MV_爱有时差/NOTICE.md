# NOTICE

本番外 MV 为非官方同人作品，由 AI 辅助生成并用于剧情演绎；不代表任何模型厂商、歌曲权利人或参考仓库作者的官方合作/授权。

## 方法参考署名

- `Win-Hao/music-mv` @ `0088b142`（MIT）：听懂歌→定画风→画角色→剧本分镜→先草图后整片→看片修改的流程；diorama 分层纸艺、景深、暖光、12fps 手摆、慢推与 review 过线方法。本工具自有 Canvas2D 实现，未复制其代码/素材。许可全文：`licenses/music-mv-MIT.txt`。
- `Nyankomintsu/world-execute-me-lyric-mv`（MIT）：确定性时间函数、逐帧导出、关键词/消息窗视觉化方法；未复制剪影/歌词/音频。
- `JohnHeibel/PDoomVideo`：仅历史方法参考（逐帧、转场、联系表）。v4 已按用户要求废弃其整身 bounce/hop/sway；未复制代码/素材。
- `xiaosia/voxel-mv`：v2/v3 历史舞台/动作方法；v4 正片不再使用其帧图作为主形象。

## 角色形象来源（v4，用户指定真实素材）

固定提交逐文件 git blob sha1 校验＋sha256 记录于 `data/upstream_manifest.json`；素材本体 gitignored，由 `fetch_upstream.mjs` 重建。

1. **tqlearning/ai-girl-chatgpt-pets** @ `3afe14603b40e24c75e87e097cbfee1bfc10290d`
   - 使用：`assets/deepseek-whale/`、`assets/gpt-dragon/` 的 `spritesheet.png` + `pet.json`（鲸鱼娘/GPT 真逐帧动画与 16 方向）。
   - 处理：整格 192×208 绘制，公共 footY≈200，按 `frame_durations_ms` 播放；不逐帧 autocrop/recenter/stretch（遵守上游 FORMAT.md）。
   - 许可边界：上游 `RIGHTS.md` 明确美术形象无开放授权，MIT 仅覆盖文档/布局 json；形象归 ZipZipPipe（B站 4168597）。本片按用户指示非官方同人非商用使用＋署名，不声明可商用/可自由再分发。入库件：`licenses/pets-RIGHTS.md`、`pets-ATTRIBUTION.md`、`pets-LICENSE.txt`。
2. **shuaizenge/ai-girls** @ `dcd69f5f4f2dff1a9c0031e82deb49e0fe949c76`
   - 使用：`characters/{claude,gemini,gpt,kimi,qwen,glm}/chibi/zipzippipe-BV1tE9XBbErS-*.png`（静态 Q 版纸偶；glm=Z.AI；whale/gpt 正片改用 pets），以及 `characters/doubao/generated/doubao-fullbody.jpg` 的 Day12 cutout。
   - 处理：chibi 仅边界连通抠背景/脚底对齐/缩放，不重绘脸。豆包上游无 chibi，v4 用同一 cutout 像素做分段仿射重排派生 Q（头×1.25、躯干×0.9/0.62、腿×0.82/0.5），正常比例件归档；这是派生排版，不是上游 Q 版原图。
   - 许可边界：仓库无统一许可；chibi 来自 ZipZipPipe《大AI和小AI们》BV1tE9XBbErS 截帧，DeepSeek 链 CC BY-NC-SA 4.0，其他为开放分享/再创作声明；豆包官方素材版权归字节。不得改标 CC0/MIT/商用开放。入库件：`licenses/ai-girls-NOTICE.md`。
3. **JAdpp/dsh-whale-galgame** @ `0ec130efebf15ffb63a2733b909d423b769db9c5`（v3 历史情感特写；v4 退出正片）
   - CC BY-NC-SA 4.0，署名链 上善→ZipZipPipe→Small-tailqwq。入库件：`licenses/CC-BY-NC-SA-4.0.txt`、`licenses/dsh-deep-whale-NOTICE.txt`。
4. **xiaosia/voxel-mv** @ `0caefec6c40ddca779ed498629069ac51dcb00a5`（v2/v3 历史动作；v4 退出正片）
   - `characters/` 帧图上游未逐项确权（THIRD_PARTY_NOTICES 排除于授权外）；历史记录按用户指示非商用同人使用＋署名，不声明可商用。

## 其余素材

- 歌曲音轨：用户提供的参考片 `《把回忆拼好给你》.mp4`，仅按用户本轮要求 copy 使用；不冒称官方授权。
- 字幕组件：`tools/字幕/day2_style_sub.mjs`。字体：项目既有 `video-fx/assets/fonts/`（各自开源许可）。
- 纸艺舞台 `src/paper.js` / `src/film.js` 为本工具自有实现。

## 生成物

成片、分镜、海报、图鉴为确定性渲染产物。自动验收报告只证明技术检查通过，不构成人工艺术/听审批准。角色与品牌权利归原权利人；不得冒称官方合作或统一商用授权。


## v5 追加：鲸娘 Q 版动作表情图集（AI 生成派生）

- 入库件：`assets/sprites/pets/whale_q.png`（＋`whale_q_idle.png` 预览），来自本仓库
  `tools/角色Q版库/pets/whale/spritesheet.png`，由 `prepare_assets.mjs` 复制登记。
- **性质：AI 生成派生美术**，用户 2026-11-06 明确授权（`gen_new`）后生成，**不是上游原画**，
  也不是官方委托/授权产物。设计基准为 pets 上游 `assets/deepseek-whale` 的鲸娘形象
  （ZipZipPipe 女仆二设，创作链「上善无形原鲸鱼娘 → ZipZipPipe 女仆二设」）。
- 上游原始图集并未丢弃：仍登记在 `data/sprites.json` 的 `characters.whale.petUpstream`，
  文件 `assets/sprites/pets/whale.png` 保留，署名与许可边界照旧适用。
- 生成/抠图/归一化披露与完整署名链见 `../角色Q版库/NOTICE.md`。
- 边界不变：非官方同人、非商用倾向＋署名；不冒称 ZipZipPipe 原作、官方合作或可商用开放授权。
