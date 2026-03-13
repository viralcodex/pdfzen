import { afterEach, describe, expect, it } from "bun:test";
import { join } from "path";
import { cleanupTempDir, createPdf, createTempDir, getPdfPageCount } from "../utils/test-utils";

let tempDir = "";

afterEach(async () => {
  if (tempDir) {
    await cleanupTempDir(tempDir);
    tempDir = "";
  }
});

describe("split tool", () => {
  it("splits every N pages", async () => {
    const { splitPDF } = await import("../../src/tools/split");
    tempDir = await createTempDir("pdfzen-split-");

    const input = join(tempDir, "input.pdf");
    const outputDir = join(tempDir, "out");
    await createPdf(input, 5);

    const result = await splitPDF({
      inputPath: input,
      outputDir,
      splitMode: "every",
      splitValue: 2,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.totalFiles).toBe(3);
      expect(await getPdfPageCount(result.outputFiles?.[0])).toBe(2);
      expect(await getPdfPageCount(result.outputFiles?.[1])).toBe(2);
      expect(await getPdfPageCount(result.outputFiles?.[2])).toBe(1);
    }
  });

  it("validates splitAt page range", async () => {
    const { splitPDF } = await import("../../src/tools/split");
    tempDir = await createTempDir("pdfzen-split-invalid-");

    const input = join(tempDir, "input.pdf");
    await createPdf(input, 3);

    const result = await splitPDF({
      inputPath: input,
      outputDir: join(tempDir, "out"),
      splitMode: "splitAt",
      splitValue: 3,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Split page must be between 1 and 2");
    }
  });

  it("splits at a valid page into two files", async () => {
    const { splitPDF } = await import("../../src/tools/split");
    tempDir = await createTempDir("pdfzen-split-at-");

    const input = join(tempDir, "input.pdf");
    const outputDir = join(tempDir, "out");
    await createPdf(input, 4);

    const result = await splitPDF({
      inputPath: input,
      outputDir,
      splitMode: "splitAt",
      splitValue: 2,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.totalFiles).toBe(2);
      expect(await getPdfPageCount(result.outputFiles?.[0])).toBe(2);
      expect(await getPdfPageCount(result.outputFiles?.[1])).toBe(2);
    }
  });

  it("extracts a page range", async () => {
    const { splitPDF } = await import("../../src/tools/split");
    tempDir = await createTempDir("pdfzen-split-range-");

    const input = join(tempDir, "input.pdf");
    const outputDir = join(tempDir, "out");
    await createPdf(input, 5);

    const result = await splitPDF({
      inputPath: input,
      outputDir,
      splitMode: "range",
      splitValue: [2, 4],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.totalFiles).toBe(1);
      expect(await getPdfPageCount(result.outputFiles?.[0])).toBe(3);
    }
  });

  it("returns failure for missing input file", async () => {
    const { splitPDF } = await import("../../src/tools/split");
    tempDir = await createTempDir("pdfzen-split-missing-");

    const result = await splitPDF({
      inputPath: join(tempDir, "missing.pdf"),
      outputDir: join(tempDir, "out"),
      splitMode: "every",
      splitValue: 2,
    });

    expect(result.success).toBe(false);
  });
});
