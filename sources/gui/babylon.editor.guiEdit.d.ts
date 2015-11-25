declare module BABYLON.EDITOR.GUI {
    class GUIEditForm extends GUIElement {
        private _datElement;
        /**
        * Constructor
        * @param name: the form name
        */
        constructor(name: string);
        addFolder(name: any): dat.IFolderElement;
        add(object: Object, propertyPath: string, name: string): dat.IGUIElement;
        buildElement(parent: string): void;
    }
}
