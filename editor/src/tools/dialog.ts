import { FileFilter, ipcRenderer } from "electron";

export type OpenFileDialogOptions = {
    title?: string;
    filters?: FileFilter[];
};

export function openSingleFileDialog(options?: OpenFileDialogOptions): string {
    return ipcRenderer.sendSync("editor:open-single-file-dialog", options?.title, options?.filters);
}

export function openMultipleFilesDialog(options?: OpenFileDialogOptions): string[] {
    return ipcRenderer.sendSync("editor:open-multiple-files-dialog", options?.title, options?.filters);
}

export function openSingleFolderDialog(title?: string): string {
    return ipcRenderer.sendSync("editor:open-single-folder-dialog", title);
}
