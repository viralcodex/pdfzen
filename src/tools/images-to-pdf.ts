import { PDFDocument } from "pdf-lib";
import type { ImagesToPDFInput, ImagesToPDFOutput } from "../model/models";

export type { ImagesToPDFInput, ImagesToPDFOutput };

/**
 * Converts multiple images into a single PDF file using pdf-lib
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

    const pdfDoc = await PDFDocument.create();
    const pageSize = input.pageSize || "fit";

    for (const imgPath of validImages) {
      const imgBytes = await Bun.file(imgPath).arrayBuffer();
      const ext = imgPath.toLowerCase();

      const image = ext.endsWith(".png")
        ? await pdfDoc.embedPng(imgBytes)
        : await pdfDoc.embedJpg(imgBytes);

      const imgWidth = image.width;
      const imgHeight = image.height;

      let pageWidth: number;
      let pageHeight: number;

      if (pageSize === "a4") {
        pageWidth = 595.28;
        pageHeight = 841.89;
      } else if (pageSize === "letter") {
        pageWidth = 612;
        pageHeight = 792;
      } else {
        // "fit" - page matches image dimensions
        pageWidth = imgWidth;
        pageHeight = imgHeight;
      }

      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      if (pageSize !== "fit") {
        // Scale image to fit page, centered
        const scale = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
        const newWidth = imgWidth * scale;
        const newHeight = imgHeight * scale;
        const x = (pageWidth - newWidth) / 2;
        const y = (pageHeight - newHeight) / 2;
        page.drawImage(image, { x, y, width: newWidth, height: newHeight });
      } else {
        page.drawImage(image, { x: 0, y: 0, width: imgWidth, height: imgHeight });
      }
    }

    const pdfBytes = await pdfDoc.save();
    await Bun.write(input.outputPath, pdfBytes);

    return {
      success: true,
      outputPath: input.outputPath,
      totalPages: pdfDoc.getPageCount(),
    };
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
  return [".png", ".jpg", ".jpeg"].some((e) => ext.endsWith(e));
}

/**
 * Validates if files are supported images
 * @param filePaths - Array of file paths to validate
 * @returns Array of valid image paths
 */
export function filterValidImages(filePaths: string[]): string[] {
  return filePaths.filter(isSupportedImage);
}
