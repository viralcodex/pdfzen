import { createContext, useContext, type ParentComponent } from "solid-js";
import type { FileListOptions } from "../model";
import { useFileList } from "../hooks/useFileList";

interface FileListProviderProps {
    options?: FileListOptions;
}

const FileListContext = createContext<ReturnType< typeof useFileList>>();

export const FileListProvider: ParentComponent<FileListProviderProps> = (props) => {
    const fileList = useFileList(props.options);

    return (
        <FileListContext.Provider value={fileList}>
            {props.children}
        </FileListContext.Provider>
    );
}

export const useFileListContext = () => {
    const context = useContext(FileListContext);
    if (!context) {
        throw new Error("useFileListContext must be used within a FileListProvider");
    }
    return context;
}