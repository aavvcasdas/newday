"""门禁回归：负例必须非零；不以全仓一片绿作为测试目标。"""
import hashlib
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path[:0]=[str(ROOT/'tools/剧本'),str(ROOT/'tools/验收')]
from media_common import validate_timing
from verify_episode import tail_check
from rules_config import text_redlines

def module(name):
    spec=importlib.util.spec_from_file_location(name,ROOT/f'tools/剧本/{name}.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
opener=module('开场体检');cute=module('呆萌体检');scanner=module('画面红线体检')

class GateTests(unittest.TestCase):
    def test_shared_opener_words(self):
        self.assertEqual(cute.FIRST_BAN,opener.OPENER_BLACKLIST)
    def test_fake_measured_rejected(self):
        for flag in [False,None,'true']:
            with tempfile.NamedTemporaryFile(mode='w',suffix='.json') as f:
                json.dump({'measured':flag,'cues':[]},f);f.flush()
                with self.assertRaises(ValueError):opener.load_json(f.name)
    def test_event_not_any_nonblacklist(self):
        cues=[dict(id='L01',text='今天海底真安静呀',start=0,end=1)]
        self.assertIsNone(opener.first_event(cues)[0])
        with self.assertRaises(ValueError):opener.first_event(cues,'L99')
        cues[0]['text']='怎么又翻车了？';self.assertEqual(opener.first_event(cues)[0]['id'],'L01')
    def test_md_does_not_cross_section(self):
        with tempfile.NamedTemporaryFile(mode='w',suffix='.md') as f:
            f.write('## 口播说明\n没有定稿\n## 命令\n```bash\nrm something\n```\n');f.flush()
            with self.assertRaises(SystemExit):cute.load_text(md=f.name)
    def test_digits_spaced_and_unicode(self):
        for txt in ['涨了 100 ！','涨了１００呀']:
            self.assertTrue(text_redlines([txt]))
    def test_self_reference_not_every_mention(self):
        self.assertTrue(text_redlines(['本鱼要吃饭呀']))
        self.assertTrue(text_redlines(['我是大肥鱼']))
        self.assertFalse(text_redlines(['有人喊“大肥鱼”，本鲸才不是呢！']))
        self.assertFalse(text_redlines(['大肥鱼是住户喊歪的称呼']))
        self.assertFalse(text_redlines(['有人说“本鱼。','本鱼回来了！”']))
    def test_relative_scanner_path(self):
        p=ROOT/'tools/day9制作/render_day9_storyboard_full.mjs'
        result=subprocess.run([sys.executable,ROOT/'tools/剧本/画面红线体检.py','--file',str(p.relative_to(ROOT))],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
    def test_static_external_and_eye(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/'lines.txt';p.write_text('涨了 100 ！');self.assertTrue(scanner.scan_file(p))
            p=Path(tmp)/'subtitle_timing.json';p.write_text(json.dumps({'screens':[{'text':'涨了100'}]}));self.assertTrue(scanner.scan_file(p))
            p=Path(tmp)/'ui_cards.mjs';p.write_text("draw({eyes:'lids',squint:0.2});fillRect(0,0,progress*200,12);txt(g,'粉丝 100');")
            names={h[0] for h in scanner.scan_file(p)};self.assertIn('禁用闭眼眼型',names);self.assertIn('横向进度条嫌疑',names);self.assertIn('显式眯眼值',names);self.assertIn('体量数字',names)
            p.write_text("txt(g,'非官方同人 · AI生成 · 剧情演绎');")
            self.assertFalse(scanner.scan_file(p))
    def test_timing_hash_overlap_line_and_limit(self):
        with tempfile.NamedTemporaryFile() as f:
            f.write(b'test');f.flush()
            a=dict(measured=True,source_sha256=hashlib.sha256(b'test').hexdigest(),source_duration_seconds=1,cues=[dict(text='诶？',start=0,end=1)])
            s=dict(measured=True,screens=[dict(line=1,text='诶？',start=0,end=1.2)])
            validate_timing(a,s,['诶？'],f.name)
            for patch in [dict(line=99),dict(start=-1),dict(end=1.4),dict(text='改字')]:
                bad={'measured':True,'screens':[{**s['screens'][0],**patch}]}
                with self.assertRaises(ValueError):validate_timing(a,bad,['诶？'],f.name)
            a['source_sha256']='wrong'
            with self.assertRaises(ValueError):validate_timing(a,s,['诶？'],f.name)
    def test_tail(self):
        self.assertAlmostEqual(tail_check(1.2,1),.2)
        for dur in [.99,1.01,2]:
            with self.assertRaises(ValueError):tail_check(dur,1)
    def test_invalid_configuration_fails_closed(self):
        p=subprocess.run([sys.executable,ROOT/'tools/gate.py','--day','999','--stage','final'],capture_output=True)
        self.assertNotEqual(p.returncode,0)
    def test_single_cue_tail_no_indexerror(self):
        with tempfile.NamedTemporaryFile(mode='w',suffix='.json') as f:
            json.dump(dict(measured=True,cues=[dict(start=0,end=1,text='下一集怎么翻车呀？')]),f);f.flush()
            r=subprocess.run([sys.executable,ROOT/'tools/剧本/开场体检.py','--json',f.name],capture_output=True)
            self.assertEqual(r.returncode,0,r.stderr)

if __name__=='__main__':unittest.main()
