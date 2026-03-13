import { describe, expect, it } from "bun:test";

describe("pdf-to-images tool", () => {
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
