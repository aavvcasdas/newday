#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Day14 C04 编码/渲染后的像素核对：头顶上方到底是伞面还是天空。

contact_check.mjs 只算构图数据。这个脚本读**真的渲染出来的 PNG**，
在鲸娘头顶正上方的若干采样点上判断像素是否属于伞面颜色区间。

为什么不信「坐标算出来通过」：第一版只用伞沿全局最低点判断，
结果头顶那一侧其实只差 4px，画面里看着像伞压着头发；
改成逐点采样后才发现问题。像素核对是第二道关。

用法：
  python3 tools/day14制作/frame_pixel_check.py /tmp/day14-c04-contact.png
退出码 1 = 不通过。
"""
import json
import struct
import sys
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTACT = ROOT / 'tools/day14制作/contact_check.json'

# 伞面的米色填充 #efd7a9 与描边 #a58779 都算伞；天空是蓝灰渐变。
CANOPY_FILL = (239, 215, 169)
CANOPY_STROKE = (165, 135, 121)
TOL = 18


def read_png(path):
    d = path.read_bytes()
    pos, w, h, ct, idat = 8, None, None, None, b''
    while pos < len(d):
        ln = struct.unpack('>I', d[pos:pos + 4])[0]
        typ = d[pos + 4:pos + 8]
        data = d[pos + 8:pos + 8 + ln]
        if typ == b'IHDR':
            w, h, _bd, ct = struct.unpack('>IIBB', data[:10])
        elif typ == b'IDAT':
            idat += data
        pos += 12 + ln
    raw = zlib.decompress(idat)
    ch = 4 if ct == 6 else 3
    stride = w * ch
    rows, prev, i = [], bytearray(stride), 0
    for _ in range(h):
        f = raw[i]
        i += 1
        line = bytearray(raw[i:i + stride])
        i += stride
        if f == 1:
            for x in range(ch, stride):
                line[x] = (line[x] + line[x - ch]) & 255
        elif f == 2:
            for x in range(stride):
                line[x] = (line[x] + prev[x]) & 255
        elif f == 3:
            for x in range(stride):
                a = line[x - ch] if x >= ch else 0
                line[x] = (line[x] + ((a + prev[x]) >> 1)) & 255
        elif f == 4:
            for x in range(stride):
                a = line[x - ch] if x >= ch else 0
                b = prev[x]
                c = prev[x - ch] if x >= ch else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[x] = (line[x] + pr) & 255
        rows.append(bytes(line))
        prev = line
    return w, h, ch, rows


def near(px, target, tol=TOL):
    return all(abs(px[i] - target[i]) <= tol for i in range(3))


def main():
    img = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/day14-c04-contact.png')
    report = json.loads(CONTACT.read_text(encoding='utf-8'))
    w, h, ch, rows = read_png(img)
    sx, sy = w / 1280.0, h / 720.0

    def pixel(x, y):
        X, Y = int(x * sx), int(y * sy)
        o = X * ch
        return tuple(rows[Y][o:o + 3])

    samples = report['derived']['clearanceSamples']
    head_top = report['derived']['whaleHeadTopY']
    results = []
    for s in samples:
        # 伞面在伞沿之上（y 更小），所以往 rimY 上方 8px 取点：
        # 构图说沿头顶有 2–40px 净空，这一点必然落在伞面填充里。
        y = s['rimY'] - 8
        px = pixel(s['x'], y)
        ok = near(px, CANOPY_FILL) or near(px, CANOPY_STROKE)
        results.append({'x': s['x'], 'y': round(y, 2), 'rgb': list(px), 'isCanopy': ok})

    passed = all(r['isCanopy'] for r in results)
    out = {
        'image': str(img),
        'image_size': [w, h],
        'scope': 'rendered PNG pixels above the head; proves the canopy covers, not that a hand grips the cane',
        'samples': results,
        'passed': passed,
    }
    dest = ROOT / 'tools/day14制作/contact_pixel_check.json'
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    for r in results:
        print(f"  x={r['x']:>6} y={r['y']:>6}  rgb={tuple(r['rgb'])}  {'伞面' if r['isCanopy'] else '不是伞面'}")
    print('像素核对：' + ('通过（头顶上方均为伞面）' if passed else '不通过'))
    print(f'报告：{dest}')
    return 0 if passed else 1


if __name__ == '__main__':
    sys.exit(main())
