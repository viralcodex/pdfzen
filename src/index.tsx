import { KeyEvent, RGBA } from "@opentui/core";
import { Dynamic, render, useKeyboard } from "@opentui/solid";
import { ToolsMenu } from "./components/tools-menu";
import { HeaderLayout } from "./components/header-layout";
import { createSignal } from "solid-js";
import { MergeUI } from "./components/merge";
import { CompressUI } from "./components/compress";
import { RotateUI } from "./components/rotate";
import { SplitUI } from "./components/split";
import { DeleteUI } from "./components/delete";
import { PDFToImagesUI } from "./components/pdf-to-images";
import { ImagesToPDFUI } from "./components/images-to-pdf";
import { ProtectUI } from "./components/protect";
import { DecryptUI } from "./components/decrypt";
import { toolsMenu } from "./constants/constants";
import Hero from "./components/hero";

// Static tool component mapping - defined outside render for performance
const toolComponents: Record<string, () => any> = {
  merge: MergeUI,
  split: SplitUI,
  compress: CompressUI,
  rotate: RotateUI,
  delete: DeleteUI,
  pdfToImages: PDFToImagesUI,
  imagesToPDF: ImagesToPDFUI,
  protect: ProtectUI,
  decrypt: DecryptUI,
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
        <HeaderLayout toolName={getToolName(selectedTool())} onBack={() => setSelectedTool("")}>
          <Dynamic component={toolComponents[selectedTool()]} />
        </HeaderLayout>
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
          <text fg="#68ffc0" content={"Press ESC again to go back to menu"} />
        </box>
      )}
    </box>
  );
});
