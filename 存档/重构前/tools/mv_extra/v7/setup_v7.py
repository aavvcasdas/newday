"""Restore shared Day12 assets and verify the v7 sprite atlases."""
import argparse
import hashlib
import subprocess
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[3]
EXPECTED = {
    'dragon.png': 'caa3b035447437eab4523dcab1a2a86a23fe497cc988bd9c55251a8665064cd2',
    'dragon.json': 'a26c72ce7e7398c3dc045a5c2fff6c63bb03b98844e5d7c329b64700aee4a607',
    'whale.png': '8ade73fd5a54ba216084d1c7a59d0bf994c94afecfcdaff6cda9c1cb81ad2bc4',
    'whale.json': 'c7d07d72832a470ead1bc5863255c643b74fe9fc609ef0b0dbecdd34b880a7a9',
}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--verify-only', action='store_true')
    args = parser.parse_args()
    cmd = [sys.executable, str(ROOT / 'tools/mv_extra/v6/setup_v6.py')]
    if args.verify_only:
        cmd.append('--verify-only')
    subprocess.run(cmd, check=True)
    for name, digest in EXPECTED.items():
        asset = ROOT / 'assets/ai-girls/pet-v7' / name
        if not asset.exists() or hashlib.sha256(asset.read_bytes()).hexdigest() != digest:
            raise ValueError(f'Missing or mismatched: {asset}')
    print('Verified v7 pet atlases and state metadata.')

if __name__ == '__main__':
    main()
