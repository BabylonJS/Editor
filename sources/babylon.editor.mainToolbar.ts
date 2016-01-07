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
        private _projectConnectStorage = "PROJECT-CONNECT-STORAGE";

        private _mainEditLaunch = "EDIT-LAUNCH";

        private _mainAdd: string = "MAIN-ADD";
        private _addPointLight: string = "ADD-POINT-LIGHT";
        private _addDirectionalLight: string = "ADD-DIRECTIONAL-LIGHT";
        private _addSpotLight: string = "ADD-SPOT-LIGHT";
        private _addHemisphericLight: string = "ADD-HEMISPHERIC-LIGHT";
        private _addParticleSystem: string = "ADD-PARTICLE-SYSTEM";
        private _addSkyMesh: string = "ADD-SKY-MESH";
        private _addReflectionProbe: string = "ADD-REFLECTION-PROBE";
        private _addRenderTarget: string = "ADD-RENDER-TARGET";

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

                    else if (id.indexOf(this._projectConnectStorage) !== -1) {
                        var oneDriveStorage = new OneDriveStorage(this._core);
                        oneDriveStorage.open();
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

                    else if (id.indexOf(this._addParticleSystem) !== -1) {
                        SceneFactory.AddParticleSystem(this._core);
                    }

                    else if (id.indexOf(this._addSkyMesh) !== -1) {
                        SceneFactory.AddSkyMesh(this._core);
                    }

                    else if (id.indexOf(this._addReflectionProbe) !== -1) {
                        SceneFactory.AddReflectionProbe(this._core);
                    }
                    else if (id.indexOf(this._addRenderTarget) !== -1) {
                        SceneFactory.AddRenderTargetTexture(this._core);
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

            var menu = this.toolbar.createMenu("menu", this._mainProject, "Scene", "icon-folder");
            this.toolbar.createMenuItem(menu, "button", this._projectExportCode, "Export", "icon-export");
            this.toolbar.addBreak(menu);
            this.toolbar.createMenuItem(menu, "button", this._projectConnectStorage, "Synchronize on OneDrive", "icon-one-drive");
            //...

            menu = this.toolbar.createMenu("menu", "MAIN-EDIT", "Edit", "icon-edit");
            this.toolbar.createMenuItem(menu, "button", this._mainEditLaunch, "Edit Launch...", "icon-play-game");
            //...

            menu = this.toolbar.createMenu("menu", this._mainAdd, "Add", "icon-add");
            this.toolbar.createMenuItem(menu, "button", this._addPointLight, "Add Point Light", "icon-light");
            this.toolbar.createMenuItem(menu, "button", this._addDirectionalLight, "Add Directional Light", "icon-directional-light");
            this.toolbar.createMenuItem(menu, "button", this._addSpotLight, "Add Spot Light", "icon-directional-light");
            this.toolbar.createMenuItem(menu, "button", this._addHemisphericLight, "Add Hemispheric Light", "icon-light");
            this.toolbar.addBreak(menu);
            this.toolbar.createMenuItem(menu, "button", this._addParticleSystem, "Add Particle System", "icon-particles");
            this.toolbar.addBreak(menu);
            this.toolbar.createMenuItem(menu, "button", this._addSkyMesh, "Add Sky", "icon-shaders");
            this.toolbar.addBreak(menu);
            this.toolbar.createMenuItem(menu, "button", this._addReflectionProbe, "Add Reflection Probe", "icon-effects");
            this.toolbar.createMenuItem(menu, "button", this._addRenderTarget, "Add Render Target Texture", "icon-camera");
            //...

            // Build element
            this.toolbar.buildElement(this.container);
        }
    }
}
