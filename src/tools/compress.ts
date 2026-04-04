import mupdf from "../utils/mupdf";
import type { CompressPDFInput, CompressPDFOutput } from "../model/models";

export type { CompressPDFInput, CompressPDFOutput };

/**
 * Compresses a PDF file using MuPDF WASM
 * Performs: garbage collection, image recompression, stream deflation, font compression
 * @param input - Input PDF path and output path
 * @returns Result with success status, file sizes, and compression ratio
 */
export async function compressPDF(input: CompressPDFInput): Promise<CompressPDFOutput> {
  try {
    const originalSize = Bun.file(input.inputPath).size;
    const pdfBytes = await Bun.file(input.inputPath).arrayBuffer();

    const doc = mupdf.Document.openDocument(pdfBytes, "application/pdf");
    const pdfDoc = doc.asPDF();
    if (!pdfDoc) {
      return { success: false, error: "Not a valid PDF document" };
    }

    const buf = pdfDoc.saveToBuffer(
      "garbage=deduplicate,compress,compress-images,compress-fonts,clean,sanitize",
    );
    const compressed = buf.asUint8Array();
    await Bun.write(input.outputPath, compressed);

    const compressedSize = compressed.byteLength;
    const ratio = originalSize > 0 ? (1 - compressedSize / originalSize) * 100 : 0;

    return {
      success: true,
      outputPath: input.outputPath,
      originalSize,
      compressedSize,
      compressionRatio: `${ratio.toFixed(2)}%`,
    };
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
