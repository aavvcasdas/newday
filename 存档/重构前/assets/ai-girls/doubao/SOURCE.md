# 豆包素材导入说明

来源：用户指定的 [shuaizenge/ai-girls](https://github.com/shuaizenge/ai-girls)，固定提交 `dcd69f5f4f2dff1a9c0031e82deb49e0fe949c76`。

- [原全身图（来源仓库已生成的参考，不是官方全身原图）](https://github.com/shuaizenge/ai-girls/blob/dcd69f5f4f2dff1a9c0031e82deb49e0fe949c76/characters/doubao/generated/doubao-fullbody.jpg)
- [原角色说明](https://github.com/shuaizenge/ai-girls/blob/dcd69f5f4f2dff1a9c0031e82deb49e0fe949c76/characters/doubao/README.md)
- [素材声明NOTICE](https://github.com/shuaizenge/ai-girls/blob/dcd69f5f4f2dff1a9c0031e82deb49e0fe949c76/NOTICE.md)
- [逐项来源与许可catalog](https://github.com/shuaizenge/ai-girls/blob/dcd69f5f4f2dff1a9c0031e82deb49e0fe949c76/catalog.json)

本目录`README.md`和`repository-README.md`是保留原字节的上游说明，其相对链接仍以上游仓库为基准，请通过上面的固定提交链接查看，不将移植后的失效相对路径当作新来源。

`doubao-cutout.png`仅由`doubao-fullbody.jpg`进行浅蓝背景的边缘连通alpha抠除和透明边裁剪；RGB纹理与原图对应裁切逐像素相同。没有新生成脸/身体，没有把三视图伪装成动作序列。

实际导入的blob SHA1、SHA256和裁剪区域见`source.json`。复现/核验：`python tools/day12制作/prepare_doubao.py --verify-only`。

公开头像与公开参考仓库并不等于开放商用授权，不自行授予CC0/MIT或代表豆包/字节跳动官方合作。请按原来源和相关权利人的许可使用。
