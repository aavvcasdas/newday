#!/usr/bin/env python3
"""Experimental two-joint Gemini walk preview. Requires Pillow; not an engine atlas."""
import math
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw
from build_gemini_parts_test import cut_green

ROOT = Path(__file__).resolve().parent
SIZE = 700
PIVOT = (350, 300)
KNEE = 125
LENGTH = 270
HIP = (600, 690)
# Each tuple: near thigh, near knee, far thigh, far knee, support leg.
# Positive angles rotate a downward leg toward screen right.  Knee bends back.
POSES = [(16, 0, -16, 15, 'near'), (7, 2, -9, 30, 'near'),
         (-3, 2, 1, 36, 'near'), (-13, 4, 12, 18, 'near'),
         (-16, 15, 16, 0, 'far'), (-9, 30, 7, 2, 'far'),
         (1, 36, -3, 2, 'far'), (12, 18, -13, 4, 'far')]


def sole_y(thigh, knee):
    """Approximate ankle vertical position; shoe orientation is not corrected."""
    return KNEE * math.cos(math.radians(thigh)) + (LENGTH - KNEE) * math.cos(math.radians(thigh - knee))


def split_leg(leg):
    # Soft transition at knee to reduce the seam between independently rotated regions.
    source = Image.new('RGBA', (SIZE, SIZE))
    source.alpha_composite(leg, (PIVOT[0] - leg.width // 2, PIVOT[1]))
    mask = Image.new('L', (SIZE, SIZE))
    px = mask.load()
    for y in range(SIZE):
        weight = max(0, min(255, round(255 * (y - (PIVOT[1] + KNEE - 12)) / 24)))
        for x in range(SIZE):
            px[x, y] = weight
    lower = source.copy()
    lower.putalpha(ImageChops.multiply(source.getchannel('A'), mask))
    upper = source.copy()
    upper.putalpha(ImageChops.multiply(source.getchannel('A'), ImageChops.invert(mask)))
    return upper, lower


def pose_leg(parts, thigh, knee):
    upper, lower = parts
    lower = lower.rotate(-knee, resample=Image.Resampling.BICUBIC,
                         center=(PIVOT[0], PIVOT[1] + KNEE))
    merged = Image.alpha_composite(lower, upper)
    return merged.rotate(thigh, resample=Image.Resampling.BICUBIC, center=PIVOT)


def build():
    body = cut_green(Image.open(ROOT / 'gemini_parts_body_retry.png'))
    # Restore the original garment/hip area: the generated legless body removed
    # the shorts and the top of the thighs along with the legs.
    original = cut_green(Image.open(ROOT / 'gemini_profile_v2.png'))
    mask = Image.new('L', original.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.polygon([(495, 680), (700, 680), (700, 741), (655, 748),
                  (620, 749), (570, 746), (525, 735)], fill=255)
    original.putalpha(ImageChops.multiply(original.getchannel('A'), mask))
    body = Image.alpha_composite(body, original)
    leg = cut_green(Image.open(ROOT / 'gemini_parts_leg_trial.png'))
    leg = leg.crop(leg.getbbox())
    leg = leg.resize((round(leg.width * LENGTH / leg.height), LENGTH), Image.Resampling.LANCZOS)
    parts = split_leg(leg)
    frames = []
    for nt, nk, ft, fk, support in POSES:
        st, sk = (nt, nk) if support == 'near' else (ft, fk)
        # Compensate body and both hips vertically, keeping a mathematical ankle on a fixed line.
        dy = round(LENGTH - sole_y(st, sk))
        canvas = Image.new('RGBA', body.size, (201, 248, 161, 255))
        for thigh, knee in [(ft, fk), (nt, nk)]:
            posed = pose_leg(parts, thigh, knee)
            canvas.alpha_composite(posed, (HIP[0] - PIVOT[0], HIP[1] + dy - PIVOT[1]))
        canvas.alpha_composite(body, (0, dy))
        frames.append(canvas.convert('RGB').resize((421, 400), Image.Resampling.LANCZOS))
    frames[0].save(ROOT / 'gemini_hip_walk_test.gif', save_all=True,
                   append_images=frames[1:], duration=[120] * 7 + [220], loop=0)
    print('8 frames, 421x400; approximate knee pivot and ankle-height compensation')


if __name__ == '__main__':
    build()
