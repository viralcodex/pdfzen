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
    const { splitPDF } = await import("../../src/tools/split-extract");
    tempDir = await createTempDir("tuidf-split-");

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
    const { splitPDF } = await import("../../src/tools/split-extract");
    tempDir = await createTempDir("tuidf-split-invalid-");

    const input = join(tempDir, "input.pdf");
    await createPdf(input, 3);

    const result = await splitPDF({
      inputPath: input,
      outputDir: join(tempDir, "out"),
      splitMode: "at",
      splitValue: 3,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Split page must be between 1 and 2");
    }
  });

  it("splits at a valid page into two files", async () => {
    const { splitPDF } = await import("../../src/tools/split-extract");
    tempDir = await createTempDir("tuidf-split-at-");

    const input = join(tempDir, "input.pdf");
    const outputDir = join(tempDir, "out");
    await createPdf(input, 4);

    const result = await splitPDF({
      inputPath: input,
      outputDir,
      splitMode: "at",
      splitValue: 2,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.totalFiles).toBe(2);
      expect(await getPdfPageCount(result.outputFiles?.[0])).toBe(2);
      expect(await getPdfPageCount(result.outputFiles?.[1])).toBe(2);
    }
  });

  it("uses the first array value when splitting at a page", async () => {
    const { splitPDF } = await import("../../src/tools/split-extract");
    tempDir = await createTempDir("tuidf-split-at-array-");

    const input = join(tempDir, "input.pdf");
    const outputDir = join(tempDir, "out");
    await createPdf(input, 4);

    const result = await splitPDF({
      inputPath: input,
      outputDir,
      splitMode: "at",
      splitValue: [3, 99],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.totalFiles).toBe(2);
      expect(await getPdfPageCount(result.outputFiles?.[0])).toBe(3);
      expect(await getPdfPageCount(result.outputFiles?.[1])).toBe(1);
    }
  });

  it("extracts a page range", async () => {
    const { splitPDF } = await import("../../src/tools/split-extract");
    tempDir = await createTempDir("tuidf-split-range-");

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

  it("uses numeric split range values from the first page", async () => {
    const { splitPDF } = await import("../../src/tools/split-extract");
    tempDir = await createTempDir("tuidf-split-range-number-");

    const input = join(tempDir, "input.pdf");
    const outputDir = join(tempDir, "out");
    await createPdf(input, 4);

    const result = await splitPDF({
      inputPath: input,
      outputDir,
      splitMode: "range",
      splitValue: 2,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.totalFiles).toBe(1);
      expect(await getPdfPageCount(result.outputFiles?.[0])).toBe(2);
    }
  });

  it("returns failure for missing input file", async () => {
    const { splitPDF } = await import("../../src/tools/split-extract");
    tempDir = await createTempDir("tuidf-split-missing-");

    const result = await splitPDF({
      inputPath: join(tempDir, "missing.pdf"),
      outputDir: join(tempDir, "out"),
      splitMode: "every",
      splitValue: 2,
    });

    expect(result.success).toBe(false);
  });
});

describe("extract tool", () => {
  it("extracts every N pages into multiple files", async () => {
    const { extractPDF } = await import("../../src/tools/split-extract");
    tempDir = await createTempDir("tuidf-extract-every-");

    const input = join(tempDir, "input.pdf");
    const outputDir = join(tempDir, "out");
    await createPdf(input, 5);

    const result = await extractPDF({
      inputPath: input,
      outputDir,
      extractMode: "every",
      extractValue: 2,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.totalFiles).toBe(3);
      expect(await getPdfPageCount(result.outputFiles?.[0])).toBe(2);
      expect(await getPdfPageCount(result.outputFiles?.[1])).toBe(2);
      expect(await getPdfPageCount(result.outputFiles?.[2])).toBe(1);
    }
  });

  it("extracts a page range into one file", async () => {
    const { extractPDF } = await import("../../src/tools/split-extract");
    tempDir = await createTempDir("tuidf-extract-range-");

    const input = join(tempDir, "input.pdf");
    const outputDir = join(tempDir, "out");
    await createPdf(input, 5);

    const result = await extractPDF({
      inputPath: input,
      outputDir,
      extractMode: "range",
      extractValue: [2, 4],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.totalFiles).toBe(1);
      expect(await getPdfPageCount(result.outputFiles?.[0])).toBe(3);
    }
  });

  it("clamps numeric extract ranges to the total page count", async () => {
    const { extractPDF } = await import("../../src/tools/split-extract");
    tempDir = await createTempDir("tuidf-extract-range-number-");

    const input = join(tempDir, "input.pdf");
    const outputDir = join(tempDir, "out");
    await createPdf(input, 3);

    const result = await extractPDF({
      inputPath: input,
      outputDir,
      extractMode: "range",
      extractValue: 99,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.totalFiles).toBe(1);
      expect(await getPdfPageCount(result.outputFiles?.[0])).toBe(3);
    }
  });

  it("validates extract range order", async () => {
    const { extractPDF } = await import("../../src/tools/split-extract");
    tempDir = await createTempDir("tuidf-extract-invalid-");

    const input = join(tempDir, "input.pdf");
    const outputDir = join(tempDir, "out");
    await createPdf(input, 5);

    const result = await extractPDF({
      inputPath: input,
      outputDir,
      extractMode: "range",
      extractValue: [4, 2],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Page range must be between 1 and 5");
    }
  });

  it("returns failure for missing input file", async () => {
    const { extractPDF } = await import("../../src/tools/split-extract");
    tempDir = await createTempDir("tuidf-extract-missing-");

    const result = await extractPDF({
      inputPath: join(tempDir, "missing.pdf"),
      outputDir: join(tempDir, "out"),
      extractMode: "every",
      extractValue: 2,
    });

    expect(result.success).toBe(false);
  });
});
