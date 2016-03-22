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
        protected addTextureButton(name: string, property: string, parentFolder?: dat.IFolderElement, callback?: () => void): dat.IFolderElement;
    }
}
