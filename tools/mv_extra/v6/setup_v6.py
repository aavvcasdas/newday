"""Restore shared assets and verify the v6 waving-pose cutouts."""
import argparse
import hashlib
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
EXPECTED = {
    'doubao': '353b487134137c44e5b8d7174615befb79dc5c42d3ab1da298e2252ec08f37dd',
    'gemini': '11c4354c4d5580e701802cc9718c34ea69b55d397e83b27782fae17d22429e56',
    'gpt': '7eaab192d43521dd151732e6b464a693ed02ce0b6f921f6d3664b194c9096192',
    'kimi': 'efa64f4b4d22bb5db43d3da65d484eaf2e18da25549b35ebf7b8dcebe92a1f60',
    'qwen': '804808a774f20b86f8996787a5672f54610f14573cbd9681d8cd96e8c564d594',
}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--verify-only', action='store_true')
    args = parser.parse_args()
    cmd = [sys.executable, str(ROOT / 'tools/mv_extra/v5/setup_v5.py')]
    if args.verify_only:
        cmd.append('--verify-only')
    subprocess.run(cmd, check=True)
    for name, digest in EXPECTED.items():
        asset = ROOT / 'assets/ai-girls/chibi-v6' / f'{name}_wave.png'
        if not asset.exists() or hashlib.sha256(asset.read_bytes()).hexdigest() != digest:
            raise ValueError(f'Missing or mismatched: {asset}')
    print('Verified v6 waving poses.')

if __name__ == '__main__':
    main()
