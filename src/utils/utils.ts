import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import { PDFDocument } from "pdf-lib";
import path from "path";
import { OUTPUT_DIR } from "../constants/constants";

const openedFiles = new Set<string>(); // to track opened files
const outputCache = new Map<string, string>(); // inputPath+tool -> outputPath

const execAsync = promisify(exec);


const ensureOutputDir = async () => {
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
  } catch (error) {
    console.warn("Could not create output directory:", error);
  }
};

export const chunkArray = (array: Array<any>, chunkSize: number) => {
  return Array.from({ length: Math.ceil(array.length / chunkSize)}, (_, i) => array.slice(i * chunkSize, i * chunkSize + chunkSize));
};

export const getOutputPath = async (prefix: string, inputFile?: string): Promise<string> => {
  await ensureOutputDir();
  const baseName = inputFile ? path.basename(inputFile, ".pdf") : "";

  if (inputFile) {
    const cacheKey = `${inputFile}:${prefix}`;
    const cached = outputCache.get(cacheKey);
    if (cached) return cached; // Reuse same output file
  }

  const fileName = baseName ? `${baseName}-${prefix}.pdf` : `${prefix}-${Date.now()}.pdf`;
  const outputPath = path.join(OUTPUT_DIR, fileName);

  if (inputFile) outputCache.set(`${inputFile}:${prefix}`, outputPath);
  return outputPath;
};

export const getOutputDir = async (prefix: string): Promise<string> => {
  await ensureOutputDir();
  const dirName = `${prefix}-${Date.now()}`;
  const dirPath = path.join(OUTPUT_DIR, dirName);
  await fs.mkdir(dirPath, { recursive: true });
  return dirPath;
};

export const openOutputFolder = async (folderPath?: string) => {
  const targetPath = folderPath || OUTPUT_DIR;
  await ensureOutputDir();

  try {
    // Verify folder exists before trying to open
    const stats = await fs.stat(targetPath);
    if (!stats.isDirectory()) {
      throw new Error("Output path is not a directory");
    }
    const command = getPlatformOpenCommand(targetPath);
    await execAsync(command);
  } catch (error) {
    console.error("Failed to open output folder:", targetPath, error);
    throw error;
  }
};

export const openFile = async (path: string) => {
  try {
    if (openedFiles.has(path)) return; // prevent reopening
    openedFiles.add(path);
    const command = getPlatformOpenCommand(path);
    await execAsync(command);
  } catch (error) {
    console.warn("Could not auto-open file:", error);
  }
};

export const validatePdfFile = async (
  path: string,
): Promise<{ valid: boolean; error?: string }> => {
  try {
    const stats = await fs.stat(path);
    if (!stats.isFile()) return { valid: false, error: "Path is not a file" };
    if (!path.toLowerCase().endsWith(".pdf")) return { valid: false, error: "File must be a PDF" };
    return { valid: true };
  } catch {
    return { valid: false, error: "File not found" };
  }
};

const getPlatformOpenCommand = (filePath: string): string => {
  const platform = process.platform;
  if (platform === "win32") {
    return `start "" "${filePath}"`;
  } else if (platform === "darwin") {
    return `open "${filePath}"`;
  } else {
    return `xdg-open "${filePath}"`;
  }
};

export const clearOpenedFiles = () => {
  openedFiles.clear();
};

export const closeFileTracking = (filePath: string) => {
  openedFiles.delete(filePath);
};

export const unescapePath = (path: string): string => path.replace(/\\(.)/g, "$1");

export const getPageCount = async (path: string): Promise<number> => {
  try {
    const pdfBytes = await fs.readFile(path);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    return pdfDoc.getPageCount();
  } catch {
    return 0;
  }
};
