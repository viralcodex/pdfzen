import { describe, expect, it, mock } from "bun:test";

const backendModulePath = new URL("../../src/utils/backend.ts", import.meta.url).pathname;

let backendMode: "success" | "fallback" = "success";

const backendPdfToImages = async () => {
  if (backendMode === "success") {
    return {
      success: true,
      outputFiles: ["/tmp/out/page-1.png", "/tmp/out/page-2.png"],
      totalImages: 2,
    };
  }

  return {
    success: false,
  };
};

const mockFactory = () => ({
  backendCompressPdf: async () => ({ success: false, error: "stub" }),
  backendImagesToPdf: async () => ({ success: false, error: "stub" }),
  backendPdfToImages,
  backendProtectPdf: async () => ({ success: false, error: "stub" }),
  callBackend: async () => ({ success: false, error: "stub" }),
  checkBackendDeps: async () => ({ allInstalled: false, dependencies: {} }),
  installBackendDeps: async () => ({ success: false, error: "stub" }),
  warmupBackend: async () => ({ success: false, error: "stub" }),
});

mock.module("../../src/utils/backend", mockFactory);
mock.module(backendModulePath, mockFactory);
const { pdfToImages } = await import("../../src/tools/pdf-to-images");
mock.restore();

describe("pdf-to-images tool branch coverage", () => {
  it("maps backend success payload", async () => {
    backendMode = "success";

    const result = await pdfToImages({
      inputPath: "/tmp/in.pdf",
      outputDir: "/tmp/out",
      pages: [1, 2],
    });

    expect(result).toEqual({
      success: true,
      outputFiles: ["/tmp/out/page-1.png", "/tmp/out/page-2.png"],
      totalImages: 2,
    });
  });

  it("uses default error when backend omits error", async () => {
    backendMode = "fallback";

    const result = await pdfToImages({
      inputPath: "/tmp/in.pdf",
      outputDir: "/tmp/out",
      pages: "all",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unknown error");
    }
  });
});
