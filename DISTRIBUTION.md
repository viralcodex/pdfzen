# Distributing pdfzen

This guide explains how to distribute pdfzen to users.

## Distribution Methods

| Method | Platforms | User Requirements |
|--------|-----------|-------------------|
| [Standalone Binary](#standalone-binaries-recommended) | macOS, Linux, Windows | None |
| [Homebrew](#homebrew-macos-only) | macOS | Homebrew |
| [From Source](#from-source) | All | Bun + Python |

---

## Standalone Binaries (Recommended)

The easiest way to distribute. Users download a zip/tarball and run.

### Automated Builds via GitHub Actions

Push a tag to trigger automatic builds for all platforms:

```bash
git tag v0.1.0
git push origin v0.1.0
```

This creates releases for:
- **macOS** (Apple Silicon + Intel)
- **Linux** (x64)
- **Windows** (x64)

### Manual Build (Current Platform Only)

```bash
bun run build:standalone 0.1.0
```

### User Installation

**macOS/Linux:**
```bash
curl -LO https://github.com/USER/pdfzen/releases/download/v0.1.0/pdfzen-0.1.0-darwin-aarch64.tar.gz
tar -xzf pdfzen-0.1.0-darwin-aarch64.tar.gz
./pdfzen-0.1.0-darwin-aarch64/pdfzen
```

**Windows:**
```powershell
# Download pdfzen-0.1.0-windows-x64.zip from Releases
# Extract and run:
.\pdfzen-0.1.0-windows-x64\pdfzen.bat
```

---

## Homebrew (macOS Only)

```bash
# Make the script executable
chmod +x scripts/build-release.sh

# Build with version number
./scripts/build-release.sh 0.1.0
```

This creates:
- `release/pdfzen-0.1.0.tar.gz` - The distributable archive
- Outputs the SHA256 hash (save this!)

## Step 2: Create a GitHub Release

1. Go to your repo → **Releases** → **Create a new release**
2. Tag: `v0.1.0`
3. Title: `pdfzen v0.1.0`
4. Upload `release/pdfzen-0.1.0.tar.gz`
5. Publish the release

## Step 3: Create Your Homebrew Tap

A "tap" is a GitHub repository containing your formulas.

```bash
# Create a new repo named "homebrew-pdfzen" on GitHub
# Then clone it locally:
git clone https://github.com/YOUR_USERNAME/homebrew-pdfzen.git
cd homebrew-pdfzen

# Copy the formula
cp /path/to/pdfzen/Formula/pdfzen.rb .

# Edit pdfzen.rb and update:
# 1. Replace YOUR_USERNAME with your GitHub username
# 2. Replace REPLACE_WITH_SHA256_FROM_BUILD with the actual SHA256

git add pdfzen.rb
git commit -m "Add pdfzen formula"
git push
```

## Step 4: Users Can Now Install

```bash
# Add your tap
brew tap YOUR_USERNAME/pdfzen

# Install pdfzen
brew install pdfzen

# Run it
pdfzen
```

## Updating the Formula

For new releases:

1. Build new version: `./scripts/build-release.sh 0.2.0`
2. Create GitHub release with the new archive
3. Update `pdfzen.rb`:
   - Change `url` to point to new release
   - Update `sha256` hash
4. Push to your tap repo

## Local Testing

Test the formula locally before publishing:

```bash
# Install from local formula
brew install --build-from-source ./Formula/pdfzen.rb

# Or create a local tarball and test
./scripts/build-release.sh 0.1.0
brew install ./release/pdfzen-0.1.0.tar.gz
```

## Notes

- The formula depends on `python@3.11` from Homebrew
- On first run, pdfzen creates a Python venv at `/usr/local/var/pdfzen/venv`
- The TUI is compiled to a native binary using Bun's compile feature

---

## From Source

For developers or users who want to build from source.

### Requirements

- [Bun](https://bun.sh) - JavaScript runtime
- Python 3.10+ with pip

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/pdfzen.git
cd pdfzen
bun install
bun run setup
```

### Running

```bash
bun run dev
```

---

## Project Structure

```
pdfzen/
├── .github/
│   └── workflows/
│       └── release.yml      # CI/CD for cross-platform builds
├── Formula/
│   └── pdfzen.rb            # Homebrew formula
├── scripts/
│   ├── build-release.sh     # Homebrew release build
│   └── build-standalone.sh  # Standalone binary build
├── dist/                    # (generated) Build outputs
└── ...
```
