declare module BABYLON.EDITOR {
    class Exporter {
        core: EditorCore;
        /**
        * Constructor
        */
        constructor(core: EditorCore);
        exportScene(): void;
    }
}
