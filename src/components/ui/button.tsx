import { MouseEvent, TextAttributes } from "@opentui/core";
import { createSignal } from "solid-js";
import { EmptyBorderChars, HIGHLIGHT_ACCENT_COLOR } from "../../constants/constants";

interface ButtonProps {
  label: string;
  color: string;
  disabled?: boolean;
  onClick: (e?: MouseEvent) => void;
  focused?: boolean;
  width?: number | "auto" | `${number}%`;
  marginLeft?: number;
  marginRight?: number;
  marginTop?: number;
  marginBottom?: number;
  paddingRight?: number;
  paddingLeft?: number;
  paddingTop?: number;
  paddingBottom?: number;
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
        return { bg: "#14353d", border: HIGHLIGHT_ACCENT_COLOR };
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
      width={props.width}
      marginTop={props.marginTop ?? 0}
      marginBottom={props.marginBottom ?? 0}
    >
      <box
        border={["bottom"]}
        borderStyle="heavy"
        borderColor={isHighlighted() ? HIGHLIGHT_ACCENT_COLOR : getColor().border}
        backgroundColor={getColor().bg}
        customBorderChars={{
          ...EmptyBorderChars,
          horizontal: isHighlighted() ? "▄" : "▂",
        }}
        height={1}
        marginLeft={props.marginLeft ?? 0}
        marginRight={props.marginRight ?? 0}
        marginTop={props.marginTop ?? 0}
        marginBottom={props.marginBottom ?? 0}
        paddingLeft={props.paddingLeft ?? 2}
        paddingRight={props.paddingRight ?? 2}
        paddingTop={props.paddingTop ?? 1}
        paddingBottom={props.paddingBottom ?? 1}
        width="100%"
        justifyContent="center"
        alignItems="center"
        onMouseDown={props.disabled ? undefined : (e: MouseEvent) => props.onClick(e)}
        onMouseOver={() => setHovered(true)}
        onMouseOut={() => setHovered(false)}
      >
        <text fg={getTextColor()} attributes={TextAttributes.BOLD} content={props.label} />
      </box>
    </box>
  );
}
