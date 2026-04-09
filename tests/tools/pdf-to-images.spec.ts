import { afterEach, describe, expect, it } from "bun:test";
import { join } from "path";
import { cleanupTempDir, createPdf, createTempDir } from "../utils/test-utils";

let tempDir = "";

afterEach(async () => {
  if (tempDir) {
    await cleanupTempDir(tempDir);
    tempDir = "";
  }
});

describe("pdf-to-images tool", () => {
  it("converts all pages to png with default options", async () => {
    const { pdfToImages } = await import("../../src/tools/pdf-to-images");
    tempDir = await createTempDir("pdfzen-pdf-to-images-png-");

    const input = join(tempDir, "input.pdf");
    const outputDir = join(tempDir, "png-out");
    await createPdf(input, 2);

    const result = await pdfToImages({
      inputPath: input,
      outputDir,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.totalImages).toBe(2);
      expect(result.outputFiles).toHaveLength(2);
      expect(result.outputFiles?.every((filePath) => filePath.endsWith(".png"))).toBe(true);

      const bytes = new Uint8Array(await Bun.file(result.outputFiles?.[0] ?? "").arrayBuffer());
      expect(bytes[0]).toBe(0x89);
      expect(bytes[1]).toBe(0x50);
      expect(bytes[2]).toBe(0x4e);
      expect(bytes[3]).toBe(0x47);
    }
  });

  it("converts selected pages to jpg", async () => {
    const { pdfToImages } = await import("../../src/tools/pdf-to-images");
    tempDir = await createTempDir("pdfzen-pdf-to-images-jpg-");

    const input = join(tempDir, "input.pdf");
    const outputDir = join(tempDir, "jpg-out");
    await createPdf(input, 3);

    const result = await pdfToImages({
      inputPath: input,
      outputDir,
      format: "jpg",
      dpi: 100,
      pages: [2, 99],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.totalImages).toBe(1);
      expect(result.outputFiles?.[0]).toContain("_page_2.jpg");

      const bytes = new Uint8Array(await Bun.file(result.outputFiles?.[0] ?? "").arrayBuffer());
      expect(bytes[0]).toBe(0xff);
      expect(bytes[1]).toBe(0xd8);
      expect(bytes[2]).toBe(0xff);
    }
  });

  it("returns failure when input PDF is missing", async () => {
    const { pdfToImages } = await import("../../src/tools/pdf-to-images");

    const result = await pdfToImages({
      inputPath: "/tmp/missing.pdf",
      outputDir: "/tmp/out",
      format: "png",
      dpi: 150,
      pages: [1, 3],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error?.length).toBeGreaterThan(0);
    }
  });

  it("returns failure with pages='all' path when file is missing", async () => {
    const { pdfToImages } = await import("../../src/tools/pdf-to-images");

    const result = await pdfToImages({
      inputPath: "/tmp/missing-all.pdf",
      outputDir: "/tmp/out",
      format: "jpg",
      dpi: 100,
      pages: "all",
    });

    expect(result.success).toBe(false);
  });

  it("handles invalid pages value that throws during join", async () => {
    const { pdfToImages } = await import("../../src/tools/pdf-to-images");
    const result = await pdfToImages({
      inputPath: "/tmp/any.pdf",
      outputDir: "/tmp/out",
      pages: { join: null } as unknown as number[],
    });
    expect(result.success).toBe(false);
  });
});
