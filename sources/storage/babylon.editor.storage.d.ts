declare module BABYLON.EDITOR {
    interface IStorageOpenOptions {
    }
    interface IStorageSaveOptions {
    }
    interface IStorage {
        open(options?: IStorageOpenOptions): void;
        save(options?: IStorageSaveOptions): void;
    }
    interface IStorageResults {
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
