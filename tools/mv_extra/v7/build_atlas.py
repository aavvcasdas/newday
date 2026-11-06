"""Build original fixed-cell animation atlases from our generated pose edits.

Every source for a character shares a canvas; scale/registration is identical
across every state.  There is no per-frame crop or automatic recentring.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import json

ROOT = Path(__file__).resolve().parents[3]
ASSET = ROOT / 'assets/ai-girls/pet-v7'
W, H, COLS = 384, 416, 8
DUR = {
    'idle': [280, 110, 110, 140, 140, 320],
    'thinking': [260, 150, 120, 120, 150, 260],
    'eating': [220, 160, 170, 220, 180, 180],
    'empty': [300, 180, 180, 180, 180, 300],
}
SETS = {
    'dragon': {
        'idle': ['dragon_think', 'dragon_think', 'dragon_blink', 'dragon_blink', 'dragon_think', 'dragon_think'],
        'thinking': ['dragon_think', 'dragon_think', 'dragon_blink', 'dragon_think', 'dragon_think', 'dragon_think'],
    },
    'whale': {
        'idle': ['whale_rice', 'whale_rice', 'whale_blink', 'whale_blink', 'whale_rice', 'whale_rice'],
        'eating': ['whale_rice', 'whale_scoop', 'whale_scoop', 'whale_eat', 'whale_eat', 'whale_scoop'],
        'empty': ['whale_empty'] * 6,
    },
}


def cell(im, kind, alternate_tail):
    # Generated tail edit is registered to the same source canvas. Replace
    # only its tail-side region, leaving eyes, hands and props untouched.
    if alternate_tail:
        tail = Image.open(ASSET/'source'/f'{kind}_tail_left.png').convert('RGBA')
        if kind == 'whale':
            box = (round(im.width*0.79), round(im.height*0.62), im.width, im.height)
        else:
            box = (0, round(im.height*0.71), round(im.width*0.25), im.height)
        im = im.copy()
        im.paste(tail.crop(box), box)
    # Fixed source dimensions per character, one fixed scale and position.
    k = min((W-14)/im.width, (H-12)/im.height)
    result = im.resize((round(im.width*k), round(im.height*k)), Image.Resampling.LANCZOS)
    out = Image.new('RGBA', (W,H))
    out.alpha_composite(result, ((W-result.width)//2, H-5-result.height))
    return out


def main():
    for kind, states in SETS.items():
        atlas = Image.new('RGBA', (COLS*W, len(states)*H))
        manifest = {'version': 1, 'cell_width': W, 'cell_height': H, 'columns': COLS, 'rows': len(states), 'states': {}}
        for row, (state, sources) in enumerate(states.items()):
            manifest['states'][state] = {'row': row, 'frames': len(sources), 'durations_ms': DUR[state]}
            for index, source in enumerate(sources):
                im = Image.open(ASSET/'source'/f'{source}.png').convert('RGBA')
                atlas.alpha_composite(cell(im,kind,index in (2, 3, 4)), (index*W,row*H))
        atlas.save(ASSET/f'{kind}.png', optimize=True)
        (ASSET/f'{kind}.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
        print(kind, atlas.size)

if __name__ == '__main__':
    main()
