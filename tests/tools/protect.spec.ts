import { afterEach, describe, expect, it } from "bun:test";
import { join } from "path";
import {
  cleanupTempDir,
  createPdf,
  createTempDir,
  getPdfPageCount,
  withMockedOpenDocument,
} from "../utils/test-utils";

let tempDir = "";

afterEach(async () => {
  if (tempDir) {
    await cleanupTempDir(tempDir);
    tempDir = "";
  }
});

describe("protect tool", () => {
  it("protects and unprotects a pdf with passwords", async () => {
    const { protectPDF, unprotectPDF } = await import("../../src/tools/protect");
    tempDir = await createTempDir("tuidf-protect-");

    const input = join(tempDir, "input.pdf");
    const protectedPath = join(tempDir, "protected.pdf");
    const unprotectedPath = join(tempDir, "unprotected.pdf");
    await createPdf(input, 2);

    const protectedResult = await protectPDF({
      inputPath: input,
      outputPath: protectedPath,
      userPassword: "reader",
      ownerPassword: "owner",
      permissions: {
        print: false,
        modify: false,
        copy: false,
        annotate: false,
      },
    });

    expect(protectedResult.success).toBe(true);
    expect(await Bun.file(protectedPath).exists()).toBe(true);

    const unprotectedResult = await unprotectPDF(protectedPath, unprotectedPath, "reader");

    expect(unprotectedResult.success).toBe(true);
    if (unprotectedResult.success) {
      expect(await getPdfPageCount(unprotectedPath)).toBe(2);
    }
  });

  it("rejects inputs that cannot be treated as pdf documents", async () => {
    const { protectPDF } = await import("../../src/tools/protect");
    tempDir = await createTempDir("tuidf-protect-invalid-doc-");

    const input = join(tempDir, "input.pdf");
    await createPdf(input, 1);

    const result = await withMockedOpenDocument(
      () => ({ asPDF: () => null }),
      () =>
        protectPDF({
          inputPath: input,
          outputPath: join(tempDir, "out.pdf"),
          userPassword: "reader",
        }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Not a valid PDF document");
    }
  });

  it("rejects protected inputs that cannot be converted back into pdf documents", async () => {
    const { unprotectPDF } = await import("../../src/tools/protect");
    tempDir = await createTempDir("tuidf-unprotect-invalid-doc-");

    const input = join(tempDir, "input.pdf");
    await createPdf(input, 1);

    const result = await withMockedOpenDocument(
      () => ({
        needsPassword: () => false,
        asPDF: () => null,
      }),
      () => unprotectPDF(input, join(tempDir, "out.pdf"), "reader"),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Not a valid PDF document");
    }
  });

  it("rejects an incorrect password for a protected pdf", async () => {
    const { protectPDF, unprotectPDF } = await import("../../src/tools/protect");
    tempDir = await createTempDir("tuidf-protect-wrong-password-");

    const input = join(tempDir, "input.pdf");
    const protectedPath = join(tempDir, "protected.pdf");
    await createPdf(input, 1);

    const protectedResult = await protectPDF({
      inputPath: input,
      outputPath: protectedPath,
      userPassword: "reader",
    });

    expect(protectedResult.success).toBe(true);

    const result = await unprotectPDF(protectedPath, join(tempDir, "wrong.pdf"), "wrong");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Incorrect password");
    }
  });

  it("defaults a missing owner password to the user password", async () => {
    const { protectPDF } = await import("../../src/tools/protect");
    tempDir = await createTempDir("tuidf-protect-owner-fallback-");

    const input = join(tempDir, "input.pdf");
    const output = join(tempDir, "protected.pdf");
    let saveOptions = "";

    await createPdf(input, 1);

    const result = await withMockedOpenDocument(
      () => ({
        asPDF: () => ({
          saveToBuffer: (options: string) => {
            saveOptions = options;
            return {
              asUint8Array: () => new Uint8Array([37, 80, 68, 70]),
            };
          },
        }),
      }),
      () =>
        protectPDF({
          inputPath: input,
          outputPath: output,
          userPassword: "reader",
        }),
    );

    expect(result.success).toBe(true);
    expect(saveOptions).toContain("user-password=reader");
    expect(saveOptions).toContain("owner-password=reader");
  });

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

  it("rejects passwords with invalid delimiter characters", async () => {
    const { protectPDF } = await import("../../src/tools/protect");

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

  it("returns failure for missing input files", async () => {
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

  it("accepts owner-only passwords before failing on a missing input file", async () => {
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
