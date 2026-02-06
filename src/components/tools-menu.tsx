import { useTerminalDimensions } from "@opentui/solid";
import { EmptyBorderChars, toolsMenu } from "../constants/constants";
import { TextAttributes } from "@opentui/core";
import { chunkArray } from "../utils/utils";
import { createEffect, onCleanup } from "solid-js";
import { useKeyboardNav } from "../hooks/useKeyboardNav";

export function ToolsMenu(props: {
  selectedTool: () => string | null;
  selectTool: (toolName: string) => void;
}) {
  const { selectedTool, selectTool } = props;
  const nav = useKeyboardNav();
  const terminalDimensions = useTerminalDimensions();
  const isCompact = () => terminalDimensions().width < 95;
  const columns = () => (isCompact() ? 2 : 4);
  const gap = () => (isCompact() ? 2 : 2);
  const rowWidth = () => Math.max(0, terminalDimensions().width - 6);
  const buttonWidth = () => {
    const cols = columns();
    const totalGap = gap() * (cols - 1);
    return Math.max(18, Math.floor((rowWidth() - totalGap) / cols));
  };

  const rows = () => chunkArray(toolsMenu, isCompact() ? 2 : 4);

  // Register all tool menu items
  createEffect(() => {
    nav.clearElements();
    toolsMenu.forEach((tool) => {
      nav.registerElement({
        id: `tool-${tool.command}`,
        type: "tool",
        onEnter: () => selectTool(tool.command),
      });
    });
  });

  onCleanup(() => {
    nav.clearElements();
  });

  return (
    <box
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
      rowGap={1}
    >
      {rows().map((row) => (
        <box
          alignItems="center"
          justifyContent="center"
          flexDirection="row"
          columnGap={gap()}
          width={rowWidth()}
        >
          {row.map((tool) => {
            const isSelected = () => selectedTool() === tool.command;
            const isFocused = () => nav.isFocused(`tool-${tool.command}`);
            return (
              <box
                alignItems="center"
                justifyContent="center"
                paddingLeft={3}
                paddingRight={3}
                paddingTop={1}
                onMouseDown={() => selectTool(tool.command)}
                width={buttonWidth()}
                backgroundColor={"#2c3e50"}
                border={["bottom"]}
                borderColor={isFocused() ? "#68ffc0" : "#e74c3c"}
                borderStyle="heavy"
                customBorderChars={{
                  ...EmptyBorderChars,
                  horizontal: isFocused() ? "▄" : "▂",
                }}
              >
                <text
                  fg={isFocused() ? "#32d692" : isSelected() ? "#ffffff" : "#e2e8f0"}
                  attributes={isSelected() || isFocused() ? TextAttributes.BOLD : undefined}
                  content={String(tool.name)}
                />
              </box>
            );
          })}
        </box>
      ))}
    </box>
  );
}
