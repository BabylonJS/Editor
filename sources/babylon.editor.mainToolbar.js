var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var MainToolbar = (function () {
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function MainToolbar(core) {
                // Public members
                this.container = "BABYLON-EDITOR-MAIN-TOOLBAR";
                this.toolbar = null;
                this.panel = null;
                this._mainProject = "MAIN-PROJECT";
                this._projectExportCode = "PROJECT-EXPORT-CODE";
                this._projectConnectStorage = "PROJECT-CONNECT-STORAGE";
                this._mainEditLaunch = "EDIT-LAUNCH";
                this._mainAdd = "MAIN-ADD";
                this._addPointLight = "ADD-POINT-LIGHT";
                this._addDirectionalLight = "ADD-DIRECTIONAL-LIGHT";
                this._addSpotLight = "ADD-SPOT-LIGHT";
                this._addHemisphericLight = "ADD-HEMISPHERIC-LIGHT";
                this._addParticleSystem = "ADD-PARTICLE-SYSTEM";
                this._addSkyMesh = "ADD-SKY-MESH";
                this._addReflectionProbe = "ADD-REFLECTION-PROBE";
                this._addRenderTarget = "ADD-RENDER-TARGET";
                // Initialize
                this._editor = core.editor;
                this._core = core;
                this.panel = this._editor.layouts.getPanelFromType("top");
                // Register this
                this._core.updates.push(this);
                this._core.eventReceivers.push(this);
            }
            // Pre update
            MainToolbar.prototype.onPreUpdate = function () {
            };
            // Post update
            MainToolbar.prototype.onPostUpdate = function () {
            };
            // Event
            MainToolbar.prototype.onEvent = function (event) {
                if (event.eventType === EDITOR.EventType.GUI_EVENT && event.guiEvent.eventType === EDITOR.GUIEventType.TOOLBAR_MENU_SELECTED) {
                    if (event.guiEvent.caller !== this.toolbar || !event.guiEvent.data) {
                        return false;
                    }
                    var id = event.guiEvent.data;
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
                            var oneDriveStorage = new EDITOR.OneDriveStorage(this._core);
                            oneDriveStorage.open();
                        }
                        return true;
                    }
                    // Add
                    if (id.indexOf(this._mainAdd) !== -1) {
                        if (id.indexOf(this._addPointLight) !== -1) {
                            EDITOR.SceneFactory.AddPointLight(this._core);
                        }
                        else if (id.indexOf(this._addDirectionalLight) !== -1) {
                            EDITOR.SceneFactory.AddDirectionalLight(this._core);
                        }
                        else if (id.indexOf(this._addSpotLight) !== -1) {
                            EDITOR.SceneFactory.AddSpotLight(this._core);
                        }
                        else if (id.indexOf(this._addHemisphericLight) !== -1) {
                            EDITOR.SceneFactory.AddHemisphericLight(this._core);
                        }
                        else if (id.indexOf(this._addParticleSystem) !== -1) {
                            EDITOR.SceneFactory.AddParticleSystem(this._core);
                        }
                        else if (id.indexOf(this._addSkyMesh) !== -1) {
                            EDITOR.SceneFactory.AddSkyMesh(this._core);
                        }
                        else if (id.indexOf(this._addReflectionProbe) !== -1) {
                            EDITOR.SceneFactory.AddReflectionProbe(this._core);
                        }
                        else if (id.indexOf(this._addRenderTarget) !== -1) {
                            EDITOR.SceneFactory.AddRenderTargetTexture(this._core);
                        }
                        return true;
                    }
                }
                return false;
            };
            // Creates the UI
            MainToolbar.prototype.createUI = function () {
                if (this.toolbar != null)
                    this.toolbar.destroy();
                this.toolbar = new EDITOR.GUI.GUIToolbar(this.container, this._core);
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
            };
            return MainToolbar;
        })();
        EDITOR.MainToolbar = MainToolbar;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.mainToolbar.js.map