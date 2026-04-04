<img width="2480" height="1010" alt="image" src="https://github.com/user-attachments/assets/0b8d33ec-ae2c-4c15-93b7-e551c2be1f60" />

<p align="center">
  <em>A terminal-based PDF utility tool for merging, splitting, compressing, rotating, encrypting, and decrypting PDFs.</em>
</p>

## Installation

### Quick install (macOS / Linux)

```bash
curl -fsSL https://raw.githubusercontent.com/viralcodex/pdfzen/main/install.sh | bash
```

### Windows

Download `pdfzen-windows-x64.exe` from the [latest release](https://github.com/viralcodex/pdfzen/releases/latest) and add it to your PATH.

### From source

Prerequisites:

- Bun (latest recommended)

```bash
bun install
```

## Setup

First-time setup (installs dependencies):

```bash
bun run setup
```

## Usage

Run the app:

```bash
bun run dev
```

Other commands:

```bash
bun run setup         # Install dependencies
bun run build         # Build for distribution
bun run build:release # Build standalone binaries for all platforms
```

Install a global `pdfzen` command (macOS/Linux):

```bash
bun run install:global
```

Then reload your shell and run from anywhere:

```bash
pdfzen
```

## Features

- **Merge PDFs**: Combine multiple PDF files into one
- **Split PDF**: Split a PDF into multiple files by pages, ranges, or intervals
- **Compress PDF**: Reduce PDF file size with image optimization
- **Rotate PDF**: Rotate pages in a PDF document
- **Delete Pages**: Remove specific pages from a PDF
- **Protect PDF**: Add password protection and permissions
- **Decrypt PDF**: Remove password protection from PDFs
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

- Click on the file list area to open file picker
- Drag & drop files into the terminal
