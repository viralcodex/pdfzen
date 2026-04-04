import mupdf from "../utils/mupdf";
import { mkdir } from "fs/promises";
import { join, basename } from "path";
import type { PDFToImagesInput, PDFToImagesOutput } from "../model/models";

/**
 * Converts PDF pages to images using MuPDF WASM
 * @param input - Input PDF path, output directory, and conversion options
 * @returns Result with success status and output file paths
 */
export async function pdfToImages(input: PDFToImagesInput): Promise<PDFToImagesOutput> {
  try {
    // Ensure output directory exists
    await mkdir(input.outputDir, { recursive: true });

    const pdfBytes = await Bun.file(input.inputPath).arrayBuffer();
    const doc = mupdf.Document.openDocument(pdfBytes, "application/pdf");
    const totalPages = doc.countPages();

    const baseName = basename(input.inputPath, ".pdf");
    const format = input.format || "png";
    const dpi = input.dpi || 150;

    // DPI to zoom factor (72 DPI is base)
    const zoom = dpi / 72;
    const matrix = mupdf.Matrix.scale(zoom, zoom);

    // Determine which pages to convert (input is 1-based)
    let pageIndices: number[];
    if (input.pages && input.pages !== "all") {
      pageIndices = input.pages
        .filter((p) => p >= 1 && p <= totalPages)
        .map((p) => p - 1);
    } else {
      pageIndices = Array.from({ length: totalPages }, (_, i) => i);
    }

    const outputFiles: string[] = [];

    for (const pageIdx of pageIndices) {
      const page = doc.loadPage(pageIdx);
      const ext = format.toLowerCase();
      const outputPath = join(input.outputDir, `${baseName}_page_${pageIdx + 1}.${ext}`);

      if (ext === "jpg" || ext === "jpeg") {
        // JPEG: render without alpha (asJPEG throws on alpha pixmaps)
        const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false, true);
        const buf = pixmap.asJPEG(90, false);
        await Bun.write(outputPath, buf);
      } else {
        const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, true, true);
        const buf = pixmap.asPNG();
        await Bun.write(outputPath, buf);
      }

      outputFiles.push(outputPath);
    }

    return {
      success: true,
      outputFiles,
      totalImages: outputFiles.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
