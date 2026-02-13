import { PDFDocument } from "pdf-lib";
import type { DeletePagesInput, DeletePagesOutput } from "../model/models";

export type { DeletePagesInput, DeletePagesOutput };

/**
 * Deletes specified pages from a PDF file
 * @param input - Input PDF path, output path, and pages to delete
 * @returns Result with success status and page counts
 */
export async function deletePages(input: DeletePagesInput): Promise<DeletePagesOutput> {
  try {
    const pdfBytes = await Bun.file(input.inputPath).arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();

    // Validate page numbers
    const validPages = input.pagesToDelete
      .filter((pageNum) => pageNum >= 1 && pageNum <= totalPages)
      .map((pageNum) => pageNum - 1); // Convert to 0-based indices

    if (validPages.length === 0) {
      return {
        success: false,
        error: "No valid pages to delete",
      };
    }

    if (validPages.length >= totalPages) {
      return {
        success: false,
        error: "Cannot delete all pages from PDF",
      };
    }

    // Sort in descending order to delete from end first (prevents index shifting issues)
    const sortedIndices = [...new Set(validPages)].sort((a, b) => b - a);

    // Delete pages
    for (const pageIndex of sortedIndices) {
      pdfDoc.removePage(pageIndex);
    }

    // Save the modified PDF
    const modifiedPdfBytes = await pdfDoc.save();
    await Bun.write(input.outputPath, modifiedPdfBytes);

    return {
      success: true,
      outputPath: input.outputPath,
      deletedPages: sortedIndices.length,
      remainingPages: totalPages - sortedIndices.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Gets the total page count of a PDF
 * @param inputPath - Path to the PDF file
 * @returns Total number of pages
 */
export async function getPDFPageCount(inputPath: string): Promise<number> {
  const pdfBytes = await Bun.file(inputPath).arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBytes);
  return pdfDoc.getPageCount();
}
