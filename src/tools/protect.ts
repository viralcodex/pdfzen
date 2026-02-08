import { backendProtectPdf, callBackend } from "../utils/backend";
import type { ProtectPDFInput, ProtectPDFOutput } from "../model/models";

export type { ProtectPDFInput, ProtectPDFOutput };

/**
 * Protects a PDF with password encryption using Python backend (pikepdf)
 * @param input - Input PDF path, output path, and protection options
 * @returns Result with success status
 */
export async function protectPDF(input: ProtectPDFInput): Promise<ProtectPDFOutput> {
  try {
    // Validate that at least one password is provided
    if (!input.userPassword && !input.ownerPassword) {
      return {
        success: false,
        error: "At least one password (user or owner) must be provided",
      };
    }

    const permissions = input.permissions || {};

    const result = await backendProtectPdf({
      input: input.inputPath,
      output: input.outputPath,
      userPassword: input.userPassword,
      ownerPassword: input.ownerPassword,
      allowPrint: permissions.print ?? true,
      allowCopy: permissions.copy ?? true,
      allowModify: permissions.modify ?? true,
      allowAnnotate: permissions.annotate ?? true,
    });

    if (result.success) {
      return {
        success: true,
        outputPath: result.outputPath,
      };
    } else {
      return {
        success: false,
        error: result.error || "Unknown error",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Removes password protection from a PDF (requires knowing the password)
 * @param inputPath - Path to the protected PDF
 * @param outputPath - Path for the unprotected PDF
 * @param password - The password to unlock the PDF
 * @returns Result with success status
 */
export async function unprotectPDF(
  inputPath: string,
  outputPath: string,
  password: string
): Promise<ProtectPDFOutput> {
  try {
    // Pass password via stdin for security (not visible in process list)
    const result = await callBackend(
      "unprotect",
      {
        input: inputPath,
        output: outputPath,
      },
      { password }  // sensitiveData - sent via stdin
    );

    if (result.success) {
      return {
        success: true,
        outputPath: result.outputPath,
      };
    } else {
      return {
        success: false,
        error: result.error || "Unknown error",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
