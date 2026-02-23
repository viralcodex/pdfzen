#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

bun run "$PROJECT_DIR/scripts/release/build-ui.ts"
