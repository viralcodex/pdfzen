import type { PreviewStatusMessageProps } from "../../model/models";

export function PreviewStatusMessage(props: PreviewStatusMessageProps) {
  return (
    <box flexGrow={1} alignItems="center" justifyContent="center" padding={1}>
      <text fg={props.color} content={props.content} />
    </box>
  );
}