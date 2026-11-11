#!/usr/bin/env python3
"""音频工具的测试：全部用「已知答案」的合成信号（不是真人配音 / 真歌）。
    python3 -m unittest discover -s 通用模板/tests -p 'test_*.py'
覆盖：audio_mix.py（按采样对位、淡出、配乐压低、干声可减回）、align_voice.py（按停顿切句、逐词对齐、拒绝伪造）、
      align_beats.py（实测拍点、吸附）、film.mjs plan（规划轴公式与旧项目 Day14 的规划逐句一致）。
"""
import json
import os
import subprocess
import sys
import tempfile
import unittest
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
CLI = os.path.join(HERE, '..', 'cli')
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))


def write_wav(path, x, sr):
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(np.round(np.clip(x, -1, 32767 / 32768) * 32768).astype('<i2').tobytes())


def read_wav(path):
    with wave.open(path, 'rb') as w:
        return w.getframerate(), np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').reshape(-1, w.getnchannels()).astype(np.float64) / 32768


def jload(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def wtext(path, text):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)


def rtext(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


def run(script, *args, ok=True):
    r = subprocess.run([sys.executable, os.path.join(CLI, script), *map(str, args)], capture_output=True, text=True)
    if ok and r.returncode != 0:
        raise AssertionError(f'{script} 失败：\n{r.stdout}\n{r.stderr}')
    return r


def speech_like(spans, dur, sr, seed=7):
    """在给定的时间段里放「像说话的声音」：带 6Hz 起伏的窄带噪声；段外是极轻的底噪"""
    rng = np.random.default_rng(seed)
    n = int(dur * sr)
    t = np.arange(n) / sr
    x = rng.normal(0, 0.0004, n)
    carrier = np.sin(2 * np.pi * 220 * t) * 0.5 + np.sin(2 * np.pi * 440 * t) * 0.3 + rng.normal(0, 0.15, n)
    for a, b in spans:
        i0, i1 = int(a * sr), int(b * sr)
        env = np.minimum(1, np.minimum((t[i0:i1] - a) / 0.01, (b - t[i0:i1]) / 0.01)) * (0.75 + 0.25 * np.sin(2 * np.pi * 6 * t[i0:i1]))
        x[i0:i1] += carrier[i0:i1] * env * 0.3
    return x


class AudioMix(unittest.TestCase):
    SR = 48000

    def mix(self, src, duration, *extra):
        d = tempfile.mkdtemp()
        s, o, r = os.path.join(d, 's.wav'), os.path.join(d, 'o.wav'), os.path.join(d, 'r.json')
        write_wav(s, src, self.SR)
        run('audio_mix.py', '--src', s, '--out', o, '--report', r, '--duration', duration, *extra)
        return read_wav(o)[1], jload(r), d

    def test_offset_zero_is_sample_exact(self):
        rng = np.random.default_rng(1)
        src = rng.uniform(-0.5, 0.5, self.SR * 3)
        out, rep, _ = self.mix(src, 2.0)
        self.assertEqual(len(out), 2 * self.SR)
        # 没有 fadeOut：片尾硬切要给出警告
        self.assertIn('warning', rep)
        ref = np.round(src[:2 * self.SR] * 32768) / 32768
        self.assertTrue(np.array_equal(out[:, 0], ref), '画面第 i 个采样必须就是音源第 i 个采样')

    def test_positive_and_negative_offset(self):
        rng = np.random.default_rng(2)
        src = rng.uniform(-0.5, 0.5, self.SR * 2)
        q = np.round(src * 32768) / 32768
        out, _, _ = self.mix(src, 3.0, '--offset', 0.5)   # 音源晚 0.5 秒进
        k = self.SR // 2
        self.assertTrue(np.all(out[:k] == 0))
        self.assertTrue(np.array_equal(out[k:k + len(q), 0], q))
        out, _, _ = self.mix(src, 1.0, '--offset', -0.25)  # 丢掉音源开头 0.25 秒
        self.assertTrue(np.array_equal(out[:, 0], q[self.SR // 4:self.SR // 4 + self.SR]))

    def test_fade_out_only_when_cut_mid_source(self):
        src = np.full(self.SR * 4, 0.5)
        out, rep, _ = self.mix(src, 2.0, '--fade-out', 1.0)
        self.assertEqual(rep['fade_out_seconds'], 1.0)
        self.assertAlmostEqual(out[self.SR - 1, 0], 0.5, places=3)          # 淡出开始前
        self.assertAlmostEqual(out[int(1.5 * self.SR), 0], 0.25, places=3)  # 线性：过半时一半音量
        self.assertLess(abs(out[-1, 0]), 1e-3)
        # 音源自己先结束：不淡出
        out, rep, _ = self.mix(np.full(self.SR, 0.5), 2.0, '--fade-out', 1.0)
        self.assertEqual(rep['fade_out_seconds'], 0)
        self.assertAlmostEqual(out[self.SR - 100, 0], 0.5, places=3)
        self.assertTrue(np.all(out[self.SR:] == 0))

    def test_full_scale_samples_already_in_the_source_are_not_mix_clipping(self):
        # 流行歌的母带常有顶到满刻度的采样。原样搬过来不是混音的错：只记数，不算削波
        rng = np.random.default_rng(3)
        src = rng.uniform(-0.5, 0.5, self.SR * 3)
        hot = [1000, 1001, 5000, 40000, 2 * self.SR - 10]   # 最后一个落在淡出段里，会被淡出压下去
        src[hot] = 1.0
        out, rep, _ = self.mix(src, 2.0, '--fade-out', 0.5)
        self.assertEqual(rep['clipped_by_mix'], 0)
        self.assertEqual(rep['full_scale_samples_from_source'], 4 * 2, '四个位置 × 左右声道')
        self.assertEqual(rep['clipped_samples'], 4 * 2)
        self.assertLess(abs(out[2 * self.SR - 10, 0]), 0.05, '淡出段里的那一个已经不在满刻度')

    def test_chip_bgm_ducks_under_voice_and_stem_subtracts_back(self):
        spans = [(0.5, 2.5), (3.5, 5.5)]
        src = speech_like(spans, 6.5, self.SR)
        d0 = tempfile.mkdtemp()
        stem = os.path.join(d0, 'stem.wav')
        out, rep, _ = self.mix(src, 6.5, '--bgm-chip', 128, '--stem', stem)
        b = rep['bgm']
        self.assertGreater(b['bgm_below_voice_db'], 12, '说话时伴奏至少比人声低 12 dB')
        self.assertGreater(b['bgm_rms_db_in_gaps'], b['bgm_rms_db_during_speech'], '气口里伴奏要回升')
        self.assertEqual(rep['clipped_samples'], 0)
        st = read_wav(stem)[1]
        dry = np.round(src * 32768) / 32768
        # 成片 − 伴奏 stem = 干声（各自量化到 16bit，允许 ±1 个量化台阶）
        self.assertLess(np.max(np.abs(out[:, 0] - st[:, 0] - dry[:len(out)])), 2.5 / 32768)


class Strip(unittest.TestCase):
    def test_strip_pages_and_missing_frame(self):
        from PIL import Image
        d = tempfile.mkdtemp()
        fr = os.path.join(d, 'frames'); os.makedirs(fr)
        for f in range(0, 10):
            Image.new('RGB', (64, 36), (f * 20, 80, 120)).save(os.path.join(fr, f'f{f:05d}.png'))
        info = os.path.join(d, 'info.json')
        json.dump({'fps': 2, 'frames': 10, 'width': 64, 'height': 36, 'shots': [{'id': 'A', 'a': 0}, {'id': 'B', 'a': 2.5}]}, open(info, 'w'))
        font = os.path.join(HERE, '..', 'engine', 'assets', 'fonts', 'ZCOOLKuaiLe-Regular.ttf')
        out = os.path.join(d, 'strip')
        txt = run('qa.py', 'strip', fr, out, '--info', info, '--font', font, '--step', 2, '--cols', 2, '--rows', 2, '--cell', 64).stdout
        self.assertIn('5 格 / 2 张', txt)                        # 第 0、2、4、6、8 帧 → 每页 4 格 → 两页
        a, b = Image.open(out + '_01.jpg'), Image.open(out + '_02.jpg')
        self.assertEqual(a.size, (128, 2 * (36 + 20)))
        self.assertEqual(b.size, (128, 1 * (36 + 20)))
        os.remove(os.path.join(fr, 'f00004.png'))
        r = run('qa.py', 'strip', fr, out, '--info', info, '--font', font, '--step', 2, ok=False)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn('缺帧 4', r.stderr + r.stdout)


class AlignVoice(unittest.TestCase):
    SR = 16000
    LINES = ['今天的饭碗特别大。', '本鲸决定先数一数筷子。', '一双，两双，数到第七双就乱了。', '算了，先吃饭。']

    def align(self, spans, lines=None, extra=(), ok=True, dur=None):
        d = tempfile.mkdtemp()
        wav, lj, out = os.path.join(d, 'v.wav'), os.path.join(d, 'l.json'), os.path.join(d, 'cues.json')
        write_wav(wav, speech_like(spans, dur or spans[-1][1] + 0.5, self.SR), self.SR)
        wtext(lj, json.dumps([{'text': t, 'who': 'whale'} for t in (lines or self.LINES)], ensure_ascii=False))
        r = run('align_voice.py', '--wav', wav, '--lines', lj, '--out', out, '--audio-name', 'v.wav', '--audio-sha256', 'x' * 64, *extra, ok=ok)
        return (jload(out) if os.path.exists(out) else None), r

    def test_one_segment_per_line_is_unique(self):
        truth = [(0.40, 2.90), (3.40, 6.50), (7.10, 11.30), (11.90, 13.60)]
        cues, _ = self.align(truth)
        self.assertTrue(cues['measured'])
        self.assertEqual(cues['summary']['mapping'], 'unique')
        self.assertEqual(cues['summary']['warnings'], [])
        for line, (a, b) in zip(cues['lines'], truth):
            self.assertLess(abs(line['start'] - a), 0.03)
            self.assertLess(abs(line['end'] - b), 0.03)
            self.assertEqual(line['who'], 'whale')

    def test_extra_pauses_inside_lines_are_resolved_by_proportion(self):
        # 第 3 句中间有两个逗号停顿（各 0.25 秒），句间停顿 0.5 秒
        segs = [(0.40, 2.90), (3.40, 6.50), (7.00, 8.00), (8.25, 9.25), (9.50, 11.60), (12.10, 13.80)]
        cues, _ = self.align(segs)
        self.assertEqual(cues['summary']['mapping'], 'by-proportion')
        self.assertEqual(len(cues['summary']['warnings']), 1, '按比例挑的句界必须带一条「请听一遍核对」的提醒')
        want = [(0.40, 2.90), (3.40, 6.50), (7.00, 11.60), (12.10, 13.80)]
        for line, (a, b) in zip(cues['lines'], want):
            self.assertLess(abs(line['start'] - a), 0.03)
            self.assertLess(abs(line['end'] - b), 0.03)

    def test_refuses_when_pauses_are_not_enough(self):
        cues, r = self.align([(0.4, 6.0), (6.6, 12.0)], ok=False)
        self.assertNotEqual(r.returncode, 0)
        self.assertIsNone(cues, '对不上就不写 cues.json')
        self.assertIn('停顿不够分句', r.stderr + r.stdout)

    def test_refuses_implausible_speaking_rate(self):
        # 四句字数相近，但第 2 段声音只有 0.3 秒：按停顿切出来语速离谱 → 拒绝
        lines = ['今天的饭碗特别大。', '本鲸决定数一数筷子。', '数到第七双就乱掉了。', '算了还是先吃饭吧。']
        cues, r = self.align([(0.4, 3.0), (3.5, 3.8), (4.3, 6.9), (7.4, 10.0)], lines=lines, ok=False)
        self.assertNotEqual(r.returncode, 0)
        self.assertIsNone(cues)
        self.assertIn('语速对不上', r.stderr + r.stdout)

    def test_asr_words_path(self):
        truth = [(0.40, 2.90), (3.40, 6.50), (7.10, 11.30), (11.90, 13.60)]
        d = tempfile.mkdtemp()
        words = []
        for text, (a, b) in zip(self.LINES, truth):
            chars = [c for c in text if c not in '，。']
            step = (b - a) / len(chars)
            # ASR 的边界故意给得粗一点（各偏 80 毫秒），并听错一个字：对齐后要被 RMS 修回真实边界
            for i, c in enumerate(chars):
                words.append({'word': '万' if c == '碗' else c, 'start': a + i * step + (0.08 if i == 0 else 0), 'end': a + (i + 1) * step - (0.08 if i == len(chars) - 1 else 0)})
        wj = os.path.join(d, 'words.json')
        wtext(wj, json.dumps({'result': words}, ensure_ascii=False))
        cues, _ = self.align(truth, extra=('--words', wj))
        self.assertEqual(cues['summary']['mapping'], 'asr-words')
        self.assertGreater(cues['summary']['matched_char_ratio'], 0.9)
        for line, (a, b) in zip(cues['lines'], truth):
            self.assertLess(abs(line['start'] - a), 0.04)
            self.assertLess(abs(line['end'] - b), 0.04)


class AlignBeats(unittest.TestCase):
    def test_click_track_tempo_and_snap(self):
        sr, bpm, dur = 22050, 120.0, 40.0
        period = 60 / bpm
        n = int(sr * dur)
        t = np.arange(n) / sr
        x = np.zeros(n)
        for k in range(int(dur / period)):
            i0 = int((0.25 + k * period) * sr)
            m = min(n - i0, int(0.05 * sr))
            x[i0:i0 + m] += np.sin(2 * np.pi * (90 if k % 4 == 0 else 180) * t[:m]) * np.exp(-t[:m] * 60) * (0.9 if k % 4 == 0 else 0.5)
        d = tempfile.mkdtemp()
        wav, srt, out = os.path.join(d, 'c.wav'), os.path.join(d, 'l.srt'), os.path.join(d, 'cues.json')
        write_wav(wav, x, sr)
        # 四句歌词，起点故意各偏离拍点 ±0.1 秒左右
        starts = [10.25 + 0.09, 14.25 - 0.11, 18.25 + 0.06, 22.25 - 0.08]
        f = lambda s: f'{int(s // 3600):02d}:{int(s % 3600 // 60):02d}:{int(s % 60):02d},{int(round((s % 1) * 1000)):03d}'
        wtext(srt, '\n'.join(f'{i + 1}\n{f(s)} --> {f(s + 3)}\n第{i + 1}句\n' for i, s in enumerate(starts)))
        run('align_beats.py', '--wav', wav, '--srt', srt, '--out', out)
        cues = jload(out)
        self.assertTrue(cues['measured'])
        self.assertLess(abs(cues['beat']['period'] - period) / period, 0.005, f"拍长测成了 {cues['beat']['period']}")
        for line, s in zip(cues['lines'], starts):
            # 吸附后：离任意一个真实拍点（0.25 + k × 0.5）不超过 30 毫秒，且移动不超过半拍
            phase = (line['start'] - 0.25) / period
            self.assertLess(abs(phase - round(phase)) * period, 0.03, f"{line['text']} 吸到了 {line['start']}")
            self.assertLessEqual(abs(line['start'] - s), period / 2 + 1e-6)


class PlanFormula(unittest.TestCase):
    def test_reproduces_archived_day14_planning_line_by_line(self):
        """规划轴的估法沿用旧项目：拿存档里的 Day14 台词重估一遍，应当与存档里的 planning.json 逐句一致"""
        old_dir = os.path.join(REPO, '存档', '重构前', 'Day', 'Day14')
        old = jload(os.path.join(old_dir, 'planning.json'))
        d = tempfile.mkdtemp()
        proj = os.path.join(d, 'p')
        os.makedirs(proj)
        wtext(os.path.join(proj, 'film.json'), json.dumps({'id': 'plan-test', 'kind': 'day', 'title': 't', 'script': '台词.txt', 'speaker': 'whale'}))
        wtext(os.path.join(proj, 'project.tsx'), '// 测试占位\n')
        wtext(os.path.join(proj, '台词.txt'), rtext(os.path.join(old_dir, 'Day14配音台词.txt')))
        r = subprocess.run(['node', os.path.join(CLI, 'film.mjs'), 'plan', proj, '--work', os.path.join(d, 'w')], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        new = jload(os.path.join(proj, 'cues.json'))
        self.assertFalse(new['measured'])
        self.assertEqual(len(new['lines']), len(old['cues']))
        self.assertAlmostEqual(new['lines'][-1]['end'], old['duration_seconds'], delta=0.0005)
        for a, b in zip(new['lines'], old['cues']):
            self.assertEqual(a['text'], b['text'])
            self.assertAlmostEqual(a['start'], b['start'], delta=0.0005)
            self.assertAlmostEqual(a['end'], b['end'], delta=0.0005)
            self.assertEqual(a['who'], 'whale')


if __name__ == '__main__':
    unittest.main()
