import { describe, expect, it } from "bun:test";

describe("main-ui tool wiring", () => {
  it("maps every tool menu command to a rendered component", async () => {
    const constantsFile = new URL("../../src/constants/constants.ts", import.meta.url);
    const mainUiFile = new URL("../../src/components/main-ui.tsx", import.meta.url);
    const constantsCode = await Bun.file(constantsFile).text();
    const mainUiCode = await Bun.file(mainUiFile).text();

    const commandMatches = [...constantsCode.matchAll(/command:\s*"([^"]+)"/g)];
    const commands = commandMatches.map((match) => match[1]);

    expect(commands.length).toBeGreaterThan(0);

    for (const command of commands) {
      expect(mainUiCode.includes(`${command}:`)).toBe(true);
    }
  });
});