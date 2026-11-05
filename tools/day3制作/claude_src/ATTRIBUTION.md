# Claude 大小姐立绘 · 来源与授权

## 这是什么

Day3 样片里 L03–L16 的「Claude 大小姐」形象，从 v6 起改成**用现成的像素风立绘**，
不再由渲染器用几何图元现画（原来那套 `ladyClaude()` 只有一种姿态，动作全靠外层 transform）。

## 出处（必须一起署名）

| 项目 | 内容 |
|---|---|
| 素材库 | **Claude大小姐的日记本** · <https://github.com/opsCar/claude-daxiaojie-assets> |
| 取用目录 | `full-body/`（1024×1536 透明 PNG，全身立绘动作库） |
| 角色设定原作 | **ZipZipPipe（胖次狐）** · <https://space.bilibili.com/4168597> |
| 设定图 | **lmy414/ai-chan-sheets** · <https://github.com/lmy414/ai-chan-sheets> |
| 协议 | **CC BY-NC-SA 4.0**（署名 · 非商业性使用 · 相同方式共享） |

发布时必须带上这行署名：

```
素材：Claude大小姐的日记本（github.com/opsCar/claude-daxiaojie-assets）
· 角色设定：ZipZipPipe（胖次狐）· 设定图：lmy414/ai-chan-sheets · CC BY-NC-SA 4.0
```

> 同人作品，与 Anthropic 官方无关；「Claude」是 Anthropic 的商标。
> 本仓库对 Day3 的使用**仅限非商业**（运营样片、内测、复盘），不得用于付费推广或售卖。

## 本目录用了哪几张

| 文件 | 用在 | 用途 |
|---|---|---|
| `full/pose_1_greet.png` | L03 变身完成、L04、L11 | 默认站立（微笑打招呼） |
| `full/pose_2_explain.png` | L06、L09 | 讲解 / 比划 |
| `full/pose_3_wave.png` | L10、L13（电视内外） | 挥手 |
| `full/pose_cross_arms_no.png` | L05、L18 | 抱臂拒绝 / 驳回 |
| `full/pose_present.png` | L07、L17 | 展示 / 递交 |
| `full/pose_microphone.png` | L14 | 饭碗当麦 |
| `full/pose_shocked_back.png` | L15 | 被水浇到、后仰 |
| `full/pose_4_flustered.png` | L16 褪色前 | 慌掉色 |
| `full/pose_5_signoff.png` | L12 | 点名 / 收尾 |
| `full/pose_hold_teapot.png` | 备用（茶歇镜头） | 端茶 |

## 处理方式

不重画、不调色、不改设计：直接用原图（透明底已就绪），只做**缩放与骨架绑定**。
`tools/day3制作/whale_girl_src/whale_rig.mjs` 的骨架是「从 alpha 通道量」的通用实现，
所以大小姐也能量出自己的 10 骨骨架，动作（点头/鞠躬/后仰/呼吸）与她共享同一套骨骼运动。
