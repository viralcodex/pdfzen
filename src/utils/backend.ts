import { join, resolve } from "path";
import type { BackendResult } from "../model/models";

export type { BackendResult };

// Path to Python backend (development mode)
const BACKEND_DIR = path.resolve(__dirname, "../../backend");
const BACKEND_PATH = path.join(BACKEND_DIR, "pdfzen_backend.py");

// Security limits
const MAX_TIMEOUT_MS = 120000; // 2 minutes max execution time

// Cache backend config to avoid repeated checks
let cachedBackendConfig: { executable: string; args: string[] } | null = null;

/**
 * Get the backend executable and base args
 * Supports standalone builds (PDFZEN_BACKEND env) and development mode
 */
function getBackendConfig(): { executable: string; args: string[] } {
  if (cachedBackendConfig) return cachedBackendConfig;

  // Standalone mode: use bundled backend executable
  const standaloneBackend = process.env.PDFZEN_BACKEND;
  if (standaloneBackend && fs.existsSync(standaloneBackend)) {
    cachedBackendConfig = { executable: standaloneBackend, args: [] };
    return cachedBackendConfig;
  }

  // Development mode: use Python
  const venvPath = path.join(BACKEND_DIR, ".venv");
  let pythonPath: string;

  if (venvExists) {
    if (process.platform === "win32") {
      pythonPath = path.join(venvPath, "Scripts", "python");
    } else {
      pythonPath = path.join(venvPath, "bin", "python");
    }
  } else {
    pythonPath = "python3";
  }

  cachedBackendConfig = { executable: pythonPath, args: [BACKEND_PATH] };
  return cachedBackendConfig;
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
  return new Promise((resolve) => {
    const config = getBackendConfig();
    
    // Build command line arguments as array (safe from injection)
    const argsList: string[] = [...config.args, command];

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

    const proc = spawn(config.executable, argsList, {
      stdio: ["pipe", "pipe", "pipe"],
      timeout: MAX_TIMEOUT_MS,
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
