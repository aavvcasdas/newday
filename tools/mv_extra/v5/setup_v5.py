"""Restore shared pinned Day12 assets and verify v5's generated character cutouts."""
import argparse
import hashlib
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
EXPECTED = {
    'doubao': '5e511928bfa5201cc0f5673400ec51e5abf1a4097e6ae9bb87d7fa32fd4a7c44',
    'gemini': '5832e12d16b6893068035d3792fb24947d5a2e538b8be1de305702c52627d3ca',
    'gpt': '8154fd3779077e906c8768528a803fe8d0c43598ac090f339637c68642db6a96',
    'kimi': '7a28723a5f4143ce8b603c8d5c9838fb369dced1f53cf7dd067203123f4faa54',
    'qwen': '380a14a02f6a728888ddde503894dd9cee3145e476a6e0898631b8ed20c3f0f4',
}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--verify-only', action='store_true')
    args = parser.parse_args()
    cmd = [sys.executable, str(ROOT / 'tools/mv_extra/v4/setup_v4.py')]
    if args.verify_only:
        cmd.append('--verify-only')
    subprocess.run(cmd, check=True)
    for name, digest in EXPECTED.items():
        asset = ROOT / 'assets/ai-girls/chibi-v5' / f'{name}.png'
        if not asset.exists() or hashlib.sha256(asset.read_bytes()).hexdigest() != digest:
            raise ValueError(f'Character asset missing or mismatched: {asset}')
    print('Verified v5 Q-version character cutouts.')

if __name__ == '__main__':
    main()
