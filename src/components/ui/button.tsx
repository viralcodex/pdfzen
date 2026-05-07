import { TextAttributes } from "@opentui/core";
import { createSignal } from "solid-js";
import { EmptyBorderChars } from "../../constants/constants";

interface ButtonProps {
  label: string;
  color: string;
  disabled?: boolean;
  onClick: () => void;
  focused?: boolean;
  width?: number | "auto" | `${number}%`;
}

export function Button(props: ButtonProps) {
  const [hovered, setHovered] = createSignal(false);
  const isHighlighted = () => !props.disabled && (props.focused || hovered());

  const getColor = () => {
    if (props.disabled) return { bg: "#2a2a2a", border: "#444444" };
    switch (props.color) {
      case "green":
        return { bg: "#1e3a28", border: "#3bff8c" };
      case "cyan":
        return { bg: "#1a2f3a", border: "#34aeff" };
      case "output":
        return { bg: "#14353d", border: "#68ffc0" };
      case "yellow":
        return { bg: "#3a321a", border: "#f39c12" };
      case "magenta":
        return { bg: "#2f1a3a", border: "#9b59b6" };
      case "red":
        return { bg: "#3a1a1a", border: "#e74c3c" };
      default:
        return { bg: "#2c3e50", border: "#95a5a6" };
    }
  };

  const getTextColor = () => {
    if (props.disabled) return "#7f8c8d";
    if (isHighlighted() || props.color === "output") return getColor().border;
    return getColor().border;
  };

  return (
    <box
      border={["bottom"]}
      borderStyle="heavy"
      borderColor={isHighlighted() ? "#68ffc0" : getColor().border}
      backgroundColor={getColor().bg}
      customBorderChars={{
        ...EmptyBorderChars,
        horizontal: isHighlighted() ? "▄" : "▂",
      }}
      height={1}
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
      width={props.width}
      justifyContent="center"
      alignItems="center"
      onMouseDown={props.disabled ? undefined : props.onClick}
      onMouseOver={() => setHovered(true)}
      onMouseOut={() => setHovered(false)}
    >
      <text fg={getTextColor()} attributes={TextAttributes.BOLD} content={props.label} />
    </box>
  );
}
