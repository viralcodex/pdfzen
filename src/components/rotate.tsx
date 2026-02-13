import { createSignal, createMemo, Show, createEffect, onCleanup } from "solid-js";
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
import { useKeyboardNav } from "../hooks/useKeyboardNav";
import { TextAttributes } from "@opentui/core";

type Rotation = 90 | 180 | 270;
type PageMode = "all" | "specific";

export function RotateUI() {
  const fl = useFileList({ trackPageCount: true });
  const nav = useKeyboardNav();
  const [rotation, setRotation] = createSignal<Rotation>(90);
  const [pageMode, setPageMode] = createSignal<PageMode>("all");
  const [pagesInput, setPagesInput] = createSignal("");
  const [focusedInput, setFocusedInput] = createSignal<string | null>(null);

  const canRotate = createMemo(() => fl.selectedFile() !== null && !fl.isProcessing());
  const canAddFile = () => fl.inputPath().trim().length > 0;
  const canClearAll = () => fl.fileCount() > 0;

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

    // Register rotation toggles
    [90, 180, 270].forEach((deg) => {
      nav.registerElement({
        id: `rotation-${deg}`,
        type: "toggle",
        onEnter: () => setRotation(deg as Rotation),
      });
    });

    // Register page mode toggles
    nav.registerElement({
      id: "pagemode-all",
      type: "toggle",
      onEnter: () => setPageMode("all"),
    });
    nav.registerElement({
      id: "pagemode-specific",
      type: "toggle",
      onEnter: () => setPageMode("specific"),
    });

    // Register specific pages input if in specific mode
    if (pageMode() === "specific") {
      nav.registerElement({ id: "input-pages", type: "input" });
    }

    // Register path input
    nav.registerElement({
      id: "path-input",
      type: "input",
      onEnter: () => {
        if (canAddFile()) fl.addFile();
      },
    });

    // Register buttons
    nav.registerElement({
      id: "add-file-btn",
      type: "button",
      onEnter: () => fl.addFile(),
      canFocus: () => canAddFile(),
    });
    nav.registerElement({
      id: "clear-all-btn",
      type: "button",
      onEnter: () => clearAll(),
      canFocus: () => canClearAll(),
    });
    nav.registerElement({
      id: "rotate-btn",
      type: "button",
      onEnter: () => handleRotate(),
      canFocus: () => canRotate(),
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

  createEffect(() => {
    nav.setIsInputMode(focusedInput() !== null);
  });

  // Sync back: reset focusedInput when nav exits input mode (Tab/Escape)
  createEffect(() => {
    if (!nav.isInputMode()) {
      setFocusedInput(null);
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
        selectedIndex={fl.selectedIndex}
        onSelect={fl.selectFile}
        onRemove={fl.removeFile}
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
            <text fg="#95a5a6" content={`(${fl.pageCount()} pages)`} />
          </box>
        </box>
      </Show>

      <Label text="Rotation" />
      <ToggleRow>
        <Toggle
          label="90° →"
          value={90 as Rotation}
          selected={rotation()}
          onSelect={setRotation}
          focused={nav.isFocused("rotation-90")}
        />
        <Toggle
          label="180°"
          value={180 as Rotation}
          selected={rotation()}
          onSelect={setRotation}
          focused={nav.isFocused("rotation-180")}
        />
        <Toggle
          label="270° ←"
          value={270 as Rotation}
          selected={rotation()}
          onSelect={setRotation}
          focused={nav.isFocused("rotation-270")}
        />
      </ToggleRow>

      <Label text="Apply to" />
      <ToggleRow>
        <Toggle
          label="All Pages"
          value="all"
          selected={pageMode()}
          onSelect={setPageMode}
          focused={nav.isFocused("pagemode-all")}
        />
        <Toggle
          label="Specific Pages"
          value="specific"
          selected={pageMode()}
          onSelect={setPageMode}
          focused={nav.isFocused("pagemode-specific")}
        />
      </ToggleRow>

      <Show when={pageMode() === "specific"}>
        <TextInput
          label="Pages (comma-separated, e.g., 1, 2, 3):"
          value={pagesInput}
          onInput={setPagesInput}
          placeholder="1, 2, 3"
          focused={focusedInput() === "input-pages" || nav.isFocused("input-pages")}
          onFocus={() => setFocusedInput("input-pages")}
        />
      </Show>

      <PathInput
        value={fl.inputPath}
        onInput={fl.setInputPath}
        onSubmit={fl.addFile}
        focused={focusedInput() === "path-input" || nav.isFocused("path-input")}
        onFocus={() => setFocusedInput("path-input")}
      />

      <ButtonRow>
        <Button
          label="Add File"
          color={canAddFile() ? "green" : "gray"}
          disabled={!canAddFile()}
          onClick={fl.addFile}
          focused={nav.isFocused("add-file-btn")}
        />
        <Button
          label="Clear All"
          color={canClearAll() ? "yellow" : "gray"}
          disabled={!canClearAll()}
          onClick={clearAll}
          focused={nav.isFocused("clear-all-btn")}
        />
        <Button
          label={fl.isProcessing() ? "Rotating..." : "Rotate"}
          color={canRotate() ? "cyan" : "gray"}
          disabled={!canRotate()}
          onClick={handleRotate}
          focused={nav.isFocused("rotate-btn")}
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
