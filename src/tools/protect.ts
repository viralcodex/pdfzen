import mupdf from "../utils/mupdf";
import type { ProtectPDFInput, ProtectPDFOutput } from "../model/models";

/**
 * Compute the PDF permissions bitfield (P value) from permission flags.
 * PDF spec: bits 1-2 must be 0, bits 7-8 and 13-32 must be 1.
 */
function computePermissions(opts: {
  print?: boolean;
  copy?: boolean;
  modify?: boolean;
  annotate?: boolean;
}): number {
  // Start with all permissions granted (0xFFFFFFFC signed)
  let p = -4;
  if (opts.print === false) p &= ~((1 << 2) | (1 << 11)); // bits 3, 12
  if (opts.modify === false) p &= ~((1 << 3) | (1 << 8) | (1 << 10)); // bits 4, 9, 11
  if (opts.copy === false) p &= ~(1 << 4); // bit 5
  if (opts.annotate === false) p &= ~(1 << 5); // bit 6
  return p;
}

/**
 * Build the mupdf save options string for encryption.
 * Passwords are interpolated into the options string; characters that would
 * break the comma-delimited parser are rejected upfront.
 */
function buildEncryptOptions(opts: {
  userPassword?: string;
  ownerPassword?: string;
  permissions: number;
}): string {
  const parts: string[] = ["encrypt=aes-256"];
  if (opts.userPassword) parts.push(`user-password=${opts.userPassword}`);
  if (opts.ownerPassword) parts.push(`owner-password=${opts.ownerPassword}`);
  parts.push(`permissions=${opts.permissions}`);
  return parts.join(",");
}

/**
 * Protects a PDF with password encryption using MuPDF WASM
 * @param input - Input PDF path, output path, and protection options
 * @returns Result with success status
 */
export async function protectPDF(input: ProtectPDFInput): Promise<ProtectPDFOutput> {
  try {
    const userPassword = input.userPassword || undefined;
    const ownerPassword = input.ownerPassword || userPassword;

    // Validate that at least one password is provided
    if (!userPassword && !ownerPassword) {
      return {
        success: false,
        error: "At least one password (user or owner) must be provided",
      };
    }

    // Reject passwords containing characters that break the options parser
    for (const pw of [userPassword, ownerPassword]) {
      if (pw && /[,=]/.test(pw)) {
        return {
          success: false,
          error: "Passwords must not contain ',' or '=' characters",
        };
      }
    }

    const permissions = input.permissions || {};
    const permBits = computePermissions(permissions);

    const pdfBytes = await Bun.file(input.inputPath).arrayBuffer();
    const doc = mupdf.Document.openDocument(pdfBytes, "application/pdf");
    const pdfDoc = doc.asPDF();
    if (!pdfDoc) {
      return { success: false, error: "Not a valid PDF document" };
    }

    const opts = buildEncryptOptions({
      userPassword,
      ownerPassword,
      permissions: permBits,
    });

    const buf = pdfDoc.saveToBuffer(opts);
    await Bun.write(input.outputPath, buf.asUint8Array());

    return {
      success: true,
      outputPath: input.outputPath,
    };
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
  password: string,
): Promise<ProtectPDFOutput> {
  try {
    const pdfBytes = await Bun.file(inputPath).arrayBuffer();
    const doc = mupdf.Document.openDocument(pdfBytes, "application/pdf");

    if (doc.needsPassword()) {
      const auth = doc.authenticatePassword(password);
      if (auth === 0) {
        return { success: false, error: "Incorrect password" };
      }
    }

    const pdfDoc = doc.asPDF();
    if (!pdfDoc) {
      return { success: false, error: "Not a valid PDF document" };
    }

    const buf = pdfDoc.saveToBuffer("decrypt");
    await Bun.write(outputPath, buf.asUint8Array());

    return {
      success: true,
      outputPath,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
