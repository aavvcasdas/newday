"""Verify pinned source media, guest cutouts, OFL CJK fonts, and restore pinned Day12 HD Whale Girl + Claude Chibi poses into gitignored cache."""
import argparse
import base64
import concurrent.futures
import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
MV_ROOT = ROOT / "tools/mv_extra"
MANIFEST_PATH = Path(__file__).with_name("production_assets_v4.json")


def sha256_file(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def ensure_pinned_blob(repo: str, item: dict, verify_only: bool) -> str:
    dst = ROOT / item["cachePath"]
    if dst.exists() and sha256_file(dst) == item["sha256"]:
        return f"verified {item['cachePath']}"
    if verify_only:
        raise AssertionError(f"Missing or mismatched cached asset: {item['cachePath']}")
    raw = json.loads(
        subprocess.check_output(
            ["gh", "api", f"repos/{repo}/git/blobs/{item['gitBlobSha1']}"]
        )
    )
    data = base64.b64decode(raw["content"])
    blob_sha1 = hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()
    assert blob_sha1 == item["gitBlobSha1"], f"Git blob SHA1 mismatch for {item['cachePath']}"
    assert hashlib.sha256(data).hexdigest() == item["sha256"], f"SHA256 mismatch for {item['cachePath']}"
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_bytes(data)
    return f"restored {item['cachePath']}"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--verify-only", action="store_true")
    args = ap.parse_args()

    cmd = [sys.executable, str(MV_ROOT / "setup.py")]
    if args.verify_only:
        cmd.append("--verify-only")
    subprocess.run(cmd, check=True)

    manifest = json.loads(MANIFEST_PATH.read_text())
    repo = manifest["repository"]
    all_items = list(manifest["fonts"]) + list(manifest["actors"])

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        futures = [pool.submit(ensure_pinned_blob, repo, it, args.verify_only) for it in all_items]
        for fut in futures:
            fut.result()

    galgame = {
        "claude": "d85403607bc7fcc167e964b1a8a0f918d8355025f833eb364ea1fc99476099c2",
        "gpt": "f61f587e9eec4f193097b755c7309daedf5ff26398b181661c0f289caa00f2e5",
        "gemini": "9c7842d4d7d122480d5e5e5cee668eb40675480ffedceea25fcd22a4b9166bba",
        "kimi": "c6f07e2430a4d102abf4356ac3f785124a894cbf1213e05eec1738204d3943f9",
    }
    for name, expected in galgame.items():
        path = ROOT / "assets/ai-girls/galgame" / f"{name}.webp"
        assert path.is_file() and sha256_file(path) == expected, f"Galgame asset missing or mismatched: {path}"

    doubao = ROOT / "assets/ai-girls/doubao/doubao-cutout.png"
    assert doubao.exists(), f"Missing doubao cutout: {doubao}"

    cutout_manifest = json.loads((ROOT / "assets/ai-girls/extra-guests/cutouts/manifest.json").read_text())
    for item in cutout_manifest:
        cutout_path = ROOT / item["path"]
        assert cutout_path.exists(), f"Missing guest cutout: {cutout_path}"
        assert sha256_file(cutout_path) == item["derivedSha256"], f"Guest cutout SHA mismatch: {cutout_path}"

    print(
        f"v4 setup verified: source audio/video, {len(manifest['actors'])} Day12/Claude HD poses, "
        f"galgame cast, guest cutouts, and OFL fonts ready."
    )


if __name__ == "__main__":
    main()
