import { TextAttributes } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/solid";
import { Show, Index } from "solid-js";
import type { JSX, Accessor, Setter } from "solid-js";
import { EmptyBorderChars } from "../constants/constants";

// ============ Shared Types ============
export type StatusType = "info" | "error" | "success";

export const STATUS_COLORS: Record<StatusType, string> = {
  error: "red",
  success: "green",
  info: "white",
};

// ============ Layout Components ============
export function ToolContainer(props: { children: JSX.Element }) {
  const terminalDimensions = useTerminalDimensions();
  const isCompact = () => terminalDimensions().height < 30;

  return (
    <box
      flexDirection="column"
      width="100%"
      height="100%"
      paddingLeft={2}
      paddingRight={2}
    >
      <box flexDirection="column" flexGrow={1} minHeight={0}>
        {isCompact() ? (
          <scrollbox width="100%" height="100%" flexGrow={1} minHeight={0}>
            <box flexDirection="column" width="100%" paddingBottom={1}>
              {props.children}
            </box>
          </scrollbox>
        ) : (
          props.children
        )}
      </box>
    </box>
  );
}

export function ButtonRow(props: { children: JSX.Element }) {
  return (
    <box flexDirection="row" columnGap={2} marginTop={1} flexShrink={0}>
      {props.children}
    </box>
  );
}

export function ToggleRow(props: { children: JSX.Element }) {
  return (
    <box flexDirection="row" columnGap={1} flexShrink={0}>
      {props.children}
    </box>
  );
}

// ============ Interactive Components ============
interface ButtonProps {
  label: string;
  color: string;
  disabled?: boolean;
  onClick: () => void;
}

export function Button(props: ButtonProps) {
  const getColor = () => {
    if (props.disabled) return { bg: "#1a1a1a", border: "#333333" };
    switch (props.color) {
      case "green":
        return { bg: "#1e3a28", border: "#27ae60" };
      case "cyan":
        return { bg: "#1a2f3a", border: "#3498db" };
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

  return (
    <box
      border={["bottom"]}
      borderStyle="heavy"
      borderColor={getColor().border}
      backgroundColor={getColor().bg}
      customBorderChars={{
        ...EmptyBorderChars,
        horizontal: "▂",
      }}
      height={1}
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
      justifyContent="center"
      alignItems="center"
      onMouseDown={props.onClick}
    >
      <text
        fg={props.disabled ? "#7f8c8d" : props.color}
        attributes={TextAttributes.BOLD}
        content={props.label}
      />
    </box>
  );
}

interface ToggleProps<T> {
  label: string;
  value: T;
  selected: T;
  onSelect: (v: T) => void;
}

export function Toggle<T>(props: ToggleProps<T>) {
  const isSelected = () => props.value === props.selected;
  return (
    <box
      border={["bottom"]}
      borderStyle={isSelected() ? "heavy" : "single"}
      borderColor={isSelected() ? "#3498db" : "#34495e"}
      backgroundColor={isSelected() ? "#1a2f3a" : "#1a1a1a"}
      customBorderChars={{
        ...EmptyBorderChars,
        horizontal: "▂",
      }}
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      justifyContent="center"
      alignItems="center"
      onMouseDown={() => props.onSelect(props.value)}
    >
      <text
        fg={isSelected() ? "#3498db" : "#7f8c8d"}
        attributes={isSelected() ? TextAttributes.BOLD : undefined}
        content={props.label}
      />
    </box>
  );
}

// ============ Display Components ============
export function Label(props: { text: string; count?: number }) {
  return (
    <text
      attributes={TextAttributes.BOLD}
      marginTop={1}
      flexShrink={0}
      content={
        props.count !== undefined
          ? `${props.text} (${props.count}):`
          : `${props.text}:`
      }
    />
  );
}

export function StatusBar(props: { message: string; type: StatusType }) {
  const getBorderColor = () => {
    switch (props.type) {
      case "error":
        return "#e74c3c";
      case "success":
        return "#27ae60";
      default:
        return "#3498db";
    }
  };

  return (
    <box
      border={["left", "bottom"]}
      borderColor={getBorderColor()}
      borderStyle="heavy"
      backgroundColor="#1a1a1a"
      paddingLeft={1}
      paddingRight={1}
      // paddingTop={1}
      marginTop={1}
      flexShrink={0}
    >
      <text
        fg={STATUS_COLORS[props.type]}
        attributes={TextAttributes.BOLD}
        content={props.message}
      />
    </box>
  );
}

// ============ File List Component ============
interface FileListProps {
  files: Accessor<string[]>;
  selectedIndex: Accessor<number | null>;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
  onMove?: (index: number, direction: "up" | "down") => void;
  emptyText?: string;
  showReorder?: boolean;
}

export function FileList(props: FileListProps) {
  const fileCount = () => props.files().length;

  return (
    <scrollbox
      border={["left"]}
      borderStyle="heavy"
      borderColor="#34495e"
      customBorderChars={{
        ...EmptyBorderChars,
        vertical: "▌",
        bottomLeft: "╹",
      }}
      backgroundColor="#1a1a1a"
      width="100%"
      flexGrow={1}
      minHeight={0}
    >
      <Show
        when={fileCount() > 0}
        fallback={
          <box
            flexGrow={1}
            alignItems="center"
            justifyContent="center"
            paddingTop={1}
            paddingBottom={1}
          >
            <text
              fg="#7f8c8d"
              content={
                props.emptyText ||
                "No files added yet. Drag & drop PDFs or enter path below."
              }
            />
          </box>
        }
      >
        <box flexDirection="column" width="100%">
          <Index each={props.files()}>
            {(file, index) => {
              const isSelected = () => props.selectedIndex() === index;
              return (
                <box
                  flexDirection="row"
                  alignItems="center"
                  padding={1}
                  marginBottom={1}
                  backgroundColor={"#333333"}
                  onMouseDown={() => props.onSelect(index)}
                  columnGap={1}
                  border={["left"]}
                  borderColor={"#3498db"}
                  customBorderChars={{
                    ...EmptyBorderChars,
                    vertical: "┃",
                  }}
                >
                  <text
                    fg={isSelected() ? "cyan" : "yellow"}
                    minWidth={3}
                    content={isSelected() ? "▶" : `${index + 1}.`}
                  />
                  <text
                    fg={"#ecf0f1"}
                    flexGrow={1}
                    flexShrink={1}
                    content={String(file())}
                  />
                  <box flexDirection="row" columnGap={1}>
                    <Show when={props.showReorder && props.onMove}>
                      <box
                        border={["bottom"]}
                        borderColor={index > 0 ? "#3498db" : "#34495e"}
                        backgroundColor="#2c3e50"
                        customBorderChars={{
                          ...EmptyBorderChars,
                          horizontal: "▂",
                        }}
                        onMouseDown={(e: any) => {
                          e.stopPropagation?.();
                          props.onMove?.(index, "up");
                        }}
                        height={1}
                        paddingTop={1}
                        paddingBottom={1}
                        paddingLeft={2}
                        paddingRight={2}
                        minWidth={3}
                        justifyContent="center"
                        alignItems="center"
                      >
                        <text
                          fg={index > 0 ? "#3498db" : "#7f8c8d"}
                          content={"↑"}
                        />
                      </box>
                      <box
                        border={["bottom"]}
                        borderColor={
                          index < fileCount() - 1 ? "#3498db" : "#34495e"
                        }
                        backgroundColor="#2c3e50"
                        customBorderChars={{
                          ...EmptyBorderChars,
                          horizontal: "▂",
                        }}
                        onMouseDown={(e: any) => {
                          e.stopPropagation?.();
                          props.onMove?.(index, "down");
                        }}
                        height={1}
                        paddingTop={1}
                        paddingBottom={1}
                        paddingLeft={2}
                        paddingRight={2}
                        minWidth={3}
                        justifyContent="center"
                        alignItems="center"
                      >
                        <text
                          fg={index < fileCount() - 1 ? "#3498db" : "#7f8c8d"}
                          content={"↓"}
                        />
                      </box>
                    </Show>
                    <box
                      border={["bottom"]}
                      borderColor="#e74c3c"
                      backgroundColor="#3a1a1a"
                      customBorderChars={{
                        ...EmptyBorderChars,
                        horizontal: "▂",
                      }}
                      onMouseDown={(e: any) => {
                        e.stopPropagation?.();
                        props.onRemove(index);
                      }}
                      height={1}
                      paddingTop={1}
                      paddingBottom={1}
                      paddingLeft={2}
                      paddingRight={2}
                      minWidth={3}
                      justifyContent="center"
                      alignItems="center"
                    >
                      <text
                        fg="#e74c3c"
                        attributes={TextAttributes.BOLD}
                        content={"X"}
                      />
                    </box>
                  </box>
                </box>
              );
            }}
          </Index>
        </box>
      </Show>
    </scrollbox>
  );
}

// ============ Input Components ============
interface PathInputProps {
  value: Accessor<string>;
  onInput: Setter<string>;
  onSubmit: () => void;
  focused: boolean;
  onFocus: () => void;
}

export function PathInput(props: PathInputProps) {
  const borderColor = () => (props.focused ? "#3498db" : "#34495e");
  return (
    <box
      flexDirection="column"
      marginTop={1}
      marginBottom={1}
      alignItems="flex-start"
      flexShrink={0}
    >
      <text fg="#ecf0f1" attributes={TextAttributes.BOLD} content={"Path:"} />
      <box
        border={["left"]}
        borderStyle="heavy"
        borderColor={borderColor()}
        customBorderChars={{
          ...EmptyBorderChars,
          vertical: "▌",
          bottomLeft: "╹",
        }}
        backgroundColor="#1a1a1a"
        paddingTop={1}
        paddingBottom={2}
        paddingLeft={1}
        paddingRight={1}
        width="100%"
      >
        <input
          focused={props.focused}
          value={props.value()}
          onInput={props.onInput}
          onSubmit={props.onSubmit}
          placeholder="/path/to/file.pdf"
          onMouseDown={props.onFocus}
        />
      </box>
    </box>
  );
}

interface TextInputProps {
  label: string;
  value: Accessor<string>;
  onInput: Setter<string>;
  placeholder?: string;
  focused: boolean;
  onFocus: () => void;
  // Layout customization
  flexGrow?: number;
  marginTop?: number;
  marginBottom?: number;
  width?: number | "auto" | `${number}%`;
}

export function TextInput(props: TextInputProps) {
  const borderColor = () => (props.focused ? "#3498db" : "#34495e");
  return (
    <box
      flexDirection="column"
      marginTop={props.marginTop ?? 1}
      marginBottom={props.marginBottom ?? 1}
      alignItems="flex-start"
      flexShrink={0}
      flexGrow={props.flexGrow}
      width={props.width}
    >
      <text
        fg="#ecf0f1"
        attributes={TextAttributes.BOLD}
        content={props.label}
      />
      <box
        border={["left"]}
        borderStyle="heavy"
        borderColor={borderColor()}
        customBorderChars={{
          ...EmptyBorderChars,
          vertical: "▌",
          horizontal: "▂",
        }}
        backgroundColor="#1a1a1a"
        padding={1}
        paddingBottom={2}
        width={props.width ?? "100%"}
      >
        <input
          focused={props.focused}
          value={props.value()}
          onInput={props.onInput}
          placeholder={props.placeholder}
          onMouseDown={props.onFocus}
        />
      </box>
    </box>
  );
}
