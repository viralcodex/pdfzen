import { PDFDocument } from "pdf-lib";
import { join, basename } from "path";
import { OUTPUT_DIR } from "../constants/constants";
import { mkdir, stat } from "fs/promises";

const openedFiles = new Set<string>(); // to track opened files
const outputCache = new Map<string, string>(); // inputPath+tool -> outputPath

// Security limit for file size (100MB)
const MAX_FILE_SIZE = 100 * 1024 * 1024;

const ensureOutputDir = async () => {
  try {
    await mkdir(OUTPUT_DIR, { recursive: true });
  } catch (error) {
    console.warn("Could not create output directory:", error);
  }
};

export const chunkArray = (array: Array<any>, chunkSize: number) => {
  return Array.from({ length: Math.ceil(array.length / chunkSize) }, (_, i) =>
    array.slice(i * chunkSize, i * chunkSize + chunkSize),
  );
};

export const getOutputPath = async (prefix: string, inputFile?: string): Promise<string> => {
  await ensureOutputDir();
  const baseName = inputFile ? basename(inputFile, ".pdf") : "";

  if (inputFile) {
    const cacheKey = `${inputFile}:${prefix}`;
    const cached = outputCache.get(cacheKey);
    if (cached) return cached; // Reuse same output file
  }

  const fileName = baseName ? `${baseName}-${prefix}.pdf` : `${prefix}-${Date.now()}.pdf`;
  const outputPath = join(OUTPUT_DIR, fileName);

  if (inputFile) outputCache.set(`${inputFile}:${prefix}`, outputPath);
  return outputPath;
};

export const getOutputDir = async (prefix: string): Promise<string> => {
  await ensureOutputDir();
  const dirName = `${prefix}-${Date.now()}`;
  const dirPath = join(OUTPUT_DIR, dirName);
  await mkdir(dirPath, { recursive: true });
  return dirPath;
};

export const openOutputFolder = async (folderPath?: string) => {
  const targetPath = folderPath || OUTPUT_DIR;
  await ensureOutputDir();

  try {
    // Verify folder exists before trying to open
    const stats = await stat(targetPath);
    if (!stats.isDirectory()) {
      throw new Error("Output path is not a directory");
    }
    // Use Bun.spawn with argument array to prevent command injection
    const { cmd, args } = getPlatformOpenCommand(targetPath);
    const proc = Bun.spawn([cmd, ...args]);
    await proc.exited;
  } catch (error) {
    console.error("Failed to open output folder:", targetPath, error);
    throw error;
  }
};

export const openFile = async (filePath: string) => {
  try {
    if (openedFiles.has(filePath)) return; // prevent reopening
    openedFiles.add(filePath);
    // Use Bun.spawn with argument array to prevent command injection
    const { cmd, args } = getPlatformOpenCommand(filePath);
    const proc = Bun.spawn([cmd, ...args]);
    await proc.exited;
  } catch (error) {
    console.warn("Could not auto-open file:", error);
  }
};

export const validatePdfFile = async (
  filePath: string,
): Promise<{ valid: boolean; error?: string }> => {
  try {
    const file = Bun.file(filePath);
    const exists = await file.exists();
    if (!exists) return { valid: false, error: "File not found" };
    if (!filePath.toLowerCase().endsWith(".pdf"))
      return { valid: false, error: "File must be a PDF" };
    // Check file size limit
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "File not found" };
  }
};

export const validateImageFile = async (
  filePath: string,
): Promise<{ valid: boolean; error?: string }> => {
  try {
    const file = Bun.file(filePath);
    const exists = await file.exists();
    if (!exists) return { valid: false, error: "File not found" };
    const ext = filePath.toLowerCase();
    if ([".png", ".jpg", ".jpeg"].every((e) => !ext.endsWith(e))) {
      return { valid: false, error: "File must be PNG, JPG, or JPEG" };
    }
    // Check file size limit
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "File not found" };
  }
};

/**
 * Get platform-specific open command and arguments
 * Returns command and args separately to use with execFile (safe from injection)
 */
const getPlatformOpenCommand = (filePath: string): { cmd: string; args: string[] } => {
  const platform = process.platform;
  if (platform === "win32") {
    // Windows: use 'cmd' with /c start
    return { cmd: "cmd", args: ["/c", "start", "", filePath] };
  } else if (platform === "darwin") {
    return { cmd: "open", args: [filePath] };
  } else {
    return { cmd: "xdg-open", args: [filePath] };
  }
};

export const clearOpenedFiles = () => {
  openedFiles.clear();
};

export const closeFileTracking = (filePath: string) => {
  openedFiles.delete(filePath);
};

export const unescapePath = (path: string): string => path.replace(/\\(.)/g, "$1");

export const getPageCount = async (filePath: string): Promise<number> => {
  try {
    const pdfBytes = await Bun.file(filePath).arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    return pdfDoc.getPageCount();
  } catch {
    return 0;
  }
};
