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

describe("rotate tool", () => {
  it("rotates all pages", async () => {
    const { rotatePDF, getPDFRotations } = await import("../../src/tools/rotate");
    tempDir = await createTempDir("pdfzen-rotate-");

    const input = join(tempDir, "input.pdf");
    const output = join(tempDir, "rotated.pdf");
    await createPdf(input, 2);

    const result = await rotatePDF({
      inputPath: input,
      outputPath: output,
      rotation: 90,
      pages: "all",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.rotatedPages).toBe(2);
    }

    const rotations = await getPDFRotations(output);
    expect(rotations.map((r) => r.rotation)).toEqual([90, 90]);
  });

  it("rotates only selected valid pages", async () => {
    const { rotatePDF, getPDFRotations } = await import("../../src/tools/rotate");
    tempDir = await createTempDir("pdfzen-rotate-selected-");

    const input = join(tempDir, "input.pdf");
    const output = join(tempDir, "rotated.pdf");
    await createPdf(input, 3);

    const result = await rotatePDF({
      inputPath: input,
      outputPath: output,
      rotation: 180,
      pages: [2, 99],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.rotatedPages).toBe(1);
    }

    const rotations = await getPDFRotations(output);
    expect(rotations.map((r) => r.rotation)).toEqual([0, 180, 0]);
  });

  it("returns failure when rotate input file is missing", async () => {
    const { rotatePDF } = await import("../../src/tools/rotate");
    tempDir = await createTempDir("pdfzen-rotate-missing-");

    const result = await rotatePDF({
      inputPath: join(tempDir, "missing.pdf"),
      outputPath: join(tempDir, "out.pdf"),
      rotation: 90,
      pages: "all",
    });

    expect(result.success).toBe(false);
  });

  it("throws clear error for invalid PDF in getPDFRotations", async () => {
    const { getPDFRotations } = await import("../../src/tools/rotate");
    tempDir = await createTempDir("pdfzen-rotate-invalid-");

    const notPdf = join(tempDir, "bad.pdf");
    await Bun.write(notPdf, "not a real pdf");

    await expect(getPDFRotations(notPdf)).rejects.toThrow("Failed to get PDF rotations");
  });
});
