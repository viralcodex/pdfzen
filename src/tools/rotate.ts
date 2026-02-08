import { PDFDocument, degrees } from "pdf-lib";
import fs from "fs/promises";
import type { RotatePDFInput, RotatePDFOutput } from "../model/models";

export type { RotatePDFInput, RotatePDFOutput };

/**
 * Rotates pages in a PDF file
 * @param input - Input PDF path, output path, rotation angle, and pages to rotate
 * @returns Result with success status and number of rotated pages
 */
export async function rotatePDF(input: RotatePDFInput): Promise<RotatePDFOutput> {
  try {
    const pdfBytes = await fs.readFile(input.inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();

    // Determine which pages to rotate
    let pagesToRotate: number[];

    if (input.pages === "all" || !input.pages) {
      pagesToRotate = Array.from({ length: totalPages }, (_, i) => i);
    } else {
      // Convert 1-based page numbers to 0-based indices
      pagesToRotate = input.pages
        .filter((pageNum) => pageNum >= 1 && pageNum <= totalPages)
        .map((pageNum) => pageNum - 1);
    }

    // Rotate the specified pages
    for (const pageIndex of pagesToRotate) {
      const page = pdfDoc.getPage(pageIndex);
      const currentRotation = page.getRotation().angle;
      const newRotation = (currentRotation + input.rotation) % 360;
      page.setRotation(degrees(newRotation));
    }

    // Save the rotated PDF
    const rotatedPdfBytes = await pdfDoc.save();
    await fs.writeFile(input.outputPath, rotatedPdfBytes);

    return {
      success: true,
      outputPath: input.outputPath,
      rotatedPages: pagesToRotate.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Gets rotation information for all pages in a PDF
 * @param inputPath - Path to the PDF file
 * @returns Array of page numbers and their current rotation angles
 */
export async function getPDFRotations(
  inputPath: string,
): Promise<Array<{ page: number; rotation: number }>> {
  try {
    const pdfBytes = await fs.readFile(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();

    const rotations = [];
    for (let i = 0; i < totalPages; i++) {
      const page = pdfDoc.getPage(i);
      rotations.push({
        page: i + 1,
        rotation: page.getRotation().angle,
      });
    }

    return rotations;
  } catch (error) {
    throw new Error(
      `Failed to get PDF rotations: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
