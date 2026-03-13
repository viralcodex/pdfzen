import { describe, expect, it } from "bun:test";

describe("delete component wiring", () => {
  it("has a matching source file", async () => {
    const file = new URL("../../src/components/delete.tsx", import.meta.url);
    expect(await Bun.file(file).exists()).toBe(true);
  });
});
