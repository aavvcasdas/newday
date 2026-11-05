"""开场视觉门禁回归：静态暗房必须被拦，动态明亮开场必须放行。"""
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/验收'))
try:
    import numpy as np  # noqa: F401
    from media_common import binary
    FF = binary('ffmpeg')
    binary('ffprobe')
    READY = True
except Exception:
    READY = False

SCRIPT = ROOT / 'tools/验收/check_opener_visual.py'


def run_gate(video, *extra):
    return subprocess.run([sys.executable, str(SCRIPT), '--video', str(video), *extra],
                          capture_output=True, text=True)


@unittest.skipUnless(READY, '安装 numpy/ffmpeg/ffprobe 后运行开场视觉集成测试')
class OpenerVisualTests(unittest.TestCase):
    def make(self, folder, name, video_src, audio_src):
        out = Path(folder) / name
        subprocess.run([FF, '-v', 'error', '-y', '-f', 'lavfi', '-i', video_src,
                        '-f', 'lavfi', '-i', audio_src, '-c:v', 'libx264',
                        '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ac', '2', '-t', '3', str(out)], check=True)
        return out

    def test_static_dark_silence_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            v = self.make(tmp, 'bad.mp4', 'color=c=0x141B2D:s=1920x1080:r=30:d=3',
                          'anullsrc=r=44100:cl=stereo')
            r = run_gate(v, '--check-bgm')
            self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
            self.assertIn('"passed": false', r.stdout)

    def test_moving_bright_loud_accepted(self):
        with tempfile.TemporaryDirectory() as tmp:
            v = self.make(tmp, 'good.mp4', 'testsrc2=s=1920x1080:r=30:d=3',
                          'sine=frequency=440:sample_rate=44100')
            r = run_gate(v, '--check-bgm')
            self.assertEqual(r.returncode, 0, r.stdout + r.stderr)


if __name__ == '__main__':
    unittest.main()
