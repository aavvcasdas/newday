"""Optional: rebuild the committed, renamed UI font subset. Not the movie renderer font."""
import hashlib
import json
import tarfile
import urllib.request
from io import BytesIO
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
URL = 'https://registry.npmjs.org/@expo-google-fonts/noto-sans-sc/-/noto-sans-sc-0.4.4.tgz'
SOURCE_SHA = 'd45f67f0a7c0ca3f256950777ce6a61cc7ce5f9696d02900cbbaac25f8aa7d16'
CACHE = ROOT / 'tools/mv_extra/cache/review-font.ttf'

def main():
    if not CACHE.exists():
        with urllib.request.urlopen(URL, timeout=60) as response:
            package = response.read()
        with tarfile.open(fileobj=BytesIO(package)) as archive:
            raw = archive.extractfile('package/400Regular/NotoSansSC_400Regular.ttf').read()
        assert hashlib.sha256(raw).hexdigest() == SOURCE_SHA
        CACHE.parent.mkdir(parents=True, exist_ok=True)
        CACHE.write_bytes(raw)
    assert hashlib.sha256(CACHE.read_bytes()).hexdigest() == SOURCE_SHA
    # UI text and locked captions only. Arbitrary note characters fall back to system fonts.
    sources = [HERE / n for n in ['index.html', 'app.js', 'model.py']]
    sources += [ROOT / 'tools/mv_extra/v2/lyrics.txt']
    text = ''.join(p.read_text() for p in sources) + ''.join(chr(n) for n in range(32, 127))
    font = TTFont(CACHE, recalcTimestamp=False)
    for name in font['name'].names:
        if name.nameID in (1, 4, 6, 16):
            name.string = ('WhaleReviewSans' if name.nameID == 6 else 'Whale Review Sans').encode(name.getEncoding())
    options = subset.Options()
    options.flavor = 'woff2'
    options.recalc_timestamp = False
    options.name_IDs = ['*']
    worker = subset.Subsetter(options=options)
    worker.populate(text=text)
    worker.subset(font)
    output = HERE / 'review-sans.woff2'
    font.flavor = 'woff2'
    font.save(output)
    (HERE / 'font-source.json').write_text(json.dumps({
        'sourcePackage': '@expo-google-fonts/noto-sans-sc@0.4.4', 'url': URL,
        'sourceMember': 'package/400Regular/NotoSansSC_400Regular.ttf',
        'sourceSha256': SOURCE_SHA, 'outputSha256': hashlib.sha256(output.read_bytes()).hexdigest(),
        'license': 'SIL OFL 1.1; full notice in FONT-OFL.txt',
        'modification': 'UI-only glyph subset renamed Whale Review Sans; no movie font substitution',
        'glyphCount': font['maxp'].numGlyphs,
    }, ensure_ascii=False, indent=2) + '\n')

if __name__ == '__main__':
    main()
