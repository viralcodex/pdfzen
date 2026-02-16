import { TextAttributes } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/solid";
import { Show, Index, createSignal } from "solid-js";
import type { JSX, Accessor, Setter } from "solid-js";
import { EmptyBorderChars } from "../constants/constants";
import type { StatusType } from "../model/models";
import { handleFileExplorer } from "../utils/utils";

export type { StatusType };

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
    <box flexDirection="column" width="100%" height="100%" paddingLeft={2} paddingRight={2}>
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
  focused?: boolean;
}

export function Button(props: ButtonProps) {
  const [hovered, setHovered] = createSignal(false);
  const isHighlighted = () => !props.disabled && (props.focused || hovered());

  const getColor = () => {
    if (props.disabled) return { bg: "#2a2a2a", border: "#444444" };
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
      borderColor={isHighlighted() ? "#68ffc0" : getColor().border}
      backgroundColor={getColor().bg}
      customBorderChars={{
        ...EmptyBorderChars,
        horizontal: isHighlighted() ? "▄" : "▂",
      }}
      height={1}
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
      justifyContent="center"
      alignItems="center"
      onMouseDown={props.onClick}
      onMouseOver={() => setHovered(true)}
      onMouseOut={() => setHovered(false)}
    >
      <text
        fg={props.disabled ? "#7f8c8d" : isHighlighted() ? "#68ffc0" : props.color}
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
  focused?: boolean;
}

export function Toggle<T>(props: ToggleProps<T>) {
  const [hovered, setHovered] = createSignal(false);
  const isSelected = () => props.value === props.selected;
  const isHighlighted = () => props.focused || hovered();
  return (
    <box
      border={["bottom"]}
      borderStyle={isSelected() ? "heavy" : "single"}
      borderColor={isHighlighted() ? "#68ffc0" : isSelected() ? "#3498db" : "#34495e"}
      backgroundColor={isSelected() ? "#1a2f3a" : "#1a1a1a"}
      customBorderChars={{
        ...EmptyBorderChars,
        horizontal: isHighlighted() ? "▄" : "▂",
      }}
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      justifyContent="center"
      alignItems="center"
      onMouseDown={() => props.onSelect(props.value)}
      onMouseOver={() => setHovered(true)}
      onMouseOut={() => setHovered(false)}
    >
      <text
        fg={isHighlighted() ? "#68ffc0" : isSelected() ? "#3498db" : "#7f8c8d"}
        attributes={isSelected() || isHighlighted() ? TextAttributes.BOLD : undefined}
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
      content={props.count !== undefined ? `${props.text} (${props.count}):` : `${props.text}:`}
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
  fileType: "pdf" | "image";
  selectedIndex: Accessor<number | null>;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
  onMove?: (index: number, direction: "up" | "down") => void;
  onFilesSelected?: (files: string[]) => void;
  emptyText?: string;
  showReorder?: boolean;
  focusedIndex?: () => number | null;
  focusedButton?: () => string | null;
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
      onMouseDown={async (e) => {
        const files = await handleFileExplorer(e, props.fileType);
        if (files.length > 0) {
          props.onFilesSelected?.(files);
        }
      }}
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
                "No files added yet. Click or drag files here to add."
              }
            />
          </box>
        }
      >
        <box flexDirection="column" width="100%">
          <Index each={props.files()}>
            {(file, index) => {
              const isSelected = () => props.selectedIndex() === index;
              const isFocused = () => props.focusedIndex?.() === index;
              const [rowHovered, setRowHovered] = createSignal(false);
              const [upHovered, setUpHovered] = createSignal(false);
              const [downHovered, setDownHovered] = createSignal(false);
              const [removeHovered, setRemoveHovered] = createSignal(false);
              const isRowHighlighted = () => isFocused() || rowHovered();
              const canMoveUp = () => index > 0;
              const canMoveDown = () => index < fileCount() - 1;
              const isUpHighlighted = () =>
                canMoveUp() &&
                (props.focusedButton?.() === `file-${index}-up` || upHovered());
              const isDownHighlighted = () =>
                canMoveDown() &&
                (props.focusedButton?.() === `file-${index}-down` ||
                  downHovered());
              const isRemoveHighlighted = () =>
                props.focusedButton?.() === `file-${index}-remove` ||
                removeHovered();
              return (
                <box
                  flexDirection="row"
                  alignItems="center"
                  padding={1}
                  marginBottom={1}
                  backgroundColor={isRowHighlighted() ? "#2a4a3a" : "#333333"}
                  onMouseDown={() => props.onSelect(index)}
                  onMouseOver={() => setRowHovered(true)}
                  onMouseOut={() => setRowHovered(false)}
                  columnGap={1}
                  width="100%"
                  border={["left"]}
                  borderColor={isRowHighlighted() ? "#68ffc0" : "#3498db"}
                  customBorderChars={{
                    ...EmptyBorderChars,
                    vertical: isRowHighlighted() ? "▐" : "┃",
                  }}
                >
                  <text
                    fg={
                      isRowHighlighted()
                        ? "#68ffc0"
                        : isSelected()
                          ? "cyan"
                          : "yellow"
                    }
                    minWidth={3}
                    content={`${index + 1}.`}
                  />
                  <text
                    fg={isRowHighlighted() ? "#ffffff" : "#ecf0f1"}
                    flexGrow={1}
                    flexShrink={1}
                    content={String(file())}
                    attributes={
                      isRowHighlighted() ? TextAttributes.BOLD : undefined
                    }
                  />
                  <box flexDirection="row" columnGap={1} flexShrink={0}>
                    <Show when={props.showReorder && props.onMove}>
                      <box
                        border={["bottom"]}
                        borderColor={
                          isUpHighlighted()
                            ? "#68ffc0"
                            : canMoveUp()
                              ? "#3498db"
                              : "#34495e"
                        }
                        backgroundColor={
                          isUpHighlighted() ? "#1a4a3a" : "#2c3e50"
                        }
                        customBorderChars={{
                          ...EmptyBorderChars,
                          horizontal: isUpHighlighted() ? "▄" : "▂",
                        }}
                        onMouseDown={(e: any) => {
                          e.stopPropagation?.();
                          props.onMove?.(index, "up");
                        }}
                        onMouseOver={() => setUpHovered(true)}
                        onMouseOut={() => setUpHovered(false)}
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
                          fg={
                            isUpHighlighted()
                              ? "#68ffc0"
                              : canMoveUp()
                                ? "#3498db"
                                : "#7f8c8d"
                          }
                          attributes={
                            isUpHighlighted() ? TextAttributes.BOLD : undefined
                          }
                          content={"↑"}
                        />
                      </box>
                      <box
                        border={["bottom"]}
                        borderColor={
                          isDownHighlighted()
                            ? "#68ffc0"
                            : canMoveDown()
                              ? "#3498db"
                              : "#34495e"
                        }
                        backgroundColor={
                          isDownHighlighted() ? "#1a4a3a" : "#2c3e50"
                        }
                        customBorderChars={{
                          ...EmptyBorderChars,
                          horizontal: isDownHighlighted() ? "▄" : "▂",
                        }}
                        onMouseDown={(e: any) => {
                          e.stopPropagation?.();
                          props.onMove?.(index, "down");
                        }}
                        onMouseOver={() => setDownHovered(true)}
                        onMouseOut={() => setDownHovered(false)}
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
                          fg={
                            isDownHighlighted()
                              ? "#68ffc0"
                              : canMoveDown()
                                ? "#3498db"
                                : "#7f8c8d"
                          }
                          attributes={
                            isDownHighlighted()
                              ? TextAttributes.BOLD
                              : undefined
                          }
                          content={"↓"}
                        />
                      </box>
                    </Show>
                    <box
                      border={["bottom"]}
                      borderColor={
                        isRemoveHighlighted() ? "#ff6b6b" : "#e74c3c"
                      }
                      backgroundColor={
                        isRemoveHighlighted() ? "#5a1a1a" : "#3a1a1a"
                      }
                      customBorderChars={{
                        ...EmptyBorderChars,
                        horizontal: isRemoveHighlighted() ? "▄" : "▂",
                      }}
                      onMouseDown={(e: any) => {
                        e.stopPropagation?.();
                        props.onRemove(index);
                      }}
                      onMouseOver={() => setRemoveHovered(true)}
                      onMouseOut={() => setRemoveHovered(false)}
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
                        fg={isRemoveHighlighted() ? "#ff6b6b" : "#e74c3c"}
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
interface TextInputProps {
  label: string;
  value: Accessor<string>;
  onInput: Setter<string>;
  placeholder?: string;
  focused: boolean;
  onFocus: () => void;
  onSubmit?: () => void;
  // Layout customization
  flexGrow?: number;
  marginTop?: number;
  marginBottom?: number;
  width?: number | "auto" | `${number}%`;
}

export function TextInput(props: TextInputProps) {
  const borderColor = () => (props.focused ? "#68ffc0" : "#34495e");
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
      <text fg="#ecf0f1" attributes={TextAttributes.BOLD} content={props.label} />
      <box
        border={["left"]}
        borderStyle="heavy"
        borderColor={borderColor()}
        customBorderChars={{
          ...EmptyBorderChars,
          vertical: props.focused ? "▐" : "▌",
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
          onSubmit={props.onSubmit}
          placeholder={props.placeholder}
          onMouseDown={props.onFocus}
        />
      </box>
    </box>
  );
}


