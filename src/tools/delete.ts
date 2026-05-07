import { PDFDocument } from "pdf-lib";
import type { DeletePagesInput, DeletePagesOutput } from "../model/models";
import { loadPdfDocument, savePdfDocument } from "../utils/utils";

type DeletePagesResult = Omit<DeletePagesOutput, "outputPath">;

export function deletePagesFromDocument(
  pdfDoc: PDFDocument,
  pagesToDelete: number[],
): DeletePagesResult {
  const totalPages = pdfDoc.getPageCount();

  const validPages = pagesToDelete
    .filter((pageNum) => pageNum >= 1 && pageNum <= totalPages)
    .map((pageNum) => pageNum - 1);

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

  const sortedIndices = [...new Set(validPages)].sort((a, b) => b - a);

  for (const pageIndex of sortedIndices) {
    pdfDoc.removePage(pageIndex);
  }

  return {
    success: true,
    deletedPages: sortedIndices.length,
    remainingPages: totalPages - sortedIndices.length,
  };
}

/**
 * Deletes specified pages from a PDF file
 * @param input - Input PDF path, output path, and pages to delete
 * @returns Result with success status and page counts
 */
export async function deletePages(input: DeletePagesInput): Promise<DeletePagesOutput> {
  try {
    const pdfDoc = await loadPdfDocument(input.inputPath);
    const result = deletePagesFromDocument(pdfDoc, input.pagesToDelete);

    if (!result.success) {
      return result;
    }

    await savePdfDocument(pdfDoc, input.outputPath);

    return {
      ...result,
      outputPath: input.outputPath,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
