import { describe, expect, it } from "bun:test";

describe("hero component wiring", () => {
  it("has a matching source file", async () => {
    const file = new URL("../../src/components/hero.tsx", import.meta.url);
    expect(await Bun.file(file).exists()).toBe(true);
  });
});
