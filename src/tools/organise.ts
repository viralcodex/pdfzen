import { PDFDocument } from "pdf-lib";
import { deletePagesFromDocument } from "./delete";
import {
  getOutputPath,
  handleFileExplorer,
  loadPdfDocument,
  savePdfDocument,
} from "../utils/utils";

interface OrganiseDraftInput {
  inputPath: string;
  originalInputPath?: string | null;
  workingFilePath?: string | null;
}

interface OrganiseAddPageInput extends OrganiseDraftInput {
  pageIndex: number;
}

interface OrganiseAddPageOutput {
  success: boolean;
  draftPath?: string;
  totalPages?: number;
  currentPage?: number;
  error?: string;
}

interface DeleteOrganisePageInput extends OrganiseDraftInput {
  pageToDelete: number;
  totalPages: number;
}

interface DeleteOrganisePageOutput {
  success: boolean;
  draftPath?: string;
  remainingPages?: number;
  nextPage?: number;
  deletedPage?: number;
  error?: string;
}

interface MoveOrganisePageInput extends OrganiseDraftInput {
  sourceIndex: number;
  destIndex: number;
  totalPages: number;
}

interface MoveOrganisePageOutput {
  success: boolean;
  draftPath?: string;
  totalPages?: number;
  currentPage?: number;
  sourceIndex?: number;
  destIndex?: number;
  error?: string;
}

interface SaveOrganisePdfInput extends OrganiseDraftInput {
  outputPath?: string;
}

interface SaveOrganisePdfOutput {
  success: boolean;
  outputPath?: string;
  error?: string;
}

const resolveDraftPath = async (input: OrganiseDraftInput) =>
  input.workingFilePath ??
  getOutputPath("organise-draft", input.originalInputPath ?? input.inputPath);

export async function deleteOrganisePage(
  input: DeleteOrganisePageInput,
): Promise<DeleteOrganisePageOutput> {
  try {
    const pdfDoc = await loadPdfDocument(input.inputPath);
    const result = deletePagesFromDocument(pdfDoc, [input.pageToDelete]);

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Unable to delete page",
      };
    }

    const draftPath = await resolveDraftPath(input);
    await savePdfDocument(pdfDoc, draftPath);

    const remainingPages = result.remainingPages ?? Math.max(input.totalPages - 1, 1);
    const nextPage = Math.min(input.pageToDelete, remainingPages);

    return {
      success: true,
      draftPath,
      deletedPage: input.pageToDelete,
      remainingPages,
      nextPage,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to delete page",
    };
  }
}

export async function moveOrganisePage(
  input: MoveOrganisePageInput,
): Promise<MoveOrganisePageOutput> {
  try {
    const pdfDoc = await loadPdfDocument(input.inputPath);
    const reorderedPdf = await PDFDocument.create();
    const pageOrder = Array.from({ length: input.totalPages }, (_, index) => index);
    const [movedPageIndex] = pageOrder.splice(input.sourceIndex - 1, 1);

    if (movedPageIndex === undefined) {
      return {
        success: false,
        error: "Unable to move page",
      };
    }

    pageOrder.splice(input.destIndex - 1, 0, movedPageIndex);

    const copiedPages = await reorderedPdf.copyPages(pdfDoc, pageOrder);
    copiedPages.forEach((page) => {
      reorderedPdf.addPage(page);
    });

    const draftPath = await resolveDraftPath(input);
    await savePdfDocument(reorderedPdf, draftPath);

    return {
      success: true,
      draftPath,
      totalPages: reorderedPdf.getPageCount(),
      currentPage: input.destIndex,
      sourceIndex: input.sourceIndex,
      destIndex: input.destIndex,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to move page",
    };
  }
}

export async function addPagesToPdf(input: OrganiseAddPageInput): Promise<OrganiseAddPageOutput> {
  const baseInput = input;

  try {
    const files = await handleFileExplorer(undefined, "pdf");

    if (!files || files.length === 0) {
      return {
        success: false,
        error: "No PDF files selected",
      };
    }

    const pdfDoc = await loadPdfDocument(baseInput.workingFilePath ?? baseInput.inputPath);

    const mergedPdfs = await PDFDocument.create();

    for (const file of files) {
      const newPdf = await loadPdfDocument(file);
      const copiedPages = await mergedPdfs.copyPages(newPdf, newPdf.getPageIndices());

      copiedPages.forEach((page) => {
        mergedPdfs.addPage(page);
      });
    }

    //now we gotta merge mergedPdfs into pdfDoc at the correct index (could be in middle, start or end)
    const finalPdf = await PDFDocument.create();

    const pdfDocPages = await finalPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
    const mergedPages = await finalPdf.copyPages(mergedPdfs, mergedPdfs.getPageIndices());

    const beforePages = pdfDocPages.slice(0, baseInput.pageIndex);
    const afterPages = pdfDocPages.slice(baseInput.pageIndex);

    beforePages.forEach((page) => finalPdf.addPage(page));
    mergedPages.forEach((page) => finalPdf.addPage(page));
    afterPages.forEach((page) => finalPdf.addPage(page));

    const draftPath = await resolveDraftPath(baseInput);

    await savePdfDocument(finalPdf, draftPath);

    return {
      success: true,
      draftPath: draftPath,
      totalPages: finalPdf.getPageCount(),
      currentPage: baseInput.pageIndex + 1,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to add page",
    };
  }
}

export async function saveOrganisePdf(input: SaveOrganisePdfInput): Promise<SaveOrganisePdfOutput> {
  try {
    const sourcePath = input.workingFilePath ?? input.inputPath;
    const outputPath =
      input.outputPath ??
      (await getOutputPath("organise-edited", input.originalInputPath ?? sourcePath));
    const pdfDoc = await loadPdfDocument(sourcePath);
    await savePdfDocument(pdfDoc, outputPath);

    return {
      success: true,
      outputPath,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to save PDF",
    };
  }
}
