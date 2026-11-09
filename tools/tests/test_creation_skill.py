"""回归：人格不能脱离角色，上集与 skill 不能只留标题。无网络、无媒体依赖。"""
import hashlib
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(ROOT / 'tools/agent'), str(ROOT / 'tools/剧本')]
import create_episode as creation
import 剧情 as plot
from provider import ProviderError, MockProvider


class CaptureProvider:
    name = 'capture'

    def __init__(self, reply=None):
        self.reply = reply if reply is not None else (ROOT / 'Day/Day12/Day12配音台词.txt').read_text()

    def complete(self, messages):
        self.messages = messages
        return self.reply


class FailProvider:
    name = 'failure'

    def complete(self, messages):
        raise ProviderError('network', '不可用')


class CreationSkillTests(unittest.TestCase):
    def test_full_context_and_creation_persona_reach_provider(self):
        provider = CaptureProvider()
        result = creation.generate(ROOT, 12, '豆包', provider)
        self.assertTrue(result['ok'], result)
        self.assertEqual(result['code'], 'candidate')
        self.assertTrue(result['review_required'])
        self.assertFalse(result['written'])
        self.assertEqual(result['character_id'], 'dafeiyu')
        self.assertEqual(result['persona_id'], 'mowan')
        self.assertEqual(result['visual_id'], 'whale_girl_existing')
        messages = provider.messages
        self.assertIn('角色身份仍是大肥鱼', messages[0]['content'])
        self.assertIn('活动人格为魔丸', messages[0]['content'])
        self.assertNotIn('你不是大肥鱼', messages[0]['content'])
        self.assertIn('当前是剧情创作', messages[1]['content'])
        self.assertNotIn('不要插玩笑', messages[1]['content'])
        user = messages[-1]['content']
        self.assertIn((ROOT / 'Day/Day11/Day11配音台词.txt').read_text(), user)
        self.assertIn((ROOT / 'Day/Day12/Day12方向.md').read_text().rstrip(), user)
        self.assertIn('先把不确定的', provider.reply)
        self.assertIn('name: 剧情生成', user)
        # 2026-11-09：三拍顺序 / 一天一客等门禁已删除，beats.md 改为历史样例。
        self.assertIn('Day12 写法样例（历史笔记，非门禁）', user)
        self.assertIn('2026-11-09 用户删除五类文案门禁', user)
        self.assertIn('已删除的口径', user)
        self.assertIn('角色不换，移植人格', user)
        self.assertIn('本轮通过 GitHub API 实读的 skill', user)
        self.assertEqual(len(result['sources']), 7)
        for source in result['sources']:
            self.assertEqual(source['sha256'], hashlib.sha256((ROOT / source['path']).read_bytes()).hexdigest())

    def test_creation_never_overwrites_scripts_or_notes(self):
        paths = [ROOT / p for p in ('agent.md', '00_运营总览/连续更新记忆.md',
                                   'Day/Day11/Day11配音台词.txt', 'Day/Day12/Day12配音台词.txt')]
        before = {p: p.read_bytes() for p in paths}
        creation.generate(ROOT, 12, '豆包', CaptureProvider())
        self.assertEqual(before, {p: p.read_bytes() for p in paths})

    def test_missing_required_context_fails_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            # 缺任一必需上下文都要 fail-closed；先缺上集口播就报 ValueError，
            # 其余缺文件报 OSError，两者都算「没有降级成只读标题」。
            with self.assertRaises((OSError, ValueError)):
                creation.prepare(tmp, 12, '豆包')
        with self.assertRaises(ValueError):
            creation.prepare(ROOT, 11, '豆包')
        # 2026-11-09：一天一客门禁已删除，任意 guest 标签都不再被拒。
        packet = creation.prepare(ROOT, 12, '未注册客人')
        self.assertEqual(packet['guest'], '未注册客人')
        self.assertTrue(packet['messages'])

    def test_unconfigured_mock_and_failed_model_are_not_success(self):
        with patch.dict(os.environ, {}, clear=True):
            result = creation.generate(ROOT, 12, '豆包')
        self.assertEqual(result['code'], 'unconfigured')
        self.assertNotIn('reply', result)
        self.assertEqual(creation.generate(ROOT, 12, '豆包', MockProvider())['code'], 'testing_only')
        result = creation.generate(ROOT, 12, '豆包', FailProvider())
        self.assertFalse(result['ok'])
        self.assertEqual(result['code'], 'network')
        result = creation.generate(ROOT, 12, '豆包', CaptureProvider('  '))
        self.assertEqual(result['code'], 'empty')

    def test_markdown_model_output_rejected_but_free_prose_is_not(self):
        # 2026-11-09：五类文案门禁已删除，短稿不再因结构被拒；只挡 Markdown 形状。
        result = creation.generate(ROOT, 12, '豆包', CaptureProvider('任务做完了。'))
        self.assertTrue(result['ok'], result)
        result = creation.generate(ROOT, 12, '豆包', CaptureProvider('# 剧情\n' + CaptureProvider().reply))
        self.assertFalse(result['ok'], result)
        self.assertEqual(result['code'], 'draft_invalid')

    def test_old_plot_may_motivate_invitation_before_meme(self):
        prev = plot.load_lines(ROOT / 'Day/Day11/Day11配音台词.txt')
        curr = plot.load_lines(ROOT / 'Day/Day12/Day12配音台词.txt')
        # 三拍顺序门禁已删除；这里只确认插入任意动机行都不会再被退稿。
        curr.insert(1, '老大可能换新工作。')
        self.assertFalse(plot.check(curr, prev, '豆包')[0])

    def test_meme_before_invitation_and_late_guest_are_allowed_now(self):
        prev = plot.load_lines(ROOT / 'Day/Day11/Day11配音台词.txt')
        curr = ['豆包开了录取通知。', '找新朋友来帮忙。', *prev]
        self.assertFalse(plot.check(curr, prev, '豆包')[0])
        curr = plot.load_lines(ROOT / 'Day/Day12/Day12配音台词.txt')
        curr = [line.replace('豆包', '朋友') for line in curr] + ['豆包来了。']
        self.assertFalse(plot.check(curr, prev, '豆包')[0])

    def test_multiple_guests_allowed_but_benyu_still_silent(self):
        curr = plot.load_lines(ROOT / 'Day/Day12/Day12配音台词.txt')
        prev = plot.load_lines(ROOT / 'Day/Day11/Day11配音台词.txt')
        # 一天一客门禁已删除：多位客人不再报错。
        self.assertFalse(plot.check(curr + ['千问也来了。'], prev, '豆包')[0])
        errors, _ = plot.check(curr + ['笨鱼说：录取了。'], prev, '豆包')
        self.assertTrue(any('笨鱼不新增对白' in error for error in errors))

    def test_markdown_and_txt_are_same_current_script(self):
        text = (ROOT / 'Day/Day12/Day12配音台词.txt').read_text()
        md = (ROOT / 'Day/Day12/Day12文案.md').read_text()
        self.assertEqual(md.split('```text\n', 1)[1].split('```', 1)[0], text)
        self.assertNotIn('身份证', text)
        self.assertNotIn('今天不带她', text)

    def test_benyu_return_and_rice_motive_are_in_actual_creation_inputs(self):
        text = (ROOT / 'Day/Day12/Day12配音台词.txt').read_text()
        self.assertLess(text.index('找新朋友来帮忙'), text.index('笨鱼又回来了'))
        self.assertLess(text.index('笨鱼又回来了'), text.index('本鲸问'))
        self.assertLess(text.index('她开始道歉'), text.index('认了这个帮手'))
        self.assertLess(text.index('认了这个帮手'), text.index('豆包虽然不太聪明，但是不需要米饭'))
        self.assertIn('笨鱼按住原来标过的地方，把要求推给豆包', text)
        self.assertFalse(any(word in text for word in ('免费', '零成本', '人机校验通过', '账号恢复')))
        packet = creation.prepare(ROOT, 12, '豆包')
        context = packet['messages'][-1]['content']
        self.assertIn('笨鱼本集回归', context)
        self.assertIn('把豆包当自己的帮手', context)
        self.assertIn('不表示免费调用', context)
        prev = plot.load_lines(ROOT / 'Day/Day11/Day11配音台词.txt')
        self.assertFalse(plot.check(text.splitlines(), prev, '豆包')[0])

    def test_comment_at_is_benyu_action_not_audience_cta_and_jokes_pay_off(self):
        text = (ROOT / 'Day/Day12/Day12配音台词.txt').read_text()
        self.assertIn('现在它回评论，碰上拿不准的，先艾特豆包', text)
        self.assertIn('原来是学会摇人了', text)
        self.assertIn('你这是招同事，还是护食', text)
        self.assertTrue(text.rstrip().endswith('豆包是不吃米饭，本鲸也不能跟着吃大饼。'))
        self.assertNotIn('@', text)  # 口播用可读汉字，画面用@。
        self.assertNotIn('大家去', text)
        context = creation.prepare(ROOT, 12, '豆包')['messages'][-1]['content']
        self.assertIn('@豆包', context)
        self.assertIn('不编平台回执', context)
        self.assertIn('用户提供的剧情口径', context)

    def test_cli_prepare_and_missing_input_exit_codes(self):
        result = subprocess.run([sys.executable, ROOT / 'tools/agent/create_episode.py',
                                 '--day', '12', '--guest', '豆包', '--prepare-only'],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('"code": "prepared"', result.stdout)
        self.assertIn('"generated": false', result.stdout)
        result = subprocess.run([sys.executable, ROOT / 'tools/agent/create_episode.py',
                                 '--day', '999', '--guest', '豆包', '--prepare-only'],
                                capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('"code": "input"', result.stdout)


if __name__ == '__main__':
    unittest.main()
