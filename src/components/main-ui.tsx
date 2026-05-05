import { Dynamic, useTerminalDimensions } from "@opentui/solid";
import { createEffect, createSignal, Show } from "solid-js";
import { MergeUI } from "./merge";
import { CompressUI } from "./compress";
import { RotateUI } from "./rotate";
import { SplitExtractUI } from "./split-extract";
import { DeleteUI } from "./delete";
import { PDFToImagesUI } from "./pdf-to-images";
import { ImagesToPDFUI } from "./images-to-pdf";
import { ProtectUI } from "./protect";
import { DecryptUI } from "./decrypt";
import { HeaderLayout } from "./header-layout";
import { PDFPreviewPane } from "./pdf-preview";
import { useFileListContext } from "../provider/fileListProvider";
import { Button } from "./ui";

interface MainUIProps {
  selectedTool: string;
  toolName: string;
  onBack: () => void;
}

const toolComponents: Record<string, () => any> = {
  merge: MergeUI,
  splitExtract: SplitExtractUI,
  compress: CompressUI,
  rotate: RotateUI,
  delete: DeleteUI,
  pdfToImages: PDFToImagesUI,
  imagesToPDF: ImagesToPDFUI,
  protect: ProtectUI,
  decrypt: DecryptUI,
};

export function MainUI(props: MainUIProps) {
  const fl = useFileListContext();
  const [isPreviewOpen, setIsPreviewOpen] = createSignal(false);
  const terminalSize = useTerminalDimensions();

  createEffect(() => {
    if (fl.selectedFile()) {
      setIsPreviewOpen(true);
    }
    if(terminalSize().width < 50) {
      setIsPreviewOpen(false);
    }
  });

  return (
    <HeaderLayout toolName={props.toolName} onBack={props.onBack}>
      <box flexDirection="row">
        <box flexGrow={3}>
          <Dynamic component={toolComponents[props.selectedTool]} />
        </box>
        <box flexGrow={2} width={isPreviewOpen() ? "25%" : 6}>
          <Show
            when={isPreviewOpen()}
            fallback={
              <box alignItems="flex-start" paddingTop={2}>
                <Button
                  disabled={!fl.selectedFile()}
                  color="yellow"
                  label="◀"
                  onClick={() => setIsPreviewOpen(true)}
                />
              </box>
            }
          >
            <PDFPreviewPane
              onOpen={() => setIsPreviewOpen(true)}
              onClose={() => setIsPreviewOpen(false)}
            />
          </Show>
        </box>
      </box>
    </HeaderLayout>
  );
}
