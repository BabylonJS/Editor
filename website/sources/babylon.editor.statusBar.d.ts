declare module BABYLON.EDITOR {
    class StatusBar {
        panel: GUI.IGUIPanel;
        private _core;
        private _element;
        private _elements;
        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore);
        addElement(id: string, text: string, img?: string, right?: boolean): void;
        removeElement(id: string): boolean;
        showSpinner(id: string): void;
        hideSpinner(id: string): void;
        setText(id: string, text: string): void;
        setImage(id: string, image: string): void;
        private _getItem(id);
    }
}
