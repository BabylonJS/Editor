declare module BABYLON.EDITOR.GUI {
    class GUIElement implements IGUIElement {
        element: W2UI.IElement;
        name: string;
        constructor(name: string);
        destroy(): void;
        refresh(): void;
        on(event: W2UI.IEvent, callback: (target: any, eventData: any) => void): void;
        buildElement(parent: string): void;
    }
}
