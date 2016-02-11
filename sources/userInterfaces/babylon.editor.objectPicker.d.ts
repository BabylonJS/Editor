declare module BABYLON.EDITOR {
    class ObjectPicker implements IEventReceiver {
        core: EditorCore;
        objectLists: Array<any[]>;
        selectedObjects: Array<any>;
        onObjectPicked: (names: string[]) => void;
        onClosedPicker: () => void;
        minSelectCount: number;
        windowName: string;
        selectButtonName: string;
        closeButtonName: string;
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
