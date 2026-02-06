import { createSignal, Show } from "solid-js";
import { useTerminalDimensions } from "@opentui/solid";
import { splitPDF } from "../tools/split";
import { getOutputDir, openOutputFolder } from "../utils/utils";
import { useFileList } from "../hooks/useFileList";
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
  const [splitMode, setSplitMode] = createSignal<SplitMode>("splitAt");
  const [pagesInput, setPagesInput] = createSignal("");
  const [rangeStart, setRangeStart] = createSignal("");
  const [rangeEnd, setRangeEnd] = createSignal("");
  const [everyN, setEveryN] = createSignal("");
  const [focusedInput, setFocusedInput] = createSignal<string | null>(null);
  const terminalDimensions = useTerminalDimensions();
  const isCompact = () => terminalDimensions().height < 30 || terminalDimensions().width < 60;

  const canSplit = () => fl.selectedFile() !== null && !fl.isProcessing();

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
              type: "error" 
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
          paddingTop={1}
          paddingBottom={1}
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

      <Label text="Split Mode" />
      <ToggleRow>
        <Toggle
          label="Split At"
          value="splitAt"
          selected={splitMode()}
          onSelect={setSplitMode}
        />
        <Toggle label="Range" value="range" selected={splitMode()} onSelect={setSplitMode} />
        <Toggle
          label="Every N Pages"
          value="every"
          selected={splitMode()}
          onSelect={setSplitMode}
        />
      </ToggleRow>

      <Show when={splitMode() === "splitAt"}>
        <TextInput
          label="Split after page:"
          value={pagesInput}
          onInput={setPagesInput}
          placeholder={fl.pageCount() > 1 ? `1-${fl.pageCount() - 1}` : "1"}
          focused={isFocused("splitAt")}
          onFocus={focus("splitAt")}
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
            focused={isFocused("rangeStart")}
            onFocus={focus("rangeStart")}
            flexGrow={1}
          />
          <TextInput
            label="To Page:"
            value={rangeEnd}
            onInput={setRangeEnd}
            placeholder={String(fl.pageCount() || "")}
            focused={isFocused("rangeEnd")}
            onFocus={focus("rangeEnd")}
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
          focused={isFocused("every")}
          onFocus={focus("every")}
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
          label={fl.isProcessing() ? "Splitting..." : "Split"}
          color={canSplit() ? "cyan" : "gray"}
          onClick={handleSplit}
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
