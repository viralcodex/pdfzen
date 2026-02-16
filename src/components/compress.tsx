import { TextAttributes } from "@opentui/core";
import { createSignal, Show, createEffect, onCleanup } from "solid-js";
import { compressPDF, formatFileSize } from "../tools/compress";
import { openFile, getOutputPath, openOutputFolder } from "../utils/utils";
import { ToolContainer, Label, FileList, ButtonRow, Button, StatusBar } from "./ui";
import { useFileList } from "../hooks/useFileList";
import { useKeyboardNav } from "../hooks/useKeyboardNav";

interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  ratio: string;
  outputPath: string;
}

export function CompressUI() {
  const fl = useFileList();
  const nav = useKeyboardNav();
  const [result, setResult] = createSignal<CompressionResult | null>(null);

  const canClearAll = () => fl.fileCount() > 0;
  const canCompress = () => fl.selectedFile() && !fl.isProcessing();

  const clearAll = () => {
    fl.clearAll();
    setResult(null);
  };

  const handleCompress = async () => {
    const file = fl.selectedFile();
    if (!file || fl.isProcessing()) return;

    fl.setIsProcessing(true);
    fl.setStatus({ msg: "Compressing PDF...", type: "info" });

    try {
      const outputPath = await getOutputPath("compressed", file);
      const res = await compressPDF({ inputPath: file, outputPath });

      if (res.success && res.originalSize && res.compressedSize) {
        setResult({
          originalSize: res.originalSize,
          compressedSize: res.compressedSize,
          ratio: res.compressionRatio || "0%",
          outputPath,
        });
        fl.setStatus({ msg: `Compressed: ${res.compressionRatio} reduction`, type: "success" });
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

    // Register file list items and remove buttons
    fl.files().forEach((_, index) => {
      nav.registerElement({
        id: `file-${index}`,
        type: "list-item",
        onEnter: () => fl.selectFile(index),
      });

      // Remove button
      nav.registerElement({
        id: `file-${index}-remove`,
        type: "button",
        onEnter: () => fl.removeFile(index),
      });
    });

    // Register buttons
    nav.registerElement({
      id: "clear-all-btn",
      type: "button",
      onEnter: () => clearAll(),
      canFocus: () => canClearAll(),
    });

    nav.registerElement({
      id: "compress-btn",
      type: "button",
      onEnter: () => handleCompress(),
      canFocus: () => !!canCompress(),
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

  onCleanup(() => {
    nav.clearElements();
  });

  return (
    <ToolContainer>
      <Label text="Files" count={fl.fileCount()} />
      <FileList
        files={fl.files}
        fileType="pdf"
        selectedIndex={fl.selectedIndex}
        onSelect={fl.selectFile}
        onRemove={fl.removeFile}
        onFilesSelected={async (paths) => {
          for (const path of paths) {
            await fl.addFileToList(path);
          }
        }}
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

      <Show when={fl.selectedFile()}>
        <box
          border={["left"]}
          borderColor="#3498db"
          borderStyle="heavy"
          backgroundColor="#1a2f3a"
          paddingLeft={1}
          paddingTop={1}
          paddingBottom={1}
          marginTop={1}
          flexShrink={0}
        >
          <box flexDirection="row" columnGap={1}>
            <text fg="#ecf0f1" content={"Selected:"} />
            <text fg="#3498db" attributes={TextAttributes.BOLD} content={fl.selectedFile() ?? ""} />
          </box>
        </box>
      </Show>

      <Show when={result()}>
        <box flexDirection="column" marginTop={1} paddingLeft={1} flexShrink={0}>
          <text attributes={TextAttributes.BOLD} fg="green" content={"Compression Result:"} />
          <box flexDirection="row" marginTop={1}>
            <text fg="yellow" minWidth={15} content={"Original:"} />
            <text content={formatFileSize(result()!.originalSize)} />
          </box>
          <box flexDirection="row">
            <text fg="yellow" minWidth={15} content={"Compressed:"} />
            <text content={formatFileSize(result()!.compressedSize)} />
          </box>
          <box flexDirection="row">
            <text fg="yellow" minWidth={15} content={"Reduction:"} />
            <text fg="green" content={result()!.ratio} />
          </box>
        </box>
      </Show>

      <ButtonRow>
        <Button
          label="Clear All"
          color={canClearAll() ? "yellow" : "gray"}
          disabled={!canClearAll()}
          onClick={clearAll}
          focused={nav.isFocused("clear-all-btn")}
        />
        <Button
          label={fl.isProcessing() ? "Compressing..." : "Compress"}
          color={canCompress() ? "cyan" : "gray"}
          disabled={!canCompress()}
          onClick={handleCompress}
          focused={nav.isFocused("compress-btn")}
        />
        <Button
          label="Open Output"
          color="magenta"
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
