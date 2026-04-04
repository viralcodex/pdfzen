import { describe, expect, it } from "bun:test";

describe("images-to-pdf tool", () => {
  it("filters supported image extensions", async () => {
    const { filterValidImages } = await import("../../src/tools/images-to-pdf");

    const result = filterValidImages([
      "one.png",
      "two.jpg",
      "three.jpeg",
      "four.gif",
      "five.pdf",
    ]);

    expect(result).toEqual(["one.png", "two.jpg", "three.jpeg"]);
  });

  it("accepts uppercase image extensions", async () => {
    const { filterValidImages } = await import("../../src/tools/images-to-pdf");
    const result = filterValidImages(["ONE.PNG", "TWO.JPEG", "bad.GIF"]);
    expect(result).toEqual(["ONE.PNG", "TWO.JPEG"]);
  });

  it("validates missing and unsupported inputs before conversion", async () => {
    const { imagesToPDF } = await import("../../src/tools/images-to-pdf");

    const empty = await imagesToPDF({
      inputPaths: [],
      outputPath: "/tmp/out.pdf",
    });
    expect(empty.success).toBe(false);

    const invalid = await imagesToPDF({
      inputPaths: ["one.gif", "two.bmp"],
      outputPath: "/tmp/out.pdf",
    });
    expect(invalid.success).toBe(false);
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
