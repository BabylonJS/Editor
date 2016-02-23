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
                this.particleSystemMenu = null;
                this.particleSystemCopyItem = null;
                this.particleSystemPasteItem = null;
                this._mainProject = "MAIN-PROJECT";
                this._mainProjectOpenFiles = "MAIN-PROJECT-OPEN-FILES";
                this._mainProjectReload = "MAIN-PROJECT-RELOAD";
                this._projectExportCode = "PROJECT-EXPORT-CODE";
                this._projectExportBabylonScene = "PROJECT-EXPORT-BABYLON-SCENE";
                this._projectConnectStorage = "PROJECT-CONNECT-STORAGE";
                this._projectTemplateStorage = "PROJECT-TEMPLATE-STORAGE";
                this._mainEdit = "MAIN-EDIT";
                this._mainEditLaunch = "EDIT-LAUNCH";
                this._mainAdd = "MAIN-ADD";
                this._addPointLight = "ADD-POINT-LIGHT";
                this._addDirectionalLight = "ADD-DIRECTIONAL-LIGHT";
                this._addSpotLight = "ADD-SPOT-LIGHT";
                this._addHemisphericLight = "ADD-HEMISPHERIC-LIGHT";
                this._addParticleSystem = "ADD-PARTICLE-SYSTEM";
                this._addSkyMesh = "ADD-SKY-MESH";
                this._addLensFlare = "ADD-LENS-FLARE";
                this._addReflectionProbe = "ADD-REFLECTION-PROBE";
                this._addRenderTarget = "ADD-RENDER-TARGET";
                this._particlesMain = "PARTICLES-MAIN";
                this._particlesCopy = "PARTICLES-COPY";
                this._particlesPaste = "PARTICLES-PASTE";
                this._particlesPlay = "PARTICLES-PLAY";
                this._particlesStop = "PARTICLES-STOP";
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
                var _this = this;
                if (event.eventType === EDITOR.EventType.GUI_EVENT && event.guiEvent.eventType === EDITOR.GUIEventType.TOOLBAR_MENU_SELECTED) {
                    if (event.guiEvent.caller !== this.toolbar || !event.guiEvent.data) {
                        return false;
                    }
                    var id = event.guiEvent.data;
                    //var finalIDs = id.split(":");
                    //var item = this.toolbar.getItemByID(finalIDs[finalIDs.length - 1]);
                    //if (item === null)
                    //    return false;
                    var selected = this.toolbar.decomposeSelectedMenu(id);
                    if (!selected || !selected.hasParent)
                        return false;
                    // Project
                    if (id.indexOf(this._mainProject) !== -1) {
                        if (id.indexOf(this._mainProjectOpenFiles) !== -1) {
                            var inputFiles = $("#BABYLON-EDITOR-LOAD-SCENE-FILE");
                            inputFiles.change(function (data) {
                                _this._editor.filesInput.loadFiles(data);
                            }).click();
                        }
                        else if (id.indexOf(this._mainProjectReload) !== -1) {
                            this._core.editor.filesInput.reload();
                        }
                        else if (id.indexOf(this._projectExportCode) !== -1) {
                            var exporter = new EDITOR.Exporter(this._core);
                            exporter.openSceneExporter();
                        }
                        else if (id.indexOf(this._projectExportBabylonScene) !== -1) {
                            var babylonExporter = new EDITOR.BabylonExporter(this._core);
                            babylonExporter.createUI();
                        }
                        else if (id.indexOf(this._projectConnectStorage) !== -1) {
                            var storageExporter = new EDITOR.StorageExporter(this._core);
                            storageExporter.export();
                        }
                        else if (id.indexOf(this._projectTemplateStorage) !== -1) {
                            var storageExporter = new EDITOR.StorageExporter(this._core);
                            storageExporter.createTemplate();
                        }
                        return true;
                    }
                    // Edit
                    if (id.indexOf(this._mainEdit) !== -1) {
                        if (id.indexOf(this._mainEditLaunch) !== -1) {
                            var launchEditor = new EDITOR.LaunchEditor(this._core);
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
                        else if (id.indexOf(this._addLensFlare) !== -1) {
                            EDITOR.SceneFactory.AddLensFlareSystem(this._core);
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
                    // Particles
                    if (id.indexOf(this._particlesMain) !== -1) {
                        if (id.indexOf(this._particlesCopy) !== -1) {
                            EDITOR.GUIParticleSystemEditor._CopiedParticleSystem = EDITOR.GUIParticleSystemEditor._CurrentParticleSystem;
                        }
                        else if (id.indexOf(this._particlesPaste) !== -1) {
                            if (!EDITOR.GUIParticleSystemEditor._CopiedParticleSystem)
                                return true;
                            var emitter = EDITOR.GUIParticleSystemEditor._CopiedParticleSystem.emitter;
                            var newParticleSystem = EDITOR.GUIParticleSystemEditor.CreateParticleSystem(this._core.currentScene, EDITOR.GUIParticleSystemEditor._CopiedParticleSystem.getCapacity(), EDITOR.GUIParticleSystemEditor._CopiedParticleSystem, emitter);
                            EDITOR.Event.sendSceneEvent(newParticleSystem, EDITOR.SceneEventType.OBJECT_ADDED, this._core);
                            this._editor.editionTool.updateEditionTool();
                        }
                        else if (id.indexOf(this._particlesPlay) !== -1) {
                            EDITOR.GUIParticleSystemEditor.PlayStopAllParticleSystems(this._core.currentScene, true);
                        }
                        else if (id.indexOf(this._particlesStop) !== -1) {
                            EDITOR.GUIParticleSystemEditor.PlayStopAllParticleSystems(this._core.currentScene, false);
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
                var menu = this.toolbar.createMenu("menu", this._mainProject, "Project", "icon-folder");
                this.toolbar.createMenuItem(menu, "button", this._mainProjectOpenFiles, "Open Files", "icon-copy");
                this.toolbar.createMenuItem(menu, "button", this._mainProjectReload, "Reload...", "icon-copy");
                this.toolbar.addBreak(menu);
                this.toolbar.createMenuItem(menu, "button", this._projectExportCode, "Export...", "icon-export");
                this.toolbar.createMenuItem(menu, "button", this._projectExportBabylonScene, "Export .babylon Scene...", "icon-export");
                this.toolbar.addBreak(menu);
                this.toolbar.createMenuItem(menu, "button", this._projectConnectStorage, "Save on OneDrive", "icon-one-drive");
                this.toolbar.createMenuItem(menu, "button", this._projectTemplateStorage, "Template on OneDrive", "icon-one-drive");
                //...
                menu = this.toolbar.createMenu("menu", "MAIN-EDIT", "Edit", "icon-edit");
                this.toolbar.createMenuItem(menu, "button", this._mainEditLaunch, "Animate at Launch...", "icon-play-game");
                //...
                menu = this.toolbar.createMenu("menu", this._mainAdd, "Add", "icon-add");
                this.toolbar.createMenuItem(menu, "button", this._addPointLight, "Add Point Light", "icon-light");
                this.toolbar.createMenuItem(menu, "button", this._addDirectionalLight, "Add Directional Light", "icon-directional-light");
                this.toolbar.createMenuItem(menu, "button", this._addSpotLight, "Add Spot Light", "icon-directional-light");
                this.toolbar.createMenuItem(menu, "button", this._addHemisphericLight, "Add Hemispheric Light", "icon-light");
                this.toolbar.addBreak(menu);
                this.toolbar.createMenuItem(menu, "button", this._addParticleSystem, "Add Particle System", "icon-particles");
                this.toolbar.addBreak(menu);
                this.toolbar.createMenuItem(menu, "button", this._addLensFlare, "Add Lens Flare", "icon-lens-flare");
                this.toolbar.addBreak(menu);
                this.toolbar.createMenuItem(menu, "button", this._addSkyMesh, "Add Sky", "icon-shaders");
                this.toolbar.addBreak(menu);
                this.toolbar.createMenuItem(menu, "button", this._addReflectionProbe, "Add Reflection Probe", "icon-effects");
                this.toolbar.createMenuItem(menu, "button", this._addRenderTarget, "Add Render Target Texture", "icon-camera");
                //...
                this.particleSystemMenu = menu = this.toolbar.createMenu("menu", this._particlesMain, "Particles", "icon-particles");
                this.particleSystemCopyItem = this.toolbar.createMenuItem(menu, "button", this._particlesCopy, "Copy Selected Particle System", "icon-copy", false, true);
                this.particleSystemPasteItem = this.toolbar.createMenuItem(menu, "button", this._particlesPaste, "Paste Particle System", "icon-copy", false, true);
                this.toolbar.addBreak(menu);
                this.toolbar.createMenuItem(menu, "button", this._particlesPlay, "Start All Particles", "icon-play-game");
                this.toolbar.createMenuItem(menu, "button", this._particlesStop, "Stop All Particles", "icon-error");
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