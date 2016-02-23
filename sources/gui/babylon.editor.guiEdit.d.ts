declare module BABYLON.EDITOR.GUI {
    class GUIEditForm extends GUIElement<W2UI.IElement> {
        private _datElement;
        /**
        * Constructor
        * @param name: the form name
        */
        constructor(name: string, core: EditorCore);
        remove(): void;
        addFolder(name: any, parent?: dat.IFolderElement): dat.IFolderElement;
        add(object: Object, propertyPath: string, items?: Array<string>, name?: string): dat.IGUIElement;
        tagObjectIfChanged(element: dat.IGUIElement, object: any, property: string): void;
        width: number;
        height: number;
        remember(object: any): void;
        buildElement(parent: string): void;
    }
}
