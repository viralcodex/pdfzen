# Changelog

All notable changes to PDFZen will be documented in this file.

## [0.1.0] — 2025-04-05

Initial public release of **PDFZen** — a fast, terminal-native PDF toolkit built with [SolidJS](https://solidjs.com), [OpenTUI](https://opentui.com), and [Bun](https://bun.sh).

### Features

- **Merge PDFs** — Combine multiple PDF files into a single document with drag-to-reorder support.
- **Split PDF** — Split a PDF by page numbers, ranges, or fixed intervals.
- **Compress PDF** — Reduce file size through image optimization while preserving quality.
- **Rotate PDF** — Rotate individual pages or entire documents (90°, 180°, 270°).
- **Delete Pages** — Remove specific pages from a PDF.
- **Protect PDF** — Add password encryption and permission controls.
- **Decrypt PDF** — Remove password protection from encrypted PDFs.
- **PDF to Images** — Convert PDF pages to PNG or JPG.
- **Images to PDF** — Combine image files into a single PDF document.

### UI & Navigation

- Full keyboard-driven TUI with tab, arrow keys, and vim-style (`j`/`k`) navigation.
- Native file picker integration on macOS (osascript), Linux (zenity), and Windows (PowerShell).
- Reorderable file lists with move-up, move-down, and remove actions.
- Double-press `ESC` to return to the main menu from any tool.
- `Ctrl+D` debug panel for inspecting application state.
- ASCII art hero banner on the home screen.

### Architecture

- Built entirely on **Bun** — runtime, bundler, test runner, and compiler.
- **MuPDF WASM** backend for PDF processing — no native binary dependencies at runtime.
- SolidJS reactive UI rendered through the OpenTUI terminal reconciler.
- Single-binary distribution via `bun build --compile` for all supported targets.

### Build & Distribution

- Cross-platform standalone binaries: **macOS** (arm64, x64), **Linux** (x64, arm64), **Windows** (x64).
- One-line installer script for macOS and Linux (`curl | bash`).
- GitHub Actions CI/CD pipeline for automated release artifact builds.
- Output files saved to `~/Documents/PDFZen/` by default.

### Testing

- Comprehensive test suite covering all tools, components, hooks, and utilities.
- Tests run via `bun test`.

[0.1.0]: https://github.com/viralcodex/pdfzen/releases/tag/v0.1.0
