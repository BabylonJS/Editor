module BABYLON.EDITOR {
    export class MainToolbar implements ICustomUpdate, IEventReceiver {
        // Public members
        public container: string = "BABYLON-EDITOR-MAIN-TOOLBAR";
        public toolbar: GUI.GUIToolbar = null;
        public panel: GUI.IGUIPanel = null;

        // Private members
        private _core: EditorCore;
        private _editor: EditorMain;

        private _mainRendring: string = "MAIN-RENDERING";
        private _enablePostProcesses: string = "ENABLE-POST-PROCESSES";
        private _enableShadows: string = "ENABLE-SHADOWS";

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
            if (event.eventType === EventType.GUI_EVENT && event.guiEvent.eventType === GUIEventType.TOOLBAR_MENU_SELECTED) {
                if (event.guiEvent.caller !== this.toolbar || !event.guiEvent.data) {
                    return false;
                }

                var id: string = event.guiEvent.data;
                var finalID = id.split(":");
                var item = this.toolbar.getItemByID(finalID[finalID.length - 1]);

                if (item === null)
                    return false;

                // Rendering
                if (id.indexOf(this._mainRendring) !== -1) {
                    if (id.indexOf(this._enablePostProcesses) !== -1) {
                        this._core.currentScene.postProcessesEnabled = !this._core.currentScene.postProcessesEnabled;
                    }
                    else if (id.indexOf(this._enableShadows) !== -1) {
                        this._core.currentScene.shadowsEnabled = !this._core.currentScene.shadowsEnabled;
                    }
                }
            }

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

            menu = this.toolbar.createMenu("menu", this._mainRendring, "Rendering", "icon-camera");
            this.toolbar.createMenuItem(menu, "check", this._enablePostProcesses, "Enable Post-Processes", "icon-shaders", true);
            this.toolbar.createMenuItem(menu, "check", this._enableShadows, "Enable Shadows", "icon-light", true);
            //...

            // Build element
            this.toolbar.buildElement(this.container);
        }
    }
}
