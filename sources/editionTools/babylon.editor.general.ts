module BABYLON.EDITOR {
    export class GeneralTool implements ICustomEditionTool {
        // Public members
        public object: any = null;
        public containers: Array<string>;

        // Private members
        private _editionTool: EditionTool;

        private _generalForm: GUI.IGUIForm;

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            // Initialize
            this._editionTool = editionTool;

            this.containers = [
                "BABYLON-EDITOR-EDITION-TOOL-GENERAL"
            ];
        }

        // Object supported
        public isObjectSupported(object: any): boolean {
            if (object instanceof Mesh
                || object instanceof Light
                || object instanceof Camera)
            {
                return true;
            }

            return false;
        }

        // Creates the UI
        public createUI(): void {
            // General
            this._generalForm = new GUI.GUIForm(this.containers[0], "General");
            this._generalForm.createField("NAME", "text", "Name :", 5, "yo");
            this._generalForm.buildElement(this._editionTool.container);
        }
    }
}