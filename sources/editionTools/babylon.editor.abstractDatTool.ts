module BABYLON.EDITOR {
    export class AbstractDatTool extends AbstractTool {
        // Public members

        // Protected members
        protected _element: GUI.GUIEditForm;

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            // Initialize
            super(editionTool);
        }

        // Update
        public update(): void {
            if (this._element) {
                this._element.remove();
                this._element = null;
            }
        }

        // Resize
        public resize(): void {
            if (this._element)
                this._element.width = this._editionTool.panel.width - 15;
        }
    }
}