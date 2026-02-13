#!/bin/bash
set -e

# Build standalone binaries for pdfzen
# Creates a single directory with everything needed to run

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="${1:-0.1.0}"
PLATFORM="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

# Normalize architecture name
if [[ "$ARCH" == "arm64" ]]; then
  ARCH="aarch64"
elif [[ "$ARCH" == "x86_64" ]]; then
  ARCH="x64"
fi

OUTPUT_DIR="$PROJECT_DIR/dist"
RELEASE_NAME="pdfzen-$VERSION-$PLATFORM-$ARCH"
RELEASE_DIR="$OUTPUT_DIR/$RELEASE_NAME"

echo -e "${BLUE}Building pdfzen v$VERSION for $PLATFORM-$ARCH${NC}"
echo ""

# Clean previous builds
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"

# Step 1: Compile Bun TUI to standalone binary
echo -e "${BLUE}[1/4]${NC} Compiling TUI to native binary..."
cd "$PROJECT_DIR"
bun build --compile --minify ./src/index.tsx --outfile "$RELEASE_DIR/pdfzen-tui"
echo -e "${GREEN}✓${NC} TUI compiled"

# Step 2: Bundle Python backend with PyInstaller
echo -e "${BLUE}[2/4]${NC} Bundling Python backend..."

# Check if we have a venv, create if needed
VENV_DIR="$PROJECT_DIR/backend/.venv"
if [[ ! -d "$VENV_DIR" ]]; then
  echo "  Creating Python venv..."
  python3 -m venv "$VENV_DIR"
  "$VENV_DIR/bin/pip" install --quiet -r "$PROJECT_DIR/backend/requirements.txt"
fi

# Install PyInstaller if needed
if ! "$VENV_DIR/bin/pip" show pyinstaller &>/dev/null; then
  echo "  Installing PyInstaller..."
  "$VENV_DIR/bin/pip" install --quiet pyinstaller
fi

# Build Python backend as standalone
echo "  Running PyInstaller..."
cd "$PROJECT_DIR/backend"
"$VENV_DIR/bin/pyinstaller" \
  --onefile \
  --clean \
  --distpath "$RELEASE_DIR" \
  --workpath "$OUTPUT_DIR/pyinstaller-build" \
  --specpath "$OUTPUT_DIR/pyinstaller-build" \
  --name pdfzen-backend \
  --noconfirm \
  pdfzen_backend.py 2>/dev/null

echo -e "${GREEN}✓${NC} Backend bundled"

# Step 3: Create launcher script
echo -e "${BLUE}[3/4]${NC} Creating launcher..."

cat > "$RELEASE_DIR/pdfzen" << 'LAUNCHER'
#!/bin/bash
set -e

# Get the directory where pdfzen is installed
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Tell TUI where to find the bundled backend
export PDFZEN_BACKEND="$SCRIPT_DIR/pdfzen-backend"

# Run TUI
exec "$SCRIPT_DIR/pdfzen-tui"
LAUNCHER

chmod +x "$RELEASE_DIR/pdfzen"
echo -e "${GREEN}✓${NC} Launcher created"

# Step 4: Create archive
echo -e "${BLUE}[4/4]${NC} Creating archive..."
cd "$OUTPUT_DIR"
tar -czf "$RELEASE_NAME.tar.gz" "$RELEASE_NAME"

# Calculate SHA256
SHA256=$(shasum -a 256 "$RELEASE_NAME.tar.gz" | cut -d' ' -f1)

# Cleanup build artifacts
rm -rf "$OUTPUT_DIR/pyinstaller-build"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Build complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Binary:   ${BLUE}$RELEASE_DIR/pdfzen${NC}"
echo -e "  Archive:  ${BLUE}$OUTPUT_DIR/$RELEASE_NAME.tar.gz${NC}"
echo -e "  SHA256:   $SHA256"
echo ""
echo -e "${YELLOW}To test locally:${NC}"
echo "  $RELEASE_DIR/pdfzen"
echo ""
echo -e "${YELLOW}To distribute:${NC}"
echo "  Upload $RELEASE_NAME.tar.gz to GitHub Releases"
echo ""
echo -e "${YELLOW}Users install with:${NC}"
echo "  curl -LO https://github.com/USER/pdfzen/releases/download/v$VERSION/$RELEASE_NAME.tar.gz"
echo "  tar -xzf $RELEASE_NAME.tar.gz"
echo "  ./$RELEASE_NAME/pdfzen"
