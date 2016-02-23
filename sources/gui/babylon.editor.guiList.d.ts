declare module BABYLON.EDITOR.GUI {
    class GUIList extends GUIElement<W2UI.IListElement> {
        items: Array<string>;
        /**
        * Constructor
        * @param name: the form name
        * @param core: the editor core
        */
        constructor(name: string, core: EditorCore);
        addItem(name: string): IGUIListElement;
        getSelected(): number;
        buildElement(parent: string): void;
    }
}
