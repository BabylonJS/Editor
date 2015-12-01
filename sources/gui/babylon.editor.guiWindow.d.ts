declare module BABYLON.EDITOR.GUI {
    class GUIWindow extends GUIElement implements IGUIWindowElement {
        title: string;
        body: string;
        size: Vector2;
        buttons: Array<string>;
        modal: boolean;
        showClose: boolean;
        showMax: boolean;
        onToggle: () => void;
        private _onCloseCallbacks;
        private _onCloseCallback;
        /**
        * Constructor
        * @param name: the form name
        */
        constructor(name: string, core: EditorCore, title: string, body: string, size?: Vector2, buttons?: Array<string>);
        setOnCloseCallback(callback: () => void): void;
        close(): void;
        maximize(): void;
        buildElement(parent: string): void;
    }
}
