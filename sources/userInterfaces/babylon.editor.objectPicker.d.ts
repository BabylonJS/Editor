declare module BABYLON.EDITOR {
    class ObjectPicker implements IEventReceiver {
        core: EditorCore;
        onSelectCallback: (objectId: string) => void;
        objectLists: Array<any[]>;
        propertyToDraw: string;
        private _window;
        private _list;
        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore);
        onEvent(event: Event): boolean;
        open(): void;
    }
}
