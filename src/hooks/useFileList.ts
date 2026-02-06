import { createSignal, createMemo } from "solid-js";
import { usePaste } from "@opentui/solid";
import { unescapePath, validatePdfFile, getPageCount } from "../utils/utils";
import type { StatusType } from "../components/ui";

type Status = { msg: string; type: StatusType };

export interface FileListOptions {
  trackPageCount?: boolean;
}

export function useFileList(options: FileListOptions = {}) {
  const { trackPageCount = false } = options;

  const [files, setFiles] = createSignal<string[]>([]);
  const [selectedIndex, setSelectedIndex] = createSignal<number | null>(null);
  const [pageCount, setPageCount] = createSignal(0);
  const [inputPath, setInputPath] = createSignal("");
  const [status, setStatus] = createSignal<Status>({ msg: "Ready", type: "info" });
  const [isProcessing, setIsProcessing] = createSignal(false);

  const fileCount = createMemo(() => files().length);
  const selectedFile = createMemo(() => {
    const idx = selectedIndex();
    return idx !== null ? (files()[idx] ?? null) : null;
  });

  const updatePageCount = async (file: string | null) => {
    if (!trackPageCount || !file) {
      setPageCount(0);
      return 0;
    }
    const pages = await getPageCount(file);
    setPageCount(pages);
    return pages;
  };

  const addFileToList = async (rawPath: string, fromPaste = false): Promise<boolean> => {
    const cleanPath = unescapePath(rawPath.trim());
    if (!cleanPath) return false;

    if (files().includes(cleanPath)) {
      setStatus({ msg: "File already added", type: "error" });
      return false;
    }

    setStatus({ msg: "Validating file...", type: "info" });
    const { valid, error } = await validatePdfFile(cleanPath);

    if (!valid) {
      setStatus(
        fromPaste
          ? { msg: "Ready", type: "info" }
          : { msg: error || "Invalid file", type: "error" },
      );
      return false;
    }

    const newIndex = files().length;
    setFiles((prev) => [...prev, cleanPath]);

    // Auto-select first file
    if (selectedIndex() === null) {
      setSelectedIndex(newIndex);
      await updatePageCount(cleanPath);
    }

    setStatus({ msg: `${newIndex + 1} file(s) added`, type: "info" });
    return true;
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

    setFiles((prev) => prev.filter((_, i) => i !== index));

    // Update selection
    if (selected !== null) {
      if (len === 1) {
        setSelectedIndex(null);
        setPageCount(0);
      } else if (index === selected) {
        const newIdx = Math.min(index, len - 2);
        setSelectedIndex(newIdx);
        // Get file from updated array (after removal)
        const fileToSelect = newIdx < index ? currentFiles[newIdx] : currentFiles[newIdx + 1];
        updatePageCount(fileToSelect ?? null);
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
    setSelectedIndex(null);
    setPageCount(0);
    setInputPath("");
    setStatus({ msg: "Ready", type: "info" });
  };

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
    selectFile,
    removeFile,
    moveFile,
    addFile,
    clearAll,
  };
}
