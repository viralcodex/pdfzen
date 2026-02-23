#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
BUNDLE_DIR="$PROJECT_DIR/release"
BIN_DIR="$BUNDLE_DIR/bin"
LIB_DIR="$BUNDLE_DIR/lib"

"$PROJECT_DIR/scripts/release/build-ui.sh"
"$PROJECT_DIR/scripts/release/build-backend.sh"

mkdir -p "$BIN_DIR" "$LIB_DIR"

cat > "$BIN_DIR/pdfzen" <<'LAUNCHER'
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

export PDFZEN_BACKEND_BIN="$ROOT_DIR/lib/pdfzen-backend"

cd "$ROOT_DIR"
exec "$ROOT_DIR/lib/pdfzen-ui" "$@"
LAUNCHER

chmod +x "$BIN_DIR/pdfzen" "$LIB_DIR/pdfzen-ui" "$LIB_DIR/pdfzen-backend"

echo "Bundle created at: $BUNDLE_DIR"
echo "Run: $BIN_DIR/pdfzen"
