module BABYLON.EDITOR {
    export class EditPanel {
        // Public members
        public core: EditorCore;
        public editor: EditorMain;

        public panel: GUI.GUIPanel;

        public onClose: () => void = null;

        // Private members
        private _containers: string[] = [];
        private _mainPanel: GUI.GUIPanel;

        /**
        * Constructor
        */
        constructor(core: EditorCore) {
            // Initialize
            this.core = core;
            this.editor = core.editor;

            this.panel = this.editor.layouts.getPanelFromType("preview");
            this._mainPanel = this.editor.layouts.getPanelFromType("main");
        }
        
        // Adds a new element to the panel
        // Returns true if added, false if already exists by providing the ID
        public addContainer(container: string, id?: string): boolean {

            if (id) {
                var exists = $("#" + id)[0];

                if (exists)
                    return false;
            }

            $("#BABYLON-EDITOR-PREVIEW-PANEL").append(container);

            return true;
        }

        // Closes the panel
        public close(): void {
            if (this.onClose)
                this.onClose();

            // Empty div
            $("#BABYLON-EDITOR-PREVIEW-PANEL").empty();

            // Free
            this.onClose = null;
        }

        // Sets the panel size
        public setPanelSize(percents: number): void {
            var height = this.panel._panelElement.height;
            height += this._mainPanel._panelElement.height;

            this.editor.layouts.setPanelSize("preview", height * percents / 100);
        }
    }
}