import { backendCompressPdf } from "../utils/backend";
import type { CompressPDFInput, CompressPDFOutput } from "../model/models";

export type { CompressPDFInput, CompressPDFOutput };

/**
 * Compresses a PDF file using the Python backend (PyMuPDF)
 * Performs: garbage collection, image recompression, stream deflation, linearization
 * @param input - Input PDF path and output path
 * @returns Result with success status, file sizes, and compression ratio
 */
export async function compressPDF(input: CompressPDFInput): Promise<CompressPDFOutput> {
  try {
    const result = await backendCompressPdf({
      input: input.inputPath,
      output: input.outputPath,
    });

    if (result.success) {
      return {
        success: true,
        outputPath: result.outputPath,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        compressionRatio: result.compressionRatio,
      };
    } else {
      return {
        success: false,
        error: result.error || "Compression failed",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Formats file size in human-readable format
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
