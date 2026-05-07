import { PDFDocument } from "pdf-lib";
import type { MergePDFsInput, MergePDFsOutput } from "../model/models";
import { loadPdfDocument, savePdfDocument } from "../utils/utils";

/**
 * Merges multiple PDF files into a single PDF
 * @param input - Array of input PDF paths and output path
 * @returns Result with success status and output path
 */
export async function mergePDFs(input: MergePDFsInput): Promise<MergePDFsOutput> {
  try {
    if (input.inputPaths.length < 2) {
      return {
        success: false,
        error: "At least 2 PDF files are required for merging",
      };
    }

    // Create a new PDF document
    const mergedPdf = await PDFDocument.create();
    let totalPages = 0;

    // Load and copy pages from each PDF
    for (const pdfPath of input.inputPaths) {
      const pdf = await loadPdfDocument(pdfPath);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());

      copiedPages.forEach((page) => {
        mergedPdf.addPage(page);
        totalPages++;
      });
    }

    // Save the merged PDF
    await savePdfDocument(mergedPdf, input.outputPath);

    return {
      success: true,
      outputPath: input.outputPath,
      pageCount: totalPages,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
