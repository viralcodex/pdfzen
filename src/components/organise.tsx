import { RGBA, TextAttributes, type BoxRenderable, type CliRenderer, type KeyEvent } from "@opentui/core";
import { onResize, useKeyboard, useRenderer } from "@opentui/solid";
import {
  Show,
  type Accessor,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  onCleanup,
  type Setter,
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
import { StatusBar } from "./ui/status-bar";
import { PreviewButton } from "./ui/preview-button";
import { PDFPreviewFrame, TextInput } from "./ui/index";

type RendererCapabilities = CliRenderer["capabilities"];

type CarouselRenderSlot = "previous" | "current" | "next";

interface CarouselRenderTask {
  slot: CarouselRenderSlot;
  result: Awaited<ReturnType<typeof renderPDFPreviewPage>>;
  viewport: ReturnType<typeof getPDFPreviewViewport> extends infer T
    ? Exclude<T, null>
    : never;
}

interface OrganisePDFToolWindowProps {
  onClose: () => void;
  closeFocused: boolean;
  currentPage: Accessor<number>;
  goPrev: () => void;
  goNext: () => void;
  prevFocused: boolean;
  nextFocused: boolean;
  movePageInput: () => string;
  movePageInputFocused: boolean;
  movePageButtonFocused: boolean;
  onMovePageInput: Setter<string>;
  onMovePageFocus: () => void;
  deletePage: () => void;
  deleteFocused: boolean;
  savePdf: () => void;
  saveFocused: boolean;
  movePage: () => void;
}

const hasKittyGraphics = (capabilities: RendererCapabilities | null) =>
  Boolean(capabilities?.kitty_graphics);

function OrganisePDFToolWindow(props: OrganisePDFToolWindowProps) {
  const renderer = useRenderer();
  const fl = useFileListContext();
  const selectedFile = fl.selectedFile;
  const initialKittySupport = hasKittyGraphics(renderer.capabilities ?? null);
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

  let previousFrameRef: BoxRenderable | undefined;
  let currentFrameRef: BoxRenderable | undefined;
  let nextFrameRef: BoxRenderable | undefined;
  let requestVersion = 0;
  let previousZIndex: number | null = null;
  let currentZIndex: number | null = null;
  let nextZIndex: number | null = null;
  let latestZIndex = 0;
  let capabilityProbeTimer: ReturnType<typeof setTimeout> | null = null;
  let layoutRefreshTimer: ReturnType<typeof setTimeout> | null = null;

  const totalPages = () => pageCount() ?? 0;
  const currentPage = props.currentPage;
  const previousPage = () => currentPage() - 1;
  const nextPage = () => currentPage() + 1;
  const hasPreviousPage = () => previousPage() >= 1;
  const hasNextPage = () => nextPage() <= totalPages();
  const canGoPrev = () => hasPreviousPage();
  const canGoNext = () => hasNextPage();
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

  const clearPreviousPreview = () => {
    if (previousZIndex === null) {
      return;
    }

    clearPDFPreview(renderer, previousZIndex);
    previousZIndex = null;
  };

  const clearCurrentPreview = () => {
    if (currentZIndex === null) {
      return;
    }

    clearPDFPreview(renderer, currentZIndex);
    currentZIndex = null;
  };

  const clearNextPreview = () => {
    if (nextZIndex === null) {
      return;
    }

    clearPDFPreview(renderer, nextZIndex);
    nextZIndex = null;
  };

  const clearCarouselPreviews = () => {
    clearPreviousPreview();
    clearCurrentPreview();
    clearNextPreview();
  };

  const cancelPendingPreviewRender = () => {
    requestVersion += 1;
  };

  const refreshPreviewLayout = () => {
    cancelPendingPreviewRender();
    clearCarouselPreviews();

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
    setError(null);
  });

  createEffect(() => {
    const file = selectedFile();
    const activePage = currentPage();
    const leftNeighborPage = previousPage();
    const rightNeighborPage = nextPage();
    const total = totalPages();
    const isSupported = supported();
    layoutVersion();

    requestVersion += 1;
    const currentRequest = requestVersion;

    if (!file || !previousFrameRef || !currentFrameRef || !nextFrameRef || !isSupported) {
      setIsLoading(false);
      setError(null);
      clearCarouselPreviews();
      return;
    }

    const previousViewport = getPDFPreviewViewport(renderer, previousFrameRef);
    const currentViewport = getPDFPreviewViewport(renderer, currentFrameRef);
    const nextViewport = getPDFPreviewViewport(renderer, nextFrameRef);

    if (!previousViewport || !currentViewport || !nextViewport) {
      setIsLoading(false);
      setError("Carousel preview area is too small for inline page rendering.");
      clearCarouselPreviews();
      return;
    }

    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        const renders: Promise<CarouselRenderTask>[] = [
          renderPDFPreviewPage(file, activePage, currentViewport).then(
            (result) => ({
              slot: "current" as const,
              result,
              viewport: currentViewport,
            }),
          ),
        ];

        if (leftNeighborPage >= 1) {
          renders.push(
            renderPDFPreviewPage(file, leftNeighborPage, previousViewport).then(
              (result) => ({
                slot: "previous" as const,
                result,
                viewport: previousViewport,
              }),
            ),
          );
        }

        if (rightNeighborPage <= total) {
          renders.push(
            renderPDFPreviewPage(file, rightNeighborPage, nextViewport).then(
              (result) => ({
                slot: "next" as const,
                result,
                viewport: nextViewport,
              }),
            ),
          );
        }

        const results = await Promise.all(renders);

        if (currentRequest !== requestVersion) {
          return;
        }

        let renderedPreviousPage = false;
        let renderedNextPage = false;

        results.forEach(({ slot, result, viewport }) => {
          const nextLayer = ++latestZIndex;

          if (slot === "previous") {
            displayPDFPreview(
              renderer,
              viewport,
              result.width,
              result.height,
              result.png,
              nextLayer,
              previousZIndex,
            );
            previousZIndex = nextLayer;
            renderedPreviousPage = true;
            return;
          }

          if (slot === "current") {
            displayPDFPreview(
              renderer,
              viewport,
              result.width,
              result.height,
              result.png,
              nextLayer,
              currentZIndex,
            );
            currentZIndex = nextLayer;
            return;
          }

          displayPDFPreview(
            renderer,
            viewport,
            result.width,
            result.height,
            result.png,
            nextLayer,
            nextZIndex,
          );
          nextZIndex = nextLayer;
          renderedNextPage = true;
        });

        if (!renderedPreviousPage) {
          clearPreviousPreview();
        }

        if (!renderedNextPage) {
          clearNextPreview();
        }

        setIsLoading(false);
      } catch (previewError) {
        if (currentRequest !== requestVersion) {
          return;
        }

        clearCarouselPreviews();
        setIsLoading(false);
        setError(
          previewError instanceof Error
            ? previewError.message
            : "Unable to render the selected PDF page.",
        );
      }
    })();
  });

  onCleanup(() => {
    renderer.off("capabilities", handleCapabilitiesChange);
    cancelPendingPreviewRender();
    clearCapabilityProbeTimer();
    clearLayoutRefreshTimer();
    clearCarouselPreviews();
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
        <box
          width={"100%"}
          flexDirection="row"
          justifyContent="center"
          alignItems="center"
        >
          <text
            fg="#d8c7b8"
            attributes={TextAttributes.BOLD}
            content="Reorder, Delete or Insert Pages in a PDF"
          />
        </box>
      </box>
      <box
        flexDirection="row"
        columnGap={2}
        flexGrow={1}
        minHeight={18}
        alignItems="stretch"
      >
        <box flexDirection="column" flexGrow={1} rowGap={0} width={`100%`}>
          <box justifyContent="center" alignItems="center" height={1}>
            <text
              fg="#4f565d"
              content={hasPreviousPage() ? `Page ${previousPage()}` : "End"}
            />
          </box>
          <box flexGrow={1} alignItems="center" justifyContent="center">
            <PDFPreviewFrame
              setFrameRef={(value: BoxRenderable | undefined) => {
                previousFrameRef = value;
              }}
              onLayoutChange={refreshPreviewLayout}
              hasFile={Boolean(selectedFile())}
              supported={supported()}
              showSupportProbe={showSupportProbe()}
              showUnsupported={showUnsupported()}
              showError={showError()}
              errorMessage={error() ?? "Unable to render preview."}
              emptyMessage="Select a PDF to organise."
              border={false}
              backgroundColor="#161616"
              width="72%"
              height="68%"
              minHeight={9}
              alignItems="center"
              justifyContent="center"
            >
              <Show
                when={
                  selectedFile() &&
                  supported() &&
                  !showError() &&
                  hasPreviousPage()
                }
              >
                <box
                  position="absolute"
                  top={0}
                  right={0}
                  bottom={0}
                  left={0}
                  backgroundColor={RGBA.fromInts(18, 18, 18, 128)}
                />
              </Show>
              <Show
                when={
                  selectedFile() &&
                  supported() &&
                  !showError() &&
                  !hasPreviousPage()
                }
              >
                <text fg="#5f6770" content="No previous page" />
              </Show>
            </PDFPreviewFrame>
          </box>
        </box>
        <box border={["left"]} borderColor="#34495e" width={1}></box>
        <box flexDirection="column" flexGrow={6} rowGap={1} width={`100%`}>
          <box justifyContent="center" alignItems="center">
            <text
              fg="#d8c7b8"
              attributes={TextAttributes.BOLD}
              content={`Page ${currentPage()}`}
            />
          </box>
          <PDFPreviewFrame
            setFrameRef={(value: BoxRenderable | undefined) => {
              currentFrameRef = value;
            }}
            onLayoutChange={refreshPreviewLayout}
            hasFile={Boolean(selectedFile())}
            supported={supported()}
            showSupportProbe={showSupportProbe()}
            showUnsupported={showUnsupported()}
            showLoading={showLoading()}
            loadingMessage="Rendering page preview..."
            showError={showError()}
            errorMessage={error() ?? "Unable to render preview."}
            emptyMessage="Select a PDF to organise."
            border={false}
            backgroundColor="#221b18"
            minHeight={18}
            alignItems="center"
            justifyContent="center"
          />
        </box>
        <box border={["left"]} borderColor="#34495e" width={1}></box>
        <box flexDirection="column" flexGrow={1} rowGap={0} width={`100%`}>
          <box justifyContent="center" alignItems="center" height={1}>
            <text
              fg="#4f565d"
              content={hasNextPage() ? `Page ${nextPage()}` : "End"}
            />
          </box>
          <box flexGrow={1} alignItems="center" justifyContent="center">
            <PDFPreviewFrame
              setFrameRef={(value: BoxRenderable | undefined) => {
                nextFrameRef = value;
              }}
              onLayoutChange={refreshPreviewLayout}
              hasFile={Boolean(selectedFile())}
              supported={supported()}
              showSupportProbe={showSupportProbe()}
              showUnsupported={showUnsupported()}
              showError={showError()}
              errorMessage={error() ?? "Unable to render preview."}
              emptyMessage="Select a PDF to organise."
              border={false}
              backgroundColor="#161616"
              width="72%"
              height="68%"
              minHeight={9}
              alignItems="center"
              justifyContent="center"
            >
              <Show
                when={
                  selectedFile() && supported() && !showError() && hasNextPage()
                }
              >
                <box
                  position="absolute"
                  top={0}
                  right={0}
                  bottom={0}
                  left={0}
                  backgroundColor={RGBA.fromInts(18, 18, 18, 128)}
                />
              </Show>
              <Show
                when={
                  selectedFile() &&
                  supported() &&
                  !showError() &&
                  !hasNextPage()
                }
              >
                <text fg="#5f6770" content="No next page" />
              </Show>
            </PDFPreviewFrame>
          </box>
        </box>
      </box>
      <Show when={selectedFile()}>
        <box
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          columnGap={1}
          paddingTop={1}
          width={"100%"}
        >
          <box
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            columnGap={1}
          >
            <PreviewButton
              label="◀"
              disabled={!canGoPrev()}
              onClick={props.goPrev}
              focused={props.prevFocused}
            />
            <box paddingBottom={1}>
              <text
                fg="#b9aaa0"
                content={`Page ${currentPage()}/${pageCount.loading ? "..." : totalPages()}`}
              />
            </box>
            <PreviewButton
              label="▶"
              disabled={!canGoNext()}
              onClick={props.goNext}
              focused={props.nextFocused}
            />
          </box>
          <box
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            columnGap={1}
            flexGrow={1}
            flexShrink={0}
            width={"100%"}
          >
            <box flexDirection="column" alignItems="stretch" width={"20%"}>
              <TextInput
                label="Move page to"
                value={props.movePageInput}
                focused={props.movePageInputFocused}
                onFocus={props.onMovePageFocus}
                onInput={props.onMovePageInput}
                marginBottom={1}
                width={"100%"}
              />
              <Button
                label="Move Page"
                color="cyan"
                onClick={props.movePage}
                focused={props.movePageButtonFocused}
                width={"100%"}
              />
              <box marginTop={1}>
                <Button
                  label="Delete Page"
                  color="red"
                  onClick={props.deletePage}
                  focused={props.deleteFocused}
                  width={"100%"}
                />
              </box>
              <box marginTop={1}>
                <Button
                  label="Save PDF"
                  color="green"
                  onClick={props.savePdf}
                  focused={props.saveFocused}
                  width={"100%"}
                />
              </box>
            </box>
          </box>
        </box>
      </Show>
    </box>
  );
}

export function OrganiseUI() {
  const fl = useFileListContext();
  const nav = useKeyboardNav();
  const [isToolWindowOpen, setIsToolWindowOpen] = createSignal(false);
  const openToolWindow = () => setIsToolWindowOpen(true);
  const closeToolWindow = () => setIsToolWindowOpen(false);
  const [focusedInput, setFocusedInput] = createSignal<string | null>(null);
  const [currentPage, setCurrentPage] = createSignal(1);
  const [movePageInput, setMovePageInput] = createSignal("");

  createEffect(() => {
    nav.clearElements();

    if (isToolWindowOpen()) {
      nav.registerElement({
        id: "close-organise-btn",
        type: "button",
        onEnter: closeToolWindow,
      });

      nav.registerElement({
        id: "organise-prev-btn",
        type: "button",
        onEnter: goPrev,
      });

      nav.registerElement({
        id: "organise-next-btn",
        type: "button",
        onEnter: goNext,
      });

      nav.registerElement({
        id: "move-page-input",
        type: "input",
        onEnter: () => setFocusedInput("move-page-input"),
        canFocus: () => Boolean(fl.selectedFile()),
      });
       
      nav.registerElement({
        id: "move-page-btn",
        type: "button",
        onEnter: movePage,
        canFocus: () => Boolean(fl.selectedFile()),
      });

      nav.registerElement({
        id: "delete-page-btn",
        type: "button",
        onEnter: deletePage,
        canFocus: () => Boolean(fl.selectedFile()),
      });

      nav.registerElement({
        id: "save-pdf-btn",
        type: "button",
        onEnter: savePdf,
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

  createEffect(() => {
    nav.setIsInputMode(focusedInput() !== null);
  });

  createEffect(() => {
    if (!nav.isInputMode()) {
      setFocusedInput(null);
    }
  });

  createEffect(() => {
    const selected = fl.selectedFile();

    if (!selected) {
      setCurrentPage(1);
      setMovePageInput("");
      return;
    }

    setCurrentPage(1);

    if (focusedInput() !== "move-page-input") {
      setMovePageInput("1");
    }
  });

  createEffect(() => {
    const total = Math.max(fl.pageCount(), 1);
    const clampedPage = Math.min(Math.max(currentPage(), 1), total);

    if (clampedPage !== currentPage()) {
      setCurrentPage(clampedPage);
    }

    if (focusedInput() !== "move-page-input") {
      setMovePageInput(String(clampedPage));
    }
  });

  onCleanup(() => {
    nav.clearElements();
  });

  const activePage = currentPage;

  const handleMovePageInput: Setter<string> = (value) => {
    const nextValue =
      typeof value === "function"
        ? (value as (prev: string) => string)(movePageInput())
        : value;
    setMovePageInput(nextValue);

    const parsed = Number.parseInt(nextValue, 10);

    if (!Number.isNaN(parsed)) {
      const clamped = Math.min(Math.max(parsed, 1), Math.max(fl.pageCount(), 1));
      setCurrentPage(clamped);
    }

    return nextValue;
  };

  const goPrev = () => {
    if (activePage() <= 1) {
      return;
    }

    const nextPage = activePage() - 1;
    setCurrentPage(nextPage);
  };

  const goNext = () => {
    if (activePage() >= fl.pageCount()) {
      return;
    }

    const nextPage = activePage() + 1;
    setCurrentPage(nextPage);
  };

  const savePdf = () => {};
  const deletePage = () => {};
  const movePage = () => {};

  useKeyboard((event: KeyEvent) => {
    if (!isToolWindowOpen() || nav.isInputMode() || !fl.selectedFile()) {
      return;
    }

    if (event.name === "left") {
      goPrev();
      return;
    }

    if (event.name === "right") {
      goNext();
    }
  });

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
          currentPage={currentPage}
          goPrev={goPrev}
          goNext={goNext}
          prevFocused={nav.isFocused("organise-prev-btn")}
          nextFocused={nav.isFocused("organise-next-btn")}
          movePageInputFocused={
            focusedInput() === "move-page-input" ||
            nav.isFocused("move-page-input")
          }
          movePageButtonFocused={nav.isFocused("move-page-btn")}
          movePageInput={movePageInput}
          onMovePageInput={handleMovePageInput}
          deletePage={deletePage}
          deleteFocused={nav.isFocused("delete-page-btn")}
          savePdf={savePdf}
          saveFocused={nav.isFocused("save-pdf-btn")}
          movePage={movePage}
          onMovePageFocus={() => setFocusedInput("move-page-input")}
          
        />
      </Show>
      <ButtonRow>
        <Show when={!isToolWindowOpen()}>
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
        </Show>
      </ButtonRow>
      <StatusBar message={fl.status().msg} type={fl.status().type} />
    </ToolContainer>
  );
}
