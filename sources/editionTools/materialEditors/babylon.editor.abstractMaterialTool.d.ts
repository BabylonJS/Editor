declare module BABYLON.EDITOR {
    class AbstractMaterialTool<T> extends AbstractDatTool {
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
        protected addColorFolder(property: Color3 | Color4, propertyName: string, open?: boolean, parent?: dat.IFolderElement): dat.IFolderElement;
    }
}
