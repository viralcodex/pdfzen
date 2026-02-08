#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
VENV_DIR="$BACKEND_DIR/.venv"

print_step() {
  echo -e "${BLUE}==>${NC} $1"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}!${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

# Check for required tools
check_dependencies() {
  print_step "Checking dependencies..."

  # Check Python
  if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
    print_success "Python 3 found: $PYTHON_VERSION"
  else
    print_error "Python 3 not found. Please install Python 3.10+"
    exit 1
  fi

  # Check Bun
  if command -v bun &> /dev/null; then
    BUN_VERSION=$(bun --version)
    print_success "Bun found: $BUN_VERSION"
  else
    print_error "Bun not found. Install with: curl -fsSL https://bun.sh/install | bash"
    exit 1
  fi
}

# Setup Python virtual environment
setup_backend() {
  print_step "Setting up Python backend..."

  cd "$BACKEND_DIR"

  # Create venv if it doesn't exist
  if [ ! -d "$VENV_DIR" ]; then
    print_step "Creating virtual environment..."
    python3 -m venv .venv
    print_success "Virtual environment created"
  else
    print_success "Virtual environment exists"
  fi

  # Activate venv and install dependencies
  print_step "Installing Python dependencies..."
  source "$VENV_DIR/bin/activate"
  pip install -q --upgrade pip
  pip install -q -r requirements.txt
  print_success "Python dependencies installed"

  # Verify backend works
  print_step "Verifying backend..."
  if python3 pdfzen_backend.py check-deps > /dev/null 2>&1; then
    print_success "Backend verified"
  else
    print_warning "Backend check-deps returned non-zero (may be okay)"
  fi

  cd "$PROJECT_DIR"
}

# Setup Node/Bun dependencies
setup_frontend() {
  print_step "Setting up frontend..."

  cd "$PROJECT_DIR"

  if [ ! -d "node_modules" ]; then
    print_step "Installing npm dependencies..."
    bun install
    print_success "npm dependencies installed"
  else
    print_success "npm dependencies exist"
  fi
}

# Start development
start_dev() {
  print_step "Starting TUI..."
  echo ""
  echo -e "${GREEN}PDFZen is starting!${NC}"
  echo -e "Backend: CLI at ${YELLOW}$VENV_DIR/bin/python3 $BACKEND_DIR/pdfzen_backend.py${NC}"
  echo -e "Press ${YELLOW}Ctrl+C${NC} to stop"
  echo ""

  cd "$PROJECT_DIR"
  bun run dev
}

# Main
main() {
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║${NC}       ${GREEN}PDFZen Dev Environment${NC}       ${BLUE}║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════╝${NC}"
  echo ""

  case "${1:-}" in
    setup)
      check_dependencies
      setup_backend
      setup_frontend
      echo ""
      print_success "Setup complete! Run './dev.sh' to start."
      ;;
    backend)
      # Run backend CLI directly (for testing)
      cd "$BACKEND_DIR"
      source "$VENV_DIR/bin/activate"
      shift || true
      python3 pdfzen_backend.py "$@"
      ;;
    ui)
      cd "$PROJECT_DIR"
      bun run dev
      ;;
    *)
      check_dependencies
      setup_backend
      setup_frontend
      echo ""
      start_dev
      ;;
  esac
}

main "$@"
