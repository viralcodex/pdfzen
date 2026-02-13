import { createSignal, createEffect, onCleanup } from "solid-js";
import { mergePDFs } from "../tools/merge";
import { openFile, getOutputPath, openOutputFolder } from "../utils/utils";
import { ToolContainer, Label, FileList, PathInput, ButtonRow, Button, StatusBar } from "./ui";
import { useFileList } from "../hooks/useFileList";
import { useKeyboardNav } from "../hooks/useKeyboardNav";

export function MergeUI() {
  const fl = useFileList();
  const nav = useKeyboardNav();
  const [inputFocused, setInputFocused] = createSignal(false);

  const canMerge = () => fl.fileCount() >= 2 && !fl.isProcessing();
  const canAddFiles = () => fl.inputPath().trim().length > 0;
  const canClearAll = () => fl.fileCount() > 0;

  const handleMerge = async () => {
    if (!canMerge()) return;

    fl.setIsProcessing(true);
    fl.setStatus({ msg: "Merging PDFs...", type: "info" });

    try {
      const outputPath = await getOutputPath("merged");
      const result = await mergePDFs({ inputPaths: fl.files(), outputPath });

      if (result.success) {
        fl.setStatus({ msg: `Merged ${result.pageCount} pages`, type: "success" });
        fl.clearAll();
        openFile(outputPath);
      } else {
        fl.setStatus({ msg: result.error || "Unknown error", type: "error" });
      }
    } catch (error) {
      fl.setStatus({
        msg: error instanceof Error ? error.message : "Unknown error",
        type: "error",
      });
    } finally {
      fl.setIsProcessing(false);
    }
  };

  // Register keyboard navigation elements
  createEffect(() => {
    nav.clearElements();

    // Register file list items and their action buttons
    fl.files().forEach((_, index) => {
      // Move up button
      nav.registerElement({
        id: `file-${index}-up`,
        type: "button",
        onEnter: () => fl.moveFile(index, "up"),
        canFocus: () => index > 0,
      });

      // Move down button
      nav.registerElement({
        id: `file-${index}-down`,
        type: "button",
        onEnter: () => fl.moveFile(index, "down"),
        canFocus: () => index < fl.fileCount() - 1,
      });

      // Remove button
      nav.registerElement({
        id: `file-${index}-remove`,
        type: "button",
        onEnter: () => fl.removeFile(index),
      });
    });

    // Register input
    nav.registerElement({
      id: "path-input",
      type: "input",
      onEnter: () => {
        if (canAddFiles()) fl.addFile();
      },
    });

    // Register buttons
    nav.registerElement({
      id: "add-files-btn",
      type: "button",
      onEnter: () => fl.addFile(),
      canFocus: () => canAddFiles(),
    });

    nav.registerElement({
      id: "clear-all-btn",
      type: "button",
      onEnter: () => fl.clearAll(),
      canFocus: () => canClearAll(),
    });

    nav.registerElement({
      id: "merge-btn",
      type: "button",
      onEnter: () => handleMerge(),
      canFocus: () => canMerge(),
    });

    nav.registerElement({
      id: "open-output-btn",
      type: "button",
      onEnter: () =>
        openOutputFolder().catch((_) =>
          fl.setStatus({ msg: "Failed to open folder", type: "error" }),
        ),
    });
  });

  // Track input focus mode
  createEffect(() => {
    nav.setIsInputMode(inputFocused());
  });

  // Sync back: reset inputFocused when nav exits input mode (Tab/Escape)
  createEffect(() => {
    if (!nav.isInputMode()) {
      setInputFocused(false);
    }
  });

  onCleanup(() => {
    nav.clearElements();
  });

  return (
    <ToolContainer>
      <Label text="Files" count={fl.fileCount()} />
      <FileList
        files={fl.files}
        selectedIndex={() => null}
        onSelect={() => {}}
        onRemove={fl.removeFile}
        onMove={fl.moveFile}
        showReorder={true}
        focusedIndex={() => {
          const focusId = nav.getFocusedId();
          if (focusId && focusId.startsWith("file-")) {
            const parts = focusId.split("-");
            return parseInt(parts[1] || "0");
          }
          return null;
        }}
        focusedButton={() => nav.getFocusedId()}
      />

      <PathInput
        value={fl.inputPath}
        onInput={fl.setInputPath}
        onSubmit={fl.addFile}
        focused={inputFocused() || nav.isFocused("path-input")}
        onFocus={() => setInputFocused(true)}
      />

      <ButtonRow>
        <Button
          label="Add Files"
          color={canAddFiles() ? "#5bef4e" : "gray"}
          disabled={!canAddFiles()}
          onClick={fl.addFile}
          focused={nav.isFocused("add-files-btn")}
        />
        <Button
          label="Clear All"
          color={canClearAll() ? "#f3ae40" : "gray"}
          disabled={!canClearAll()}
          onClick={fl.clearAll}
          focused={nav.isFocused("clear-all-btn")}
        />
        <Button
          label={fl.isProcessing() ? "Merging..." : "Merge"}
          color={canMerge() ? "cyan" : "gray"}
          disabled={!canMerge()}
          onClick={handleMerge}
          focused={nav.isFocused("merge-btn")}
        />
        <Button
          label="Open Output"
          color="#da7cff"
          onClick={() =>
            openOutputFolder().catch((_) =>
              fl.setStatus({ msg: "Failed to open folder", type: "error" }),
            )
          }
          focused={nav.isFocused("open-output-btn")}
        />
      </ButtonRow>

      <StatusBar message={fl.status().msg} type={fl.status().type} />
    </ToolContainer>
  );
}
