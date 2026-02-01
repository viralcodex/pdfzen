export function SplitUI() {
  return (
    <box
      flexDirection="column"
      height="100%"
      width="100%"
    >
      <box
        width="100%"
        alignItems="center"
        paddingTop={1}
        paddingBottom={1}
        border={true}
      >
        <text fg="yellow">Split Tool</text>
      </box>
      <box
        alignItems="center"
        justifyContent="center"
        flexGrow={1}
      >
        <text>Split Tool UI</text>
      </box>
    </box>
  );
}
