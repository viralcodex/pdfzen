import { backendImagesToPdf } from "../utils/backend";
import type { ImagesToPDFInput, ImagesToPDFOutput } from "../model/models";

export type { ImagesToPDFInput, ImagesToPDFOutput };

/**
 * Converts multiple images into a single PDF file using Python backend
 * @param input - Image paths, output path, and page size options
 * @returns Result with success status and page count
 */
export async function imagesToPDF(input: ImagesToPDFInput): Promise<ImagesToPDFOutput> {
  try {
    if (input.inputPaths.length === 0) {
      return {
        success: false,
        error: "No images provided",
      };
    }

    const validImages = filterValidImages(input.inputPaths);

    if (validImages.length === 0) {
      return {
        success: false,
        error: "No valid images provided",
      };
    }
    const result = await backendImagesToPdf({
      inputs: validImages,
      output: input.outputPath,
      pageSize: input.pageSize || "fit",
    });

    if (result.success) {
      return {
        success: true,
        outputPath: result.outputPath,
        totalPages: result.totalPages,
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

/**
 * Checks if a file is a supported image format
 */
function isSupportedImage(filePath: string): boolean {
  const ext = filePath.toLowerCase();
  return [".png", ".jpg", ".jpeg"].some(e => ext.endsWith(e));
}

/**
 * Validates if files are supported images
 * @param filePaths - Array of file paths to validate
 * @returns Array of valid image paths
 */
export function filterValidImages(filePaths: string[]): string[] {
  return filePaths.filter(isSupportedImage);
}
