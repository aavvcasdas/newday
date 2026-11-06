# NOTICE

本番外 MV 为非官方同人作品，由 AI 辅助生成并用于剧情演绎；不代表任何模型厂商、歌曲权利人或参考仓库作者的官方合作/授权。

## 方法参考署名

- 来源：voxel-mv，https://github.com/xiaosia/voxel-mv （微缩体素/立牌/柔光方法与逐帧导出思路）
- 来源：world-execute-me-lyric-mv，https://github.com/Nyankomintsu/world-execute-me-lyric-mv （MIT 软件方法参考；未复制其剪影资产、歌词或音频）
- 来源：PDoomVideo，https://github.com/JohnHeibel/PDoomVideo （检查提交 `fa546a38092e75f2b079e6a86d6abc54dd525d17`；仅借鉴整身动作、节拍脉冲、转场与确定性逐帧渲染方法。该仓库未检测到 LICENSE，本片未复制其代码、素材或音频。）

## 角色形象来源（2026-11-06 v3，用户指定仓库真实素材）

本片 8 位 AI 娘形象取自以下上游仓库的固定提交，逐文件 git blob sha1 校验＋sha256 记录于 `data/upstream_manifest.json`。上游素材下载到 gitignored 的 `assets/upstream/`，由 `fetch_upstream.mjs` 重建。v3 主形象为 ai-girls Q版 chibi；同一角色同一镜头只出现一种形象，不叠加两条素材路线。

1. **shuaizenge/ai-girls** @ `dcd69f5f4f2dff1a9c0031e82deb49e0fe949c76`
   - 使用：`characters/{deepseek,claude,gemini,gpt,kimi,qwen,glm}/chibi/zipzippipe-BV1tE9XBbErS-*.png` 的 Q版 chibi 截帧（主形象；glm 对应本片 Z.AI），以及 `characters/doubao/generated/doubao-fullbody.jpg` 的 Day12 既有抠图。
   - 处理：chibi 原图为不透明视频截帧，本片只做边界连通 flood-fill 抠背景、脚底对齐、缩放；不重绘脸/服装，不做口型/眨眼/假头转。豆包沿用 Day12 alpha-only cutout。
   - 许可边界：仓库无统一许可，`catalog.json`/`NOTICE.md` 逐项标注。chibi 来自 ZipZipPipe《大AI和小AI们》BV1tE9XBbErS 的完整视频截帧，原始 Q 版立绘未取得；DeepSeek 须保留创作链“上善无形原鲸鱼娘 → ZipZipPipe 女仆二设”，CC BY-NC-SA 4.0；其他 ZipZipPipe 角色只有开放分享/再创作声明，不得改标 CC0/MIT。豆包官方素材版权归字节跳动，generated 全身只作形象参考。上游 NOTICE 已保留为 `licenses/ai-girls-NOTICE.md`；不声明商用开放授权。
2. **JAdpp/dsh-whale-galgame** @ `0ec130efebf15ffb63a2733b909d423b769db9c5`
   - 使用：`assets/default/whale-{cheerful,shy,serious,confused,angry,frightened,exasperated,starry}.webp` 鲸鱼娘高清表情差分（情感特写 S06/S09/S12）。
   - 许可：CC BY-NC-SA 4.0（非商业＋相同方式共享）。署名链：**上善 → ZipZipPipe → Small-tailqwq**。完整许可文本与上游署名声明已随仓库保留在 `licenses/CC-BY-NC-SA-4.0.txt`、`licenses/dsh-deep-whale-NOTICE.txt`。本片对其做的裁切/缩放属改编，按 ShareAlike 以相同 CC BY-NC-SA 4.0 条款共享该部分；不得商用。
3. **xiaosia/voxel-mv** @ `0caefec6c40ddca779ed498629069ac51dcb00a5`
   - 使用：`characters/{deepseek,claude,gemini,gpt,kimi,qwen,zai}/frames/` 动画帧，仅用于少数动作镜头（S03/S07/S13）＋`身高校正.json` mv_scale。
   - **许可边界（重要）**：仓库默认 PolyForm-NC-1.0 / CC BY-NC-SA，但其 `THIRD_PARTY_NOTICES.md` 明确 `characters/` 帧图与角色形象**没有逐项权属和分发许可记录，排除于该授权之外**。本片按用户明确指示在非官方同人 MV 中使用并署名；不主张对这些帧图拥有任何权利，不声明其可商用或可自由再分发。任何后续分发/商用前必须先向上游核实权属。

## 其余素材

- 歌曲音轨：来自用户提供的参考片 `《把回忆拼好给你》.mp4`，仅按用户本轮要求在该同人交付中 copy 使用；不冒称官方授权。
- 字幕组件：项目既有 `tools/字幕/day2_style_sub.mjs`。字体：项目既有 `video-fx/assets/fonts/`（Noto Sans SC / ZCOOL KuaiLe / Silkscreen，各自开源许可）。
- 微缩体素舞台（`src/engine.js`）为本工具自有实现，未复制上游代码。

## 生成物

成片、分镜、海报、图鉴为本工具确定性渲染产物。自动验收报告只证明技术检查通过，不构成人工艺术/听审批准。角色与品牌权利归原权利人；不得冒称官方合作或统一商用授权。
