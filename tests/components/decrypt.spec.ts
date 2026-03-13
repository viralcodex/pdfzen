import { describe, expect, it } from "bun:test";

describe("decrypt component wiring", () => {
  it("has a matching source file", async () => {
    const file = new URL("../../src/components/decrypt.tsx", import.meta.url);
    expect(await Bun.file(file).exists()).toBe(true);
  });
});
