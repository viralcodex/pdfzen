# Homebrew formula for pdfzen
# To use: Create a tap repo (homebrew-pdfzen) and add this formula

class Pdfzen < Formula
  desc "Terminal-based PDF toolkit for merge, split, compress, and more"
  homepage "https://github.com/viralcodex/pdfzen"
  url "https://github.com/viralcodex/pdfzen/releases/download/v0.1.6/pdfzen-0.1.6.tar.gz"
  sha256 "428d5e030aaf6a4a4497e3c7e932d411cff1d0b6b22a068815305b4e1480382d"
  license "MIT"

  depends_on "python@3.11"

  def install
    # Install TUI binaries (universal - includes both arm64 and x64)
    (libexec/"lib").install Dir["lib/*"]
    
    # Install backend
    (libexec/"backend").install "backend/pdfzen_backend.py"
    (libexec/"backend").install "backend/requirements.txt"
    
    # Create backend wrapper script (called by TUI via PDFZEN_BACKEND)
    (libexec/"bin/pdfzen-backend").write <<~EOS
      #!/bin/bash
      VENV_DIR="#{var}/pdfzen/venv"
      exec "$VENV_DIR/bin/python" "#{libexec}/backend/pdfzen_backend.py" "$@"
    EOS
    chmod 0755, libexec/"bin/pdfzen-backend"
    
    # Create main launcher
    (bin/"pdfzen").write <<~EOS
      #!/bin/bash
      set -e
      
      VENV_DIR="#{var}/pdfzen/venv"
      
      # Create venv and install deps on first run
      if [[ ! -d "$VENV_DIR" ]]; then
        echo "Setting up Python environment (first run)..."
        "#{Formula["python@3.11"].opt_bin}/python3.11" -m venv "$VENV_DIR"
        "$VENV_DIR/bin/pip" install --quiet -r "#{libexec}/backend/requirements.txt"
      fi
      
      # Tell TUI where to find the backend
      export PDFZEN_BACKEND="#{libexec}/bin/pdfzen-backend"
      
      # Run TUI
      exec "#{libexec}/lib/pdfzen-tui"
    EOS
  end

  def post_install
    # Create var directory for venv
    (var/"pdfzen").mkpath
  end

  def caveats
    <<~EOS
      pdfzen requires Python 3.11 for the PDF processing backend.
      On first run, it will set up a Python virtual environment.
      
      Run with:
        pdfzen
    EOS
  end

  test do
    assert_match "pdfzen", shell_output("#{bin}/pdfzen --version 2>&1", 1)
  end
end
