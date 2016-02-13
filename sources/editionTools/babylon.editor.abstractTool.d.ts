declare module BABYLON.EDITOR {
    class AbstractTool implements ICustomEditionTool {
        object: any;
        containers: Array<string>;
        tab: string;
        protected _editionTool: EditionTool;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): boolean;
        apply(): void;
        resize(): void;
    }
}
