import { createSignal, Show, createEffect, onCleanup } from "solid-js";
import { useTerminalDimensions } from "@opentui/solid";
import { splitPDF } from "../tools/split";
import { getOutputDir, openOutputFolder } from "../utils/utils";
import { useFileList } from "../hooks/useFileList";
import { useKeyboardNav } from "../hooks/useKeyboardNav";
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
import { TextAttributes } from "@opentui/core";

type SplitMode = "splitAt" | "range" | "every";

export function SplitUI() {
  const fl = useFileList({ trackPageCount: true });
  const nav = useKeyboardNav();
  const [splitMode, setSplitMode] = createSignal<SplitMode>("splitAt");
  const [pagesInput, setPagesInput] = createSignal("");
  const [rangeStart, setRangeStart] = createSignal("");
  const [rangeEnd, setRangeEnd] = createSignal("");
  const [everyN, setEveryN] = createSignal("");
  const [focusedInput, setFocusedInput] = createSignal<string | null>(null);
  const terminalDimensions = useTerminalDimensions();
  const isCompact = () => terminalDimensions().height < 30 || terminalDimensions().width < 60;

  const canSplit = () => fl.selectedFile() !== null && !fl.isProcessing();
  const canAddFile = () => fl.inputPath().trim().length > 0;
  const canClearAll = () => fl.fileCount() > 0;

  const clearAll = () => {
    fl.clearAll();
    setPagesInput("");
    setRangeStart("");
    setRangeEnd("");
    setEveryN("");
  };

  const handleSplit = async () => {
    const file = fl.selectedFile();
    if (!file || fl.isProcessing()) return;

    fl.setIsProcessing(true);
    fl.setStatus({ msg: "Splitting PDF...", type: "info" });

    try {
      const outputDir = await getOutputDir("split");
      let splitValue: number | number[];

      switch (splitMode()) {
        case "splitAt":
          splitValue = parseInt(pagesInput()) || 0;
          if (splitValue < 1 || splitValue >= fl.pageCount()) {
            fl.setStatus({
              msg: `Split page must be between 1 and ${fl.pageCount() - 1}`,
              type: "error",
            });
            fl.setIsProcessing(false);
            return;
          }
          break;
        case "range":
          const start = parseInt(rangeStart()) || 1;
          const end = parseInt(rangeEnd()) || fl.pageCount();
          splitValue = [start, end];
          break;
        case "every":
          splitValue = parseInt(everyN()) || 1;
          break;
      }

      const res = await splitPDF({
        inputPath: file,
        outputDir,
        splitMode: splitMode(),
        splitValue,
      });

      if (res.success) {
        fl.setStatus({ msg: `Created ${res.totalFiles} file(s)`, type: "success" });
        await openOutputFolder(outputDir).catch((_) =>
          fl.setStatus({ msg: "Failed to open folder", type: "error" }),
        );
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

    // Register mode toggles
    nav.registerElement({
      id: "toggle-splitAt",
      type: "toggle",
      onEnter: () => setSplitMode("splitAt"),
    });
    nav.registerElement({
      id: "toggle-range",
      type: "toggle",
      onEnter: () => setSplitMode("range"),
    });
    nav.registerElement({
      id: "toggle-every",
      type: "toggle",
      onEnter: () => setSplitMode("every"),
    });

    // Register mode-specific inputs
    if (splitMode() === "splitAt") {
      nav.registerElement({ id: "input-splitAt", type: "input" });
    } else if (splitMode() === "range") {
      nav.registerElement({ id: "input-rangeStart", type: "input" });
      nav.registerElement({ id: "input-rangeEnd", type: "input" });
    } else if (splitMode() === "every") {
      nav.registerElement({ id: "input-every", type: "input" });
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
      id: "split-btn",
      type: "button",
      onEnter: () => handleSplit(),
      canFocus: () => canSplit(),
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

      <Label text="Split Mode" />
      <ToggleRow>
        <Toggle
          label="Split At"
          value="splitAt"
          selected={splitMode()}
          onSelect={setSplitMode}
          focused={nav.isFocused("toggle-splitAt")}
        />
        <Toggle
          label="Range"
          value="range"
          selected={splitMode()}
          onSelect={setSplitMode}
          focused={nav.isFocused("toggle-range")}
        />
        <Toggle
          label="Every N Pages"
          value="every"
          selected={splitMode()}
          onSelect={setSplitMode}
          focused={nav.isFocused("toggle-every")}
        />
      </ToggleRow>

      <Show when={splitMode() === "splitAt"}>
        <TextInput
          label="Split after page:"
          value={pagesInput}
          onInput={setPagesInput}
          placeholder={fl.pageCount() > 1 ? `1-${fl.pageCount() - 1}` : "1"}
          focused={focusedInput() === "input-splitAt" || nav.isFocused("input-splitAt")}
          onFocus={() => setFocusedInput("input-splitAt")}
        />
      </Show>

      <Show when={splitMode() === "range"}>
        <box
          flexDirection={isCompact() ? "column" : "row"}
          columnGap={isCompact() ? 0 : 2}
          rowGap={isCompact() ? 1 : 0}
          marginTop={0}
          flexShrink={0}
        >
          <TextInput
            label="From Page:"
            value={rangeStart}
            onInput={setRangeStart}
            placeholder="1"
            focused={focusedInput() === "input-rangeStart" || nav.isFocused("input-rangeStart")}
            onFocus={() => setFocusedInput("input-rangeStart")}
            flexGrow={1}
          />
          <TextInput
            label="To Page:"
            value={rangeEnd}
            onInput={setRangeEnd}
            placeholder={String(fl.pageCount() || "")}
            focused={focusedInput() === "input-rangeEnd" || nav.isFocused("input-rangeEnd")}
            onFocus={() => setFocusedInput("input-rangeEnd")}
            flexGrow={1}
          />
        </box>
      </Show>

      <Show when={splitMode() === "every"}>
        <TextInput
          label="Split every N pages:"
          value={everyN}
          onInput={setEveryN}
          placeholder="2"
          focused={focusedInput() === "input-every" || nav.isFocused("input-every")}
          onFocus={() => setFocusedInput("input-every")}
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
          label={fl.isProcessing() ? "Splitting..." : "Split"}
          color={canSplit() ? "cyan" : "gray"}
          disabled={!canSplit()}
          onClick={handleSplit}
          focused={nav.isFocused("split-btn")}
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
