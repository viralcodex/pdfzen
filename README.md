<img width="2480" height="1010" alt="image" src="https://github.com/user-attachments/assets/0b8d33ec-ae2c-4c15-93b7-e551c2be1f60" />

<p align="center">
  <em>A terminal-based PDF utility tool for merging, splitting, compressing, rotating, encrypting, and decrypting PDFs.</em>
</p>

## Installation

To install dependencies:

```bash
bun install
```

## Setup

First-time setup (creates Python virtual environment and installs backend dependencies):

```bash
bun run setup
```

## Usage

To run:

```bash
bun dev
```

Or use the unified dev script:

```bash
bun dev:all     # Setup (if needed) + run UI
bun dev:ui      # Run UI only
bun dev:backend # Setup backend only
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
