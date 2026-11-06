# NOTICE

本番外 MV 为非官方同人作品，由 AI 辅助生成并用于剧情演绎；不代表任何模型厂商、歌曲权利人或参考仓库作者的官方合作/授权。

## 方法参考署名

- 来源：voxel-mv，https://github.com/xiaosia/voxel-mv （微缩体素/立牌/柔光方法与逐帧导出思路）
- 来源：world-execute-me-lyric-mv，https://github.com/Nyankomintsu/world-execute-me-lyric-mv （MIT 软件方法参考；未复制其剪影资产、歌词或音频）

## 角色形象来源（2026-11-06 v2，用户指定仓库真实素材）

本片 8 位 AI 娘形象全部取自以下上游仓库的固定提交，逐文件 git blob sha1 校验＋sha256 记录于 `data/upstream_manifest.json`。上游素材下载到 gitignored 的 `assets/upstream/`，由 `fetch_upstream.mjs` 重建；本片仅做裁切/缩放/脚底对齐等排版性处理，不重绘角色。

1. **xiaosia/voxel-mv** @ `0caefec6c40ddca779ed498629069ac51dcb00a5`
   - 使用：`characters/{deepseek,claude,gemini,gpt,kimi,qwen,zai}/frames/` 动画帧（deepseek 即鲸鱼娘群像/动作形象）＋`身高校正.json` mv_scale。
   - **许可边界（重要）**：仓库默认 PolyForm-NC-1.0 / CC BY-NC-SA，但其 `THIRD_PARTY_NOTICES.md` 明确 `characters/` 帧图与角色形象**没有逐项权属和分发许可记录，排除于该授权之外**。本片按用户明确指示在非官方同人 MV 中使用并署名；不主张对这些帧图拥有任何权利，不声明其可商用或可自由再分发。任何后续分发/商用前必须先向上游核实权属。
2. **JAdpp/dsh-whale-galgame** @ `0ec130efebf15ffb63a2733b909d423b769db9c5`
   - 使用：`assets/default/whale-{cheerful,shy,serious,confused,angry,frightened,exasperated,starry}.webp` 鲸鱼娘高清表情差分（情感特写）。
   - 许可：CC BY-NC-SA 4.0（非商业＋相同方式共享）。署名链：**上善 → ZipZipPipe → Small-tailqwq**。完整许可文本与上游署名声明已随仓库保留在 `licenses/CC-BY-NC-SA-4.0.txt`、`licenses/dsh-deep-whale-NOTICE.txt`（与 fetch 到的上游 `assets/default/licenses/` 文件一致）。本片对其做的裁切/缩放属改编，按 ShareAlike 以相同 CC BY-NC-SA 4.0 条款共享该部分；不得商用。
3. **shuaizenge/ai-girls** @ `dcd69f5f4f2dff1a9c0031e82deb49e0fe949c76`
   - 使用：`characters/doubao/generated/doubao-fullbody.jpg` 的 Day12 已抠图全身（`assets/ai-girls/doubao/doubao-cutout.png`，同一上游源）。
   - 许可边界：仓库无统一许可，`catalog.json` 逐项标注；豆包官方头像权利归字节跳动，生成全身为 AI 生成参考图。本片只沿用既有抠图、不重绘脸、不做口型/眨眼/假头转；不声明商用开放授权。

## 其余素材

- 歌曲音轨：来自用户提供的参考片 `《把回忆拼好给你》.mp4`，仅按用户本轮要求在该同人交付中 copy 使用；不冒称官方授权。
- 字幕组件：项目既有 `tools/字幕/day2_style_sub.mjs`。字体：项目既有 `video-fx/assets/fonts/`（Noto Sans SC / ZCOOL KuaiLe / Silkscreen，各自开源许可）。
- 微缩体素舞台（`src/engine.js`）为本工具自有实现，未复制上游代码。

## 生成物

成片、分镜、海报、图鉴为本工具确定性渲染产物。自动验收报告只证明技术检查通过，不构成人工艺术/听审批准。角色与品牌权利归原权利人；不得冒称官方合作或统一商用授权。
