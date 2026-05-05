import { TextAttributes } from "@opentui/core";
import { EmptyBorderChars } from "../../constants/constants";
import type { PreviewButtonProps } from "../../model/models";

export function PreviewButton(props: PreviewButtonProps) {
  return (
    <box
      border={["bottom"]}
      customBorderChars={{
        ...EmptyBorderChars,
        horizontal: "▂",
      }}
      borderColor={props.disabled ? "#3d464c" : "#3498db"}
      backgroundColor={props.disabled ? "#1a1f23" : "#14242e"}
      paddingLeft={1}
      paddingRight={1}
      justifyContent="center"
      alignItems="center"
      onMouseDown={() => {
        if (!props.disabled) {
          props.onClick();
        }
      }}
    >
      <text
        fg={props.disabled ? "#59636a" : "#68ffc0"}
        attributes={props.disabled ? undefined : TextAttributes.BOLD}
        content={props.label}
      />
    </box>
  );
}