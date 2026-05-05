import { type BoxRenderable, type CliRenderer } from "@opentui/core";
import { onResize, useRenderer } from "@opentui/solid";
import {
  Show,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  onCleanup,
} from "solid-js";
import { useKeyboardNav } from "../hooks/useKeyboardNav";
import { useFileListContext } from "../provider/fileListProvider";
import { openFile, openOutputFolder } from "../utils/utils";
import {
  clearPDFPreview,
  displayPDFPreview,
  getPDFPreviewPageCount,
  getPDFPreviewViewport,
  renderPDFPreviewPage,
} from "../utils/pdf-preview";
import { ToolContainer } from "./ui/tool-container";
import { Label } from "./ui/label";
import { FileList } from "./ui/file-list";
import { ButtonRow } from "./ui/button-row";
import { Button } from "./ui/button";
import { PreviewStatusMessage } from "./ui/preview-status-message";
import { StatusBar } from "./ui/status-bar";
import { PreviewButton } from "./ui/preview-button";

type RendererCapabilities = CliRenderer["capabilities"];

interface PreviewMouseEvent {
  stopPropagation?: () => void;
}

type SpreadRenderSlot = "left" | "right";

interface SpreadRenderTask {
  slot: SpreadRenderSlot;
  result: Awaited<ReturnType<typeof renderPDFPreviewPage>>;
  viewport: ReturnType<typeof getPDFPreviewViewport> extends infer T
    ? Exclude<T, null>
    : never;
}

interface OrganisePDFToolWindowProps {
  onClose: () => void;
  closeFocused: boolean;
  addPageBefore: () => void;
  addPageAfter: () => void;
  addBeforeFocused: boolean;
  addBetweenFocused: boolean;
  addAfterFocused: boolean;
}

const hasKittyGraphics = (capabilities: RendererCapabilities | null) =>
  Boolean(capabilities?.kitty_graphics);

const canStopPropagation = (event: unknown): event is PreviewMouseEvent =>
  typeof event === "object" && event !== null;

function OrganisePDFToolWindow(props: OrganisePDFToolWindowProps) {
  const renderer = useRenderer();
  const fl = useFileListContext();
  const selectedFile = fl.selectedFile;
  const initialKittySupport = hasKittyGraphics(renderer.capabilities ?? null);
  const [spreadStartPage, setSpreadStartPage] = createSignal(1);
  const [layoutVersion, setLayoutVersion] = createSignal(0);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [capabilities, setCapabilities] =
    createSignal<RendererCapabilities | null>(renderer.capabilities ?? null);
  const [kittySupportDetected, setKittySupportDetected] =
    createSignal(initialKittySupport);
  const [capabilityProbeExpired, setCapabilityProbeExpired] =
    createSignal(initialKittySupport);

  const supported = createMemo(
    () => kittySupportDetected() || hasKittyGraphics(capabilities()),
  );
  const [pageCount] = createResource(
    () => selectedFile(),
    getPDFPreviewPageCount,
  );

  let leftFrameRef: BoxRenderable | undefined;
  let rightFrameRef: BoxRenderable | undefined;
  let requestVersion = 0;
  let leftZIndex: number | null = null;
  let rightZIndex: number | null = null;
  let latestZIndex = 0;
  let capabilityProbeTimer: ReturnType<typeof setTimeout> | null = null;
  let layoutRefreshTimer: ReturnType<typeof setTimeout> | null = null;

  const totalPages = () => pageCount() ?? 0;
  const leftPage = () => spreadStartPage();
  const rightPage = () => spreadStartPage() + 1;
  const hasRightPage = () => rightPage() <= totalPages();
  const canGoPrev = () => spreadStartPage() > 1;
  const canGoNext = () => hasRightPage();
  const showSupportProbe = () =>
    Boolean(selectedFile()) && !supported() && !capabilityProbeExpired();
  const showUnsupported = () =>
    Boolean(selectedFile()) && !supported() && capabilityProbeExpired();
  const showLoading = () =>
    Boolean(selectedFile()) && supported() && isLoading();
  const showError = () =>
    Boolean(selectedFile()) && supported() && !isLoading() && Boolean(error());

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

  const clearLeftPreview = () => {
    if (leftZIndex === null) {
      return;
    }

    clearPDFPreview(renderer, leftZIndex);
    leftZIndex = null;
  };

  const clearRightPreview = () => {
    if (rightZIndex === null) {
      return;
    }

    clearPDFPreview(renderer, rightZIndex);
    rightZIndex = null;
  };

  const clearPreviewPair = () => {
    clearLeftPreview();
    clearRightPreview();
  };

  const cancelPendingPreviewRender = () => {
    requestVersion += 1;
  };

  const refreshPreviewLayout = () => {
    cancelPendingPreviewRender();
    clearPreviewPair();

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
    const resolvedCapabilities =
      (nextCapabilities as RendererCapabilities | null | undefined) ?? null;

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
    setSpreadStartPage(1);
    setError(null);
  });

  createEffect(() => {
    const total = totalPages();

    if (total === 0) {
      setSpreadStartPage(1);
      return;
    }

    if (spreadStartPage() > total) {
      setSpreadStartPage(total % 2 === 0 ? Math.max(1, total - 1) : total);
    }
  });

  createEffect(() => {
    const file = selectedFile();
    const currentLeftPage = leftPage();
    const currentRightPage = rightPage();
    const total = totalPages();
    const isSupported = supported();
    layoutVersion();

    requestVersion += 1;
    const currentRequest = requestVersion;

    if (!file || !leftFrameRef || !rightFrameRef || !isSupported) {
      setIsLoading(false);
      setError(null);
      clearPreviewPair();
      return;
    }

    const leftViewport = getPDFPreviewViewport(renderer, leftFrameRef);
    const rightViewport = getPDFPreviewViewport(renderer, rightFrameRef);

    if (!leftViewport || !rightViewport) {
      setIsLoading(false);
      setError("Spread preview area is too small for inline page rendering.");
      clearPreviewPair();
      return;
    }

    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        const renders: Promise<SpreadRenderTask>[] = [
          renderPDFPreviewPage(file, currentLeftPage, leftViewport).then(
            (result) => ({
              slot: "left" as const,
              result,
              viewport: leftViewport,
            }),
          ),
        ];

        if (currentRightPage <= total) {
          renders.push(
            renderPDFPreviewPage(file, currentRightPage, rightViewport).then(
              (result) => ({
                slot: "right" as const,
                result,
                viewport: rightViewport,
              }),
            ),
          );
        }

        const results = await Promise.all(renders);

        if (currentRequest !== requestVersion) {
          return;
        }

        let renderedRightPage = false;

        results.forEach(({ slot, result, viewport }) => {
          const nextZIndex = ++latestZIndex;

          if (slot === "left") {
            displayPDFPreview(
              renderer,
              viewport,
              result.width,
              result.height,
              result.png,
              nextZIndex,
              leftZIndex,
            );
            leftZIndex = nextZIndex;
            return;
          }

          displayPDFPreview(
            renderer,
            viewport,
            result.width,
            result.height,
            result.png,
            nextZIndex,
            rightZIndex,
          );
          rightZIndex = nextZIndex;
          renderedRightPage = true;
        });

        if (!renderedRightPage) {
          clearRightPreview();
        }

        setIsLoading(false);
      } catch (previewError) {
        if (currentRequest !== requestVersion) {
          return;
        }

        clearPreviewPair();
        setIsLoading(false);
        setError(
          previewError instanceof Error
            ? previewError.message
            : "Unable to render the selected PDF spread.",
        );
      }
    })();
  });

  onCleanup(() => {
    renderer.off("capabilities", handleCapabilitiesChange);
    cancelPendingPreviewRender();
    clearCapabilityProbeTimer();
    clearLayoutRefreshTimer();
    clearPreviewPair();
  });

  return (
    <box flexDirection="column" flexGrow={1} rowGap={1} width={`100%`}>
      <box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        width={`100%`}
      >
        <Button
          label="X"
          color="red"
          onClick={props.onClose}
          focused={props.closeFocused}
        />
      </box>
      <box flexDirection="row" columnGap={1} flexGrow={1} minHeight={18}>
        <box flexDirection="column" flexGrow={1} rowGap={1} width={`100%`}>
          <box
            ref={(value) => {
              leftFrameRef = value;
              refreshPreviewLayout();
            }}
            // border
            // customBorderChars={{
            //   ...EmptyBorderChars,
            //   topLeft: "┏",
            //   topRight: "┓",
            //   bottomLeft: "┗",
            //   bottomRight: "┛",
            //   horizontal: "━",
            //   vertical: "┃",
            // }}
            // borderColor={supported() ? "#7c6559" : "#4d443f"}
            // backgroundColor="#221b18"
            flexGrow={1}
            minHeight={16}
            alignItems="center"
            justifyContent="center"
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
                content="Select a PDF to organise."
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
            {/* <Show when={showLoading()}>
              <PreviewStatusMessage
                color="#b9aaa0"
                content="Rendering spread preview..."
              />
            </Show> */}
            <Show when={showError()}>
              <PreviewStatusMessage
                color="#d08a6d"
                content={error() ?? "Unable to render preview."}
              />
            </Show>
          </box>
        </box>
        <box border={["left"]} width={1}></box>
        <box flexDirection="column" flexGrow={1} rowGap={1} width={`100%`}>
          <box
            ref={(value) => {
              rightFrameRef = value;
              refreshPreviewLayout();
            }}
            // border
            // customBorderChars={{
            //   ...EmptyBorderChars,
            //   topLeft: "┏",
            //   topRight: "┓",
            //   bottomLeft: "┗",
            //   bottomRight: "┛",
            //   horizontal: "━",
            //   vertical: "┃",
            // }}
            // borderColor={supported() ? "#7c6559" : "#4d443f"}
            // backgroundColor="#221b18"
            flexGrow={1}
            minHeight={16}
            justifyContent="center"
            alignItems="center"
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
                content="Select a PDF to organise."
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
            <Show when={showLoading() && hasRightPage()}>
              <PreviewStatusMessage
                color="#b9aaa0"
                content="Rendering spread preview..."
              />
            </Show>
            <Show when={showError()}>
              <PreviewStatusMessage
                color="#d08a6d"
                content={error() ?? "Unable to render preview."}
              />
            </Show>
            <Show
              when={
                selectedFile() &&
                supported() &&
                !showLoading() &&
                !showError() &&
                !hasRightPage()
              }
            >
              <PreviewStatusMessage
                color="#8c7f78"
                content="No second page in this spread."
              />
            </Show>
          </box>
        </box>
      </box>
      <Show when={selectedFile()}>
        <box
          flexDirection="row"
          alignItems="center"
          justifyContent="center"
          columnGap={1}
          paddingTop={1}
        >
          <PreviewButton
            label="◀"
            disabled={!canGoPrev()}
            onClick={() =>
              setSpreadStartPage((value) => Math.max(1, value - 2))
            }
          />
          <box paddingBottom={1}>
            <text
              fg="#b9aaa0"
              content={`Spread ${leftPage()}-${Math.min(rightPage(), Math.max(totalPages(), 1))}/${pageCount.loading ? "..." : totalPages()}`}
            />
          </box>
          <PreviewButton
            label="▶"
            disabled={!canGoNext()}
            onClick={() =>
              setSpreadStartPage((value) => Math.min(totalPages(), value + 2))
            }
          />
        </box>
      </Show>
      <box flexDirection="row" justifyContent="space-between" columnGap={1}>
        <Button
          label="+"
          color="cyan"
          onClick={props.addPageBefore}
          focused={props.addBeforeFocused}
        />
        <Button
          label="+"
          color="cyan"
          onClick={props.addPageAfter}
          focused={props.addBetweenFocused}
        />
        <Button
          label="+"
          color="cyan"
          onClick={props.addPageAfter}
          focused={props.addAfterFocused}
          disabled={!hasRightPage()}
        />
      </box>
    </box>
  );
}

export function OrganiseUI() {
  const fl = useFileListContext();
  const nav = useKeyboardNav();
  const [isToolWindowOpen, setIsToolWindowOpen] = createSignal(false);
  const openToolWindow = () => setIsToolWindowOpen(true);
  const closeToolWindow = () => setIsToolWindowOpen(false);

  createEffect(() => {
    nav.clearElements();

    if (isToolWindowOpen()) {
      nav.registerElement({
        id: "close-organise-btn",
        type: "button",
        onEnter: closeToolWindow,
      });

      nav.registerElement({
        id: "add-page-before-btn",
        type: "button",
        onEnter: addPageBefore,
        canFocus: () => Boolean(fl.selectedFile()),
      });

      nav.registerElement({
        id: "add-page-between-btn",
        type: "button",
        onEnter: addPageAfter,
        canFocus: () => Boolean(fl.selectedFile()),
      });

      nav.registerElement({
        id: "add-page-after-btn",
        type: "button",
        onEnter: addPageAfter,
        canFocus: () => Boolean(fl.selectedFile()),
      });

      return;
    }

    // Register file list items and their action buttons
    fl.files().forEach((_, index) => {
      nav.registerElement({
        id: `file-${index}`,
        type: "list-item",
        onEnter: () => fl.selectFile(index),
      });

      nav.registerElement({
        id: `file-${index}-open`,
        type: "button",
        onEnter: () => openFile(fl.files()[index]!),
      });

      // Move up button
      nav.registerElement({
        id: `file-${index}-up`,
        type: "button",
        onEnter: () => fl.moveFile(index, "up"),
        canFocus: () => index > 0,
      });

      // Move down button
      nav.registerElement({
        id: `file-${index}-down`,
        type: "button",
        onEnter: () => fl.moveFile(index, "down"),
        canFocus: () => index < fl.fileCount() - 1,
      });

      // Remove button
      nav.registerElement({
        id: `file-${index}-remove`,
        type: "button",
        onEnter: () => fl.removeFile(index),
      });
    });

    nav.registerElement({
      id: "open-output-btn",
      type: "button",
      onEnter: () =>
        openOutputFolder().catch((_) =>
          fl.setStatus({ msg: "Failed to open folder", type: "error" }),
        ),
    });

    nav.registerElement({
      id: "open-organise-btn",
      type: "button",
      onEnter: openToolWindow,
      canFocus: () => fl.fileCount() > 0,
    });
  });

  onCleanup(() => {
    nav.clearElements();
  });

  const addPageBefore = () => {};
  const addPageAfter = () => {};

  return (
    <ToolContainer paddingTop={1}>
      <Show when={!isToolWindowOpen()}>
        <Label text={"Files"} count={fl.fileCount()} />
      </Show>
      <Show when={!isToolWindowOpen()}>
        <FileList
          files={fl.files}
          fileType="pdf"
          selectedIndex={fl.selectedIndex}
          onSelect={fl.selectFile}
          onFocusIndex={(index) => nav.focusById(`file-${index}`)}
          onRemove={fl.removeFile}
          onMove={fl.moveFile}
          onFilesSelected={async (paths) => {
            await fl.addFilesToList(paths);
          }}
          showReorder={true}
          focusedIndex={() => {
            const focusId = nav.getFocusedId();
            if (focusId && focusId.startsWith("file-")) {
              const parts = focusId.split("-");
              return parseInt(parts[1] || "0");
            }
            return null;
          }}
          focusedButton={() => nav.getFocusedId()}
        />
      </Show>
      <Show when={isToolWindowOpen()}>
        <OrganisePDFToolWindow
          onClose={closeToolWindow}
          closeFocused={nav.isFocused("close-organise-btn")}
          addPageBefore={addPageBefore}
          addPageAfter={addPageAfter}
          addBeforeFocused={nav.isFocused("add-page-before-btn")}
          addBetweenFocused={nav.isFocused("add-page-between-btn")}
          addAfterFocused={nav.isFocused("add-page-after-btn")}
        />
      </Show>
      <ButtonRow>
        <Show when={!isToolWindowOpen()}>
          <>
            <Button
              label="Organise Pages"
              color="cyan"
              disabled={fl.fileCount() === 0}
              onClick={openToolWindow}
              focused={nav.isFocused("open-organise-btn")}
            />
            <Button
              label="Open Output"
              color="output"
              onClick={() =>
                openOutputFolder().catch((_) =>
                  fl.setStatus({
                    msg: "Failed to open folder",
                    type: "error",
                  }),
                )
              }
              focused={nav.isFocused("open-output-btn")}
            />
          </>
        </Show>
      </ButtonRow>
      <StatusBar message={fl.status().msg} type={fl.status().type} />
    </ToolContainer>
  );
}
