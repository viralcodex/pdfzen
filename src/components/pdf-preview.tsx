import { TextAttributes, type BoxRenderable, type CliRenderer } from "@opentui/core";
import { onResize, useRenderer } from "@opentui/solid";
import {
  Show,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  onCleanup,
} from "solid-js";
import {
  clearPDFPreview,
  displayPDFPreview,
  getPDFPreviewPageCount,
  getPDFPreviewViewport,
  renderPDFPreviewPage,
} from "../utils/pdf-preview";
import { useFileListContext } from "../provider/fileListProvider";
import { EmptyBorderChars } from "../constants/constants";
import { Button } from "./ui/button";
import { PreviewButton } from "./ui/preview-button";
import { PreviewStatusMessage } from "./ui/preview-status-message";

type RendererCapabilities = CliRenderer["capabilities"];

interface PreviewMouseEvent {
  stopPropagation?: () => void;
}

const hasKittyGraphics = (capabilities: RendererCapabilities | null) =>
  Boolean(capabilities?.kitty_graphics);

const canStopPropagation = (event: unknown): event is PreviewMouseEvent =>
  typeof event === "object" && event !== null;


export function PDFPreviewPane(props: { onOpen: () => void; onClose: () => void }) {
  const renderer = useRenderer();
  const fl = useFileListContext();
  const selectedFile = fl.selectedFile;
  const [page, setPage] = createSignal(1);
  const [layoutVersion, setLayoutVersion] = createSignal(0);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const initialKittySupport = hasKittyGraphics(renderer.capabilities ?? null);
  const [capabilities, setCapabilities] = createSignal<RendererCapabilities | null>(
    renderer.capabilities ?? null,
  );
  const [kittySupportDetected, setKittySupportDetected] = createSignal(initialKittySupport);
  const [capabilityProbeExpired, setCapabilityProbeExpired] = createSignal(initialKittySupport);
  const supported = createMemo(
    () => kittySupportDetected() || hasKittyGraphics(capabilities()),
  );
  const [pageCount] = createResource(() => selectedFile(), getPDFPreviewPageCount);

  let frameRef: BoxRenderable | undefined;
  let requestVersion = 0;
  let activeZIndex: number | null = null;
  let latestZIndex = 0;
  let capabilityProbeTimer: ReturnType<typeof setTimeout> | null = null;
  let layoutRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  const totalPages = () => Math.max(pageCount() ?? 0, 1);
  const canGoPrev = () => page() > 1;
  const canGoNext = () => page() < totalPages();
  const showSupportProbe = () => Boolean(selectedFile()) && !supported() && !capabilityProbeExpired();
  const showUnsupported = () => Boolean(selectedFile()) && !supported() && capabilityProbeExpired();
  const showLoading = () => Boolean(selectedFile()) && supported() && isLoading();
  const showError = () => Boolean(selectedFile()) && supported() && !isLoading() && Boolean(error());

  const invalidateLayout = () => {
    setLayoutVersion((value) => value + 1);
  };

  const clearCapabilityProbeTimer = () => {
    if (capabilityProbeTimer !== null) {
      clearTimeout(capabilityProbeTimer);
      capabilityProbeTimer = null;
    }
  };

  const clearLayoutRefreshTimer = () => {
    if (layoutRefreshTimer !== null) {
      clearTimeout(layoutRefreshTimer);
      layoutRefreshTimer = null;
    }
  };

  const clearActivePreview = () => {
    if (activeZIndex === null) {
      return;
    }

    clearPDFPreview(renderer, activeZIndex);
    activeZIndex = null;
  };

  const cancelPendingPreviewRender = () => {
    requestVersion += 1;
  };

  const refreshPreviewLayout = () => {
    cancelPendingPreviewRender();
    clearActivePreview();

    clearLayoutRefreshTimer();
    layoutRefreshTimer = setTimeout(() => {
      layoutRefreshTimer = null;
      invalidateLayout();
    }, 0);
  };
  onResize(() => {
    refreshPreviewLayout();
  });

  const handleCapabilitiesChange = (nextCapabilities: unknown) => {
    const resolvedCapabilities = (nextCapabilities as RendererCapabilities | null | undefined) ?? null;

    setCapabilities(resolvedCapabilities);

    if (hasKittyGraphics(resolvedCapabilities)) {
      setKittySupportDetected(true);
      setCapabilityProbeExpired(true);
      clearCapabilityProbeTimer();
    }

    refreshPreviewLayout();
  };

  renderer.on("capabilities", handleCapabilitiesChange);

  createEffect(() => {
    if (supported()) {
      clearCapabilityProbeTimer();

      if (!capabilityProbeExpired()) {
        setCapabilityProbeExpired(true);
      }

      return;
    }

    if (capabilityProbeExpired() || capabilityProbeTimer !== null) {
      return;
    }

    capabilityProbeTimer = setTimeout(() => {
      capabilityProbeTimer = null;
      setCapabilityProbeExpired(true);
      refreshPreviewLayout();
    }, 1500);
  });

  createEffect(() => {
    selectedFile();
    setPage(1);
    setError(null);
  });

  createEffect(() => {
    const total = pageCount();
    if (total && page() > total) {
      setPage(total);
    }
  });

  createEffect(() => {
    const file = selectedFile();
    const currentPage = page();
    const pageTotal = pageCount();
    const isSupported = supported();
    layoutVersion();

    requestVersion += 1;
    const currentRequest = requestVersion;

    if (!file || !frameRef || !isSupported) {
      setIsLoading(false);
      setError(null);
      clearActivePreview();
      return;
    }

    const viewport = getPDFPreviewViewport(renderer, frameRef);

    if (!viewport) {
      setIsLoading(false);
      setError("Preview area is too small for an inline page render.");
      clearActivePreview();
      return;
    }

    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        const result = await renderPDFPreviewPage(file, currentPage, viewport);

        if (currentRequest !== requestVersion) {
          return;
        }

        const nextZIndex = ++latestZIndex;
        displayPDFPreview(
          renderer,
          viewport,
          result.width,
          result.height,
          result.png,
          nextZIndex,
          activeZIndex,
        );
        activeZIndex = nextZIndex;
        setIsLoading(false);
      } catch (previewError) {
        if (currentRequest !== requestVersion) {
          return;
        }

        clearActivePreview();
        setIsLoading(false);
        setError(
          previewError instanceof Error
            ? previewError.message
            : "Unable to render the selected PDF page.",
        );
      }
    })();

    if (pageTotal === 0) {
      setIsLoading(true);
    }
  });

  onCleanup(() => {
    renderer.off("capabilities", handleCapabilitiesChange);
    cancelPendingPreviewRender();
    clearCapabilityProbeTimer();
    clearLayoutRefreshTimer();
    clearActivePreview();
  });

  return (
    <box flexDirection="column" flexGrow={1} minHeight={0} paddingTop={2}>
      <box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        flexShrink={0}
        paddingRight={1}
      >
        <text fg="#d8c7b8" attributes={TextAttributes.BOLD} content="Preview" />
        <Button color="red" label="X" onClick={props.onClose} />
      </box>
      <box
        ref={(value) => {
          frameRef = value;
          refreshPreviewLayout();
        }}
        border
        customBorderChars={{
          ...EmptyBorderChars,
          topLeft: "┏",
          topRight: "┓",
          bottomLeft: "┗",
          bottomRight: "┛",
          horizontal: "━",
          vertical: "┃",
        }}
        borderColor={supported() ? "#7c6559" : "#4d443f"}
        backgroundColor="#221b18"
        flexGrow={1}
        minHeight={16}
        onSizeChange={refreshPreviewLayout}
        onMouseDown={(event: unknown) => {
          if (canStopPropagation(event)) {
            event.stopPropagation?.();
          }
        }}
      >
        <Show when={!selectedFile()}>
          <PreviewStatusMessage
            color="#8c7f78"
            content="Select a PDF to preview."
          />
        </Show>

        <Show when={showSupportProbe()}>
          <PreviewStatusMessage
            color="#8c7f78"
            content="Checking terminal preview support..."
          />
        </Show>

        <Show when={showUnsupported()}>
          <PreviewStatusMessage
            color="#8c7f78"
            content="Inline preview currently requires Kitty graphics support."
          />
        </Show>

        <Show when={showLoading()}>
          <PreviewStatusMessage
            color="#b9aaa0"
            content="Rendering page preview..."
          />
        </Show>

        <Show when={showError()}>
          <PreviewStatusMessage
            color="#d08a6d"
            content={error() ?? "Unable to render preview."}
          />
        </Show>
      </box>
      <Show when={selectedFile()}>
        <box
          flexDirection="row"
          alignItems="center"
          justifyContent="center"
          columnGap={1}
          paddingTop={1}
          paddingBottom={1}
        >
          <PreviewButton
            label="◀"
            disabled={!canGoPrev()}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          />
          <box paddingBottom={1}>
            <text
              fg="#b9aaa0"
              content={`Page ${page()}/${pageCount.loading ? "..." : totalPages()}`}
            />
          </box>
          <PreviewButton
            label="▶"
            disabled={!canGoNext()}
            onClick={() =>
              setPage((value) => Math.min(totalPages(), value + 1))
            }
          />
        </box>
      </Show>
    </box>
  );
}