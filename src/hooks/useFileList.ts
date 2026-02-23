import { createSignal, createMemo } from "solid-js";
import { usePaste } from "@opentui/solid";
import { unescapePath, validatePdfFile, validateImageFile, getPageCount } from "../utils/utils";
import type { StatusType, FileListOptions } from "../model/models";

type Status = { msg: string; type: StatusType };
const READY_STATUS: Status = { msg: "Ready", type: "info" };

export type { FileListOptions };

export function useFileList(options: FileListOptions = {}) {
  const { trackPageCount = false, acceptImages = false } = options;

  const [files, setFiles] = createSignal<string[]>([]);
  const [selectedIndex, setSelectedIndex] = createSignal<number | null>(null);
  const [pageCount, setPageCount] = createSignal(0);
  const [inputPath, setInputPath] = createSignal("");
  const [status, setStatus] = createSignal<Status>(READY_STATUS);
  const [isProcessing, setIsProcessing] = createSignal(false);
  const pendingFiles = new Set<string>();

  const fileCount = createMemo(() => files().length);
  const selectedFile = createMemo(() => {
    const idx = selectedIndex();
    return idx !== null ? (files()[idx] ?? null) : null;
  });

  const pageCountCache = new Map<string, number>();
  let pageCountRequestId = 0;

  const invalidatePageCountRequests = () => {
    pageCountRequestId++;
  };

  const clearPageCountState = () => {
    invalidatePageCountRequests();
    setPageCount(0);
  };

  const updatePageCount = async (file: string | null) => {
    if (!trackPageCount || !file) {
      clearPageCountState();
      return 0;
    }

    const cached = pageCountCache.get(file);
    if (cached !== undefined) {
      invalidatePageCountRequests();
      setPageCount(cached);
      return cached;
    }

    const requestId = ++pageCountRequestId;
    const pages = await getPageCount(file);

    pageCountCache.set(file, pages);

    if (requestId === pageCountRequestId) { // Ensure this is the latest request
      setPageCount(pages);
    }

    return pages;
  };

  const addFileToList = async (rawPath: string, fromPaste = false): Promise<boolean> => {
    const cleanPath = unescapePath(rawPath.trim());
    if (!cleanPath) return false;

    if (pendingFiles.has(cleanPath) || files().includes(cleanPath)) {
      setStatus({ msg: "File already added", type: "error" });
      return false;
    }

    pendingFiles.add(cleanPath);

    try {
      setStatus({ msg: "Validating file...", type: "info" });
      const validator = acceptImages ? validateImageFile : validatePdfFile;
      const { valid, error } = await validator(cleanPath);

      if (!valid) {
        setStatus(
          fromPaste
            ? READY_STATUS
            : { msg: error || "Invalid file", type: "error" },
        );
        return false;
      }

      let newIndex = -1;
      let added = false;
      setFiles((prev) => {
        if (prev.includes(cleanPath)) return prev;
        added = true;
        newIndex = prev.length;
        return [...prev, cleanPath];
      });

      if (!added) {
        setStatus({ msg: "File already added", type: "error" });
        return false;
      }

      // Auto-select first file
      if (selectedIndex() === null && newIndex !== -1) {
        setSelectedIndex(newIndex);
        await updatePageCount(cleanPath);
      }

      setStatus({ msg: `${newIndex + 1} file(s) added`, type: "info" });
      return true;
    } finally {
      pendingFiles.delete(cleanPath);
    }
  };

  const addFilesToList = async (rawPaths: string[], fromPaste = false): Promise<number> => {
    const uniquePaths = [...new Set(rawPaths.map((p) => unescapePath(p.trim())).filter(Boolean))];
    if (uniquePaths.length === 0) return 0;

    const before = fileCount();
    await Promise.all(uniquePaths.map((path) => addFileToList(path, fromPaste)));
    const addedCount = fileCount() - before;

    if (addedCount > 0) {
      setStatus({ msg: `${fileCount()} file(s) ready`, type: "info" });
    }

    return Math.max(0, addedCount);
  };

  const selectFile = async (index: number) => {
    const file = files()[index];
    if (!file) return;

    setSelectedIndex(index);
    const pages = await updatePageCount(file);
    setStatus({
      msg: trackPageCount ? `File selected (${pages} pages)` : "File selected",
      type: "info",
    });
  };

  const removeFile = (index: number) => {
    const len = files().length;
    const selected = selectedIndex();
    const currentFiles = files();
    const removedFile = currentFiles[index];
    if (removedFile) {
      pageCountCache.delete(removedFile);
    }

    setFiles((prev) => prev.filter((_, i) => i !== index));

    // Update selection
    if (selected !== null) {
      if (len === 1) {
        clearPageCountState();
        setSelectedIndex(null);
      } else if (index === selected) {
        const newIdx = Math.min(index, len - 2);
        setSelectedIndex(newIdx);
        // Get file from updated array (after removal)
        const fileToSelect = newIdx < index ? currentFiles[newIdx] : currentFiles[newIdx + 1];
        void updatePageCount(fileToSelect ?? null);
      } else if (index < selected) {
        setSelectedIndex(selected - 1);
      }
    }

    setStatus({ msg: len <= 1 ? "Ready" : `${len - 1} file(s) remaining`, type: "info" });
  };

  const moveFile = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= fileCount()) return;

    setFiles((prev) => {
      const arr = [...prev];
      [arr[index], arr[target]] = [arr[target]!, arr[index]!];
      return arr;
    });
  };

  const addFile = async () => {
    if (await addFileToList(inputPath())) setInputPath("");
  };

  const clearAll = () => {
    setFiles([]);
    pendingFiles.clear();
    invalidatePageCountRequests();
    pageCountCache.clear();
    setSelectedIndex(null);
    setPageCount(0);
    setInputPath("");
    setStatus(READY_STATUS);
  };

  //main hook to drag and drop files into the app
  usePaste(async (event) => {
    await addFileToList(event.text, true);
  });

  return {
    // State (read)
    files,
    selectedIndex,
    pageCount,
    inputPath,
    status,
    isProcessing,
    fileCount,
    selectedFile,
    // State (write)
    setInputPath,
    setStatus,
    setIsProcessing,
    // Actions
    addFileToList,
    addFilesToList,
    selectFile,
    removeFile,
    moveFile,
    addFile,
    clearAll,
  };
}
