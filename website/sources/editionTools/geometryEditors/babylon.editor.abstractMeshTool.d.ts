declare module BABYLON.EDITOR {
    class AbstractMeshTool<T extends Mesh> extends AbstractDatTool {
        private _tabName;
        protected onObjectSupported: (mesh: Mesh) => boolean;
        protected mesh: T;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool, containerID: string, tabID: string, tabName: string);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): boolean;
    }
}
