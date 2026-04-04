import { describe, expect, it } from "bun:test";
import { protectPDF, unprotectPDF } from "../../src/tools/protect";

describe("protect tool branch coverage", () => {
  it("validates password requirements", async () => {
    const result = await protectPDF({
      inputPath: "/tmp/in.pdf",
      outputPath: "/tmp/out.pdf",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("At least one password");
    }
  });

  it("rejects passwords with invalid characters", async () => {
    const result = await protectPDF({
      inputPath: "/tmp/in.pdf",
      outputPath: "/tmp/out.pdf",
      userPassword: "pass,word",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("must not contain");
    }
  });

  it("returns failure when protecting a missing file", async () => {
    const result = await protectPDF({
      inputPath: "/tmp/missing.pdf",
      outputPath: "/tmp/protected.pdf",
      userPassword: "pw",
    });
    expect(result.success).toBe(false);
  });

  it("returns failure when unprotecting a missing file", async () => {
    const result = await unprotectPDF(
      "/tmp/missing-protected.pdf",
      "/tmp/unprotected.pdf",
      "pw",
    );
    expect(result.success).toBe(false);
  });

  it("catches thrown input getter errors in protectPDF", async () => {
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
