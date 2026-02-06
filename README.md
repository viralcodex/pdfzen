# PDFZen

A terminal-based PDF utility tool for merging, splitting, compressing, and rotating PDFs.

## Installation

To install dependencies:

```bash
bun install
```

## Usage

To run:

```bash
bun dev
```

## Features

- **Merge PDFs**: Combine multiple PDF files into one
- **Split PDF**: Split a PDF into multiple files by pages, ranges, or intervals
- **Compress PDF**: Reduce PDF file size
- **Rotate PDF**: Rotate pages in a PDF document

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

## Debug Panel

---

This project was created using `bun create tui`. [create-tui](https://git.new/create-tui) is the easiest way to get started with OpenTUI.
