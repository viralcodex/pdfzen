import { useTerminalDimensions } from "@opentui/solid";
import type { JSX } from "solid-js";

export function ToolContainer(props: { children: JSX.Element }) {
  const terminalDimensions = useTerminalDimensions();
  const isCompact = () => terminalDimensions().height < 30;

  return (
    <box flexDirection="column" width="100%" height="100%" paddingLeft={2} paddingRight={2}>
      <box flexDirection="column" flexGrow={1} minHeight={0}>
        {isCompact() ? (
          <scrollbox width="100%" height="100%" flexGrow={1} minHeight={0}>
            <box flexDirection="column" width="100%" paddingBottom={1}>
              {props.children}
            </box>
          </scrollbox>
        ) : (
          props.children
        )}
      </box>
    </box>
  );
}