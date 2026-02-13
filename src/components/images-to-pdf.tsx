import { createSignal, createEffect, onCleanup } from "solid-js";
import { imagesToPDF } from "../tools/images-to-pdf";
import { openFile, getOutputPath, openOutputFolder } from "../utils/utils";
import {
  ToolContainer,
  Label,
  FileList,
  PathInput,
  ButtonRow,
  Button,
  StatusBar,
  ToggleRow,
  Toggle,
} from "./ui";
import { useFileList } from "../hooks/useFileList";
import { useKeyboardNav } from "../hooks/useKeyboardNav";

type PageSize = "fit" | "a4" | "letter";

export function ImagesToPDFUI() {
  const fl = useFileList({ acceptImages: true });
  const nav = useKeyboardNav();
  const [pageSize, setPageSize] = createSignal<PageSize>("fit");
  const [inputFocused, setInputFocused] = createSignal(false);

  const canConvert = () => fl.fileCount() >= 1 && !fl.isProcessing();
  const canAddFiles = () => fl.inputPath().trim().length > 0;
  const canClearAll = () => fl.fileCount() > 0;

  const handleConvert = async () => {
    if (!canConvert()) return;

    fl.setIsProcessing(true);
    fl.setStatus({ msg: "Converting images to PDF...", type: "info" });

    try {
      const outputPath = await getOutputPath("images");
      const res = await imagesToPDF({
        inputPaths: fl.files(),
        outputPath,
        pageSize: pageSize(),
      });

      if (res.success) {
        fl.setStatus({
          msg: `Created PDF with ${res.totalPages} page(s)`,
          type: "success",
        });
        fl.clearAll();
        openFile(outputPath);
      } else {
        fl.setStatus({ msg: res.error || "Unknown error", type: "error" });
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

    // Register page size toggles
    nav.registerElement({
      id: "toggle-fit",
      type: "toggle",
      onEnter: () => setPageSize("fit"),
    });
    nav.registerElement({
      id: "toggle-a4",
      type: "toggle",
      onEnter: () => setPageSize("a4"),
    });
    nav.registerElement({
      id: "toggle-letter",
      type: "toggle",
      onEnter: () => setPageSize("letter"),
    });

    // Register path input
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
      id: "convert-btn",
      type: "button",
      onEnter: () => handleConvert(),
      canFocus: () => canConvert(),
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
      <Label text="Images" count={fl.fileCount()} />
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

      <Label text="Page Size" />
      <ToggleRow>
        <Toggle
          label="Fit to Image"
          value="fit"
          selected={pageSize()}
          onSelect={setPageSize}
          focused={nav.isFocused("toggle-fit")}
        />
        <Toggle
          label="A4"
          value="a4"
          selected={pageSize()}
          onSelect={setPageSize}
          focused={nav.isFocused("toggle-a4")}
        />
        <Toggle
          label="Letter"
          value="letter"
          selected={pageSize()}
          onSelect={setPageSize}
          focused={nav.isFocused("toggle-letter")}
        />
      </ToggleRow>

      <PathInput
        value={fl.inputPath}
        onInput={fl.setInputPath}
        onSubmit={fl.addFile}
        focused={inputFocused() || nav.isFocused("path-input")}
        onFocus={() => setInputFocused(true)}
      />

      <ButtonRow>
        <Button
          label="Add Images"
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
          label={fl.isProcessing() ? "Converting..." : "Create PDF"}
          color={canConvert() ? "cyan" : "gray"}
          disabled={!canConvert()}
          onClick={handleConvert}
          focused={nav.isFocused("convert-btn")}
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
