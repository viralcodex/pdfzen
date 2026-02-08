// ============ Shared Types ============
export type StatusType = "info" | "error" | "success";

export type FocusableElement = {
  id: string;
  type: "button" | "input" | "list-item" | "toggle" | "tool";
  onEnter?: () => void;
  canFocus?: () => boolean;
};

// ============ Backend Types ============
export interface BackendResult {
  success: boolean;
  error?: string;
  [key: string]: any;
}

// ============ Hook Options ============
export interface FileListOptions {
  trackPageCount?: boolean;
  acceptImages?: boolean;
}

// ============ Tool Input/Output Types ============

// Compress
export interface CompressPDFInput {
  inputPath: string;
  outputPath: string;
  quality?: "low" | "medium" | "high";
}

export interface CompressPDFOutput {
  success: boolean;
  outputPath?: string;
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: string;
  error?: string;
}

// Delete
export interface DeletePagesInput {
  inputPath: string;
  outputPath: string;
  pagesToDelete: number[]; // 1-based page numbers to delete
}

export interface DeletePagesOutput {
  success: boolean;
  outputPath?: string;
  deletedPages?: number;
  remainingPages?: number;
  error?: string;
}

// Images to PDF
export interface ImagesToPDFInput {
  inputPaths: string[];
  outputPath: string;
  pageSize?: "fit" | "a4" | "letter";
}

export interface ImagesToPDFOutput {
  success: boolean;
  outputPath?: string;
  totalPages?: number;
  error?: string;
}

// Merge
export interface MergePDFsInput {
  inputPaths: string[];
  outputPath: string;
}

export interface MergePDFsOutput {
  success: boolean;
  outputPath?: string;
  error?: string;
  pageCount?: number;
}

// PDF to Images
export interface PDFToImagesInput {
  inputPath: string;
  outputDir: string;
  format?: "png" | "jpg";
  dpi?: number;
  pages?: number[] | "all";
}

export interface PDFToImagesOutput {
  success: boolean;
  outputFiles?: string[];
  totalImages?: number;
  error?: string;
}

// Protect
export interface ProtectPDFInput {
  inputPath: string;
  outputPath: string;
  userPassword?: string;
  ownerPassword?: string;
  permissions?: {
    print?: boolean;
    modify?: boolean;
    copy?: boolean;
    annotate?: boolean;
  };
}

export interface ProtectPDFOutput {
  success: boolean;
  outputPath?: string;
  error?: string;
}

// Rotate
export interface RotatePDFInput {
  inputPath: string;
  outputPath: string;
  rotation: 90 | 180 | 270; // Rotation angle in degrees (clockwise)
  pages?: number[] | "all"; // Specific pages to rotate, or 'all' for all pages
}

export interface RotatePDFOutput {
  success: boolean;
  outputPath?: string;
  rotatedPages?: number;
  error?: string;
}

// Split
export interface SplitPDFInput {
  inputPath: string;
  outputDir: string;
  splitMode: "splitAt" | "range" | "every";
  // For 'splitAt' mode: 3 - split into pages 1-3 and pages 4-end
  // For 'range' mode: [1, 5] - extract pages 1-5
  // For 'every' mode: 2 - split every 2 pages
  splitValue: number | number[];
}

export interface SplitPDFOutput {
  success: boolean;
  outputFiles?: string[];
  error?: string;
  totalFiles?: number;
}
