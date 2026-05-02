#!/usr/bin/env bash
set -euo pipefail

# TuiDF installer — download the latest release binary and put it in PATH.
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/viralcodex/tuidf/main/install.sh | bash

REPO="viralcodex/tuidf"
INSTALL_DIR="${TUIDF_INSTALL_DIR:-$HOME/.local/bin}"
BINARY_NAME="tuidf"

# ── helpers ──────────────────────────────────────────────────────────────────

info()  { printf '\033[34m%s\033[0m\n' "$*"; }
ok()    { printf '\033[32m✓\033[0m %s\n' "$*"; }
warn()  { printf '\033[33m!\033[0m %s\n' "$*"; }
die()   { printf '\033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }

need() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

# ── detect platform ──────────────────────────────────────────────────────────

detect_platform() {
  local os arch

  case "$(uname -s)" in
    Darwin) os="darwin" ;;
    Linux)  os="linux"  ;;
    *)      die "Unsupported OS: $(uname -s). Only macOS and Linux are supported." ;;
  esac

  case "$(uname -m)" in
    x86_64|amd64)  arch="x64"   ;;
    arm64|aarch64) arch="arm64" ;;
    *)             die "Unsupported architecture: $(uname -m)" ;;
  esac

  echo "${os}-${arch}"
}

# ── find latest release tag ──────────────────────────────────────────────────

latest_tag() {
  local url="https://api.github.com/repos/${REPO}/releases/latest"
  
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": *"//;s/".*//'
  elif command -v wget >/dev/null 2>&1; then
    wget -qO- "$url" | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": *"//;s/".*//'
  else
    die "Neither curl nor wget found"
  fi
}

# ── download ─────────────────────────────────────────────────────────────────

download() {
  local url="$1" dest="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL -o "$dest" "$url"
  else
    wget -qO "$dest" "$url"
  fi
}

# ── main ─────────────────────────────────────────────────────────────────────

main() {
  local platform tag download_url tmp_file

  info "Installing TuiDF..."

  platform="$(detect_platform)"
  ok "Detected platform: ${platform}"

  info "Fetching latest release..."
  tag="$(latest_tag)"
  [ -n "$tag" ] || die "Could not determine latest release. Check https://github.com/${REPO}/releases"
  ok "Latest release: ${tag}"

  download_url="https://github.com/${REPO}/releases/download/${tag}/tuidf-${platform}"
  info "Downloading tuidf-${platform}..."

  tmp_file="$(mktemp)"
  trap 'rm -f "$tmp_file"' EXIT

  download "$download_url" "$tmp_file" || die "Download failed. Is ${platform} supported in this release?"

  mkdir -p "$INSTALL_DIR"
  mv "$tmp_file" "${INSTALL_DIR}/${BINARY_NAME}"
  chmod +x "${INSTALL_DIR}/${BINARY_NAME}"
  ok "Installed to ${INSTALL_DIR}/${BINARY_NAME}"

  # Check if install dir is in PATH
  case ":${PATH}:" in
    *":${INSTALL_DIR}:"*) ;;
    *)
      warn "${INSTALL_DIR} is not in your PATH"
      local shell_name
      shell_name="$(basename "${SHELL:-zsh}")"
      local rc_file="$HOME/.zshrc"
      [ "$shell_name" = "bash" ] && rc_file="$HOME/.bashrc"

      local path_line="export PATH=\"${INSTALL_DIR}:\$PATH\""
      if [ -f "$rc_file" ] && grep -qF "$path_line" "$rc_file"; then
        warn "PATH entry exists in ${rc_file} but not active in this shell"
      else
        echo "$path_line" >> "$rc_file"
        ok "Added ${INSTALL_DIR} to PATH in ${rc_file}"
      fi
      warn "Run: source ${rc_file}   (or open a new terminal)"
      ;;
  esac

  echo ""
  ok "TuiDF installed! Run 'tuidf' to start."
}

main
