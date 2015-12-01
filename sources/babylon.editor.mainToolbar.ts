module BABYLON.EDITOR {
    export class MainToolbar implements ICustomUpdate, IEventReceiver {
        // Public members
        public container: string = "BABYLON-EDITOR-MAIN-TOOLBAR";
        public toolbar: GUI.GUIToolbar = null;
        public panel: GUI.IGUIPanel = null;

        // Private members
        private _core: EditorCore;
        private _editor: EditorMain;

        private _mainProject = "MAIN-PROJECT";
        private _projectExportCode = "PROJECT-EXPORT-CODE";

        private _mainAdd: string = "MAIN-ADD";
        private _addPointLight: string = "ADD-POINT-LIGHT";
        private _addDirectionalLight: string = "ADD-DIRECTIONAL-LIGHT";
        private _addSpotLight: string = "ADD-SPOT-LIGHT";
        private _addHemisphericLight: string = "ADD-HEMISPHERIC-LIGHT";

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

                // Project
                if (id.indexOf(this._mainProject) !== -1) {
                    if (id.indexOf(this._projectExportCode) !== -1) {
                        this._editor.exporter.openSceneExporter();
                    }

                    return true;
                }

                // Add
                if (id.indexOf(this._mainAdd) !== -1) {
                    if (id.indexOf(this._addPointLight) !== -1) {
                        SceneFactory.AddPointLight(this._core);
                    }
                    else if (id.indexOf(this._addDirectionalLight) !== -1) {
                        SceneFactory.AddDirectionalLight(this._core);
                    }
                    else if (id.indexOf(this._addSpotLight) !== -1) {
                        SceneFactory.AddSpotLight(this._core);
                    }
                    else if (id.indexOf(this._addHemisphericLight) !== -1) {
                        SceneFactory.AddHemisphericLight(this._core);
                    }

                    return true;
                }
            }

            return false;
        }

        // Creates the UI
        public createUI(): void {
            if (this.toolbar != null)
                this.toolbar.destroy();

            this.toolbar = new GUI.GUIToolbar(this.container, this._core);

            var menu = this.toolbar.createMenu("menu", this._mainProject, "File", "icon-folder");
            this.toolbar.createMenuItem(menu, "button", this._projectExportCode, "Export", "");
            //...

            menu = this.toolbar.createMenu("menu", "MAIN-EDIT", "Edit", "icon-edit");
            //...

            menu = this.toolbar.createMenu("menu", this._mainAdd, "Add", "icon-add");
            this.toolbar.createMenuItem(menu, "button", this._addPointLight, "Add Point Light", "icon-light");
            this.toolbar.createMenuItem(menu, "button", this._addDirectionalLight, "Add Directional Light", "icon-directional-light");
            this.toolbar.createMenuItem(menu, "button", this._addSpotLight, "Add Spot Light", "icon-directional-light");
            this.toolbar.createMenuItem(menu, "button", this._addHemisphericLight, "Add Hemispheric Light", "icon-light");
            this.toolbar.addBreak(menu);
            //...

            //menu = this.toolbar.createMenu("menu", this._mainRendring, "Rendering", "icon-camera");;
            //...

            // Build element
            this.toolbar.buildElement(this.container);
        }
    }
}
