declare module BABYLON.EDITOR.GUI {
    class GUIElement<T extends W2UI.IElement> implements IGUIElement {
        element: T;
        name: string;
        core: EditorCore;
        /**
        * Constructor
        * @param name: the gui element name
        * @param core: the editor core
        */
        constructor(name: string, core: EditorCore);
        destroy(): void;
        refresh(): void;
        resize(): void;
        on(event: W2UI.IEvent, callback: (target: any, eventData: any) => void): void;
        buildElement(parent: string): void;
        /**
        * Static methods
        */
        static CreateDivElement(id: string, style?: string): string;
        static CreateElement(type: string, id: string, style?: string): string;
    }
}
