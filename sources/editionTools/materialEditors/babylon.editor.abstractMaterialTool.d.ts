declare module BABYLON.EDITOR {
    class AbstractMaterialTool<T extends Material> extends AbstractDatTool {
        private _tabName;
        protected onObjectSupported: (material: Material) => boolean;
        protected material: T;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool, containerID: string, tabID: string, tabName: string);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): boolean;
        protected addColorFolder(color: Color3 | Color4, propertyName: string, open?: boolean, parent?: dat.IFolderElement, callback?: () => void): dat.IFolderElement;
        protected addVectorFolder(vector: Vector2 | Vector3, propertyName: string, open?: boolean, parent?: dat.IFolderElement, callback?: () => void): dat.IFolderElement;
        protected addTextureButton(name: string, property: string, parentFolder?: dat.IFolderElement, callback?: () => void): dat.IFolderElement;
    }
}
