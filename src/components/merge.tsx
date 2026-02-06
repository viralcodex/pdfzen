import { createSignal } from "solid-js";
import { mergePDFs } from "../tools/merge";
import { openFile, getOutputPath, openOutputFolder } from "../utils/utils";
import { ToolContainer, Label, FileList, PathInput, ButtonRow, Button, StatusBar } from "./ui";
import { useFileList } from "../hooks/useFileList";

export function MergeUI() {
  const fl = useFileList();
  const [isFocused, setIsFocused] = createSignal(false);

  const canMerge = () => fl.fileCount() >= 2 && !fl.isProcessing();

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
      />

      <PathInput
        value={fl.inputPath}
        onInput={fl.setInputPath}
        onSubmit={fl.addFile}
        focused={isFocused()}
        onFocus={() => setIsFocused(true)}
      />

      <ButtonRow>
        <Button
          label="Add Files"
          color={fl.inputPath().trim() ? "#5bef4e" : "gray"}
          onClick={fl.addFile}
        />
        <Button
          label="Clear All"
          color={fl.fileCount() > 0 ? "#f3ae40" : "gray"}
          onClick={fl.clearAll}
        />
        <Button
          label={fl.isProcessing() ? "Merging..." : "Merge"}
          color={canMerge() ? "cyan" : "gray"}
          onClick={handleMerge}
        />
        <Button
          label="Open Output"
          color="#da7cff"
          onClick={() =>
            openOutputFolder().catch((_) =>
              fl.setStatus({ msg: "Failed to open folder", type: "error" }),
            )
          }
        />
      </ButtonRow>

      <StatusBar message={fl.status().msg} type={fl.status().type} />
    </ToolContainer>
  );
}
