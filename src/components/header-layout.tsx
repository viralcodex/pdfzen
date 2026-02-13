import { TextAttributes } from "@opentui/core";
import { createSignal, type JSX } from "solid-js";
import { EmptyBorderChars } from "../constants/constants";

interface ToolLayoutProps {
  toolName: string;
  onBack: () => void;
  children: JSX.Element;
}

export function HeaderLayout(props: ToolLayoutProps) {
  const [backHovered, setBackHovered] = createSignal(false);

  return (
    <box flexDirection="column" width="100%" height="100%">
      <box
        flexDirection="row"
        alignItems="center"
        justifyContent="center"
        width="100%"
        flexShrink={0}
        paddingLeft={2}
        paddingRight={2}
        columnGap={2}
      >
        <box
          height={1}
          paddingTop={1}
          paddingBottom={1}
          paddingLeft={1}
          paddingRight={1}
          justifyContent="center"
          alignItems="center"
          onMouseDown={props.onBack}
          onMouseOver={() => setBackHovered(true)}
          onMouseOut={() => setBackHovered(false)}
          border={["bottom"]}
          backgroundColor={backHovered() ? "#4a4a4a" : "#3b3b3b"}
          borderColor={backHovered() ? "#68ffc0" : "#ff6200"}
          customBorderChars={{
            ...EmptyBorderChars,
            horizontal: backHovered() ? "▄" : "▂",
          }}
        >
          <text fg={backHovered() ? "#68ffc0" : "yellow"} content={"esc"} />
        </box>
        <box
          flexGrow={1}
          alignItems="center"
          justifyContent="center"
          height={1}
          paddingTop={1}
          paddingBottom={1}
          border={["bottom"]}
          borderColor={"#34495e"}
          customBorderChars={{
            ...EmptyBorderChars,
            horizontal: "▂",
          }}
        >
          <text attributes={TextAttributes.BOLD} content={props.toolName} />
        </box>
      </box>
      <box flexGrow={1} minHeight={0}>
        {props.children}
      </box>
    </box>
  );
}
