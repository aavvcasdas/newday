"""Fresh re-verification of existing media, not a claim of a newly rendered film."""
import argparse
import hashlib
import json
import os
import subprocess
from pathlib import Path
import imageio_ffmpeg
from model import ROOT, SAMPLE, SOURCE, V2, data, digest

HERE = Path(__file__).resolve().parent

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ffprobe', default=os.environ.get('FFPROBE'))
    args = parser.parse_args()
    if not args.ffprobe:
        raise SystemExit('Set FFPROBE or pass --ffprobe; see README.md')
    model = data()  # Includes exact sample hash and latest lyric hash checks.
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    results = []
    for file in (SAMPLE, SOURCE):
        if not file.is_file():
            raise SystemExit(f'Missing required verification input: {file}')
        probe = json.loads(subprocess.check_output([
            args.ffprobe, '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(file)]))
        decoded = subprocess.run([ffmpeg, '-v', 'error', '-i', str(file), '-f', 'null', '-'], capture_output=True)
        if decoded.returncode or decoded.stderr.strip():
            raise SystemExit(f'Full decode failed: {decoded.stderr.decode()}')
        video = next(x for x in probe['streams'] if x['codec_type'] == 'video')
        audio = next(x for x in probe['streams'] if x['codec_type'] == 'audio')
        if file == SAMPLE:
            assert (video['width'], video['height']) == (1920, 1080)
            assert video['r_frame_rate'] == '30/1'
            assert int(video['nb_frames']) == 594
            assert abs(float(video['duration']) - 19.8) < 0.001
            assert abs(float(audio['duration']) - 19.8) < 0.05
        results.append({'path': str(file.relative_to(ROOT)), 'sha256': digest(file),
                        'bytes': file.stat().st_size, 'fullDecodeClean': True,
                        'video': {k: video.get(k) for k in ['codec_name', 'width', 'height', 'r_frame_rate', 'duration', 'nb_frames']},
                        'audio': {k: audio.get(k) for k in ['codec_name', 'sample_rate', 'channels', 'duration']}})
    raw = SOURCE.read_bytes()
    blob = hashlib.sha1(f'blob {len(raw)}\0'.encode() + raw).hexdigest()
    expected = json.loads((ROOT / 'tools/mv_extra/asset_manifest.json').read_text())
    assert blob == expected['sourceVideoGitBlobSha1']
    source_hashes = {str(p.relative_to(ROOT)): digest(p) for p in HERE.iterdir()
                     if p.suffix in ('.py', '.js', '.mjs', '.html', '.css', '.woff2')}
    report = {'kind': 'fresh verification of existing v2 media and new review entry, no new render',
              'sampleHashMatchesCurrentV2': True, 'sourceVideoGitBlobSha1': blob,
              'media': results, 'reviewSourceHashes': source_hashes,
              'latestLockedLyricSha256': digest(V2 / 'lyrics.txt'),
              'implementedLines': [c['line'] for c in model['cues'] if c['implemented']],
              'timingBasis': model['timingNote'], 'humanContinuousReview': False,
              'humanListeningApproved': False, 'userDirectionApproved': False,
              'newFullMovieRendered': False, 'priorReportsRewritten': False}
    (HERE / 'media_check.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print('Verified existing v2: 594 frames / 19.8s / 1080p30, original source identity, both full decodes clean.')

if __name__ == '__main__':
    main()
