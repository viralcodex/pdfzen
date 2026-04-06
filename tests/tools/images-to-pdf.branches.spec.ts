import { describe, expect, it } from "bun:test";
import { imagesToPDF, filterValidImages } from "../../src/tools/images-to-pdf";

describe("images-to-pdf tool branch coverage", () => {
  it("rejects empty input paths", async () => {
    const result = await imagesToPDF({
      inputPaths: [],
      outputPath: "/tmp/out.pdf",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe("No images provided");
  });

  it("rejects all-invalid image paths", async () => {
    const result = await imagesToPDF({
      inputPaths: ["one.gif", "two.bmp"],
      outputPath: "/tmp/out.pdf",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe("No valid images provided");
  });

  it("returns failure when valid image paths do not exist", async () => {
    const result = await imagesToPDF({
      inputPaths: ["/tmp/nope.jpg"],
      outputPath: "/tmp/out.pdf",
      pageSize: "fit",
    });
    expect(result.success).toBe(false);
  });

  it("filters supported image extensions", () => {
    const result = filterValidImages(["one.png", "two.jpg", "three.jpeg", "four.gif", "five.pdf"]);
    expect(result).toEqual(["one.png", "two.jpg", "three.jpeg"]);
  });
});
