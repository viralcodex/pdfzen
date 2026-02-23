#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
BUNDLE_DIR="$PROJECT_DIR/release"
ARTIFACTS_DIR="$PROJECT_DIR/release/artifacts"

VERSION="${1:-}"
if [ -z "$VERSION" ]; then
  VERSION="$(git -C "$PROJECT_DIR" describe --tags --always 2>/dev/null || true)"
fi
if [ -z "$VERSION" ]; then
  VERSION="$(date +%Y%m%d-%H%M%S)"
fi

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
NAME="pdfzen-${VERSION}-${OS}-${ARCH}"

mkdir -p "$ARTIFACTS_DIR"

ARCHIVE_PATH="$ARTIFACTS_DIR/${NAME}.tar.gz"
CHECKSUM_PATH="$ARTIFACTS_DIR/${NAME}.sha256"

tar -C "$PROJECT_DIR" -czf "$ARCHIVE_PATH" release/bin release/lib

if command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "$ARCHIVE_PATH" > "$CHECKSUM_PATH"
elif command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$ARCHIVE_PATH" > "$CHECKSUM_PATH"
else
  echo "No SHA256 tool found (shasum/sha256sum)." >&2
  exit 1
fi

echo "Created archive: $ARCHIVE_PATH"
echo "Created checksum: $CHECKSUM_PATH"
