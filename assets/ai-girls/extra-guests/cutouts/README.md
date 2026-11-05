# 番外 v2：原图透明衍生素材

本目录是相邻目录4张720×1280 RGB原图的alpha-only衍生，不是重新生成角色。

- `gemini.png`：紫色猫耳/星形饰件角色。
- `qwen.png`：蓝紫色持扇角色。
- `gpt.png`：白发、角、翼、白裙角色。
- `kimi.png`：棱镜/月亮/K字元素女仆角色。

方法：人工轮廓guide → 内部彩色前景种子 → 原五官区域强制保留 → 3轮GrabCut → Kimi鞋边局部alpha清理。没有生成式填充、补脸、口型或RGB重绘；包括透明像素在内的整张RGB数组均与原图相同。不要将白裙颜色当背景一键删白。

精确原/衍生SHA256、保护脸多边形与guide见`manifest.json`。代码：`tools/mv_extra/v2/prepare_guests.py`；6项像素/透明测试、全新进程字节一致复现报告位于同目录v2工具文件夹。暗底静态已检查，细发/鞋边仍不是专业逐毛发蒙版验收；如需细修仅调整alpha，不重绘五官。

原仓库`https://github.com/shuaizenge/ai-girls`，版本`dcd69f5f4f2dff1a9c0031e82deb49e0fe949c76`；具体源路径/blob见相邻`manifest.json`与`SOURCE.md`。沿用原有来源和授权边界；源码仓库可访问不等于图像商用许可。此抠图不新增任何原作者授权。
