declare module BABYLON.EDITOR.GUI {
    class GUIList extends GUIElement<W2UI.IListElement> {
        items: string[];
        renderDrop: boolean;
        selected: string;
        onChange: (selected: string) => void;
        /**
        * Constructor
        * @param name: the form name
        * @param core: the editor core
        */
        constructor(name: string, core: EditorCore);
        addItem(name: string): IGUIListElement;
        getSelected(): number;
        getValue(): string;
        buildElement(parent: string): void;
    }
}
