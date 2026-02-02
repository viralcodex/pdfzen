import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";

const execAsync = promisify(exec);

export const openFile = async (path: string) => {
  try {
    await execAsync(`open "${path}"`);
  } catch (error) {
    console.warn("Could not auto-open file:", error);
  }
};

export const validatePdfFile = async (path: string): Promise<{ valid: boolean; error?: string }> => {
  try {
    const stats = await fs.stat(path);
    if (!stats.isFile()) return { valid: false, error: "Path is not a file" };
    if (!path.toLowerCase().endsWith(".pdf")) return { valid: false, error: "File must be a PDF" };
    return { valid: true };
  } catch {
    return { valid: false, error: "File not found" };
  }
};
export const unescapePath = (path: string): string => path.replace(/\\(.)/g, "$1");
