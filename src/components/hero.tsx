import { TextAttributes } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/solid";

const Hero = () => {
  const terminalDimensions = useTerminalDimensions();
  const titleFont = () =>
    terminalDimensions().height < 24 || terminalDimensions().width < 60 ? "tiny" : "block";
  return (
    <box justifyContent="center" alignItems="center" flexDirection="column">
      <ascii_font font={titleFont()} text="PDFZEN" style={{ maxWidth: 100 }} />
      <text
        attributes={TextAttributes.BOLD}
        fg={"yellow"}
        marginTop={1}
        marginBottom={2}
        content={"Your all-in-one PDF solution"}
      />
    </box>
  );
};

export default Hero;
