"""Verify pinned source media, guest cutouts, and restore pinned OFL CJK fonts into gitignored cache."""
import argparse
import base64
import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
MV_ROOT = ROOT / "tools/mv_extra"
CACHE = MV_ROOT / "cache"

PINNED_FONTS = [
    {
        "name": "NotoSansSC-Bold.ttf",
        "repository": "aavvcasdas/ai-yunying",
        "gitBlobSha1": "066b8900dc311b9b0f4dd748dfe58043c6fb119a",
        "sha256": "883e82df40f7cf3219756543f574e0fcbf31c58368260d2f45e2827ab2d7e5b1",
        "cachePath": "tools/mv_extra/cache/NotoSansSC-Bold.ttf",
    },
    {
        "name": "ZCOOLKuaiLe-Regular.ttf",
        "repository": "aavvcasdas/ai-yunying",
        "gitBlobSha1": "3cf6cd927ee910d46875de173efdaac4330e84ac",
        "sha256": "812a6fc1fe54b6d73a419245c32dfeba8aa33104d5be90d1cf6af082007cb71d",
        "cachePath": "tools/mv_extra/cache/ZCOOLKuaiLe-Regular.ttf",
    },
]


def sha256_file(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def ensure_pinned_blob(item: dict, verify_only: bool) -> None:
    dst = ROOT / item["cachePath"]
    if dst.exists() and sha256_file(dst) == item["sha256"]:
        return
    if verify_only:
        raise AssertionError(f"Missing or mismatched cached font: {item['cachePath']}")
    raw = json.loads(
        subprocess.check_output(
            ["gh", "api", f"repos/{item['repository']}/git/blobs/{item['gitBlobSha1']}"]
        )
    )
    data = base64.b64decode(raw["content"])
    blob_sha1 = hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()
    assert blob_sha1 == item["gitBlobSha1"], f"Git blob SHA1 mismatch for {item['name']}"
    assert hashlib.sha256(data).hexdigest() == item["sha256"], f"SHA256 mismatch for {item['name']}"
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_bytes(data)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--verify-only", action="store_true")
    args = ap.parse_args()

    cmd = [sys.executable, str(MV_ROOT / "setup.py")]
    if args.verify_only:
        cmd.append("--verify-only")
    subprocess.run(cmd, check=True)

    for font_item in PINNED_FONTS:
        ensure_pinned_blob(font_item, args.verify_only)

    cutout_manifest = json.loads((ROOT / "assets/ai-girls/extra-guests/cutouts/manifest.json").read_text())
    for item in cutout_manifest:
        cutout_path = ROOT / item["path"]
        assert cutout_path.exists(), f"Missing guest cutout: {cutout_path}"
        assert sha256_file(cutout_path) == item["derivedSha256"], f"Guest cutout SHA mismatch: {cutout_path}"

    print("v3 setup verified: source audio/video, 6 alpha guest cutouts, and pinned OFL fonts ready.")


if __name__ == "__main__":
    main()
