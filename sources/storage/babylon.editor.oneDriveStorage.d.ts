declare module BABYLON.EDITOR {
    class OneDriverStorage implements IStorage {
        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore);
        authenticate(): void;
        private _getTokenFromCookie();
    }
}
