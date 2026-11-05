#!/usr/bin/env python3
"""兼容旧入口；通用实现已移至tools/验收/check_subtitle_sync.py。"""
import runpy
from pathlib import Path
import sys
folder=Path(__file__).resolve().parents[1]/'验收'
sys.path.insert(0,str(folder))
if __name__=='__main__':
    runpy.run_path(str(folder/'check_subtitle_sync.py'),run_name='__main__')
