import { PDFDocument } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

export interface SplitPDFInput {
  inputPath: string;
  outputDir: string;
  splitMode: 'pages' | 'range' | 'every';
  // For 'pages' mode: [1, 3, 5] - extract specific pages
  // For 'range' mode: [1, 5] - extract pages 1-5
  // For 'every' mode: 2 - split every 2 pages
  splitValue: number | number[];
}

export interface SplitPDFOutput {
  success: boolean;
  outputFiles?: string[];
  error?: string;
  totalFiles?: number;
}

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

    const baseName = path.basename(input.inputPath, '.pdf');

    switch (input.splitMode) {
      case 'pages': {
        // Extract specific pages
        const pages = Array.isArray(input.splitValue) ? input.splitValue : [input.splitValue];
        
        for (const pageNum of pages) {
          if (pageNum < 1 || pageNum > totalPages) {
            continue;
          }
          
          const newPdf = await PDFDocument.create();
          const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageNum - 1]);
          newPdf.addPage(copiedPage);
          
          const outputPath = path.join(input.outputDir, `${baseName}_page_${pageNum}.pdf`);
          const newPdfBytes = await newPdf.save();
          await fs.writeFile(outputPath, newPdfBytes);
          outputFiles.push(outputPath);
        }
        break;
      }

      case 'range': {
        // Extract a range of pages
        const range = Array.isArray(input.splitValue) ? input.splitValue : [1, input.splitValue];
        const startPage = Math.max(1, range[0] ?? 1);
        const endPage = Math.min(totalPages, range[1] ?? totalPages);
        
        const newPdf = await PDFDocument.create();
        const pageIndices = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage - 1 + i);
        const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
        
        copiedPages.forEach((page) => newPdf.addPage(page));
        
        const outputPath = path.join(input.outputDir, `${baseName}_pages_${startPage}_to_${endPage}.pdf`);
        const newPdfBytes = await newPdf.save();
        await fs.writeFile(outputPath, newPdfBytes);
        outputFiles.push(outputPath);
        break;
      }

      case 'every': {
        // Split every N pages
        const interval = typeof input.splitValue === 'number' ? input.splitValue : 1;
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
      totalFiles: outputFiles.length
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
