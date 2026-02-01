import { PDFDocument } from 'pdf-lib';
import fs from 'fs/promises';

export interface CompressPDFInput {
  inputPath: string;
  outputPath: string;
  quality?: 'low' | 'medium' | 'high'; // Compression level
}

export interface CompressPDFOutput {
  success: boolean;
  outputPath?: string;
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: string;
  error?: string;
}

/**
 * Compresses a PDF file by removing unused objects and optimizing structure
 * Note: pdf-lib has limited compression capabilities. For better compression,
 * you might want to use additional tools like Ghostscript or pdfcpu
 * @param input - Input PDF path, output path, and quality setting
 * @returns Result with success status, file sizes, and compression ratio
 */
export async function compressPDF(input: CompressPDFInput): Promise<CompressPDFOutput> {
  try {
    const pdfBytes = await fs.readFile(input.inputPath);
    const originalSize = pdfBytes.length;
    
    // Load the PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Save with optimization options
    // pdf-lib automatically removes unused objects when saving
    const compressedPdfBytes = await pdfDoc.save({
      useObjectStreams: true, // Use object streams for better compression
      addDefaultPage: false,
      objectsPerTick: 50
    });
    
    // Write compressed PDF
    await fs.writeFile(input.outputPath, compressedPdfBytes);
    
    const compressedSize = compressedPdfBytes.length;
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(2);

    return {
      success: true,
      outputPath: input.outputPath,
      originalSize,
      compressedSize,
      compressionRatio: `${ratio}%`
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Formats file size in human-readable format
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
