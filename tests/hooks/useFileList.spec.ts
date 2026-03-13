import { describe, expect, it } from "bun:test";

describe("useFileList hook module", () => {
  it("exists and includes exported hook API", async () => {
    const file = new URL("../../src/hooks/useFileList.ts", import.meta.url);
    expect(await Bun.file(file).exists()).toBe(true);

    const code = await Bun.file(file).text();
    expect(code.includes("export function useFileList")).toBe(true);
    expect(code.includes("addFileToList")).toBe(true);
    expect(code.includes("addFilesToList")).toBe(true);
    expect(code.includes("clearAll")).toBe(true);
  });
});
