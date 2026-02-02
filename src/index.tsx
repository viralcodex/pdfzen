import { KeyEvent, TextAttributes, RGBA } from "@opentui/core";
import { Dynamic, render, useKeyboard } from "@opentui/solid";
import { ToolsMenu } from "./components/tools-menu";
import { createSignal } from "solid-js";
import { MergeUI } from "./components/merge";
import { CompressUI } from "./components/compress";
import { RotateUI } from "./components/rotate";
import { SplitUI } from "./components/split";

render(() => {
  const [selectedTool, setSelectedTool] = createSignal<string>("");
  const [debugText, setDebugText] = createSignal("");
  const [escapeCount, setEscapeCount] = createSignal(0);
  let escapeTimer: Timer | null = null;

  const toolComponents: Record<string, () => any> = {
    merge: MergeUI,
    split: SplitUI,
    compress: CompressUI,
    rotate: RotateUI,
  };

  const selectTool = (toolName: string) => {
    setSelectedTool(toolName);
    setEscapeCount(0);
    setDebugText(
      `Tool selected: ${toolName} at ${new Date().toLocaleTimeString()}`,
    );
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
    <box alignItems="center" justifyContent="center" flexGrow={1}>
      {selectedTool() === "" && (
        <box justifyContent="center" alignItems="center" flexDirection="column">
          <ascii_font font="block" text="PDFZEN" />
          <text attributes={TextAttributes.BOLD} fg={"yellow"}>
            Your all-in-one PDF solution
          </text>
          <ToolsMenu selectedTool={selectedTool} selectTool={selectTool} />
        </box>
      )}
      {selectedTool() && (
        <box flexDirection="column" width="100%" height="100%" border={true}>
          <box
            alignItems="center"
            justifyContent="center"
            border={true}
            marginLeft={2}
            width="15%"
            onMouseDown={() => setSelectedTool("")}
          >
            <box>
              <text fg="yellow">Back (Esc)</text>
            </box>
          </box>
          <Dynamic component={toolComponents[selectedTool()]} />
        </box> 
      )}
      {/* Debug panel */}
      {/* {debugText() && (
        <box border={true}>
          <text fg="cyan">Debug: {debugText()}</text>
        </box>
      )} */} 
      {
        escapeCount() === 1 && selectedTool() !== "" && (
          <box
            position="absolute"
            bottom={1}
            marginTop={1}
            width="90%"
            alignItems="center"
            border={true}
            backgroundColor={RGBA.fromInts(50, 50, 50, 256)}
          >
            <text fg="#68ffc0">Press ESC again to go back to menu</text>
          </box>
        )
      }
    </box>
  );
});