import { createSignal, createMemo, Show } from "solid-js";
import { rotatePDF } from "../tools/rotate";
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
  TextInput,
} from "./ui";
import { useFileList } from "../hooks/useFileList";
import { TextAttributes } from "@opentui/core";

type Rotation = 90 | 180 | 270;
type PageMode = "all" | "specific";

export function RotateUI() {
  const fl = useFileList({ trackPageCount: true });
  const [rotation, setRotation] = createSignal<Rotation>(90);
  const [pageMode, setPageMode] = createSignal<PageMode>("all");
  const [pagesInput, setPagesInput] = createSignal("");
  const [focusedInput, setFocusedInput] = createSignal<string | null>(null);

  const canRotate = createMemo(() => fl.selectedFile() !== null && !fl.isProcessing());

  const clearAll = () => {
    fl.clearAll();
    setPagesInput("");
  };

  const handleRotate = async () => {
    const file = fl.selectedFile();
    if (!file || fl.isProcessing()) return;

    fl.setIsProcessing(true);
    fl.setStatus({ msg: "Rotating PDF...", type: "info" });

    try {
      const outputPath = await getOutputPath("rotated", file);
      let pages: number[] | "all" = "all";

      if (pageMode() === "specific") {
        pages = pagesInput()
          .split(",")
          .map((s) => parseInt(s.trim()))
          .filter((n) => !isNaN(n));
        if (pages.length === 0) {
          fl.setStatus({ msg: "Enter page numbers (e.g., 1, 2, 3)", type: "error" });
          fl.setIsProcessing(false);
          return;
        }
      }

      const res = await rotatePDF({ inputPath: file, outputPath, rotation: rotation(), pages });

      if (res.success) {
        fl.setStatus({
          msg: `Rotated ${res.rotatedPages} page(s) by ${rotation()}°`,
          type: "success",
        });
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
            <text fg="#95a5a6" content={`(${fl.pageCount()} pages)`} />
          </box>
        </box>
      </Show>

      <Label text="Rotation" />
      <ToggleRow>
        <Toggle label="90° →" value={90 as Rotation} selected={rotation()} onSelect={setRotation} />
        <Toggle label="180°" value={180 as Rotation} selected={rotation()} onSelect={setRotation} />
        <Toggle
          label="270° ←"
          value={270 as Rotation}
          selected={rotation()}
          onSelect={setRotation}
        />
      </ToggleRow>

      <Label text="Apply to" />
      <ToggleRow>
        <Toggle label="All Pages" value="all" selected={pageMode()} onSelect={setPageMode} />
        <Toggle
          label="Specific Pages"
          value="specific"
          selected={pageMode()}
          onSelect={setPageMode}
        />
      </ToggleRow>

      <Show when={pageMode() === "specific"}>
        <TextInput
          label="Pages (comma-separated, e.g., 1, 2, 3):"
          value={pagesInput}
          onInput={setPagesInput}
          placeholder="1, 2, 3"
          focused={isFocused("pages")}
          onFocus={focus("pages")}
        />
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
          label={fl.isProcessing() ? "Rotating..." : "Rotate"}
          color={canRotate() ? "cyan" : "gray"}
          onClick={handleRotate}
        />
        <Button
          label="Open Output"
          color="magenta"
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
