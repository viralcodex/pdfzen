import { describe, expect, it } from "bun:test";

describe("pdf-to-images component wiring", () => {
  it("has a matching source file", async () => {
    const file = new URL("../../src/components/pdf-to-images.tsx", import.meta.url);
    expect(await Bun.file(file).exists()).toBe(true);
  });
});
