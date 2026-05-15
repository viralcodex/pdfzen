import type { JSX } from "solid-js";

export function ToggleRow(props: { children: JSX.Element }) {
  return (
    <box flexDirection="row" columnGap={2} flexShrink={0}>
      {props.children}
    </box>
  );
}
