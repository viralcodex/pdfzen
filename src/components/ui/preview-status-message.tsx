import type { PreviewStatusMessageProps } from "../../model/models";

export function PreviewStatusMessage(props: PreviewStatusMessageProps) {
  return (
    <box alignItems="center" justifyContent="center">
      <text fg={props.color} content={props.content} />
    </box>
  );
}
