#!/bin/sh
# bootstrap.sh — Idempotent sandbox environment bootstrap for pixel-mv-remake + lemo-opuscar
# Works strictly within allowlisted hosts: github.com, registry.npmjs.org, pypi.org, files.pythonhosted.org
set -eu

REPO_ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/../../../.." && pwd)"
LEMO_DIR="${LEMO_OPUSCAR:-/home/user/lemo-opuscar}"
BIN_DIR="/home/user/bin"
mkdir -p "$BIN_DIR"

# 1. Clone or verify lemo-opuscar
sh "$REPO_ROOT/.claude/skills/lemo-opuscar/scripts/setup.sh" >/dev/null || true

# 2. Install lemo-opuscar Node packages (playwright-core, three)
if [ ! -d "$LEMO_DIR/node_modules/playwright-core" ]; then
  echo "[bootstrap] Installing lemo-opuscar npm packages..."
  (cd "$LEMO_DIR" && npm install --no-audit --no-fund --loglevel=error)
fi

# 3. Unpack headless Chromium + shared libs + ffprobe via registry.npmjs.org if missing
if [ ! -x "$BIN_DIR/chrome-headless-shell" ] || [ ! -x "$BIN_DIR/ffprobe" ]; then
  echo "[bootstrap] Provisioning chrome-headless-shell & ffprobe from registry.npmjs.org..."
  TMP_NPM="/tmp/pixel_mv_bootstrap_$$"
  mkdir -p "$TMP_NPM"
  (
    cd "$TMP_NPM"
    npm init -y >/dev/null
    npm install --no-audit --no-fund --loglevel=error @sparticuz/chromium@133.0.0 @ffprobe-installer/ffprobe
    node -e '
      const fs = require("fs");
      const path = require("path");
      const zlib = require("zlib");
      const { execSync } = require("child_process");

      const ffprobePath = require("@ffprobe-installer/ffprobe").path;
      fs.copyFileSync(ffprobePath, "/home/user/bin/ffprobe");
      fs.chmodSync("/home/user/bin/ffprobe", 0o755);

      const binDir = path.join(path.dirname(require.resolve("@sparticuz/chromium/package.json")), "bin");
      const chrOut = "/home/user/bin/chrome-headless-shell";
      fs.writeFileSync(chrOut, zlib.brotliDecompressSync(fs.readFileSync(path.join(binDir, "chromium.br"))));
      fs.chmodSync(chrOut, 0o755);

      fs.mkdirSync("/home/user/bin/libs", { recursive: true });
      for (const f of ["al2023.tar.br", "al2.tar.br", "swiftshader.tar.br"]) {
        const p = path.join(binDir, f);
        if (fs.existsSync(p)) {
          const tarPath = "/tmp/" + f.replace(/\.br$/, "");
          fs.writeFileSync(tarPath, zlib.brotliDecompressSync(fs.readFileSync(p)));
          execSync(`tar -xf "${tarPath}" -C /home/user/bin/libs`);
          fs.unlinkSync(tarPath);
        }
      }
    '
  )
  rm -rf "$TMP_NPM"
fi

# 4. Provision Python .venv + modern FFmpeg (via imageio-ffmpeg so alimiter=latency=1 works in mux.sh)
if [ ! -x "$LEMO_DIR/.venv/bin/python" ]; then
  echo "[bootstrap] Creating Python .venv in $LEMO_DIR/.venv..."
  python3 -m venv "$LEMO_DIR/.venv"
fi

if ! "$LEMO_DIR/.venv/bin/python" -c "import numpy, scipy, soundfile, soxr, PIL, imageio_ffmpeg" 2>/dev/null; then
  echo "[bootstrap] Installing Python audio/video packages + imageio-ffmpeg..."
  "$LEMO_DIR/.venv/bin/pip" install --quiet --disable-pip-version-check -r "$LEMO_DIR/requirements.txt" imageio-ffmpeg
fi

if [ ! -x "$BIN_DIR/ffmpeg" ] || ! "$BIN_DIR/ffmpeg" -h filter=alimiter 2>/dev/null | grep -q "latency"; then
  FF_EXE=$("$LEMO_DIR/.venv/bin/python" -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())")
  cp "$FF_EXE" "$BIN_DIR/ffmpeg"
  chmod +x "$BIN_DIR/ffmpeg"
fi

export PATH="$BIN_DIR:$PATH"
export LD_LIBRARY_PATH="$BIN_DIR/libs/lib:$BIN_DIR/libs:$BIN_DIR:${LD_LIBRARY_PATH:-}"
echo "[bootstrap] Ready!"
echo "  LEMO_OPUSCAR=$LEMO_DIR"
echo "  CHROME=$BIN_DIR/chrome-headless-shell ($("$BIN_DIR/chrome-headless-shell" --version))"
echo "  FFMPEG=$BIN_DIR/ffmpeg ($("$BIN_DIR/ffmpeg" -version | head -n 1))"
