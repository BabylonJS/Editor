declare module BABYLON.EDITOR.GUI {
    class GUIDialog extends GUIElement implements IGUIDialogElement {
        title: string;
        body: string;
        /**
        * Constructor
        * @param name: the form name
        */
        constructor(name: string, core: EditorCore, title: string, body: string);
        buildElement(parent: string): void;
    }
}
