import type { JSX } from "solid-js";

export function ButtonRow(props: { children: JSX.Element }) {
  return (
    <box flexDirection="row" columnGap={2} marginTop={1} flexShrink={0}>
      {props.children}
    </box>
  );
}