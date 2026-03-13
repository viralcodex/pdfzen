import { describe, expect, it, mock } from "bun:test";

const backendModulePath = new URL("../../src/utils/backend.ts", import.meta.url).pathname;

let protectMode: "success" | "fallback" = "success";
let unprotectMode: "success" | "fallback" | "throw-error" = "success";

const backendProtectPdf = async () => {
  if (protectMode === "success") {
    return {
      success: true,
      outputPath: "/tmp/protected.pdf",
    };
  }

  return {
    success: false,
  };
};

const callBackend = async (command?: string) => {
  if (unprotectMode === "throw-error" && command === "unprotect") {
    throw new Error("mock unprotect failure");
  }

  if (unprotectMode === "success") {
    return {
      success: true,
      outputPath: "/tmp/unprotected.pdf",
    };
  }

  return {
    success: false,
  };
};

const mockFactory = () => ({
  backendCompressPdf: async () => ({ success: false, error: "stub" }),
  backendImagesToPdf: async () => ({ success: false, error: "stub" }),
  backendPdfToImages: async () => ({ success: false, error: "stub" }),
  backendProtectPdf,
  callBackend,
  checkBackendDeps: async () => ({ allInstalled: false, dependencies: {} }),
  installBackendDeps: async () => ({ success: false, error: "stub" }),
  warmupBackend: async () => ({ success: false, error: "stub" }),
});

mock.module("../../src/utils/backend", mockFactory);
mock.module(backendModulePath, mockFactory);
const { protectPDF, unprotectPDF } = await import("../../src/tools/protect");
mock.restore();

describe("protect tool branch coverage", () => {
  it("maps protect backend success payload", async () => {
    protectMode = "success";

    const result = await protectPDF({
      inputPath: "/tmp/in.pdf",
      outputPath: "/tmp/out.pdf",
      userPassword: "pw",
    });

    expect(result).toEqual({
      success: true,
      outputPath: "/tmp/protected.pdf",
    });
  });

  it("uses default protect error when backend omits error", async () => {
    protectMode = "fallback";

    const result = await protectPDF({
      inputPath: "/tmp/in.pdf",
      outputPath: "/tmp/out.pdf",
      ownerPassword: "owner",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unknown error");
    }
  });

  it("maps unprotect backend success payload", async () => {
    unprotectMode = "success";

    const result = await unprotectPDF("/tmp/in.pdf", "/tmp/out.pdf", "pw");

    expect(result).toEqual({
      success: true,
      outputPath: "/tmp/unprotected.pdf",
    });
  });

  it("uses default unprotect error when backend omits error", async () => {
    unprotectMode = "fallback";

    const result = await unprotectPDF("/tmp/in.pdf", "/tmp/out.pdf", "pw");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unknown error");
    }
  });

  it("maps thrown unprotect backend error", async () => {
    unprotectMode = "throw-error";

    const result = await unprotectPDF("/tmp/in.pdf", "/tmp/out.pdf", "pw");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("mock unprotect failure");
    }
  });

});
