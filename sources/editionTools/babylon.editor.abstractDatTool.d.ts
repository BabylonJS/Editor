declare module BABYLON.EDITOR {
    class AbstractDatTool extends AbstractTool {
        protected _element: GUI.GUIEditForm;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        update(): boolean;
        resize(): void;
        /**
        * Static methods
        */
        protected addColorFolder(color: Color3 | Color4, propertyName: string, open?: boolean, parent?: dat.IFolderElement, callback?: () => void): dat.IFolderElement;
        protected addVectorFolder(vector: Vector2 | Vector3, propertyName: string, open?: boolean, parent?: dat.IFolderElement, callback?: () => void): dat.IFolderElement;
        protected addTextureFolder(object: Object, name: string, property: string, parentFolder?: dat.IFolderElement, callback?: () => void): dat.IFolderElement;
    }
}
