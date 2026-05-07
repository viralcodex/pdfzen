import type { BoxRenderable, CliRenderer } from "@opentui/core";
import { stat } from "fs/promises";
import mupdf from "./mupdf";
import type {
  ColumnBoundKittyPlacement,
  RowBoundKittyPlacement,
  CachedDocument,
  CachedPreviewImage,
  CellPixelSize,
  PDFPreviewViewport,
  KittyPlacementBase,
  PDFPreviewRenderResult,
} from "../model";

const KITTY_CHUNK_SIZE = 4096;
const DEFAULT_CELL_WIDTH = 10;
const DEFAULT_CELL_HEIGHT = 20;
const MAX_IMAGE_CACHE_ENTRIES = 12;

export type PreviewDocument = ReturnType<typeof mupdf.Document.openDocument>;

type KittyPlacement = ColumnBoundKittyPlacement | RowBoundKittyPlacement;

interface RendererOutputWriter {
  writeOut: (
    chunk: string | Uint8Array,
    encoding?: BufferEncoding,
    callback?: (error?: Error | null) => void,
  ) => boolean;
}

const documentCache = new Map<string, CachedDocument>();
const imageCache = new Map<string, CachedPreviewImage>();

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const quantizePixels = (value: number) => Math.max(256, Math.round(value / 64) * 64);

const touchImageCache = (key: string, value: CachedPreviewImage) => {
  imageCache.delete(key);
  imageCache.set(key, value);

  while (imageCache.size > MAX_IMAGE_CACHE_ENTRIES) {
    const oldestEntry = imageCache.keys().next();
    if (oldestEntry.done) break;
    imageCache.delete(oldestEntry.value);
  }
};

const getCachedDocument = async (filePath: string): Promise<CachedDocument> => {
  const fileStats = await stat(filePath);
  const cached = documentCache.get(filePath);

  if (cached && cached.modifiedMs === fileStats.mtimeMs) {
    return cached;
  }

  cached?.doc.destroy();

  const pdfBytes = await Bun.file(filePath).arrayBuffer();
  const doc = mupdf.Document.openDocument(pdfBytes, "application/pdf");
  const nextEntry = {
    doc,
    modifiedMs: fileStats.mtimeMs,
    pageCount: doc.countPages(),
  } satisfies CachedDocument;

  documentCache.set(filePath, nextEntry);
  return nextEntry;
};

const buildDeleteSequence = (mode: "A" | "Z", value?: number) => {
  if (mode === "A") {
    return "\u001b_Ga=d,d=A,q=2\u001b\\";
  }

  return `\u001b_Ga=d,d=Z,z=${value ?? 0},q=2\u001b\\`;
};

const chunkBase64 = (payload: string) => {
  const chunks: string[] = [];

  for (let index = 0; index < payload.length; index += KITTY_CHUNK_SIZE) {
    chunks.push(payload.slice(index, index + KITTY_CHUNK_SIZE));
  }

  return chunks;
};

export const getCellPixelSize = (renderer: CliRenderer): CellPixelSize => {
  const terminalColumns = renderer.terminalWidth || renderer.width;
  const terminalRows = renderer.terminalHeight || renderer.height;
  const resolution = renderer.resolution;

  if (resolution && terminalColumns > 0 && terminalRows > 0) {
    return {
      width: Math.max(1, Math.floor(resolution.width / terminalColumns)),
      height: Math.max(1, Math.floor(resolution.height / terminalRows)),
    };
  }

  return {
    width: DEFAULT_CELL_WIDTH,
    height: DEFAULT_CELL_HEIGHT,
  };
};

export const getPDFPreviewPageCount = async (filePath: string | null) => {
  if (!filePath) return 0;
  const cached = await getCachedDocument(filePath);
  return cached.pageCount;
};

export const getPDFPreviewViewport = (
  renderer: CliRenderer,
  frame: BoxRenderable | undefined,
): PDFPreviewViewport | null => {
  if (!frame) return null;

  const terminalColumns = renderer.terminalWidth || renderer.width;
  const terminalRows = renderer.terminalHeight || renderer.height;
  const availableColumns = Math.max(0, terminalColumns - frame.x - 1);
  const availableRows = Math.max(0, terminalRows - frame.y - 1);
  const columns = Math.max(0, Math.min(frame.width - 2, availableColumns));
  const rows = Math.max(0, Math.min(frame.height - 2, availableRows));

  if (columns < 8 || rows < 8) {
    return null;
  }

  const cellSize = getCellPixelSize(renderer);

  return {
    column: frame.x + 2,
    row: frame.y + 2,
    columns,
    rows,
    widthPx: Math.max(1, columns * cellSize.width),
    heightPx: Math.max(1, rows * cellSize.height),
    cellWidthPx: cellSize.width,
    cellHeightPx: cellSize.height,
  };
};

export const getKittyPlacement = (
  viewport: PDFPreviewViewport,
  imageWidth: number,
  imageHeight: number,
): KittyPlacement => {
  const fitScale = Math.min(
    1,
    viewport.widthPx / Math.max(imageWidth, 1),
    viewport.heightPx / Math.max(imageHeight, 1),
  );
  const displayWidth = Math.max(1, Math.round(imageWidth * fitScale));
  const displayHeight = Math.max(1, Math.round(imageHeight * fitScale));
  const horizontalPadding = Math.max(0, Math.floor((viewport.widthPx - displayWidth) / 2));
  const verticalPadding = Math.max(0, Math.floor((viewport.heightPx - displayHeight) / 2));
  const widthLimited = viewport.widthPx * imageHeight <= viewport.heightPx * imageWidth;
  const columnOffset = Math.floor(horizontalPadding / viewport.cellWidthPx);
  const rowOffset = Math.floor(verticalPadding / viewport.cellHeightPx);
  const offsetX = horizontalPadding % viewport.cellWidthPx;
  const offsetY = verticalPadding % viewport.cellHeightPx;

  const placementBase = {
    column: viewport.column + columnOffset,
    row: viewport.row + rowOffset,
    offsetX,
    offsetY,
  } satisfies KittyPlacementBase;

  if (widthLimited) {
    return {
      ...placementBase,
      columns: Math.max(1, Math.ceil((offsetX + displayWidth) / viewport.cellWidthPx)),
    };
  }

  return {
    ...placementBase,
    rows: Math.max(1, Math.ceil((offsetY + displayHeight) / viewport.cellHeightPx)),
  };
};

const buildPlacementParameters = (placement: KittyPlacement) => {
  const parameters = [
    placement.offsetX > 0 ? `X=${placement.offsetX}` : null,
    placement.offsetY > 0 ? `Y=${placement.offsetY}` : null,
    "columns" in placement ? `c=${placement.columns}` : `r=${placement.rows}`,
  ].filter((value): value is string => value !== null);

  return parameters.join(",");
};

const isRendererOutputWriter = (value: object): value is RendererOutputWriter => {
  if (!("writeOut" in value)) {
    return false;
  }

  return typeof Reflect.get(value, "writeOut") === "function";
};

export async function renderPDFPreviewPage(
  filePath: string,
  pageNumber: number,
  viewport: Pick<PDFPreviewViewport, "widthPx" | "heightPx">,
): Promise<PDFPreviewRenderResult> {
  const cachedDoc = await getCachedDocument(filePath);
  const page = clamp(pageNumber, 1, Math.max(cachedDoc.pageCount, 1));
  const targetWidth = quantizePixels(viewport.widthPx);
  const targetHeight = quantizePixels(viewport.heightPx);
  const cacheKey = `${filePath}:${cachedDoc.modifiedMs}:${page}:${targetWidth}:${targetHeight}`;
  const cachedImage = imageCache.get(cacheKey);

  if (cachedImage) {
    touchImageCache(cacheKey, cachedImage);
    return cachedImage.result;
  }

  const pdfPage = cachedDoc.doc.loadPage(page - 1);
  const bounds = pdfPage.getBounds();
  const pageWidth = Math.max(1, bounds[2] - bounds[0]);
  const pageHeight = Math.max(1, bounds[3] - bounds[1]);
  const scale = clamp(Math.min(targetWidth / pageWidth, targetHeight / pageHeight), 0.25, 4);
  const matrix = mupdf.Matrix.scale(scale, scale);

  const pixmap = pdfPage.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, true, true);

  try {
    const result = {
      pageCount: cachedDoc.pageCount,
      width: pixmap.getWidth(),
      height: pixmap.getHeight(),
      png: pixmap.asPNG(),
    } satisfies PDFPreviewRenderResult;

    touchImageCache(cacheKey, { result });
    return result;
  } finally {
    pixmap.destroy();
    pdfPage.destroy();
  }
}

export const buildKittyTransmitSequence = (
  placement: KittyPlacement,
  png: Uint8Array,
  zIndex: number,
  previousZIndex: number | null,
) => {
  const base64Payload = Buffer.from(png).toString("base64");
  const chunks = chunkBase64(base64Payload);
  let sequence = `\u001b[s\u001b[${placement.row};${placement.column}H`;

  chunks.forEach((chunk, index) => {
    const hasMore = index < chunks.length - 1 ? 1 : 0;

    if (index === 0) {
      const placementParameters = buildPlacementParameters(placement);
      const placementPrefix = placementParameters ? `${placementParameters},` : "";

      sequence += `\u001b_Ga=T,f=100,${placementPrefix}C=1,q=2,z=${zIndex},m=${hasMore};${chunk}\u001b\\`;
      return;
    }

    sequence += `\u001b_Gq=2,m=${hasMore};${chunk}\u001b\\`;
  });

  sequence += "\u001b[u";

  if (previousZIndex !== null) {
    sequence += buildDeleteSequence("Z", previousZIndex);
  }

  return sequence;
};

export const buildKittyDeleteSequence = (zIndex: number | null) =>
  zIndex === null ? buildDeleteSequence("A") : buildDeleteSequence("Z", zIndex);

export const writeRendererOutput = (renderer: CliRenderer, data: string | Uint8Array) => {
  const runtimeRenderer: object = renderer;

  if (isRendererOutputWriter(runtimeRenderer)) {
    runtimeRenderer.writeOut(data);
    return;
  }

  process.stdout.write(data);
};

export const clearPDFPreview = (renderer: CliRenderer, zIndex: number | null) => {
  writeRendererOutput(renderer, buildKittyDeleteSequence(zIndex));
};

export const displayPDFPreview = (
  renderer: CliRenderer,
  viewport: PDFPreviewViewport,
  imageWidth: number,
  imageHeight: number,
  png: Uint8Array,
  zIndex: number,
  previousZIndex: number | null,
) => {
  const placement = getKittyPlacement(viewport, imageWidth, imageHeight);

  writeRendererOutput(renderer, buildKittyTransmitSequence(placement, png, zIndex, previousZIndex));
};
