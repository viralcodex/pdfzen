import { describe, expect, it } from "bun:test";

describe("protect tool", () => {
  it("validates password requirements", async () => {
    const { protectPDF } = await import("../../src/tools/protect");

    const result = await protectPDF({
      inputPath: "/tmp/in.pdf",
      outputPath: "/tmp/out.pdf",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("At least one password");
    }
  });

  it("returns failure when unprotecting a missing file", async () => {
    const { protectPDF, unprotectPDF } = await import("../../src/tools/protect");

    const protectedResult = await protectPDF({
      inputPath: "/tmp/missing.pdf",
      outputPath: "/tmp/protected.pdf",
      userPassword: "pw",
    });
    expect(protectedResult.success).toBe(false);

    const unprotectedResult = await unprotectPDF(
      "/tmp/missing-protected.pdf",
      "/tmp/unprotected.pdf",
      "pw",
    );
    expect(unprotectedResult.success).toBe(false);
  });

  it("accepts owner password path and reaches protect logic", async () => {
    const { protectPDF } = await import("../../src/tools/protect");

    const result = await protectPDF({
      inputPath: "/tmp/missing.pdf",
      outputPath: "/tmp/protected-owner.pdf",
      ownerPassword: "owner-secret",
      permissions: {
        copy: false,
        print: true,
      },
    });

    expect(result.success).toBe(false);
  });

  it("catches thrown input getter errors in protectPDF", async () => {
    const { protectPDF } = await import("../../src/tools/protect");

    const result = await protectPDF({
      get userPassword() {
        throw new Error("bad-password-getter");
      },
      ownerPassword: "x",
      inputPath: "/tmp/in.pdf",
      outputPath: "/tmp/out.pdf",
    } as unknown as Parameters<typeof protectPDF>[0]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("bad-password-getter");
    }
  });

});
