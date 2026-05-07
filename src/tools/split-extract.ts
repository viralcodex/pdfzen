import { PDFDocument } from "pdf-lib";
import { mkdir } from "fs/promises";
import { basename, join } from "path";
import type { ExtractPDFInput, ExtractPDFOutput, SplitPDFInput, SplitPDFOutput } from "../model/models";
import { loadPdfDocumentWithPageCount, savePdfDocument } from "../utils/utils";

/**
 * Splits a PDF file into multiple files based on the specified mode
 * @param input - Input PDF path, output directory, and split configuration
 * @returns Result with success status and output file paths
 */
export async function splitPDF(input: SplitPDFInput): Promise<SplitPDFOutput> {
  try {
    const outputFiles: string[] = [];

    const { totalPages, baseName, pdfDoc } = await init(input);

    switch (input.splitMode) {
      case "at": {
        // Split at a specific page - creates 2 files
        const splitPage =
          typeof input.splitValue === "number" ? input.splitValue : (input.splitValue[0] ?? 1);

        if (splitPage < 1 || splitPage >= totalPages) {
          return {
            success: false,
            error: `Split page must be between 1 and ${totalPages - 1}`,
          };
        }

        // Create both parts in parallel
        const [firstResult, secondResult] = await Promise.all([
          // First part: pages 1 to splitPage
          (async () => {
            const pdf = await PDFDocument.create();
            const indices = Array.from({ length: splitPage }, (_, i) => i);
            const pages = await pdf.copyPages(pdfDoc, indices);
            pages.forEach((page) => pdf.addPage(page));
            const filePath = join(input.outputDir, `${baseName}_pages_1_to_${splitPage}.pdf`);
            await savePdfDocument(pdf, filePath);
            return filePath;
          })(),
          // Second part: pages splitPage+1 to end
          (async () => {
            const pdf = await PDFDocument.create();
            const indices = Array.from({ length: totalPages - splitPage }, (_, i) => splitPage + i);
            const pages = await pdf.copyPages(pdfDoc, indices);
            pages.forEach((page) => pdf.addPage(page));
            const filePath = join(
              input.outputDir,
              `${baseName}_pages_${splitPage + 1}_to_${totalPages}.pdf`,
            );
            await savePdfDocument(pdf, filePath);
            return filePath;
          })(),
        ]);

        outputFiles.push(firstResult, secondResult);
        break;
      }

      // Split a range of pages
      case "range": {
        const range = Array.isArray(input.splitValue) ? input.splitValue : [1, input.splitValue];
        const startPage = Math.max(1, range[0] ?? 1);
        const endPage = Math.min(totalPages, range[1] ?? totalPages);

        const newPdf = await PDFDocument.create();
        const pageIndices = Array.from(
          { length: endPage - startPage + 1 },
          (_, i) => startPage - 1 + i,
        );
        const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);

        copiedPages.forEach((page) => newPdf.addPage(page));

        const outputPath = join(
          input.outputDir,
          `${baseName}_pages_${startPage}_to_${endPage}.pdf`,
        );
        await savePdfDocument(newPdf, outputPath);
        outputFiles.push(outputPath);
        break;
      }

      // Split every N pages
      case "every": {
        const interval = typeof input.splitValue === "number" ? input.splitValue : 1;
        let fileIndex = 1;

        for (let i = 0; i < totalPages; i += interval) {
          const newPdf = await PDFDocument.create();
          const endIndex = Math.min(i + interval, totalPages);
          const pageIndices = Array.from({ length: endIndex - i }, (_, idx) => i + idx);
          const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);

          copiedPages.forEach((page) => newPdf.addPage(page));

          const outputPath = join(input.outputDir, `${baseName}_part_${fileIndex}.pdf`);
          await savePdfDocument(newPdf, outputPath);
          outputFiles.push(outputPath);
          fileIndex++;
        }
        break;
      }
    }

    return {
      success: true,
      outputFiles,
      totalFiles: outputFiles.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function extractPDF(input: ExtractPDFInput): Promise<ExtractPDFOutput> {
  try {
    const outputFiles: string[] = [];

    const { totalPages, baseName, pdfDoc } = await init(input);

    switch (input.extractMode) {
      // Extract every N pages from the PDF
      case "every": {
        const interval = typeof input.extractValue === "number" ? input.extractValue : 1;

        for (let i = 0; i < totalPages; i += interval) {
          const newPdf = await PDFDocument.create();
          const endIdx = Math.min(totalPages, i + interval);

          const pageIndices = Array.from({ length: endIdx - i }, (_, idx) => i + idx);

          const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);

          copiedPages.forEach((page) => newPdf.addPage(page));

          const outputPath = join(input.outputDir, `${baseName}_page_${i + 1}.pdf`);
          await savePdfDocument(newPdf, outputPath);
          outputFiles.push(outputPath);
        }
        break;
      }

      //Extract [i, j] range of pages from PDF
      case "range": {
        const range = Array.isArray(input.extractValue)
          ? input.extractValue
          : [1, input.extractValue];

        const startPage = Math.max(1, range[0] ?? 1);
        const endPage = Math.min(totalPages, range[1] ?? totalPages);

        if (startPage > endPage) {
          return {
            success: false,
            error: `Page range must be between 1 and ${totalPages}`,
          };
        }

        const pages = Array.from(
          { length: endPage - startPage + 1 },
          (_, idx) => startPage + idx - 1,
        );

        const newPdf = await PDFDocument.create();

        const copiedPages = await newPdf.copyPages(pdfDoc, pages);

        copiedPages.forEach((page) => newPdf.addPage(page));

        const outputPath = join(input.outputDir, `${baseName}_pages_${startPage}-${endPage}.pdf`);

        await savePdfDocument(newPdf, outputPath);

        outputFiles.push(outputPath);
        break;
      }
    }

    return {
      success: true,
      outputFiles,
      totalFiles: outputFiles.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

const init = async (input: SplitPDFInput | ExtractPDFInput) => {
  const { pdfDoc, totalPages } = await loadPdfDocumentWithPageCount(input.inputPath);

  // Ensure output directory exists
  await mkdir(input.outputDir, { recursive: true });

  const baseName = basename(input.inputPath, ".pdf");

  return {
    totalPages,
    baseName,
    pdfDoc,
  };
};
