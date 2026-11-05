# 鲸鱼娘立绘 · 来源与授权（Day3 样片用）

## 用途

Day3 无配音样片里「鲸鱼娘」这个角色（L01–L02、L16 之后、片尾）用的高清立绘，
由本目录的 `make_sprite.mjs` 从原图抠底生成 `whale_idle.png`。

## 来源

- 形象参考与立绘出处：**鲸鱼娘开源资产库** <https://treapgogo.github.io/deepseek-whale-girl/>
  （社区自发维护的非官方资源库，仓库 MIT，2026）。
  - 本站明确声明：**不设定任何形式的"标准人设"，不代表深度求索公司或 DeepSeek 官方立场。**
  - 站点 `characters/dafeiyu/reference-sheets/` 提供 `dafeiyu-chibi-character-sheet.png`（Q 版三视图与细节）与 `dafeiyu-mature-character-sheet.png`。
- 本仓库根目录的 `dafeiyu.webp`（1024×1024）与 `dafeiyu-chibi-character-sheet.png`（1448×1086）
  是用户指定的形象基准，由用户提供。
- 形象本身的著作权归社区原作者；本站与镜像只做整理。若要公开发布成片，
  请保留「非官方同人 / AI 生成内容」标注，并按资产库的说明署名来源。

## 生成物

| 文件 | 说明 |
|---|---|
| `whale_idle.png` | 从 `dafeiyu.webp` 抠底后的透明立绘（926×1024），渲染器直接读取 |
| `pose_wave/run/cry/shock/eat/point/think/cheer.png` | **AI 生成的同角色差分姿势源图**（1024×1024）：以 `dafeiyu.webp` 作 image reference 逐张生成，保证同一角色（深蓝渐变海蓝长发、白蕾丝女仆发箍 + 亮蓝蝴蝶结、鲸鳍耳、蓝白女仆裙 + 小鲸围裙、深蓝玛丽珍鞋）只换姿势不换设计 |
| `whale_wave/run/cry/shock/eat/point/think/cheer.png` | 上述 8 张用同一个 `make_sprite.mjs` 抠底后的透明立绘，渲染器按 `WHALE_POSES` 读取 |
| `make_sprite.mjs` | 抠图脚本（四边泛洪 → 发缝白洞 → 去自带投影 → 阶梯削白边 → 裁包围盒） |

## 骨架（v5）

`whale_rig.mjs` 不产生新的形象素材：它是**从上面这 9 张已经确认过配色的透明立绘里量出来的骨架**
（读 alpha 通道定中线/四肢/发梢/尾尖 → 刷蒙皮权重 → 线性混合蒙皮），
所以骨架动作的每一帧仍然是这 9 张原画本身的像素，没有另画一张图、也不改角色设计。

> 差分姿势是 **AI 生成内容 + 非官方同人**，与原角色设计者无关；成片里必须保留「非官方同人 / AI 生成内容」角标（渲染器 HUD 已固定输出）。
> 生成方式见 `Day3/Day3制作记录.md` §〇之一：只换姿势、不改配色与服装；一旦发现颜色偏离 `dafeiyu.webp` 就重出，不另造形象。

重新抠一张姿势图（示例）：

```bash
node make_sprite.mjs pose_wave.png whale_wave.png
```

重新生成：

```bash
node make_sprite.mjs ../../../../dafeiyu.webp whale_idle.png
```

## 注意

- 这台机器上的脚本阈值是对 `dafeiyu.webp` 这张图实测调出来的（发色 b≥118 且 b−r≥42 用来区分"头发缝"与"裙子上的白蕾丝"）。换图请用 `--debug` 复核。
- 角色形象属于社区共创，**不要**在任何发布物里写成 Anthropic / DeepSeek 官方形象。
