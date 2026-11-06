# v4 制作中

此目录目前仅包含 v4 的资产恢复、角色动作、画面组件和 32 镜导演规划，**尚不是可渲染的完整 MV**。导演表描述的是目标画面，不代表场景已经实现。还需完成场景编排、渲染入口、逐秒运动验证、字幕核验、成片渲染及检查。

准备资产：先按 `tools/mv_extra/setup.py` 的要求准备来源素材，然后运行 `python tools/mv_extra/v4/setup_v4.py`；依赖需要在 `tools/engine` 下执行 `npm ci`。资产缓存不纳入 Git。基础规划测试：`node --test tools/mv_extra/v4/planning.test.mjs`。测试只检查规划连续性和组件基础行为，并不能证明成片的画面或动作质量。
