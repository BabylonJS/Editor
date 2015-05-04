declare module BABYLON.EDITOR {
    class GeneralTool implements ICustomEditionTool {
        object: any;
        containers: Array<string>;
        private _editionTool;
        private _generalForm;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
    }
}
