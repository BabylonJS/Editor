declare module BABYLON.EDITOR {
    class AbstractTool implements ICustomEditionTool {
        object: Node;
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
        update(): void;
        apply(): void;
        resize(): void;
    }
}
