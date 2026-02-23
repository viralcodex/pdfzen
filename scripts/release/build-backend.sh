#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
VENV_DIR="$BACKEND_DIR/.venv"
DIST_DIR="$PROJECT_DIR/release/lib"
BUILD_DIR="$PROJECT_DIR/release/.build/backend"

mkdir -p "$DIST_DIR" "$BUILD_DIR"

if [ ! -d "$VENV_DIR" ]; then
  python3 -m venv "$VENV_DIR"
fi

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

if python -c "import PyInstaller, fitz, pikepdf, PIL" >/dev/null 2>&1; then
  echo "Using existing backend build dependencies from $VENV_DIR"
else
  if [ "${PDFZEN_BACKEND_OFFLINE:-0}" = "1" ]; then
    echo "Missing backend build dependencies in $VENV_DIR and offline mode is enabled."
    echo "Disable PDFZEN_BACKEND_OFFLINE or preinstall dependencies in backend/.venv."
    exit 1
  fi

  python -m pip install --upgrade pip >/dev/null
  python -m pip install -r "$BACKEND_DIR/requirements.txt" pyinstaller >/dev/null
fi

pyinstaller \
  --noconfirm \
  --clean \
  --onefile \
  --name pdfzen-backend \
  --distpath "$DIST_DIR" \
  --workpath "$BUILD_DIR/work" \
  --specpath "$BUILD_DIR/spec" \
  "$BACKEND_DIR/pdfzen_backend.py"

echo "Built backend executable at: $DIST_DIR/pdfzen-backend"
