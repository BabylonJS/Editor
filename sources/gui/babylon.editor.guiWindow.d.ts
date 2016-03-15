declare module BABYLON.EDITOR.GUI {
    class GUIWindow extends GUIElement<W2UI.IWindowElement> {
        title: string;
        body: string;
        size: Vector2;
        buttons: Array<string>;
        modal: boolean;
        showClose: boolean;
        showMax: boolean;
        onButtonClicked: (buttonId: string) => void;
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
        lock(message?: string): void;
        unlock(): void;
        onToggle: (maximized: boolean, width: number, height: number) => void;
        notify(message: string): void;
        buildElement(parent: string): void;
        static CreateAlert(message: string, title?: string, callback?: () => void): void;
    }
}
