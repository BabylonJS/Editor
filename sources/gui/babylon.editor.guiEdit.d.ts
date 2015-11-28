declare module BABYLON.EDITOR.GUI {
    class GUIEditForm extends GUIElement {
        private _datElement;
        /**
        * Constructor
        * @param name: the form name
        */
        constructor(name: string, core: EditorCore);
        remove(): void;
        addFolder(name: any, parent?: dat.IFolderElement): dat.IFolderElement;
        add(object: Object, propertyPath: string, name: string, items?: Array<string>): dat.IGUIElement;
        width: number;
        height: number;
        remember(object: any): void;
        buildElement(parent: string): void;
    }
}
