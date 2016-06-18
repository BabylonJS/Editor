declare module BABYLON.EDITOR {
    class ElectronLocalExporter {
        private _core;
        private static _LocalFilename;
        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore);
        writeProject(filename: string): void;
    }
}
