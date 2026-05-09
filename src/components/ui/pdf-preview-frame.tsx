import type { BoxRenderable } from "@opentui/core";
import { Show, type JSX } from "solid-js";
import { EmptyBorderChars } from "../../constants/constants";
import { PreviewStatusMessage } from "./preview-status-message";

interface PreviewMouseEvent {
  stopPropagation?: () => void;
}

type BoxDimension = number | "auto" | `${number}%`;

interface PDFPreviewFrameProps {
  setFrameRef: (value: BoxRenderable | undefined) => void;
  onLayoutChange: () => void;
  hasFile: boolean;
  supported: boolean;
  showSupportProbe: boolean;
  showUnsupported: boolean;
  showLoading?: boolean;
  showError: boolean;
  errorMessage: string;
  emptyMessage: string;
  supportProbeMessage?: string;
  unsupportedMessage?: string;
  loadingMessage?: string;
  border?: boolean;
  supportedBorderColor?: string;
  unsupportedBorderColor?: string;
  backgroundColor?: string;
  minHeight?: number;
  flexGrow?: number;
  width?: BoxDimension;
  height?: BoxDimension;
  alignItems?:
    | "auto"
    | "flex-start"
    | "center"
    | "flex-end"
    | "stretch"
    | "baseline"
    | "space-between"
    | "space-around"
    | "space-evenly"
    | undefined;
  justifyContent?:
    | "flex-start"
    | "flex-end"
    | "center"
    | "space-between"
    | "space-around"
    | "space-evenly";
  customBorderChars?: Partial<typeof EmptyBorderChars>;
  children?: JSX.Element;
}

const defaultBorderChars = {
  ...EmptyBorderChars,
  topLeft: "┏",
  topRight: "┓",
  bottomLeft: "┗",
  bottomRight: "┛",
  horizontal: "━",
  vertical: "┃",
};

const canStopPropagation = (event: unknown): event is PreviewMouseEvent =>
  typeof event === "object" && event !== null;

export function PDFPreviewFrame(props: PDFPreviewFrameProps) {
  const showBorder = props.border ?? true;

  return (
    <box
      ref={(value) => {
        props.setFrameRef(value);
        props.onLayoutChange();
      }}
      border={showBorder ? true : undefined}
      customBorderChars={
        showBorder ? { ...defaultBorderChars, ...props.customBorderChars } : undefined
      }
      borderColor={
        showBorder
          ? props.supported
            ? (props.supportedBorderColor ?? "#7c6559")
            : (props.unsupportedBorderColor ?? "#4d443f")
          : undefined
      }
      backgroundColor={props.backgroundColor}
      flexGrow={props.flexGrow ?? 1}
      width={props.width}
      height={props.height}
      minHeight={props.minHeight ?? 16}
      alignItems={props.alignItems}
      justifyContent={props.justifyContent}
      onSizeChange={props.onLayoutChange}
      onMouseDown={(event: unknown) => {
        if (canStopPropagation(event)) {
          event.stopPropagation?.();
        }
      }}
    >
      <Show when={!props.hasFile}>
        <PreviewStatusMessage color="#8c7f78" content={props.emptyMessage} />
      </Show>

      <Show when={props.showSupportProbe}>
        <PreviewStatusMessage
          color="#8c7f78"
          content={props.supportProbeMessage ?? "Checking terminal preview support..."}
        />
      </Show>

      <Show when={props.showUnsupported}>
        <PreviewStatusMessage
          color="#8c7f78"
          content={
            props.unsupportedMessage ?? "Inline preview currently requires Kitty graphics support."
          }
        />
      </Show>

      <Show when={Boolean(props.showLoading)}>
        <PreviewStatusMessage
          color="#b9aaa0"
          content={props.loadingMessage ?? "Rendering preview..."}
        />
      </Show>

      <Show when={props.showError}>
        <PreviewStatusMessage color="#d08a6d" content={props.errorMessage} />
      </Show>

      {props.children}
    </box>
  );
}
