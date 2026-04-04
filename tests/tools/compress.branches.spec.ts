import { describe, expect, it } from "bun:test";
import { compressPDF, formatFileSize } from "../../src/tools/compress";

describe("compress tool branch coverage", () => {
  it("returns failure for non-existent input file", async () => {
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

  it("formats file sizes", () => {
    expect(formatFileSize(512)).toBe("512.00 B");
    expect(formatFileSize(1024)).toBe("1.00 KB");
    expect(formatFileSize(1024 * 1024)).toBe("1.00 MB");
    expect(formatFileSize(1024 * 1024 * 1024)).toBe("1.00 GB");
  });
});
