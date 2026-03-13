import { describe, expect, it } from "bun:test";
import {
  EmptyBorderChars,
  OUTPUT_DIR,
  linuxScript,
  osaScript,
  toolsMenu,
  windowsScript,
} from "../../src/constants/constants";

describe("constants", () => {
  it("defines OUTPUT_DIR under Documents/PDFZen", () => {
    expect(OUTPUT_DIR.endsWith("Documents/PDFZen")).toBe(true);
  });

  it("defines tools menu entries with unique commands", () => {
    const commands = toolsMenu.map((t) => t.command);
    expect(commands.length).toBeGreaterThanOrEqual(9);
    expect(new Set(commands).size).toBe(commands.length);
  });

  it("provides empty border chars", () => {
    expect(Object.values(EmptyBorderChars).every((v) => v === "")).toBe(true);
  });

  it("contains placeholders in picker scripts", () => {
    expect(osaScript.includes("{{type}}")).toBe(true);
    expect(windowsScript.includes("{{type}}")).toBe(true);
    expect(linuxScript.includes("{{type}}")).toBe(true);
  });
});
