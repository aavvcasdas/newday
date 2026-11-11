# 词点交互试样底座

当前交付是 Day10 **十九秒无声结构试样**，不是有声成片。输入来自用户提供的开头三段；规划轴一律 `measured:false`，尚无 Day10 配音或实测词级对齐。

## 两条道具来源，本次都实际用了

- **既有库适配**：本号 `CORE.paint` 多部件大饼、空碗、纸气泡；一枚 `@fluentui-emoji/svg@2.2.0` 的 `poultry-leg.svg` 经 Resvg 栅格化。并非已经接入整个 Emoji/DSH 库。
- **参数化新道具**：`../day10制作/generated_props/seat_sign.mjs` 是本次编写的木质专座名牌，含底板、内衬、木纹、铆钉、折角/受击纹。`draw(ctx,t,state)` 接口；并未调用外部生图/LLM 服务或声称能自动生成任意道具。

SVG 原文件与安装包 MIT 原文在 `assets/fluent/`，来源为 npm `@fluentui-emoji/svg@2.2.0`，仓库 `https://github.com/MKAbuMattar/fluentui-emoji`。保留其许可证原有署名，不将第三方资产冒称本号原创，也不以此推定其他角色、贴纸和外部仓库的许可。

## 接触不是角色高度比例

`actor_contacts.mjs` 只注册四张已检查的原图。手掌/指尖/头顶为原图人工校准坐标；通过 `skinMatrices`、与 `drawRigged` 相同的网格三角形和重心插值投影。渲染缓存只缓存同一变形后的身体；镜像、倾斜、缩放与挂点一致。未校准姿势直接报错，不退回虚构的手部比例。

- 通用运动采样与绘制：`drop_bonk`（道具底部碰头、弧线反弹落桌）、`slap_deflect`（气泡边缘碰指尖、以受击边旋转飞走）。
- 本次渲染器约束编排：`tug_grab`（两只真实手掌夹住刚性名牌，放手后归笨鱼）、`knock_bowl`（勺柄跟手掌、勺尖与固定碗沿相交）。这两种尚未抽成任意道具都可直接复用的完整求解器。
- `unroll_scroll` 仅有基础挂点展开采样，未在样片演示；`stamp_slam / thought_poof / word_morph / edge_peek` **没有实现**。不能把这版称为八动词完成。
- 四段碰撞/争夺均使用相应两帧局部顿帧。人物与交互道具一起暂停；环境和字幕不作为配音实测依据。气泡受击还有短促局部镜头震动。
- 为保留原始人物，不画假手指；敲碗用原手掌像素裁切作勺柄的前景遮挡。脸部不跟随手臂变形。

这是确定性卡通运动编排，不是刚体物理引擎；“接触误差为零”仅指解析约束坐标一致，不是图像像素级测得完全无误。

## 新道具验收边界

```sh
node tools/互动元素/validate_generated_prop.mjs tools/day10制作/generated_props/seat_sign.mjs --report tools/day10制作/新道具_像素烟测.json
node --test tools/互动元素/cue_props_engine.test.mjs
```

四态测透明占比、明暗色阶、墨线、边缘裁切、状态差异，并检查部分静态数字文字与标签。**只能导入已经人工审查过的本地代码**，不是 JS 沙箱；不应对不可信 AI/第三方代码直接运行。该检查不是完整 OCR、审美或版权验收，也不会自动把未经认可的道具晋升为正式资产。运行时另挡气泡数字文字。

## 重现环境

沿用现有 renderer 的 Canvas/字体加载器，当前机器依赖位于 `/tmp/node_render/node_modules`；临时目录不会随 Git 持久化。需要时：

```sh
npm install --prefix /tmp/node_render @napi-rs/canvas @resvg/resvg-js @ffmpeg-installer/linux-x64 @ffprobe-installer/linux-x64
node tools/day10制作/render_interaction_sample.mjs --stills
node tools/day10制作/render_interaction_sample.mjs
```

默认输出为 Day10 的独立 MP4；不改 Day9 原片、配音、实测字幕轴或 `motion_v2`。
