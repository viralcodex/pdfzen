import { afterEach, describe, expect, it } from "bun:test";
import { join } from "path";
import {
  cleanupTempDir,
  createPdf,
  createTempDir,
  getPdfPageCount,
  withMockedOpenDocument,
} from "../utils/test-utils";

let tempDir = "";

afterEach(async () => {
  if (tempDir) {
    await cleanupTempDir(tempDir);
    tempDir = "";
  }
});

describe("compress tool", () => {
  it("compresses a valid pdf and writes the output", async () => {
    const { compressPDF } = await import("../../src/tools/compress");
    tempDir = await createTempDir("tuidf-compress-");

    const input = join(tempDir, "input.pdf");
    const output = join(tempDir, "compressed.pdf");
    await createPdf(input, 2);

    const result = await compressPDF({
      inputPath: input,
      outputPath: output,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.outputPath).toBe(output);
      expect(result.originalSize).toBeGreaterThan(0);
      expect(result.compressedSize).toBeGreaterThan(0);
      expect(result.compressionRatio).toMatch(/^-?\d+\.\d{2}%$/);
      expect(await getPdfPageCount(output)).toBe(2);
    }
  });

  it("rejects inputs that cannot be treated as pdf documents", async () => {
    const { compressPDF } = await import("../../src/tools/compress");
    tempDir = await createTempDir("tuidf-compress-invalid-doc-");

    const input = join(tempDir, "input.pdf");
    await createPdf(input, 1);

    const result = await withMockedOpenDocument(
      () => ({ asPDF: () => null }),
      () =>
        compressPDF({
        inputPath: input,
        outputPath: join(tempDir, "out.pdf"),
        }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Not a valid PDF document");
    }
  });

  it("returns a failure for a missing input file", async () => {
    const { compressPDF } = await import("../../src/tools/compress");

    const result = await compressPDF({
      inputPath: "/tmp/does-not-exist.pdf",
      outputPath: "/tmp/out.pdf",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error?.length).toBeGreaterThan(0);
    }
  });

  it("handles unexpected thrown values in input access", async () => {
    const { compressPDF } = await import("../../src/tools/compress");

    const result = await compressPDF({
      get inputPath() {
        throw new Error("bad-input-path");
      },
      outputPath: "/tmp/out.pdf",
    } as unknown as Parameters<typeof compressPDF>[0]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("bad-input-path");
    }
  });

  it("formats file sizes", async () => {
    const { formatFileSize } = await import("../../src/tools/compress");

    expect(formatFileSize(512)).toBe("512.00 B");
    expect(formatFileSize(1024)).toBe("1.00 KB");
    expect(formatFileSize(1024 * 1024)).toBe("1.00 MB");
    expect(formatFileSize(1024 * 1024 * 1024)).toBe("1.00 GB");
  });
});
