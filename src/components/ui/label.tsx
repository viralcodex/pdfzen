import { TextAttributes } from "@opentui/core";

export function Label(props: { text: string; count?: number }) {
  return (
    <text
      attributes={TextAttributes.BOLD}
      marginTop={1}
      flexShrink={0}
      content={props.count !== undefined ? `${props.text} (${props.count}):` : `${props.text}:`}
    />
  );
}
