declare module BABYLON.EDITOR {
    interface IStorage {
        /**
        * Authentificate to storage
        */
        authenticate(): void;
    }
    class Storage {
        core: EditorCore;
        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore);
    }
}
