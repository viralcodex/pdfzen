import { describe, expect, it } from "bun:test";
import {
  backendCompressPdf,
  backendImagesToPdf,
  backendPdfToImages,
  backendProtectPdf,
  callBackend,
  checkBackendDeps,
  warmupBackend,
} from "../../src/utils/backend";

describe("backend utils", () => {
  it("returns a backend result shape for check-deps", async () => {
    const result = await callBackend("check-deps", {});
    expect(typeof result.success).toBe("boolean");
  });

  it("returns dependency check shape", async () => {
    const result = await checkBackendDeps();
    expect(typeof result.allInstalled).toBe("boolean");
    expect(typeof result.dependencies).toBe("object");
  });

  it("warms backend and returns result shape", async () => {
    const result = await warmupBackend();
    expect(typeof result.success).toBe("boolean");
  });

  it("backend wrappers return a result for missing files", async () => {
    const a = await backendPdfToImages({ input: "/tmp/missing.pdf", outputDir: "/tmp/out" });
    const b = await backendImagesToPdf({ inputs: ["/tmp/missing.png"], output: "/tmp/out.pdf" });
    const c = await backendProtectPdf({ input: "/tmp/missing.pdf", output: "/tmp/out.pdf", userPassword: "pw" });
    const d = await backendCompressPdf({ input: "/tmp/missing.pdf", output: "/tmp/out.pdf" });

    expect(typeof a.success).toBe("boolean");
    expect(typeof b.success).toBe("boolean");
    expect(typeof c.success).toBe("boolean");
    expect(typeof d.success).toBe("boolean");
  });
});
