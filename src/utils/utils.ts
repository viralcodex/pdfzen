import { PDFDocument } from "pdf-lib";
import { join, basename } from "path";
import { linuxScript, osaScript, OUTPUT_DIR, windowsScript } from "../constants/constants";
import { mkdir, rm, stat } from "fs/promises";
import type { MouseEvent } from "@opentui/core";
import type { Setter } from "solid-js";

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

export const formatFileSize = (bytes: number) => {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  const decimals = unitIndex === 0 ? 0 : 1;
  return `${size.toFixed(decimals)} ${units[unitIndex]}`;
};

export const formatModifiedLabel = (date: Date) => {
  const now = new Date();
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isSameDay) {
    const timeLabel = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    return `updated today ${timeLabel}`;
  }

  const dateLabel = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return `Updated ${dateLabel}`;
};

export const getFormattedFileMetadata = async (
  filePath: string,
  options: { includePageCount?: boolean } = {},
) => {
  const size = formatFileSize(Bun.file(filePath).size);
  const fileStats = await stat(filePath).catch(() => null);
  const modified = fileStats ? formatModifiedLabel(fileStats.mtime) : null;
  const pageCount = options.includePageCount ? await getPageCount(filePath) : null;

  return { size, modified, pageCount };
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
      return {
        valid: false,
        error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
      };
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
      return {
        valid: false,
        error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
      };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "File not found" };
  }
};

export const handleFileExplorer = async (
  event: MouseEvent | undefined,
  fileType: "pdf" | "image",
  setIsPreviewOpen: Setter<boolean>,
): Promise<string[]> => {
  if (event && event.button !== 0) return [];

  const platform = process.platform;
  let cmd: string[];

  if (platform === "win32") {
    const filter =
      fileType === "pdf"
        ? "PDF files (*.pdf)|*.pdf"
        : "Image files (*.png;*.jpg;*.jpeg)|*.png;*.jpg;*.jpeg";
    const script = windowsScript.replace("{{type}}", filter);
    cmd = ["powershell", "-Command", script];
  } else if (platform === "darwin") {
    const types = fileType === "pdf" ? `"com.adobe.pdf"` : `"public.png", "public.jpeg"`;
    const script = osaScript.replace("{{type}}", types);
    cmd = ["osascript", "-e", script];
  } else {
    const filter = fileType === "pdf" ? "*.pdf" : "*.png *.jpg *.jpeg";
    const script = linuxScript.replace("{{type}}", filter);
    cmd = ["zenity", ...script.split(" ").slice(1)];
  }

  setIsPreviewOpen(true);
  try {
    const proc = Bun.spawn(cmd, { stderr: "ignore" });
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      return []; // user cancelled
    }

    const output = await new Response(proc.stdout).text();
    return output
      .trim()
      .split(/\r?\n/)
      .map((filePath) => filePath.trim())
      .filter(Boolean);
  } catch {
    return [];
  } finally {
    setIsPreviewOpen(false);
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

export async function savePdfDocument(pdfDoc: PDFDocument, outputPath: string): Promise<void> {
  const modifiedPdfBytes = await pdfDoc.save();
  await Bun.write(outputPath, modifiedPdfBytes);
}

export async function deleteFileIfExists(filePath?: string | null): Promise<void> {
  if (!filePath) {
    return;
  }
  await rm(filePath, { force: true }); // force:true prevents error if file doesn't exist
}

export const getPageCount = async (filePath: string): Promise<number> => {
  try {
    const { totalPages } = await loadPdfDocumentWithPageCount(filePath);
    return totalPages;
  } catch {
    return 0;
  }
};

export async function loadPdfDocument(inputPath: string): Promise<PDFDocument> {
  const pdfBytes = await Bun.file(inputPath).arrayBuffer();
  return PDFDocument.load(pdfBytes);
}

export async function loadPdfDocumentWithPageCount(
  inputPath: string,
): Promise<{ pdfDoc: PDFDocument; totalPages: number }> {
  const pdfDoc = await loadPdfDocument(inputPath);

  return {
    pdfDoc,
    totalPages: pdfDoc.getPageCount(),
  };
}
