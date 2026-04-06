import { afterEach, describe, expect, it } from "bun:test";
import { stat } from "fs/promises";
import { join } from "path";
import { cleanupTempDir, createPdf, createPng, createTempDir, getPdfPageCount } from "./test-utils";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs) {
    await cleanupTempDir(dir);
  }
  tempDirs.length = 0;
});

describe("test-utils", () => {
  it("creates and cleans up temp directories", async () => {
    const dir = await createTempDir("pdfzen-test-utils-");
    tempDirs.push(dir);

    expect((await stat(dir)).isDirectory()).toBe(true);

    await cleanupTempDir(dir);
    tempDirs.pop();

    await expect(stat(dir)).rejects.toThrow();
  });

  it("creates pdf and returns page count", async () => {
    const dir = await createTempDir("pdfzen-test-utils-");
    tempDirs.push(dir);

    const pdfPath = join(dir, "sample.pdf");
    await createPdf(pdfPath, 4);

    const pages = await getPdfPageCount(pdfPath);
    expect(pages).toBe(4);
  });

  it("returns 0 when pdf path is undefined", async () => {
    expect(await getPdfPageCount(undefined)).toBe(0);
  });

  it("creates a valid png signature", async () => {
    const dir = await createTempDir("pdfzen-test-utils-");
    tempDirs.push(dir);

    const pngPath = join(dir, "pixel.png");
    await createPng(pngPath);

    const bytes = new Uint8Array(await Bun.file(pngPath).arrayBuffer());
    expect(bytes[0]).toBe(0x89);
    expect(bytes[1]).toBe(0x50);
    expect(bytes[2]).toBe(0x4e);
    expect(bytes[3]).toBe(0x47);
  });
});
