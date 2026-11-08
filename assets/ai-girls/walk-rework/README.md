# 行走重做：试验中，未接入

用户要求重做八位角色的正常走路，尤其是鲸鱼娘。目前尚未完成，现有引擎行走图集没有被替换。

参考：[tqlearning/ai-girl-chatgpt-pets](https://github.com/tqlearning/ai-girl-chatgpt-pets) 的 `FORMAT.md` 描述左右移动各 8 帧，固定格子、不逐帧裁切；前 7 帧各 120ms，末帧 220ms。该库 `RIGHTS.md` 明确美术 PNG/GIF 不属于文档的 MIT 授权，本次没有复制其图像。

当前 `tools/remotion-engine/walk_rig_builder.mjs` 是从单张角色图切出腿并经骨骼变形生成 16 格，实际每两个格重复同一关键姿态；注释中的自然与零缺陷结论不能替代动态检查。固定 8 姿态并不等于重新绘制的 8 帧；单凭帧数也不能证明落脚、肢体连接和行走方向正确。

`whale_contact.png` 是以 `assets/ai-girls/lyric-action-v13/source/whale_side_rainwalk.png` 为参考生成的单张试图，仍明显沿用弯腰、双手前伸的姿态，不符合要求，**不作为最终走路帧或替换素材**。尚缺其他关键姿态、抠图、固定画布及八位角色的完整图集，也未进行动态验收。
