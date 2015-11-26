module BABYLON.EDITOR {
    export class MainToolbar implements ICustomUpdate, IEventReceiver {
        // Public members
        public container: string = "BABYLON-EDITOR-MAIN-TOOLBAR";
        public toolbar: GUI.GUIToolbar = null;
        public panel: GUI.IGUIPanel = null;

        // Private members
        private _core: EditorCore;
        private _editor: EditorMain;

        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore) {
            // Initialize
            this._editor = core.editor;
            this._core = core;

            this.panel = this._editor.layouts.getPanelFromType("top");

            // Register this
            this._core.updates.push(this);
            this._core.eventReceivers.push(this);
        }

        // Pre update
        public onPreUpdate(): void {

        }
        
        // Post update
        public onPostUpdate(): void {

        }

        // Event
        public onEvent(event: Event): boolean {

            return false;
        }

        // Creates the UI
        public createUI(): void {
            if (this.toolbar != null)
                this.toolbar.destroy();

            this.toolbar = new GUI.GUIToolbar(this.container, this._core);

            var menu = this.toolbar.createMenu("menu", "MAIN-FILES", "File", "icon-folder");
            //...

            menu = this.toolbar.createMenu("menu", "MAIN-EDIT", "Edit", "icon-edit");
            //...

            menu = this.toolbar.createMenu("menu", "MAIN-ADD", "Add", "icon-add");
            //...

            menu = this.toolbar.createMenu("menu", "MAIN-RENDERING", "Rendering", "icon-camera");
            this.toolbar.createMenuItem(menu, "button", "MAIN-RENDERINGèPOST-PROCESSES", "Manage Post-Processes", "icon-camera");
            //...

            // Build element
            this.toolbar.buildElement(this.container);
        }
    }
}
