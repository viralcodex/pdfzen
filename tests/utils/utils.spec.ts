import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { stat } from "fs/promises";
import { truncate } from "node:fs/promises";
import { rename } from "node:fs/promises";
import {
  clearOpenedFiles,
  closeFileTracking,
  chunkArray,
  formatFileSize,
  formatModifiedLabel,
  getFormattedFileMetadata,
  getOutputDir,
  getOutputPath,
  getPageCount,
  handleFileExplorer,
  openFile,
  openOutputFolder,
  unescapePath,
  validateImageFile,
  validatePdfFile,
} from "../../src/utils/utils";
import { OUTPUT_DIR } from "../../src/constants/constants";
import { createPdf } from "./test-utils";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((d) => rm(d, { recursive: true, force: true })));
  tempDirs.length = 0;
  clearOpenedFiles();
});

describe("utils", () => {
  type SpawnImpl = (cmd: string[]) => {
    exited: Promise<number>;
    stdout?: ReadableStream<Uint8Array>;
  };

  const setPlatform = (platform: NodeJS.Platform) => {
    const descriptor = Object.getOwnPropertyDescriptor(process, "platform");
    Object.defineProperty(process, "platform", { value: platform });
    return () => {
      if (descriptor) Object.defineProperty(process, "platform", descriptor);
    };
  };

  const setSpawn = (impl: SpawnImpl) => {
    const originalSpawn = Bun.spawn;
    (Bun as unknown as { spawn: SpawnImpl }).spawn = impl;
    return () => {
      (Bun as unknown as { spawn: typeof Bun.spawn }).spawn = originalSpawn;
    };
  };

  const silenceConsoleMethod = (method: "warn" | "error") => {
    const original = console[method];
    console[method] = (() => {}) as (typeof console)[typeof method];
    return () => {
      console[method] = original;
    };
  };

  const mouseEvent = (button: number): import("@opentui/core").MouseEvent =>
    ({ button }) as unknown as import("@opentui/core").MouseEvent;

  const textStream = (text: string): ReadableStream<Uint8Array> =>
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(text));
        controller.close();
      },
    });

  it("chunks arrays by size", () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunkArray([], 3)).toEqual([]);
  });

  it("formats file sizes and modified timestamps", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatModifiedLabel(new Date())).toMatch(/^updated today /);
    expect(formatModifiedLabel(new Date(2020, 0, 2, 12, 0, 0))).toMatch(/^Updated /);
  });

  it("unescapes shell-escaped paths", () => {
    expect(unescapePath("/tmp/My\\ File.pdf")).toBe("/tmp/My File.pdf");
  });

  it("validates pdf and image files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "tuidf-utils-"));
    tempDirs.push(dir);

    const pdfPath = join(dir, "sample.pdf");
    const txtPath = join(dir, "sample.txt");
    const imagePath = join(dir, "image.jpg");

    await createPdf(pdfPath, 1);
    await Bun.write(txtPath, "hello");
    await Bun.write(imagePath, "not-real-image-bytes");

    expect((await validatePdfFile(pdfPath)).valid).toBe(true);
    expect((await validatePdfFile(txtPath)).valid).toBe(false);
    expect((await validateImageFile(imagePath)).valid).toBe(true);
    expect((await validateImageFile(pdfPath)).valid).toBe(false);
  });

  it("rejects oversized pdf and image files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "tuidf-large-"));
    tempDirs.push(dir);

    const largePdf = join(dir, "large.pdf");
    const largeJpg = join(dir, "large.jpg");

    await Bun.write(largePdf, "x");
    await Bun.write(largeJpg, "x");
    await truncate(largePdf, 101 * 1024 * 1024);
    await truncate(largeJpg, 101 * 1024 * 1024);

    const pdf = await validatePdfFile(largePdf);
    const img = await validateImageFile(largeJpg);

    expect(pdf.valid).toBe(false);
    expect(pdf.error).toContain("File too large");
    expect(img.valid).toBe(false);
    expect(img.error).toContain("File too large");
  });

  it("handles validate catch paths when Bun.file throws", async () => {
    const originalBunFile = Bun.file;
    (Bun as unknown as { file: (path: string) => ReturnType<typeof Bun.file> }).file = () => {
      throw new Error("file-access-failed");
    };

    try {
      const pdf = await validatePdfFile("/tmp/any.pdf");
      const img = await validateImageFile("/tmp/any.jpg");

      expect(pdf.valid).toBe(false);
      expect(pdf.error).toBe("File not found");
      expect(img.valid).toBe(false);
      expect(img.error).toBe("File not found");
    } finally {
      (Bun as unknown as { file: typeof Bun.file }).file = originalBunFile;
    }
  });

  it("returns page count for valid pdf and 0 for invalid files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "tuidf-pages-"));
    tempDirs.push(dir);

    const pdfPath = join(dir, "multi.pdf");
    const txtPath = join(dir, "not-a-pdf.txt");

    await createPdf(pdfPath, 3);
    await Bun.write(txtPath, "plain text");

    expect(await getPageCount(pdfPath)).toBe(3);
    expect(await getPageCount(txtPath)).toBe(0);
  });

  it("returns formatted file metadata with optional page counts", async () => {
    const dir = await mkdtemp(join(tmpdir(), "tuidf-metadata-"));
    tempDirs.push(dir);

    const pdfPath = join(dir, "meta.pdf");
    await createPdf(pdfPath, 2);

    const withPageCount = await getFormattedFileMetadata(pdfPath, {
      includePageCount: true,
    });
    const withoutPageCount = await getFormattedFileMetadata(pdfPath);
    const missing = await getFormattedFileMetadata(join(dir, "missing.pdf"));

    expect(withPageCount.pageCount).toBe(2);
    expect(withPageCount.size.length).toBeGreaterThan(0);
    expect(withPageCount.modified).toMatch(/^(updated today|Updated )/);

    expect(withoutPageCount.pageCount).toBeNull();
    expect(missing.modified).toBeNull();
    expect(missing.pageCount).toBeNull();
  });

  it("creates output paths and reuses cached output for same input+prefix", async () => {
    const first = await getOutputPath("merge", "/tmp/input.pdf");
    const second = await getOutputPath("merge", "/tmp/input.pdf");
    const third = await getOutputPath("split", "/tmp/input.pdf");

    expect(first).toBe(second);
    expect(third).not.toBe(first);
    expect(first.endsWith("input-merge.pdf")).toBe(true);
  });

  it("creates timestamped output directory", async () => {
    const out = await getOutputDir("pdf-to-images");
    expect(out.includes("pdf-to-images-")).toBe(true);
    expect((await stat(out)).isDirectory()).toBe(true);
  });

  it("opens output folder when stat is directory", async () => {
    const spawned: string[][] = [];

    const restoreSpawn = setSpawn((cmd: string[]) => {
      spawned.push(cmd);
      return { exited: Promise.resolve(0), stdout: textStream("") };
    });

    try {
      await expect(openOutputFolder("/tmp")).resolves.toBeUndefined();
      expect(spawned.length).toBe(1);
    } finally {
      restoreSpawn();
    }
  });

  it("throws when output path is not a directory", async () => {
    const restoreError = silenceConsoleMethod("error");

    const dir = await mkdtemp(join(tmpdir(), "tuidf-not-dir-"));
    tempDirs.push(dir);
    const filePath = join(dir, "file.txt");
    await Bun.write(filePath, "x");

    try {
      await expect(openOutputFolder(filePath)).rejects.toThrow("not a directory");
    } finally {
      restoreError();
    }
  });

  it("opens file once until tracking is cleared", async () => {
    const spawned: string[][] = [];

    const restoreSpawn = setSpawn((cmd: string[]) => {
      spawned.push(cmd);
      return { exited: Promise.resolve(0), stdout: textStream("") };
    });

    try {
      await openFile("/tmp/a.pdf");
      await openFile("/tmp/a.pdf");

      closeFileTracking("/tmp/a.pdf");
      await openFile("/tmp/a.pdf");

      clearOpenedFiles();
      await openFile("/tmp/a.pdf");

      expect(spawned.length).toBe(3);
    } finally {
      restoreSpawn();
    }
  });

  it("swallows openFile spawn failures", async () => {
    const restoreWarn = silenceConsoleMethod("warn");
    const restoreSpawn = setSpawn(() => {
      throw new Error("spawn-failed");
    });

    try {
      await expect(openFile("/tmp/force-spawn-fail.pdf")).resolves.toBeUndefined();
    } finally {
      restoreSpawn();
      restoreWarn();
    }
  });

  it("handles file explorer platform branches and cancel/error paths", async () => {
    const rightClick = mouseEvent(2);

    expect(await handleFileExplorer(rightClick, "pdf")).toEqual([]);
  });

  it("handles file explorer success/cancel/error on darwin", async () => {
    const restorePlatform = setPlatform("darwin");
    const calls: string[][] = [];

    const restoreSpawn = setSpawn((cmd: string[]) => {
      calls.push(cmd);
      if (calls.length === 1) {
        return {
          exited: Promise.resolve(0),
          stdout: textStream("/tmp/a.pdf\n/tmp/b.pdf\n"),
        };
      }
      if (calls.length === 2) {
        return {
          exited: Promise.resolve(1),
          stdout: textStream(""),
        };
      }
      throw new Error("spawn explosion");
    });

    try {
      const leftClick = mouseEvent(0);

      expect(await handleFileExplorer(leftClick, "pdf")).toEqual(["/tmp/a.pdf", "/tmp/b.pdf"]);
      expect(await handleFileExplorer(leftClick, "image")).toEqual([]);
      expect(await handleFileExplorer(leftClick, "pdf")).toEqual([]);

      expect(calls[0]?.[0]).toBe("osascript");
    } finally {
      restoreSpawn();
      restorePlatform();
    }
  });

  it("builds platform-specific open commands for win32/linux", async () => {
    const spawned: string[][] = [];

    const restoreSpawn = setSpawn((cmd: string[]) => {
      spawned.push(cmd);
      return { exited: Promise.resolve(0), stdout: textStream("") };
    });

    const restoreWin = setPlatform("win32");
    try {
      await openFile("C:/tmp/file.pdf");
    } finally {
      restoreWin();
    }

    const restoreLinux = setPlatform("linux");
    try {
      await openFile("/tmp/linux.pdf");
      await openOutputFolder("/tmp");
      const leftClick = mouseEvent(0);
      await handleFileExplorer(leftClick, "image");
    } finally {
      restoreLinux();
      restoreSpawn();
    }

    expect(spawned.some((cmd) => cmd[0] === "cmd")).toBe(true);
    expect(spawned.some((cmd) => cmd[0] === "xdg-open")).toBe(true);
    expect(spawned.some((cmd) => cmd[0] === "zenity")).toBe(true);
  });

  it("handles win32 file explorer branch", async () => {
    const restorePlatform = setPlatform("win32");
    const calls: string[][] = [];

    const restoreSpawn = setSpawn((cmd: string[]) => {
      calls.push(cmd);
      return {
        exited: Promise.resolve(1),
        stdout: textStream(""),
      };
    });

    try {
      const leftClick = mouseEvent(0);
      expect(await handleFileExplorer(leftClick, "pdf")).toEqual([]);
      expect(await handleFileExplorer(leftClick, "image")).toEqual([]);
      expect(calls.every((cmd) => cmd[0] === "powershell")).toBe(true);
    } finally {
      restoreSpawn();
      restorePlatform();
    }
  });

  it("covers ensureOutputDir failure path", async () => {
    const originalWarn = console.warn;
    const warns: unknown[][] = [];
    let movedDir = false;
    const backupDir = `${OUTPUT_DIR}-backup-${Date.now()}`;

    console.warn = (...args: unknown[]) => {
      warns.push(args);
    };

    try {
      try {
        const st = await stat(OUTPUT_DIR);
        if (st.isDirectory()) {
          await rename(OUTPUT_DIR, backupDir);
          movedDir = true;
        }
      } catch {
        // OUTPUT_DIR may not exist yet.
      }

      await Bun.write(OUTPUT_DIR, "not-a-directory");
      await getOutputPath("mkdir-catch", "/tmp/input.pdf");

      expect(warns.some((w) => String(w[0]).includes("Could not create output directory"))).toBe(
        true,
      );
    } finally {
      try {
        await rm(OUTPUT_DIR, { recursive: true, force: true });
      } catch {
        // Best effort cleanup.
      }

      if (movedDir) {
        await rename(backupDir, OUTPUT_DIR);
      }

      console.warn = originalWarn;
    }
  });
});
