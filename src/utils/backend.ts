import { join, resolve } from "path";
import type { BackendResult } from "../model/models";

export type { BackendResult };

// Path to Python backend (using import.meta.dir for Bun)
const BACKEND_DIR = resolve(import.meta.dir, "../../backend");
const BACKEND_PATH = join(BACKEND_DIR, "pdfzen_backend.py");

// Security limits
const MAX_TIMEOUT_MS = 120000; // 2 minutes max execution time

let cachedPythonPath: string | null = null;

/**
 * Get the Python executable path - prefer venv if it exists
 */
async function getPythonPath(): Promise<string> {
  if (cachedPythonPath) return cachedPythonPath;

  const venvPath = join(BACKEND_DIR, ".venv");
  const venvExists = await Bun.file(venvPath).exists();

  if (venvExists) {
    if (process.platform === "win32") {
      cachedPythonPath = join(venvPath, "Scripts", "python");
    } else {
      cachedPythonPath = join(venvPath, "bin", "python");
    }
  } else {
    // Fallback to system Python
    cachedPythonPath = "python3";
  }

  return cachedPythonPath;
}

/**
 * Call the Python backend with the given command and arguments
 * Uses Bun.spawn with argument array to prevent command injection
 * Sensitive data (passwords) passed via stdin to avoid exposure in process list
 */
export async function callBackend(
  command: string,
  args: Record<string, any>,
  sensitiveData?: Record<string, string>,
): Promise<BackendResult> {
  try {
    const argsList: string[] = [BACKEND_PATH, command];

    for (const [key, value] of Object.entries(args)) {
      if (value === true) {
        argsList.push(`--${key}`);
      } else if (value !== false && value !== undefined && value !== null) {
        argsList.push(`--${key}`, String(value));
      }
    }

    // If we have sensitive data, add flag to read from stdin
    if (sensitiveData && Object.keys(sensitiveData).length > 0) {
      argsList.push("--stdin-secrets");
    }

    const pythonPath = await getPythonPath();

    const proc = Bun.spawn([pythonPath, ...argsList], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });

    // Send sensitive data via stdin (not visible in process list)
    if (sensitiveData && Object.keys(sensitiveData).length > 0) {
      proc.stdin.write(JSON.stringify(sensitiveData));
    }
    proc.stdin.end();

    // Set up timeout
    const timeoutPromise = new Promise<BackendResult>((resolve) => {
      setTimeout(() => {
        proc.kill();
        resolve({
          success: false,
          error: `Process timed out after ${MAX_TIMEOUT_MS}ms`,
        });
      }, MAX_TIMEOUT_MS);
    });

    // Wait for process to complete
    const processPromise = (async (): Promise<BackendResult> => {
      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;

      try {
        return JSON.parse(stdout);
      } catch {
        return {
          success: false,
          error: stderr || stdout || `Process exited with code ${exitCode}`,
        };
      }
    })();

    return await Promise.race([processPromise, timeoutPromise]);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Backend execution failed",
    };
  }
}

/**
 * Check if Python backend dependencies are installed
 */
export async function checkBackendDeps(): Promise<{
  allInstalled: boolean;
  dependencies: Record<string, { installed: boolean; version?: string }>;
}> {
  const result = await callBackend("check-deps", {});

  if (result.success && result.dependencies) {
    return {
      allInstalled: result.success,
      dependencies: result.dependencies,
    };
  }

  return {
    allInstalled: false,
    dependencies: {},
  };
}

/**
 * Install Python backend dependencies
 */
export async function installBackendDeps(): Promise<{
  success: boolean;
  error?: string;
}> {
  return await callBackend("install-deps", {});
}

/**
 * Convert PDF to images via backend
 */
export async function backendPdfToImages(opts: {
  input: string;
  outputDir: string;
  format?: "png" | "jpg";
  dpi?: number;
  pages?: string;
}): Promise<BackendResult> {
  return await callBackend("pdf-to-images", {
    input: opts.input,
    "output-dir": opts.outputDir,
    format: opts.format || "png",
    dpi: opts.dpi || 150,
    pages: opts.pages,
  });
}

/**
 * Convert images to PDF via backend
 */
export async function backendImagesToPdf(opts: {
  inputs: string[];
  output: string;
  pageSize?: "fit" | "a4" | "letter";
}): Promise<BackendResult> {
  return await callBackend("images-to-pdf", {
    inputs: opts.inputs.join("|"),
    output: opts.output,
    "page-size": opts.pageSize || "fit",
  });
}

/**
 * Protect PDF with password via backend
 * Passwords are passed via stdin to avoid exposure in process list
 */
export async function backendProtectPdf(opts: {
  input: string;
  output: string;
  userPassword?: string;
  ownerPassword?: string;
  allowPrint?: boolean;
  allowCopy?: boolean;
  allowModify?: boolean;
  allowAnnotate?: boolean;
}): Promise<BackendResult> {
  // Pass passwords via stdin for security (keys must match Python: user_password, owner_password)
  const sensitiveData: Record<string, string> = {};
  if (opts.userPassword) sensitiveData["user_password"] = opts.userPassword;
  if (opts.ownerPassword) sensitiveData["owner_password"] = opts.ownerPassword;

  return await callBackend(
    "protect",
    {
      input: opts.input,
      output: opts.output,
      "allow-print": opts.allowPrint ?? true,
      "allow-copy": opts.allowCopy ?? true,
      "allow-modify": opts.allowModify ?? true,
      "allow-annotate": opts.allowAnnotate ?? true,
    },
    sensitiveData,
  );
}

/**
 * Compress PDF via backend
 */
export async function backendCompressPdf(opts: {
  input: string;
  output: string;
}): Promise<BackendResult> {
  return await callBackend("compress", {
    input: opts.input,
    output: opts.output,
  });
}
