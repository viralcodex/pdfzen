import { KeyEvent, RGBA } from "@opentui/core";
import { render, useKeyboard } from "@opentui/solid";
import { ToolsMenu } from "./components/tools-menu";
import { createSignal } from "solid-js";
import { HIGHLIGHT_ACCENT_COLOR, toolsMenu } from "./constants/constants";
import Hero from "./components/hero";
import { MainUI } from "./components/main-ui";
import { type FileListOptions } from "./model/models";
import { FileListProvider } from "./provider/fileListProvider";

const toolFileListOptions: Record<string, FileListOptions> = {
  merge: {},
  compress: {},
  rotate: { trackPageCount: true },
  splitExtract: { trackPageCount: true },
  delete: { trackPageCount: true },
  pdfToImages: { trackPageCount: true },
  imagesToPDF: { acceptImages: true },
  protect: {},
  decrypt: {},
  organise: { trackPageCount: true },
};

render(() => {
  const [selectedTool, setSelectedTool] = createSignal<string>("");
  const [escapeCount, setEscapeCount] = createSignal(0);

  let escapeTimer: ReturnType<typeof setTimeout> | null = null;

  const getToolName = (command: string) =>
    toolsMenu.find((t) => t.command === command)?.name || command;

  const selectTool = (toolName: string) => {
    setSelectedTool(toolName);
    setEscapeCount(0);
  };

  useKeyboard((event: KeyEvent) => {
    if (event.name === "escape" && selectedTool() !== "") {
      const currentCount = escapeCount() + 1;
      setEscapeCount(currentCount);
      if (escapeTimer) {
        clearTimeout(escapeTimer);
      }
      if (currentCount >= 2) {
        setSelectedTool("");
        setEscapeCount(0);
      } else {
        escapeTimer = setTimeout(() => {
          setEscapeCount(0);
        }, 1400);
      }
    }
  });

  return (
    <box alignItems="center" justifyContent="center" flexGrow={1} backgroundColor="#141414">
      {selectedTool() === "" && (
        <box flexDirection="column" alignItems="center">
          <Hero />
          <ToolsMenu selectedTool={selectedTool} selectTool={selectTool} />
        </box>
      )}
      {selectedTool() && (
        <FileListProvider options={toolFileListOptions[selectedTool()] ?? {}}>
          <MainUI
            selectedTool={selectedTool()}
            toolName={getToolName(selectedTool())}
            onBack={() => setSelectedTool("")}
          />
        </FileListProvider>
      )}
      {escapeCount() === 1 && selectedTool() !== "" && (
        <box
          position="absolute"
          bottom={1}
          marginTop={1}
          width="90%"
          alignItems="center"
          backgroundColor={RGBA.fromInts(50, 50, 50, 256)}
        >
          <text fg={HIGHLIGHT_ACCENT_COLOR} content={"Press ESC again to go back to menu"} />
        </box>
      )}
    </box>
  );
});
