declare module BABYLON.EDITOR {
    class AbstractMaterialTool<T> extends AbstractDatTool {
        protected onObjectSupported: (material: Material) => boolean;
        protected tabName: string;
        protected material: T;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): void;
    }
}
