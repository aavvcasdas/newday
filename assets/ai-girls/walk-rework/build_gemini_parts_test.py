#!/usr/bin/env python3
"""Rough, standalone cutout/rig experiment; not a production atlas.
Requires Pillow. Does not modify or register engine assets.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent


def cut_green(im):
    im = im.convert('RGBA')
    pixels = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = pixels[x, y]
            if g > 170 and g > r * 1.10 and g > b * 1.15:
                pixels[x, y] = (r, g, b, 0)
    return im


def build():
    body = cut_green(Image.open(ROOT / 'gemini_parts_body_retry.png'))
    leg = cut_green(Image.open(ROOT / 'gemini_parts_leg_trial.png'))
    leg = leg.crop(leg.getbbox())
    height = 270
    leg = leg.resize((round(leg.width * height / leg.height), height), Image.Resampling.LANCZOS)
    # Two instances of the same artwork rotated around an approximate hip; no knee rig.
    # These are deliberately fixed, reproducible test settings, not production calibration.
    angles = [(17, -17), (8, -10), (-2, 0), (-12, 14),
              (-17, 17), (-10, 8), (0, -2), (14, -12)]
    frames = []
    for near, far in angles:
        canvas = Image.new('RGBA', body.size, (201, 248, 161, 255))
        for angle, x, lift in [(far, 594, 0), (near, 608, 0)]:
            # Pillow positive rotation is counter-clockwise: downward limbs move forward.
            piece = Image.new('RGBA', (600, 600), (0, 0, 0, 0))
            piece.alpha_composite(leg, (300 - leg.width // 2, 300))
            piece = piece.rotate(angle, resample=Image.Resampling.BICUBIC)
            canvas.alpha_composite(piece, (x - 300, 710 + lift - 300))
        canvas.alpha_composite(body)
        frames.append(canvas.convert('RGB').resize((421, 400), Image.Resampling.LANCZOS))
    frames[0].save(ROOT / 'gemini_parts_walk_test.gif', save_all=True,
                   append_images=frames[1:], duration=[120] * 7 + [220], loop=0)
    print('8 frames, 421x400; two independent rigid legs; experimental only')


if __name__ == '__main__':
    build()
