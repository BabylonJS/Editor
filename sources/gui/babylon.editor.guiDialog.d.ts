declare module BABYLON.EDITOR.GUI {
    class GUIDialog extends GUIElement<W2UI.IWindowConfirmDialog> {
        title: string;
        body: string;
        callback: (data: string) => void;
        /**
        * Constructor
        * @param name: the form name
        */
        constructor(name: string, core: EditorCore, title: string, body: string);
        buildElement(parent: string): void;
        static CreateDialog(body: string, title?: string, yesCallback?: () => void, noCallback?: () => void): void;
    }
}
