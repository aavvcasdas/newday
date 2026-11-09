"""剧情.py 回归：2026-11-09 五类文案门禁已删除，只留少量底线。"""

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(ROOT / "tools" / "剧本")]
import 剧情 as plot


PREV = """老大可能换新工作。
岗位先扒出来再说。
敲代码的，先划掉。
太远的，标出来。
太熬人的，也标出来。
先吃一口饭。
本鲸绝不摸鱼
"""

# 故意同时踩中全部五类已删除的门禁：没有「找新朋友来帮忙」、
# 没有求职梗顺序、多位客人同台、句尾语气词、阿拉伯数字、
# 而且完全不复述上一集开头/结尾的原句。
FREE = """诶？书一合上，本鲸还是焦的呢。
龙娘把两只沙漏往桌上一放呀。
大小姐、千问、Kimi、Gemini、智谱、豆包，全挤到工作台前啦。
26 镜、96 处音效、185 张补画，谁把数字加成一锅了嘛？
本鲸没接这锅，先把那张焦的单独夹起来吧。
"""


class PlotSkillTests(unittest.TestCase):
    def test_deleted_gates_are_not_failures(self):
        errors, notes = plot.check(FREE.strip().splitlines(), PREV.strip().splitlines(), "任意标签")
        self.assertFalse(errors, errors)
        self.assertTrue(any("已删除门禁" in note for note in notes))
        for word in ("三拍顺序", "一天一客", "零句尾语气词", "零阿拉伯数字"):
            self.assertTrue(any(word in note for note in notes))

    def test_no_prev_no_guest_still_ok(self):
        self.assertFalse(plot.check(["门响了呀。", "来了 8 位。"])[0])

    def test_retired_lengths_are_not_failures(self):
        long_line = "这是一句故意写得很长的话，用来证明剧情生成不再因为超过二十个字就退稿，也不能为了门禁把事情切碎。"
        errors, notes = plot.check([long_line], PREV.strip().splitlines())
        self.assertFalse(errors, errors)
        self.assertTrue(any("句长门禁不启用" in note for note in notes))
        self.assertGreater(plot.han_len(long_line), 20)

    def test_bottom_lines_still_enforced(self):
        for line, signal in [
            ("本鱼回来了。", "自称口径"),
            ("笨鱼说：录取了。", "笨鱼不新增对白"),
            ("狗屁不通。", "黑名单"),
        ]:
            errors, _ = plot.check([line])
            self.assertTrue(any(signal in item for item in errors), (line, errors))

    def test_day12_locked_script_still_passes(self):
        prev = plot.load_lines(ROOT / "Day/Day11/Day11配音台词.txt")
        curr = plot.load_lines(ROOT / "Day/Day12/Day12配音台词.txt")
        errors, notes = plot.check(curr, prev, "豆包")
        self.assertFalse(errors, errors)
        self.assertTrue(any("已删除门禁" in note for note in notes))

    def test_gate_script_stage_uses_plot_not_cute(self):
        with tempfile.TemporaryDirectory() as tmp:
            report = Path(tmp) / "gate_script_report.json"
            result = subprocess.run(
                [sys.executable, ROOT / "tools/gate.py", "--day", "14", "--stage", "script", "--report", str(report)],
                cwd=ROOT,
                capture_output=True,
                text=True,
            )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("文案底线检查", result.stdout)
        self.assertIn("已删除门禁", result.stdout)
        self.assertNotIn("呆萌体检", result.stdout)
        self.assertNotIn("开头没有说找新朋友来帮忙", result.stdout)

    def test_card_is_reference_only(self):
        with tempfile.TemporaryDirectory() as tmp:
            prev = Path(tmp) / "prev.txt"
            prev.write_text(PREV, encoding="utf-8")
            result = subprocess.run(
                [sys.executable, ROOT / "tools/剧本/剧情.py", "--prev", str(prev), "--card"],
                capture_output=True,
                text=True,
            )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("参考卡（非门禁", result.stdout)
        self.assertIn("已删除门禁", result.stdout)


if __name__ == "__main__":
    unittest.main()
