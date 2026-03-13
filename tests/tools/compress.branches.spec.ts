import { describe, expect, it, mock } from "bun:test";

const backendModulePath = new URL("../../src/utils/backend.ts", import.meta.url).pathname;

let backendMode: "success" | "fallback" = "success";

const backendCompressPdf = async () => {
  if (backendMode === "success") {
    return {
      success: true,
      outputPath: "/tmp/compressed.pdf",
      originalSize: 1000,
      compressedSize: 500,
      compressionRatio: 50,
    };
  }

  return {
    success: false,
  };
};

const mockFactory = () => ({
  backendCompressPdf,
  backendImagesToPdf: async () => ({ success: false, error: "stub" }),
  backendPdfToImages: async () => ({ success: false, error: "stub" }),
  backendProtectPdf: async () => ({ success: false, error: "stub" }),
  callBackend: async () => ({ success: false, error: "stub" }),
  checkBackendDeps: async () => ({ allInstalled: false, dependencies: {} }),
  installBackendDeps: async () => ({ success: false, error: "stub" }),
  warmupBackend: async () => ({ success: false, error: "stub" }),
});

mock.module("../../src/utils/backend", mockFactory);
mock.module(backendModulePath, mockFactory);
const { compressPDF } = await import("../../src/tools/compress");
mock.restore();

describe("compress tool branch coverage", () => {
  it("maps backend success payload", async () => {
    backendMode = "success";

    const result = await compressPDF({
      inputPath: "/tmp/in.pdf",
      outputPath: "/tmp/out.pdf",
    });

    expect(result).toEqual({
      success: true,
      outputPath: "/tmp/compressed.pdf",
      originalSize: 1000,
      compressedSize: 500,
      compressionRatio: "50",
    });
  });

  it("uses default error when backend omits error", async () => {
    backendMode = "fallback";

    const result = await compressPDF({
      inputPath: "/tmp/in.pdf",
      outputPath: "/tmp/out.pdf",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Compression failed");
    }
  });
});
