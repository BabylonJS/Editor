module BABYLON.EDITOR {
    export interface IStorageOpenOptions
    { }

    export interface IStorageSaveOptions
    { }

    export interface IStorage {
        // Open files (TODO)
        open(options?: IStorageOpenOptions): void;

        // Save files
        save(options?: IStorageSaveOptions): void;
    }

    export interface IStorageResults
    { }

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
