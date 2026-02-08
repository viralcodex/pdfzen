import { PDFDocument } from "pdf-lib";
import fs from "fs/promises";
import path from "path";
import type { SplitPDFInput, SplitPDFOutput } from "../model/models";

export type { SplitPDFInput, SplitPDFOutput };

/**
 * Splits a PDF file into multiple files based on the specified mode
 * @param input - Input PDF path, output directory, and split configuration
 * @returns Result with success status and output file paths
 */
export async function splitPDF(input: SplitPDFInput): Promise<SplitPDFOutput> {
  try {
    const pdfBytes = await fs.readFile(input.inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();
    const outputFiles: string[] = [];

    // Ensure output directory exists
    await fs.mkdir(input.outputDir, { recursive: true });

    const baseName = path.basename(input.inputPath, ".pdf");

    switch (input.splitMode) {
      case "splitAt": {
        // Split at a specific page - creates 2 files
        const splitPage = typeof input.splitValue === "number" 
          ? input.splitValue 
          : (input.splitValue[0] ?? 1);

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
            const filePath = path.join(input.outputDir, `${baseName}_pages_1_to_${splitPage}.pdf`);
            await fs.writeFile(filePath, await pdf.save());
            return filePath;
          })(),
          // Second part: pages splitPage+1 to end
          (async () => {
            const pdf = await PDFDocument.create();
            const indices = Array.from({ length: totalPages - splitPage }, (_, i) => splitPage + i);
            const pages = await pdf.copyPages(pdfDoc, indices);
            pages.forEach((page) => pdf.addPage(page));
            const filePath = path.join(input.outputDir, `${baseName}_pages_${splitPage + 1}_to_${totalPages}.pdf`);
            await fs.writeFile(filePath, await pdf.save());
            return filePath;
          })(),
        ]);

        outputFiles.push(firstResult, secondResult);
        break;
      }

      case "range": {
        // Extract a range of pages
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

        const outputPath = path.join(
          input.outputDir,
          `${baseName}_pages_${startPage}_to_${endPage}.pdf`,
        );
        const newPdfBytes = await newPdf.save();
        await fs.writeFile(outputPath, newPdfBytes);
        outputFiles.push(outputPath);
        break;
      }

      case "every": {
        // Split every N pages
        const interval = typeof input.splitValue === "number" ? input.splitValue : 1;
        let fileIndex = 1;

        for (let i = 0; i < totalPages; i += interval) {
          const newPdf = await PDFDocument.create();
          const endIndex = Math.min(i + interval, totalPages);
          const pageIndices = Array.from({ length: endIndex - i }, (_, idx) => i + idx);
          const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);

          copiedPages.forEach((page) => newPdf.addPage(page));

          const outputPath = path.join(input.outputDir, `${baseName}_part_${fileIndex}.pdf`);
          const newPdfBytes = await newPdf.save();
          await fs.writeFile(outputPath, newPdfBytes);
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
