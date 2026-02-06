import { TextAttributes } from "@opentui/core";
import { createSignal, Show } from "solid-js";
import { compressPDF, formatFileSize } from "../tools/compress";
import { openFile, getOutputPath, openOutputFolder } from "../utils/utils";
import { ToolContainer, Label, FileList, PathInput, ButtonRow, Button, StatusBar } from "./ui";
import { useFileList } from "../hooks/useFileList";

interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  ratio: string;
  outputPath: string;
}

export function CompressUI() {
  const fl = useFileList();
  const [focusedInput, setFocusedInput] = createSignal("path");
  const [result, setResult] = createSignal<CompressionResult | null>(null);

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

  const focus = (name: string) => () => setFocusedInput(name);
  const isFocused = (name: string) => focusedInput() === name;

  return (
    <ToolContainer>
      <Label text="Files" count={fl.fileCount()} />
      <FileList
        files={fl.files}
        selectedIndex={fl.selectedIndex}
        onSelect={fl.selectFile}
        onRemove={fl.removeFile}
      />

      <Show when={fl.selectedFile()}>
        <box
          border={["left"]}
          borderColor="#3498db"
          borderStyle="heavy"
          backgroundColor="#1a2f3a"
          paddingLeft={1}
          paddingTop={0.5}
          paddingBottom={0.5}
          marginTop={1}
          flexShrink={0}
        >
          <box flexDirection="row" columnGap={1}>
            <text fg="#ecf0f1" content={"Selected:"} />
            <text
              fg="#3498db"
              attributes={TextAttributes.BOLD}
              content={fl.selectedFile() ?? ""}
            />
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

      <PathInput
        value={fl.inputPath}
        onInput={fl.setInputPath}
        onSubmit={fl.addFile}
        focused={isFocused("path")}
        onFocus={focus("path")}
      />

      <ButtonRow>
        <Button
          label="Add File"
          color={fl.inputPath().trim() ? "green" : "gray"}
          onClick={fl.addFile}
        />
        <Button
          label="Clear All"
          color={fl.fileCount() > 0 ? "yellow" : "gray"}
          onClick={clearAll}
        />
        <Button
          label={fl.isProcessing() ? "Compressing..." : "Compress"}
          color={fl.selectedFile() && !fl.isProcessing() ? "cyan" : "gray"}
          onClick={handleCompress}
        />
        <Button
          label="Open Output"
          color="magenta"
          onClick={() =>
            openOutputFolder().catch((err) =>
              fl.setStatus({ msg: "Failed to open folder", type: "error" }),
            )
          }
        />
      </ButtonRow>

      <StatusBar message={fl.status().msg} type={fl.status().type} />
    </ToolContainer>
  );
}
