<img width="1408" height="600" alt="image" src="https://github.com/user-attachments/assets/7f9d7b7c-756a-493f-83ea-6c6025335714" />

<p align="center">
  <em>A terminal-based PDF utility tool for merging, splitting, compressing, and rotating PDFs.</em>
</p>

## Installation

### macOS (Homebrew)

```bash
brew install viralcodex/pdfzen/pdfzen
```

### Linux / Windows

Download the latest release from [GitHub Releases](https://github.com/viralcodex/pdfzen/releases).

**Linux:**
```bash
tar -xzf pdfzen-*-linux-x64.tar.gz
./pdfzen-*-linux-x64/pdfzen
```

**Windows:**
1. Extract `pdfzen-*-windows-x64.zip`
2. Run `pdfzen.bat`

### From Source

Requires [Bun](https://bun.sh) and Python 3.10+.

```bash
git clone https://github.com/viralcodex/pdfzen.git
cd pdfzen
bun install
bun run setup
bun dev
```

## Features

- **Merge PDFs**: Combine multiple PDF files into one
- **Split PDF**: Split a PDF into multiple files by pages, ranges, or intervals
- **Compress PDF**: Reduce PDF file size with image optimization
- **Rotate PDF**: Rotate pages in a PDF document
- **Delete Pages**: Remove specific pages from a PDF
- **Protect PDF**: Add password protection and permissions
- **PDF to Images**: Convert PDF pages to PNG/JPG images
- **Images to PDF**: Combine images into a single PDF

## Keyboard Shortcuts

### Navigation

- **Tab** / **Shift+Tab** - Navigate between UI elements
- **↑** / **↓** - Navigate up/down through elements
- **j** / **k** - Vim-style navigation (down/up)
- **Enter** - Execute focused action (press button, submit input)

### General

- **Ctrl+D** - Toggle debug panel to view application state
- **ESC** (double press) - Return to main menu from a tool

### File List Actions

When navigating file lists, you can tab through:

- **Move Up (↑)** - Reorder file up in the list
- **Move Down (↓)** - Reorder file down in the list
- **Remove (X)** - Remove file from the list

### Adding Files

- Drag & drop PDF files into the terminal
- Enter file path manually and press Enter or click "Add Files"
