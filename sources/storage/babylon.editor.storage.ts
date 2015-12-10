module BABYLON.EDITOR {
    export interface IStorage {
        /**
        * Authentificate to storage
        */
        authenticate(): void;
    }

    export class Storage {
        // Public members
        public core: EditorCore = null;

        // Private members

        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore) {
            // Initialize
            this.core = core;
        }
    }
}
