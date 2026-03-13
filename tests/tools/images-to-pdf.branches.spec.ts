import { describe, expect, it, mock } from "bun:test";

const backendModulePath = new URL("../../src/utils/backend.ts", import.meta.url).pathname;

let backendMode: "success" | "fallback" = "success";

const backendImagesToPdf = async () => {
  if (backendMode === "success") {
    return {
      success: true,
      outputPath: "/tmp/from-images.pdf",
      totalPages: 2,
    };
  }

  return {
    success: false,
  };
};

const mockFactory = () => ({
  backendCompressPdf: async () => ({ success: false, error: "stub" }),
  backendImagesToPdf,
  backendPdfToImages: async () => ({ success: false, error: "stub" }),
  backendProtectPdf: async () => ({ success: false, error: "stub" }),
  callBackend: async () => ({ success: false, error: "stub" }),
  checkBackendDeps: async () => ({ allInstalled: false, dependencies: {} }),
  installBackendDeps: async () => ({ success: false, error: "stub" }),
  warmupBackend: async () => ({ success: false, error: "stub" }),
});

mock.module("../../src/utils/backend", mockFactory);
mock.module(backendModulePath, mockFactory);
const { imagesToPDF } = await import("../../src/tools/images-to-pdf");
mock.restore();

describe("images-to-pdf tool branch coverage", () => {
  it("maps backend success payload", async () => {
    backendMode = "success";

    const result = await imagesToPDF({
      inputPaths: ["one.jpg", "two.png"],
      outputPath: "/tmp/out.pdf",
    });

    expect(result).toEqual({
      success: true,
      outputPath: "/tmp/from-images.pdf",
      totalPages: 2,
    });
  });

  it("uses default error when backend omits error", async () => {
    backendMode = "fallback";

    const result = await imagesToPDF({
      inputPaths: ["one.jpg"],
      outputPath: "/tmp/out.pdf",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unknown error");
    }
  });
});
