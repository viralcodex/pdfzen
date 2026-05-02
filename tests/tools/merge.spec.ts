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

describe("merge tool", () => {
  it("merges multiple PDFs into one", async () => {
    const { mergePDFs } = await import("../../src/tools/merge");
    tempDir = await createTempDir("tuidf-merge-");

    const first = join(tempDir, "first.pdf");
    const second = join(tempDir, "second.pdf");
    const output = join(tempDir, "merged.pdf");

    await createPdf(first, 1);
    await createPdf(second, 2);

    const result = await mergePDFs({ inputPaths: [first, second], outputPath: output });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.pageCount).toBe(3);
      expect(await getPdfPageCount(result.outputPath)).toBe(3);
    }
  });

  it("requires at least two input files", async () => {
    const { mergePDFs } = await import("../../src/tools/merge");

    const result = await mergePDFs({
      inputPaths: ["/tmp/only-one.pdf"],
      outputPath: "/tmp/output.pdf",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("At least 2 PDF files");
    }
  });

  it("fails when one input file is not a valid PDF", async () => {
    const { mergePDFs } = await import("../../src/tools/merge");
    tempDir = await createTempDir("tuidf-merge-invalid-");

    const valid = join(tempDir, "valid.pdf");
    const invalid = join(tempDir, "invalid.pdf");
    const output = join(tempDir, "merged.pdf");

    await createPdf(valid, 1);
    await Bun.write(invalid, "this is not a pdf");

    const result = await mergePDFs({ inputPaths: [valid, invalid], outputPath: output });
    expect(result.success).toBe(false);
  });

  it("returns an unknown error when a non-Error value is thrown", async () => {
    const { mergePDFs } = await import("../../src/tools/merge");

    const result = await mergePDFs({
      get inputPaths() {
        throw "bad-input-paths";
      },
      outputPath: "/tmp/merged.pdf",
    } as unknown as Parameters<typeof mergePDFs>[0]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unknown error occurred");
    }
  });
});
