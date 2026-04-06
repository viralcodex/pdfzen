import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { PDFDocument } from "pdf-lib";

export async function createTempDir(prefix = "pdfzen-test-"): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix));
}

export async function cleanupTempDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}

export async function createPdf(filePath: string, pages = 1): Promise<void> {
  const pdf = await PDFDocument.create();

  for (let i = 0; i < pages; i++) {
    pdf.addPage([595, 842]);
  }

  const bytes = await pdf.save();
  await Bun.write(filePath, bytes);
}

export async function getPdfPageCount(filePath: string | undefined): Promise<number> {
  if (!filePath) return 0;
  const bytes = await Bun.file(filePath).arrayBuffer();
  const pdf = await PDFDocument.load(bytes);
  return pdf.getPageCount();
}

export async function createPng(filePath: string): Promise<void> {
  // 1x1 transparent PNG
  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5h7n8AAAAASUVORK5CYII=";
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  await Bun.write(filePath, bytes);
}
