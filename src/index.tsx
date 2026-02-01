import { TextAttributes } from "@opentui/core";
import { Dynamic, render } from "@opentui/solid";
import { ToolsMenu } from "./components/tools-menu";
import { createSignal } from "solid-js";
import { MergeUI } from "./components/merge";
import { CompressUI } from "./components/compress";
import { RotateUI } from "./components/rotate";
import { SplitUI } from "./components/split";

render(() => {
  const [selectedTool, setSelectedTool] = createSignal<string>("");
  const [debugText, setDebugText] = createSignal("");

  const toolComponents: Record<string, () => any> = {
    merge: MergeUI,
    split: SplitUI,
    compress: CompressUI,
    rotate: RotateUI,
  };

  const selectTool = (toolName: string) => {
    setSelectedTool(toolName);
    setDebugText(
      `Tool selected: ${toolName} at ${new Date().toLocaleTimeString()}`,
    );
  };
  return (
    <box alignItems="center" justifyContent="center" flexGrow={1}>
      {selectedTool() === "" && (
        <box justifyContent="center" alignItems="center" flexDirection="column">
          <ascii_font font="block" text="PDFZEN" />
          <text attributes={TextAttributes.BOLD} fg={"yellow"} marginTop={1}>
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
            width="10%"
            onMouseDown={() => setSelectedTool("")}
          >
            <box>
              <text fg="yellow">Back to Menu</text>
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
    </box>
  );
});
