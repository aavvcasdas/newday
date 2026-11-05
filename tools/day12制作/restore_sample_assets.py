"""Restore only pinned original assets via gh; verify Git blob and SHA256, never generate substitutes."""
import argparse
import base64
import concurrent.futures
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = Path(__file__).with_name('sample_assets.json')


def restore(item):
    target = ROOT / item['path']
    if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest() == item['sha256']:
        return item['path'] + ' verified'
    manifest = json.loads(MANIFEST.read_text())
    raw = subprocess.check_output(['gh', 'api', f"repos/{manifest['repository']}/git/blobs/{item['gitBlobSha1']}"])
    blob = base64.b64decode(json.loads(raw)['content'])
    assert hashlib.sha1(f'blob {len(blob)}\0'.encode() + blob).hexdigest() == item['gitBlobSha1']
    assert hashlib.sha256(blob).hexdigest() == item['sha256']
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(blob)
    return item['path'] + ' restored and verified'


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--manifest', type=Path, default=MANIFEST)
    MANIFEST = ap.parse_args().manifest.resolve()
    manifest = json.loads(MANIFEST.read_text())
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for result in pool.map(restore, manifest['assets']):
            print(result)
