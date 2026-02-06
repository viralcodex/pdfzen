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

- **Ctrl+D** - Toggle debug panel to view application state
- **ESC** (double press) - Return to main menu from a tool

## Debug Panel

The debug panel shows comprehensive real-time application state including:

### App State
- Currently selected tool
- Escape count (for double-ESC navigation)

### File List State (useFileList hook)
- **File Count**: Total number of files in the list
- **Selected Index**: Index of currently selected file (or null)
- **Page Count**: Number of pages in selected file (for tools that track this)
- **Processing State**: Whether a file operation is in progress (⏳ YES / ✓ NO)

### Files Array
- List of all files with their indices
- Selected file highlighted with ★ indicator
- Shows both filename and full path for each file
- Scrollable when file list is long

### Selected File Details
- Index position in the array
- Filename
- Full file path
- Page count (if tracked)

### Input State
- Current value in the input path field
- Shows "(empty)" when no input

### Status State
- Status message content
- Status type (info/success/error)

Press **Ctrl+D** at any time to toggle the debug panel visibility.

This project was created using `bun create tui`. [create-tui](https://git.new/create-tui) is the easiest way to get started with OpenTUI.
