import { TextAttributes } from "@opentui/core";
import type { Accessor, Setter } from "solid-js";
import { EmptyBorderChars } from "../../constants/constants";

interface TextInputProps {
  label: string;
  value: Accessor<string>;
  onInput: Setter<string>;
  placeholder?: string;
  focused: boolean;
  onFocus: () => void;
  onSubmit?: () => void;
  flexGrow?: number;
  marginTop?: number;
  marginBottom?: number;
  width?: number | "auto" | `${number}%`;
}

export function TextInput(props: TextInputProps) {
  const borderColor = () => (props.focused ? "#68ffc0" : "#34495e");

  return (
    <box
      flexDirection="column"
      marginTop={props.marginTop ?? 1}
      marginBottom={props.marginBottom ?? 1}
      alignItems="flex-start"
      flexShrink={0}
      flexGrow={props.flexGrow}
      width={props.width}
    >
      <text fg="#ecf0f1" attributes={TextAttributes.BOLD} content={props.label} />
      <box
        border={["left"]}
        borderStyle="heavy"
        borderColor={borderColor()}
        customBorderChars={{
          ...EmptyBorderChars,
          vertical: props.focused ? "▐" : "▌",
          horizontal: "▂",
        }}
        backgroundColor="#1a1a1a"
        padding={1}
        paddingBottom={2}
        width={props.width ?? "100%"}
      >
        <input
          focused={props.focused}
          value={props.value()}
          onInput={props.onInput}
          onSubmit={props.onSubmit}
          placeholder={props.placeholder}
          onMouseDown={props.onFocus}
        />
      </box>
    </box>
  );
}