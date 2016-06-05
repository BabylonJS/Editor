declare module BABYLON.EDITOR {
    class ElectronHelper {
        /**
        * Scene file
        */
        static ReloadSceneOnFileChanged: boolean;
        /**
        * Creates "File" objects from filenames
        */
        static CreateFilesFromFileNames(filenames: string[], isOpenScene: boolean, callback: (files: File[]) => void): void;
        /**
        * Watchs the specified file
        */
        static WatchFile(filename: string, callback: (file: File) => void): void;
    }
}
