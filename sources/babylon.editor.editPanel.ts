module BABYLON.EDITOR {
    export class EditPanel implements IEventReceiver {
        // Public members
        public core: EditorCore;
        public editor: EditorMain;

        public panel: GUI.GUIPanel;

        public onClose: () => void = null;

        // Private members
        private _containers: string[] = [];
        private _mainPanel: GUI.GUIPanel;

        private _panelID = "BABYLON-EDITOR-PREVIEW-PANEL";
        private _closeButtonID = "BABYLON-EDITOR-PREVIEW-PANEL-CLOSE";
        private _closeButton: JQuery;

        /**
        * Constructor
        */
        constructor(core: EditorCore) {
            // Initialize
            this.core = core;
            this.editor = core.editor;

            this.core.eventReceivers.push(this);

            this.panel = this.editor.layouts.getPanelFromType("preview");
            this._mainPanel = this.editor.layouts.getPanelFromType("main");

            this._addCloseButton();
        }

        // On event
        public onEvent(event: Event): boolean {
            if (event.eventType === EventType.GUI_EVENT && event.guiEvent.eventType === GUIEventType.LAYOUT_CHANGED) {
                this._configureCloseButton();
            }

            return false;
        }
        
        // Adds a new element to the panel
        // Returns true if added, false if already exists by providing the ID
        public addContainer(container: string, id?: string): boolean {

            if (id) {
                var exists = $("#" + id)[0];

                if (exists)
                    return false;
            }

            $("#" + this._panelID).append(container);

            return true;
        }

        // Closes the panel
        public close(): void {
            if (this.onClose)
                this.onClose();

            // Empty div
            $("#" + this._panelID).empty();

            // Free
            this.onClose = null;

            // Create close button
            this._addCloseButton();
        }

        // Sets the panel size
        public setPanelSize(percents: number): void {
            var height = this.panel._panelElement.height;
            height += this._mainPanel._panelElement.height;

            this.editor.layouts.setPanelSize("preview", height * percents / 100);
        }

        // Creates close button
        private _addCloseButton(): void {
            $("#" + this._panelID).append(GUI.GUIElement.CreateElement("button class=\"btn w2ui-msg-title w2ui-msg-button\"", this._closeButtonID, ""));

            this._closeButton = $("#" + this._closeButtonID);
            this._closeButton.text("x");

            this._configureCloseButton();
            
            this._closeButton.click((event: JQueryEventObject) => {
                this.close();
                this.setPanelSize(0);
            });
        }

        // Configures close button
        private _configureCloseButton(): void {
            this._closeButton.css("position", "absolute");
            this._closeButton.css("right", "0%");
            this._closeButton.css("z-index", 1000); // Should be enough
            this._closeButton.css("min-width", "0px");
            this._closeButton.css("width", "15px");
        }
    }
}
