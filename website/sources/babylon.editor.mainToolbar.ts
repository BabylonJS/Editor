module BABYLON.EDITOR {
    export class MainToolbar implements ICustomUpdate, IEventReceiver {
        // Public members
        public container: string = "BABYLON-EDITOR-MAIN-TOOLBAR";
        public toolbar: GUI.GUIToolbar = null;
        public panel: GUI.GUIPanel = null;
        public core: EditorCore;

        public particleSystemMenu: GUI.IToolbarMenuElement = null;
        public particleSystemCopyItem: GUI.IToolbarElement = null;
        public particleSystemPasteItem: GUI.IToolbarElement = null; 

        // Private members
        private _editor: EditorMain;
        private _plugins: ICustomToolbarMenu[] = [];

        private _mainProject = "MAIN-PROJECT";
        private _mainProjectOpenFiles = "MAIN-PROJECT-OPEN-FILES";
        private _mainProjectReload = "MAIN-PROJECT-RELOAD";
        private _mainProjectNew = "MAIN-PROJECT-NEW";
        private _projectExportCode = "PROJECT-EXPORT-CODE";
        private _projectExportBabylonScene = "PROJECT-EXPORT-BABYLON-SCENE";
        private _projectSaveLocal = "PROJECT-SAVE-LOCAL";
        private _projectTemplateLocal = "PROJECT-TEMPLATE-LOCAL";
        private _projectSaveStorage = "PROJECT-CONNECT-STORAGE";
        private _projectTemplateStorage = "PROJECT-TEMPLATE-STORAGE";

        private _mainEdit = "MAIN-EDIT";
        private _mainEditLaunch = "EDIT-LAUNCH";
        private _mainEditTextures = "EDIT-TEXTURES";
        
        private _mainAdd: string = "MAIN-ADD";
        private _addSkyMesh: string = "ADD-SKY-MESH";
        private _addWaterMesh: string = "ADD-WATER-MESH";
        private _addLensFlare: string = "ADD-LENS-FLARE";
        private _addReflectionProbe: string = "ADD-REFLECTION-PROBE";
        private _addRenderTarget: string = "ADD-RENDER-TARGET";
        private _addMirrorTexture: string = "ADD-REFLECTION-TEXTURE";

        private _addParticleSystem: string = "ADD-PARTICLE-SYSTEM";
        private _particlesMain: string = "PARTICLES-MAIN";
        private _particlesCopy: string = "PARTICLES-COPY";
        private _particlesPaste: string = "PARTICLES-PASTE";
        private _particlesPlay: string = "PARTICLES-PLAY";
        private _particlesStop: string = "PARTICLES-STOP";

        private _main2dAdd: string = "MAIN-2D-ADD";
        private _addContainer2d: string = "ADD-CONTAINER-2D";
        private _addSprite2d: string = "ADD-SPRITE-2D";

        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore) {
            // Initialize
            this._editor = core.editor;
            this.core = core;

            this.panel = this._editor.layouts.getPanelFromType("top");

            // Register this
            this.core.updates.push(this);
            this.core.eventReceivers.push(this);
        }

        // Pre update
        public onPreUpdate(): void {
            
        }
        
        // Post update
        public onPostUpdate(): void {
            
        }

        // Event
        public onEvent(event: Event): boolean {
            if (event.eventType === EventType.KEY_EVENT) {
                if (event.keyEvent.control && event.keyEvent.key === "s" && !event.keyEvent.isDown) {
                    this._callSaveAction(Tools.CheckIfElectron() ? this._projectSaveLocal : this._projectSaveStorage);
                }
                else if (event.keyEvent.shift && event.keyEvent.control && event.keyEvent.key === "s" && !event.keyEvent.isDown) {
                    this._callSaveAction(Tools.CheckIfElectron() ? this._projectTemplateLocal : this._projectTemplateStorage);
                }
            }

            else if (event.eventType === EventType.GUI_EVENT && event.guiEvent.eventType === GUIEventType.TOOLBAR_MENU_SELECTED) {
                if (event.guiEvent.caller !== this.toolbar || !event.guiEvent.data) {
                    return false;
                }
                
                var id: string = event.guiEvent.data;

                var selected = this.toolbar.decomposeSelectedMenu(id);
                if (!selected || !selected.hasParent)
                    return false;
                
                // Project
                if (selected.parent === this._mainProject) {
                    if (selected.selected === this._mainProjectOpenFiles) {
                        Tools.OpenFileBrowser(this.core, "#BABYLON-EDITOR-LOAD-SCENE-FILE", (data: any) => {
                            //this._editor.filesInput.loadFiles(data);
                            if (data.target.files.length === 0)
                                return;
                            this.core.editor.reloadScene(true, data);
                        }, true);
                    }
                    else if (selected.selected === this._mainProjectReload) {
                        GUI.GUIDialog.CreateDialog("Are you sure to reload the project ?", "Reload the project", () => {
                            this.core.editor.reloadScene(true);
                        });
                    }
                    
                    else if (selected.selected === this._mainProjectNew) {
                        GUI.GUIDialog.CreateDialog("Are you sure to create a new project ?", "Create a new project", () => {
                            this._editor.createNewProject();
                        });
                    }

                    else if (selected.selected === this._projectExportCode) {
                        var exporter = new Exporter(this.core);
                        exporter.openSceneExporter();
                    }
                    else if (selected.selected === this._projectExportBabylonScene) {
                        var babylonExporter = new BabylonExporter(this.core);
                        babylonExporter.createUI();
                    }

                    else {
                        this._callSaveAction(selected.selected);
                    }

                    return true;
                }

                // Edit
                if (selected.parent === this._mainEdit) {
                    if (selected.selected === this._mainEditLaunch) {
                        var launchEditor = new LaunchEditor(this.core);
                    }
                    else if (selected.selected === this._mainEditTextures) {
                        var textureEditor = new GUITextureEditor(this.core, "");
                    }

                    return true;
                }

                // Add
                if (selected.parent === this._mainAdd) {
                    if (selected.selected === this._addLensFlare) {
                        SceneFactory.AddLensFlareSystem(this.core);
                    }
                    
                    else if (selected.selected === this._addSkyMesh) {
                        SceneFactory.AddSkyMesh(this.core);
                    }
                    else if (selected.selected === this._addWaterMesh) {
                        SceneFactory.AddWaterMesh(this.core);
                    }

                    else if (selected.selected === this._addReflectionProbe) {
                        SceneFactory.AddReflectionProbe(this.core);
                    }
                    else if (selected.selected === this._addRenderTarget) {
                        SceneFactory.AddRenderTargetTexture(this.core);
                    }
                    else if (selected.selected === this._addMirrorTexture) {
                        SceneFactory.AddMirrorTexture(this.core);
                    }

                    return true;
                }

                // Particles
                if (selected.parent === this._particlesMain) {
                    if (selected.selected === this._addParticleSystem) {
                        SceneFactory.AddParticleSystem(this.core);
                    }

                    else if (selected.selected === this._particlesCopy) {
                        GUIParticleSystemEditor._CopiedParticleSystem = GUIParticleSystemEditor._CurrentParticleSystem;
                    }
                    else if (selected.selected === this._particlesPaste) {
                        if (!GUIParticleSystemEditor._CopiedParticleSystem)
                            return true;
                        
                        //var emitter = GUIParticleSystemEditor._CopiedParticleSystem.emitter;
                        var selectedEmitter = this.core.editor.sceneGraphTool.sidebar.getSelectedNode();

                        if (!selectedEmitter || !selectedEmitter.data || !selectedEmitter.data.position)
                            return true;

                        var newParticleSystem = GUIParticleSystemEditor.CreateParticleSystem(this.core.currentScene, GUIParticleSystemEditor._CopiedParticleSystem.getCapacity(), GUIParticleSystemEditor._CopiedParticleSystem, selectedEmitter.data);

                        Event.sendSceneEvent(newParticleSystem, SceneEventType.OBJECT_ADDED, this.core);
                        this._editor.editionTool.updateEditionTool();
                    }

                    else if (selected.selected === this._particlesPlay) {
                        GUIParticleSystemEditor.PlayStopAllParticleSystems(this.core.currentScene, true);
                    }
                    else if (selected.selected === this._particlesStop) {
                        GUIParticleSystemEditor.PlayStopAllParticleSystems(this.core.currentScene, false);
                    }

                    return true;
                }

                // 2D
                if (selected.parent === this._main2dAdd) {
                    if (selected.selected === this._addContainer2d) {
                        SceneFactory2D.AddContainer2D(this.core);
                    }
                    else if (selected.selected === this._addSprite2d) {
                        SceneFactory2D.AddSprite2D(this.core);
                    }

                    return true;
                }

                for (var i = 0; i < this._plugins.length; i++) {
                    if (selected.parent === this._plugins[i].menuID) {
                        this._plugins[i].onMenuItemSelected(selected.selected);
                        return true;
                    }

                }
            }

            return false;
        }

        // Creates the UI
        public createUI(): void {
            if (this.toolbar != null)
                this.toolbar.destroy();

            this.toolbar = new GUI.GUIToolbar(this.container, this.core);

            var menu = this.toolbar.createMenu("menu", this._mainProject, "Project", "icon-folder");
            this.toolbar.createMenuItem(menu, "button", this._mainProjectOpenFiles, "Open Files", "icon-copy");
            this.toolbar.createMenuItem(menu, "button", this._mainProjectReload, "Reload...", "icon-copy");
            this.toolbar.addBreak(menu);
            this.toolbar.createMenuItem(menu, "button", this._mainProjectNew, "New...", "icon-copy");
            this.toolbar.addBreak(menu);
            this.toolbar.createMenuItem(menu, "button", this._projectExportCode, "Export...", "icon-export");
            this.toolbar.createMenuItem(menu, "button", this._projectExportBabylonScene, "Export .babylon Scene...", "icon-export");
            
            this.toolbar.addBreak(menu);
            if (!Tools.CheckIfElectron()) {
                this.toolbar.createMenuItem(menu, "button", this._projectSaveStorage, "Save on OneDrive", "icon-one-drive");
                this.toolbar.createMenuItem(menu, "button", this._projectTemplateStorage, "Template on OneDrive", "icon-one-drive");
            }
            else {
                this.toolbar.createMenuItem(menu, "button", this._projectSaveLocal, "Save...", "icon-save");
                this.toolbar.createMenuItem(menu, "button", this._projectTemplateLocal, "Create template...", "icon-save");
            }
            //...

            menu = this.toolbar.createMenu("menu", "MAIN-EDIT", "Edit", "icon-edit");
            this.toolbar.createMenuItem(menu, "button", this._mainEditLaunch, "Animate at Launch...", "icon-play-game");
            this.toolbar.addBreak(menu);
            this.toolbar.createMenuItem(menu, "button", this._mainEditTextures, "Edit Textures...", "icon-copy");
            //...

            menu = this.toolbar.createMenu("menu", this._mainAdd, "Add", "icon-add");
            this.toolbar.createMenuItem(menu, "button", this._addLensFlare, "Add Lens Flare", "icon-lens-flare");
            this.toolbar.addBreak(menu);
            this.toolbar.createMenuItem(menu, "button", this._addSkyMesh, "Add Sky", "icon-shaders");
            this.toolbar.createMenuItem(menu, "button", this._addWaterMesh, "Add Water", "icon-water");
            this.toolbar.addBreak(menu);
            this.toolbar.createMenuItem(menu, "button", this._addReflectionProbe, "Add Reflection Probe", "icon-effects");
            this.toolbar.createMenuItem(menu, "button", this._addRenderTarget, "Add Render Target Texture", "icon-camera");
            this.toolbar.createMenuItem(menu, "button", this._addMirrorTexture, "Add Mirror Texture", "icon-reflection");
            //...

            this.particleSystemMenu = menu = this.toolbar.createMenu("menu", this._particlesMain, "Particles", "icon-particles");
            this.toolbar.createMenuItem(menu, "button", this._addParticleSystem, "Add Particle System", "icon-particles");
            this.toolbar.addBreak(menu);
            this.particleSystemCopyItem = this.toolbar.createMenuItem(menu, "button", this._particlesCopy, "Copy Selected Particle System", "icon-copy", false, true);
            this.particleSystemPasteItem = this.toolbar.createMenuItem(menu, "button", this._particlesPaste, "Paste Particle System", "icon-copy", false, true);
            this.toolbar.addBreak(menu);
            this.toolbar.createMenuItem(menu, "button", this._particlesPlay, "Start All Particles", "icon-play-game");
            this.toolbar.createMenuItem(menu, "button", this._particlesStop, "Stop All Particles", "icon-error");
            //...

            menu = this.toolbar.createMenu("menu", this._main2dAdd, "2D", "icon-plane");
            this.toolbar.createMenuItem(menu, "button", this._addContainer2d, "Add Container", "icon-plane");
            this.toolbar.createMenuItem(menu, "button", this._addSprite2d, "Add Sprite", "icon-plane");
            //...

            for (var i = 0; i < PluginManager.MainToolbarPlugins.length; i++)
                this._plugins.push(new PluginManager.MainToolbarPlugins[i](this));

            // Build element
            this.toolbar.buildElement(this.container);
        }

        // Calls save actions
        private _callSaveAction(selected: string): void {
            if (selected === this._projectSaveLocal) {
                var storageExporter = new StorageExporter(this.core, "ElectronLocalStorage");
                storageExporter.export();
                FilesInput.FilesToLoad["scene.editorproject"] = Tools.CreateFile(Tools.ConvertStringToArray(ProjectExporter.ExportProject(this.core)), "scene.editorproject");
            }
            else if (selected === this._projectTemplateLocal) {
                var storageExporter = new StorageExporter(this.core, "ElectronLocalStorage");
                storageExporter.createTemplate();
            }
            else if (selected === this._projectSaveStorage) {
                var storageExporter = new StorageExporter(this.core);
                storageExporter.export();
                FilesInput.FilesToLoad["scene.editorproject"] = Tools.CreateFile(Tools.ConvertStringToArray(ProjectExporter.ExportProject(this.core)), "scene.editorproject");
            }
            else if (selected === this._projectTemplateStorage) {
                var storageExporter = new StorageExporter(this.core);
                storageExporter.createTemplate();
            }
        }
    }
}
