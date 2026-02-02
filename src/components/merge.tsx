import { TextAttributes } from "@opentui/core";
import { createSignal, createMemo, Index } from "solid-js";
import { usePaste } from "@opentui/solid";
import { mergePDFs } from "../tools/merge";
import { openFile, unescapePath, validatePdfFile } from "../utils/utils";

type StatusType = "info" | "error" | "success";

const STATUS_COLORS: Record<StatusType, string> = {
  error: "red",
  success: "green",
  info: "white",
};

export function MergeUI() {
  const [files, setFiles] = createSignal<string[]>([]);
  const [inputPath, setInputPath] = createSignal("");
  const [statusMessage, setStatusMessage] = createSignal("Ready");
  const [statusType, setStatusType] = createSignal<StatusType>("info");
  const [isProcessing, setIsProcessing] = createSignal(false);
  const [isFocused, setIsFocused] = createSignal(false);

  // Derived state
  const fileCount = createMemo(() => files().length);
  const canAddFile = createMemo(() => inputPath().trim().length > 0);
  const canMerge = createMemo(() => fileCount() >= 2 && !isProcessing());
  const canClear = createMemo(() => fileCount() > 0);
  const statusColor = createMemo(() => STATUS_COLORS[statusType()]);

  const setStatus = (message: string, type: StatusType = "info") => {
    setStatusMessage(message);
    setStatusType(type);
  };

  const addFileToList = async (rawPath: string, fromPaste = false): Promise<boolean> => {
    const cleanPath = unescapePath(rawPath.trim());
    if (!cleanPath) return false;

    if (files().includes(cleanPath)) {
      setStatus("File already added", "error");
      return false;
    }

    setStatus("Validating file...");
    const { valid, error } = await validatePdfFile(cleanPath);
    
    if (!valid) {
      fromPaste ? setStatus("Ready") : setStatus(error || "Invalid file", "error");
      return false;
    }

    setFiles((prev) => [...prev, cleanPath]);
    setStatus(`${files().length + 1} file(s) added`);
    return true;
  };

  usePaste((event) => addFileToList(event.text, true));

  const addFile = async () => {
    if (await addFileToList(inputPath())) {
      setInputPath("");
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setStatus(fileCount() <= 1 ? "Ready" : `${fileCount() - 1} file(s) remaining`);
  };

  const moveFile = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fileCount()) return;
    
    setFiles((prev) => {
      const newFiles = [...prev];
      [newFiles[index], newFiles[newIndex]] = [newFiles[newIndex]!, newFiles[index]!];
      return newFiles;
    });
  };

  const clearAll = () => {
    setFiles([]);
    setInputPath("");
    setStatus("Ready");
  };

  const handleMerge = async () => {
    if (!canMerge()) return;

    setIsProcessing(true);
    setStatus("Merging PDFs...");

    try {
      const outputPath = `merged-${Date.now()}.pdf`;
      const result = await mergePDFs({ inputPaths: files(), outputPath });

      if (result.success) {
        setStatus(`Merged ${result.pageCount} pages → ${outputPath}`, "success");
        setFiles([]);
        openFile(outputPath);
      } else {
        setStatus(result.error || "Unknown error", "error");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unknown error", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <box flexDirection="column" width="100%" height="100%" paddingLeft={2}>
      {/* Header */}
      <box width="100%" alignItems="center" flexShrink={0} paddingTop={1} paddingBottom={1} border>
        <ascii_font font="tiny" text="Merge PDFs" />
      </box>

      {/* Main Content */}
      <box flexDirection="column" flexGrow={1} minHeight={0}>
        <text attributes={TextAttributes.BOLD} marginTop={1} flexShrink={0}>
          Files ({fileCount()}):
        </text>

        {/* Empty State */}
        {fileCount() === 0 && (
          <scrollbox border height="50%" width="100%" flexShrink={0}>
            <box flexGrow={1} alignItems="center" justifyContent="center">
              <text fg="gray">No files added yet. Drag & drop PDFs or enter path below.</text>
            </box>
          </scrollbox>
        )}

        {/* File List */}
        {fileCount() > 0 && (
          <scrollbox border height="50%" width="100%" flexShrink={0}>
            <Index each={files()}>
              {(file, index) => (
                <box flexDirection="row" alignItems="center" paddingLeft={1} paddingRight={1}>
                  <text fg="yellow" minWidth={3}>{index + 1}.</text>
                  <text flexGrow={1} flexShrink={1}>{file()}</text>
                  <box flexDirection="row" columnGap={1}>
                    <box
                      border
                      onMouseDown={() => moveFile(index, "up")}
                      paddingLeft={1}
                      paddingRight={1}
                      minWidth={3}
                      justifyContent="center"
                      alignItems="center"
                    >
                      <text fg={index > 0 ? "cyan" : "gray"}>↑</text>
                    </box>
                    <box
                      border
                      onMouseDown={() => moveFile(index, "down")}
                      paddingLeft={1}
                      paddingRight={1}
                      minWidth={3}
                      justifyContent="center"
                      alignItems="center"
                    >
                      <text fg={index < fileCount() - 1 ? "cyan" : "gray"}>↓</text>
                    </box>
                    <box
                      border
                      onMouseDown={() => removeFile(index)}
                      paddingLeft={1}
                      paddingRight={1}
                      minWidth={3}
                      justifyContent="center"
                      alignItems="center"
                    >
                      <text fg="red" attributes={TextAttributes.BOLD}>X</text>
                    </box>
                  </box>
                </box>
              )}
            </Index>
          </scrollbox>
        )}

        {/* Input Field */}
        <box flexDirection="column" marginTop={1} alignItems="flex-start" flexShrink={0}>
          <text>Path:</text>
          <box border padding={1} width="100%">
            <input
              focused={isFocused()}
              value={inputPath()}
              onInput={setInputPath}
              onSubmit={addFile}
              placeholder="/path/to/file.pdf"
              onMouseDown={() => setIsFocused(true)}
            />
          </box>
        </box>

        {/* Action Buttons */}
        <box flexDirection="row" columnGap={2} marginTop={1} flexShrink={0}>
          <box border paddingLeft={1} paddingRight={1} minHeight={3} justifyContent="center" alignItems="center" onMouseDown={addFile}>
            <text fg={canAddFile() ? "green" : "gray"}>Add Files</text>
          </box>
          <box border paddingLeft={1} paddingRight={1} minHeight={3} justifyContent="center" alignItems="center" onMouseDown={clearAll}>
            <text fg={canClear() ? "yellow" : "gray"}>Clear All</text>
          </box>
          <box border paddingLeft={1} paddingRight={1} minHeight={3} justifyContent="center" alignItems="center" onMouseDown={handleMerge}>
            <text fg={canMerge() ? "cyan" : "gray"}>{isProcessing() ? "Merging..." : "Merge"}</text>
          </box>
        </box>

        {/* Status Bar */}
        <box border paddingLeft={1} marginTop={1} flexShrink={0}>
          <text fg={statusColor()}>{statusMessage()}</text>
        </box>
      </box>
    </box>
  );
}
