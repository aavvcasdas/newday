"""兼容Day9全片命令；共用通用终验，不再复制帧数/FFmpeg路径。"""
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools/验收'))
from verify_episode import verify
import json
if __name__=='__main__':
    try:
        result=verify(ROOT/'Day9/成片/Day9_全片分镜试做版.mp4',ROOT/'Day9/配音/鲸鱼看视频_克隆配音_最终版.wav',ROOT/'tools/day9制作/voice_alignment.json',ROOT/'tools/day9制作/subtitle_timing.json',ROOT/'Day9/Day9配音台词.txt')
        (ROOT/'tools/day9制作/全片分镜试做_媒体核验.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
        print(json.dumps({k:v for k,v in result.items() if k!='subtitles'},ensure_ascii=False,indent=2))
        sys.exit(0 if result['passed'] else 1)
    except Exception as e:
        sys.exit(f'终验失败：{e}')
