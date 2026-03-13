import { describe, expect, it } from "bun:test";

describe("images-to-pdf component wiring", () => {
  it("has a matching source file", async () => {
    const file = new URL("../../src/components/images-to-pdf.tsx", import.meta.url);
    expect(await Bun.file(file).exists()).toBe(true);
  });
});
