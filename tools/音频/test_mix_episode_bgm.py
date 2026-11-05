"""通用混音器回归：合成干声基片 -> BGM+SFX 成片，减法恢复人声须 >0.999。

依赖 numpy/ffmpeg；缺失时明确 skip，不冒充已验。
"""
import hashlib
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/验收'))
try:
    import numpy as np
    from media_common import binary
    FF = binary('ffmpeg')
    binary('ffprobe')
    READY = True
except Exception:
    READY = False

spec = importlib.util.spec_from_file_location('mix_episode_bgm', ROOT / 'tools/音频/mix_episode_bgm.py')
mix_mod = importlib.util.module_from_spec(spec)
if READY:
    spec.loader.exec_module(mix_mod)


@unittest.skipUnless(READY, '安装 numpy/ffmpeg/ffprobe 后运行混音集成测试')
class MixTests(unittest.TestCase):
    def test_auto_sfx_finds_breath_gap_and_fast_onset(self):
        alignment = {'cues': [{'chars_timed': [
            {'ch': '诶', 'start': 0.0, 'end': 0.39}, {'ch': '本', 'start': 0.72, 'end': 0.9}]}]}
        events = mix_mod.auto_sfx_events(alignment)
        kinds = [e['kind'] for e in events]
        self.assertIn('alert_pop', kinds)
        self.assertIn('whoosh', kinds)
        bgm = mix_mod.generate_bgm(2.0)
        head = float(np.sqrt(np.mean(bgm[:int(0.25 * 48000)].astype(np.float64) ** 2)))
        self.assertGreater(head, 1e-3, '前 250ms 伴奏不得静默（0.06s 快起）')

    def test_full_mix_recovers_voice(self):
        with tempfile.TemporaryDirectory() as tmp:
            d = Path(tmp)
            sr = 16000
            t = np.arange(sr * 2) / sr
            x = (np.sin(2 * np.pi * 440 * t) * 0.4 * 32767).astype('<i2')
            voice = d / 'voice.wav'
            with wave.open(str(voice), 'wb') as w:
                w.setparams((1, 2, sr, 0, 'NONE', 'not compressed'))
                w.writeframes(x.tobytes())
            dry_mp4 = d / 'dry.mp4'
            subprocess.run([FF, '-v', 'error', '-y', '-f', 'lavfi', '-i',
                            'color=c=0x223355:s=320x180:r=30:d=2', '-i', str(voice),
                            '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
                            '-ac', '2', '-t', '2', str(dry_mp4)], check=True)
            alignment = {'measured': True, 'source_sha256': hashlib.sha256(voice.read_bytes()).hexdigest(),
                         'source_duration_seconds': 2.0,
                         'cues': [{'id': 'L01', 'start': 0.0, 'end': 1.8,
                                   'chars_timed': [{'ch': '诶', 'start': 0.0, 'end': 0.39},
                                                   {'ch': '本', 'start': 0.72, 'end': 0.9}]}]}
            align_p = d / 'alignment.json'
            align_p.write_text(json.dumps(alignment))
            out, stem, report = d / 'bgm.mp4', d / 'stem.flac', d / 'report.json'
            r = subprocess.run([sys.executable, ROOT / 'tools/音频/mix_episode_bgm.py',
                                '--base', str(dry_mp4), '--voice', str(voice),
                                '--alignment', str(align_p), '--output', str(out),
                                '--stem', str(stem), '--report', str(report)],
                               capture_output=True, text=True)
            self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
            rep = json.loads(report.read_text())
            self.assertGreater(rep['known_stem_subtraction_voice_correlation'], 0.999)
            self.assertGreater(rep['mixture_reconstruction_zero_offset_correlation'], 0.999)
            self.assertTrue(rep['video_stream_unchanged'])
            self.assertTrue(stem.is_file())


if __name__ == '__main__':
    unittest.main()
