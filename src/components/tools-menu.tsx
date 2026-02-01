import { toolsMenu } from "../constants/constants";
import { TextAttributes } from "@opentui/core";

export function ToolsMenu( props: { selectedTool: () => string | null; selectTool: (toolName: string) => void } ) {
    const { selectedTool, selectTool } = props;
    return (
      <box alignItems="center" justifyContent="center" flexDirection="column">
        <box
          alignItems="center"
          justifyContent="center"
          marginTop={2}
          flexDirection="row"
          columnGap={3}
        >
          {toolsMenu.map((tool) => (
              <box
                border={true}
                flexDirection="column"
                paddingLeft={4}
                paddingRight={4}
                onMouseDown={() => selectTool(tool.command)}
              >
                <text 
                  fg={selectedTool() === tool.command ? "cyan" : "yellow"}
                  attributes={selectedTool() === tool.command ? TextAttributes.BOLD : undefined}
                >
                  {tool.name}
                </text>
              </box>
          ))}
        </box>
      </box>
    );
}