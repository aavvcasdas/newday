"""Validate the rendered v5 container, frame count and copied AAC bitstream."""
import hashlib
import re
import subprocess
from pathlib import Path
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[3]
MASTER = ROOT / '番外MV/把回忆拼好给你/成片/把回忆拼好给你_v5完整复刻版.mp4'
AUDIO = ROOT / 'assets/mv-extra/user_reference_audio.m4a'
FF = imageio_ffmpeg.get_ffmpeg_exe()

def audio_hash(path):
    proc = subprocess.Popen([FF, '-v', 'error', '-i', str(path), '-map', '0:a:0', '-c:a', 'copy', '-f', 'adts', '-'], stdout=subprocess.PIPE)
    digest = hashlib.sha256()
    for block in iter(lambda: proc.stdout.read(1024 * 1024), b''):
        digest.update(block)
    if proc.wait() != 0:
        raise RuntimeError(f'Unable to extract AAC: {path}')
    return digest.hexdigest()

def main():
    probe = subprocess.run([FF, '-hide_banner', '-i', str(MASTER), '-map', '0:v:0', '-f', 'null', '-'], capture_output=True, text=True, check=True)
    info = probe.stderr
    if not re.search(r'1920x1080.*30 fps', info):
        raise AssertionError('Expected 1920x1080 at 30 fps')
    frames = re.findall(r'frame=\s*(\d+)', info)
    if not frames or int(frames[-1]) != 1681:
        raise AssertionError(f'Unexpected decoded frame count: {frames[-1:] }')
    original, result = audio_hash(AUDIO), audio_hash(MASTER)
    if original != result:
        raise AssertionError('AAC bitstream differs from source')
    print(f'OK: 1920x1080, 30fps, 1681 decoded frames; original AAC SHA256 {result}')

if __name__ == '__main__':
    main()
