import { describe, expect, it } from "bun:test";

describe("rotate component wiring", () => {
  it("has a matching source file", async () => {
    const file = new URL("../../src/components/rotate.tsx", import.meta.url);
    expect(await Bun.file(file).exists()).toBe(true);
  });
});
