#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
BUNDLE_DIR="$PROJECT_DIR/release"
BIN_DIR="$BUNDLE_DIR/bin"
LIB_DIR="$BUNDLE_DIR/lib"

require_file() {
  local path="$1"
  if [ ! -f "$path" ]; then
    echo "Missing required file: $path" >&2
    exit 1
  fi
}

require_exec() {
  local path="$1"
  if [ ! -x "$path" ]; then
    echo "File is not executable: $path" >&2
    exit 1
  fi
}

require_file "$BIN_DIR/pdfzen"
require_file "$LIB_DIR/pdfzen-ui"
require_file "$LIB_DIR/pdfzen-backend"

require_exec "$BIN_DIR/pdfzen"
require_exec "$LIB_DIR/pdfzen-ui"
require_exec "$LIB_DIR/pdfzen-backend"

"$LIB_DIR/pdfzen-backend" --help >/dev/null

echo "Release bundle verification passed."
