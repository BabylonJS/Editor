declare module BABYLON.EDITOR.GUI {
    class GUIWindow extends GUIElement implements IGUIWindowElement {
        title: string;
        body: string;
        size: Vector2;
        buttons: Array<string>;
        modal: boolean;
        showClose: boolean;
        showMax: boolean;
        private _onCloseCallbacks;
        private _onCloseCallback;
        private _onToggle;
        /**
        * Constructor
        * @param name: the form name
        */
        constructor(name: string, core: EditorCore, title: string, body: string, size?: Vector2, buttons?: Array<string>);
        destroy(): void;
        setOnCloseCallback(callback: () => void): void;
        close(): void;
        maximize(): void;
        onToggle: (maximized: boolean, width: number, height: number) => void;
        buildElement(parent: string): void;
    }
}
