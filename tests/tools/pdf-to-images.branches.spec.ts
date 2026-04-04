import { describe, expect, it } from "bun:test";
import { pdfToImages } from "../../src/tools/pdf-to-images";

describe("pdf-to-images tool branch coverage", () => {
  it("returns failure when input PDF is missing", async () => {
    const result = await pdfToImages({
      inputPath: "/tmp/missing.pdf",
      outputDir: "/tmp/out",
      pages: [1, 2],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error?.length).toBeGreaterThan(0);
    }
  });

  it("returns failure with pages='all' path when file is missing", async () => {
    const result = await pdfToImages({
      inputPath: "/tmp/missing-all.pdf",
      outputDir: "/tmp/out",
      pages: "all",
    });

    expect(result.success).toBe(false);
  });
});
