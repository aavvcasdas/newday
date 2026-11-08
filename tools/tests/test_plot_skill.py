"""剧情承接：接上一日，不按字数退稿。"""

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

HOOKED = """找新朋友来帮忙。
这是一句故意写得很长的话，用来证明剧情生成不再因为超过二十个字就退稿，不能为了门禁把这件事切碎。
新朋友只来了一个。豆包。
有人问：这个岗，没经验，能去吗。她答：录取信，办好了。
昨天敲代码的，先划掉。太远的也还在。
老大可能换新工作。
先吃一口饭。
"""


class PlotSkillTests(unittest.TestCase):
    def test_retired_lengths_are_not_failures(self):
        errors, notes = plot.check(HOOKED.strip().splitlines(), PREV.strip().splitlines(), "豆包")
        self.assertFalse(errors, errors)
        self.assertTrue(any("句长门禁不启用" in note for note in notes))
        self.assertGreater(max(plot.han_len(line) for line in HOOKED.splitlines()), 20)

    def test_cold_open_fails_without_mentioning_length(self):
        cold = ["门响了。", "只有豆包。", "对不起，已经写上。"]
        errors, _notes = plot.check(cold, PREV.strip().splitlines(), "豆包")
        self.assertTrue(errors)
        self.assertFalse(any("字" in item and "超过" in item for item in errors))
        self.assertTrue(any("找新朋友" in item for item in errors))

    def test_plot_before_friend_fails(self):
        late = ["敲代码的，先划掉。", "太远的还在。", "老大可能换新工作。", "豆包才来。"]
        errors, _notes = plot.check(late, PREV.strip().splitlines(), "豆包")
        self.assertTrue(any("找新朋友" in item for item in errors))

    def test_particle_digit_and_second_guest(self):
        base = HOOKED.strip().splitlines()
        particle = plot.check(base + ["本鲸不收呀。"], PREV.strip().splitlines(), "豆包")[0]
        self.assertTrue(any("语气词" in item for item in particle))
        digit = plot.check(base + ["护照办了100张。"], PREV.strip().splitlines(), "豆包")[0]
        self.assertTrue(any("数字" in item for item in digit))
        extra = plot.check(base + ["大小姐也进门。"], PREV.strip().splitlines(), "豆包")[0]
        self.assertTrue(any("一个客人" in item for item in extra))

    def test_day12_hooks_day11(self):
        prev = plot.load_lines(ROOT / "Day/Day11/Day11配音台词.txt")
        curr = plot.load_lines(ROOT / "Day/Day12/Day12配音台词.txt")
        errors, notes = plot.check(curr, prev, "豆包")
        self.assertFalse(errors, errors)
        joined = "\n".join(notes)
        self.assertIn("老大可能换新工作", joined)
        self.assertIn("敲代码的", joined)

    def test_gate_script_uses_plot_not_cute(self):
        with tempfile.TemporaryDirectory() as tmp:
            report = Path(tmp) / "gate_script_report.json"
            result = subprocess.run(
                [sys.executable, ROOT / "tools/gate.py", "--day", "12", "--stage", "script", "--report", str(report)],
                cwd=ROOT,
                capture_output=True,
                text=True,
            )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("剧情承接", result.stdout)
        self.assertNotIn("呆萌体检", result.stdout)

    def test_card_does_not_need_a_draft(self):
        with tempfile.TemporaryDirectory() as tmp:
            prev = Path(tmp) / "prev.txt"
            prev.write_text(PREV, encoding="utf-8")
            result = subprocess.run(
                [sys.executable, ROOT / "tools/剧本/剧情.py", "--prev", str(prev), "--card"],
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("老大可能换新工作", result.stdout)
            self.assertIn("句长门禁不启用", result.stdout)


if __name__ == "__main__":
    unittest.main()
