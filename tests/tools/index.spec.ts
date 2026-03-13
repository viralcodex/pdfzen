import { describe, expect, it } from "bun:test";

describe("tools index exports", () => {
  it("re-exports all tool entry points", async () => {
    const tools = await import("../../src/tools/index");

    expect(typeof tools.mergePDFs).toBe("function");
    expect(typeof tools.splitPDF).toBe("function");
    expect(typeof tools.compressPDF).toBe("function");
    expect(typeof tools.rotatePDF).toBe("function");
    expect(typeof tools.deletePages).toBe("function");
    expect(typeof tools.pdfToImages).toBe("function");
    expect(typeof tools.imagesToPDF).toBe("function");
    expect(typeof tools.protectPDF).toBe("function");
  });
});
