import { afterEach, describe, expect, it } from "bun:test";
import { PDFDocument } from "pdf-lib";
import { join } from "path";
import { cleanupTempDir, createJpg, createPng, createTempDir, getPdfPageCount } from "../utils/test-utils";

let tempDir = "";

afterEach(async () => {
  if (tempDir) {
    await cleanupTempDir(tempDir);
    tempDir = "";
  }
});

const getFirstPageSize = async (pdfPath: string) => {
  const pdfBytes = await Bun.file(pdfPath).arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const page = pdfDoc.getPage(0);

  return {
    width: page.getWidth(),
    height: page.getHeight(),
  };
};

describe("images-to-pdf tool", () => {
  it("converts png and jpg images into a single pdf", async () => {
    const { imagesToPDF } = await import("../../src/tools/images-to-pdf");
    tempDir = await createTempDir("tuidf-images-to-pdf-");

    const pngPath = join(tempDir, "pixel.png");
    const jpgPath = join(tempDir, "pixel.jpg");
    const output = join(tempDir, "images.pdf");

    await createPng(pngPath);
    await createJpg(jpgPath);

    const result = await imagesToPDF({
      inputPaths: [pngPath, jpgPath],
      outputPath: output,
      pageSize: "fit",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.totalPages).toBe(2);
      expect(await getPdfPageCount(output)).toBe(2);
    }
  });

  it("supports a4 and letter output sizes", async () => {
    const { imagesToPDF } = await import("../../src/tools/images-to-pdf");
    tempDir = await createTempDir("tuidf-images-to-pdf-page-sizes-");

    const pngPath = join(tempDir, "pixel.png");
    const a4Output = join(tempDir, "a4.pdf");
    const letterOutput = join(tempDir, "letter.pdf");
    await createPng(pngPath);

    const a4Result = await imagesToPDF({
      inputPaths: [pngPath],
      outputPath: a4Output,
      pageSize: "a4",
    });
    const letterResult = await imagesToPDF({
      inputPaths: [pngPath],
      outputPath: letterOutput,
      pageSize: "letter",
    });

    expect(a4Result.success).toBe(true);
    expect(letterResult.success).toBe(true);

    const a4Page = await getFirstPageSize(a4Output);
    const letterPage = await getFirstPageSize(letterOutput);

    expect(Math.round(a4Page.width)).toBe(595);
    expect(Math.round(a4Page.height)).toBe(842);
    expect(Math.round(letterPage.width)).toBe(612);
    expect(Math.round(letterPage.height)).toBe(792);
  });

  it("filters supported image extensions", async () => {
    const { filterValidImages } = await import("../../src/tools/images-to-pdf");

    const result = filterValidImages(["one.png", "two.jpg", "three.jpeg", "four.gif", "five.pdf"]);

    expect(result).toEqual(["one.png", "two.jpg", "three.jpeg"]);
  });

  it("accepts uppercase image extensions", async () => {
    const { filterValidImages } = await import("../../src/tools/images-to-pdf");
    const result = filterValidImages(["ONE.PNG", "TWO.JPEG", "bad.GIF"]);
    expect(result).toEqual(["ONE.PNG", "TWO.JPEG"]);
  });

  it("rejects empty input paths", async () => {
    const { imagesToPDF } = await import("../../src/tools/images-to-pdf");

    const result = await imagesToPDF({
      inputPaths: [],
      outputPath: "/tmp/out.pdf",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No images provided");
    }
  });

  it("rejects unsupported input paths", async () => {
    const { imagesToPDF } = await import("../../src/tools/images-to-pdf");

    const result = await imagesToPDF({
      inputPaths: ["one.gif", "two.bmp"],
      outputPath: "/tmp/out.pdf",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No valid images provided");
    }
  });

  it("returns failure when valid image paths do not exist", async () => {
    const { imagesToPDF } = await import("../../src/tools/images-to-pdf");
    const result = await imagesToPDF({
      inputPaths: ["/tmp/nope.jpg"],
      outputPath: "/tmp/out.pdf",
      pageSize: "fit",
    });
    expect(result.success).toBe(false);
  });

  it("handles unexpected throw while filtering image paths", async () => {
    const { imagesToPDF } = await import("../../src/tools/images-to-pdf");
    const result = await imagesToPDF({
      inputPaths: [undefined as unknown as string],
      outputPath: "/tmp/out.pdf",
    });
    expect(result.success).toBe(false);
  });
});
