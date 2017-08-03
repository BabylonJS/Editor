module BABYLON.EDITOR {
    export class AbstractTool implements ICustomEditionTool {
        // Public members
        public object: any = null;

        public containers: Array<string>;
        public tab: string = "";

        // Private members
        protected _editionTool: EditionTool;
        protected _core: EditorCore;

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            // Initialize
            this._editionTool = editionTool;
            this._core = editionTool.core;
        }

        // Object supported
        public isObjectSupported(object: any): boolean {
            return false;
        }

        // Creates the UI
        public createUI(): void
        { }

        // Update
        public update(): boolean {
            return true;
        }

        // Apply
        public apply(): void
        { }

        // Resize
        public resize(): void
        { }
    }
}