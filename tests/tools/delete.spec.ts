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

describe("delete tool", () => {
  it("deletes selected pages", async () => {
    const { deletePages } = await import("../../src/tools/delete");
    tempDir = await createTempDir("tuidf-delete-");

    const input = join(tempDir, "input.pdf");
    const output = join(tempDir, "output.pdf");
    await createPdf(input, 3);

    const result = await deletePages({
      inputPath: input,
      outputPath: output,
      pagesToDelete: [2],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.deletedPages).toBe(1);
      expect(result.remainingPages).toBe(2);
      expect(await getPdfPageCount(result.outputPath)).toBe(2);
    }
  });

  it("rejects deleting all pages", async () => {
    const { deletePages } = await import("../../src/tools/delete");
    tempDir = await createTempDir("tuidf-delete-invalid-");

    const input = join(tempDir, "input.pdf");
    await createPdf(input, 2);

    const result = await deletePages({
      inputPath: input,
      outputPath: join(tempDir, "output.pdf"),
      pagesToDelete: [1, 2],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Cannot delete all pages");
    }
  });

  it("rejects when no valid pages are provided", async () => {
    const { deletePages } = await import("../../src/tools/delete");
    tempDir = await createTempDir("tuidf-delete-no-valid-");

    const input = join(tempDir, "input.pdf");
    await createPdf(input, 2);

    const result = await deletePages({
      inputPath: input,
      outputPath: join(tempDir, "output.pdf"),
      pagesToDelete: [0, 99],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("No valid pages");
    }
  });

  it("returns page count for valid PDFs", async () => {
    const { getPDFPageCount } = await import("../../src/tools/delete");
    tempDir = await createTempDir("tuidf-delete-count-");

    const input = join(tempDir, "input.pdf");
    await createPdf(input, 4);

    expect(await getPDFPageCount(input)).toBe(4);
  });

  it("deletes multiple pages in descending-safe order", async () => {
    const { deletePages } = await import("../../src/tools/delete");
    tempDir = await createTempDir("tuidf-delete-multi-");

    const input = join(tempDir, "input.pdf");
    const output = join(tempDir, "output.pdf");
    await createPdf(input, 4);

    const result = await deletePages({
      inputPath: input,
      outputPath: output,
      pagesToDelete: [3, 1],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.deletedPages).toBe(2);
      expect(result.remainingPages).toBe(2);
      expect(await getPdfPageCount(result.outputPath)).toBe(2);
    }
  });

  it("deduplicates repeated pages before deleting", async () => {
    const { deletePages } = await import("../../src/tools/delete");
    tempDir = await createTempDir("tuidf-delete-duplicates-");

    const input = join(tempDir, "input.pdf");
    const output = join(tempDir, "output.pdf");
    await createPdf(input, 4);

    const result = await deletePages({
      inputPath: input,
      outputPath: output,
      pagesToDelete: [2, 2, 4],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.deletedPages).toBe(2);
      expect(result.remainingPages).toBe(2);
      expect(await getPdfPageCount(output)).toBe(2);
    }
  });

  it("returns failure when input PDF is missing", async () => {
    const { deletePages } = await import("../../src/tools/delete");
    tempDir = await createTempDir("tuidf-delete-missing-");

    const result = await deletePages({
      inputPath: join(tempDir, "missing.pdf"),
      outputPath: join(tempDir, "out.pdf"),
      pagesToDelete: [1],
    });

    expect(result.success).toBe(false);
  });

  it("returns an unknown error when a non-Error value is thrown", async () => {
    const { deletePages } = await import("../../src/tools/delete");

    const result = await deletePages({
      get inputPath() {
        throw "bad-input-path";
      },
      outputPath: "/tmp/output.pdf",
      pagesToDelete: [1],
    } as unknown as Parameters<typeof deletePages>[0]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unknown error occurred");
    }
  });
});
