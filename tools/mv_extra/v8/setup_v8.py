"""Restore shared Day12 sources and verify v8 per-character atlases."""
import argparse, hashlib, json, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
parser=argparse.ArgumentParser()
parser.add_argument('--verify-only',action='store_true')
args=parser.parse_args()
cmd=[sys.executable,str(ROOT/'tools/mv_extra/v7/setup_v7.py')]
if args.verify_only: cmd.append('--verify-only')
subprocess.run(cmd,check=True)
assets=ROOT/'assets/ai-girls/lyric-v8'
for name,digest in json.loads((assets/'sha256.json').read_text()).items():
    path=assets/name
    if not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest()!=digest:
        raise ValueError(f'Missing or mismatched: {path}')
print('Verified v8 fixed-cell atlases for all seven characters.')
