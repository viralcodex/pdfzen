import { fonts, TextAttributes } from "@opentui/core";

export function MergeUI() {
  return (
    <box
      flexDirection="column"
      width="100%"
      height="100%"
    >
      <box
        width="100%"
        alignItems="center"
        paddingTop={1}
        paddingBottom={1}
        border={true}
      >
        <text fg="yellow">Merge Tool</text>
      </box>
      <box
        alignItems="center"
        justifyContent="center"
        flexGrow={1}
      >
        <text>UI Content Here</text>
      </box>
    </box>
  );
}
