import { mkdir } from "fs/promises";
import { backendPdfToImages } from "../utils/backend";
import type { PDFToImagesInput, PDFToImagesOutput } from "../model/models";

export type { PDFToImagesInput, PDFToImagesOutput };

/**
 * Converts PDF pages to images using Python backend (PyMuPDF)
 * @param input - Input PDF path, output directory, and conversion options
 * @returns Result with success status and output file paths
 */
export async function pdfToImages(input: PDFToImagesInput): Promise<PDFToImagesOutput> {
  try {
    // Ensure output directory exists
    await mkdir(input.outputDir, { recursive: true });

    // Convert pages array to comma-separated string
    let pagesStr: string | undefined;
    if (input.pages && input.pages !== "all") {
      pagesStr = input.pages.join(",");
    }

    const result = await backendPdfToImages({
      input: input.inputPath,
      outputDir: input.outputDir,
      format: input.format || "png",
      dpi: input.dpi || 150,
      pages: pagesStr,
    });

    if (result.success) {
      return {
        success: true,
        outputFiles: result.outputFiles,
        totalImages: result.totalImages,
      };
    } else {
      return {
        success: false,
        error: result.error || "Unknown error",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
