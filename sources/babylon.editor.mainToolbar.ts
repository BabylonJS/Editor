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
        private _projectExportCode = "PROJECT-EXPORT-CODE";
        private _projectExportBabylonScene = "PROJECT-EXPORT-BABYLON-SCENE";
        private _projectConnectStorage = "PROJECT-CONNECT-STORAGE";
        private _projectTemplateStorage = "PROJECT-TEMPLATE-STORAGE";

        private _mainEdit = "MAIN-EDIT";
        private _mainEditLaunch = "EDIT-LAUNCH";
        private _mainEditTextures = "EDIT-TEXTURES";

        private _mainAdd: string = "MAIN-ADD";
        private _addPointLight: string = "ADD-POINT-LIGHT";
        private _addDirectionalLight: string = "ADD-DIRECTIONAL-LIGHT";
        private _addSpotLight: string = "ADD-SPOT-LIGHT";
        private _addHemisphericLight: string = "ADD-HEMISPHERIC-LIGHT";
        private _addParticleSystem: string = "ADD-PARTICLE-SYSTEM";
        private _addSkyMesh: string = "ADD-SKY-MESH";
        private _addWaterMesh: string = "ADD-WATER-MESH";
        private _addLensFlare: string = "ADD-LENS-FLARE";
        private _addReflectionProbe: string = "ADD-REFLECTION-PROBE";
        private _addRenderTarget: string = "ADD-RENDER-TARGET";

        private _particlesMain: string = "PARTICLES-MAIN";
        private _particlesCopy: string = "PARTICLES-COPY";
        private _particlesPaste: string = "PARTICLES-PASTE";
        private _particlesPlay: string = "PARTICLES-PLAY";
        private _particlesStop: string = "PARTICLES-STOP";

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
            if (event.eventType === EventType.GUI_EVENT && event.guiEvent.eventType === GUIEventType.TOOLBAR_MENU_SELECTED) {
                if (event.guiEvent.caller !== this.toolbar || !event.guiEvent.data) {
                    return false;
                }

                var id: string = event.guiEvent.data;

                //var finalIDs = id.split(":");
                //var item = this.toolbar.getItemByID(finalIDs[finalIDs.length - 1]);

                //if (item === null)
                //    return false;

                var selected = this.toolbar.decomposeSelectedMenu(id);
                if (!selected || !selected.hasParent)
                    return false;

                // Project
                if (selected.parent === this._mainProject) {
                    if (selected.selected === this._mainProjectOpenFiles) {
                        var inputFiles = $("#BABYLON-EDITOR-LOAD-SCENE-FILE");

                        inputFiles.change((data: any) => {
                            this._editor.filesInput.loadFiles(data);
                        }).click();
                    }
                    else if (selected.selected === this._mainProjectReload) {
                        this.core.editor.filesInput.reload();
                    }

                    else if (selected.selected === this._projectExportCode) {
                        var exporter = new Exporter(this.core);
                        exporter.openSceneExporter();
                    }
                    else if (selected.selected === this._projectExportBabylonScene) {
                        var babylonExporter = new BabylonExporter(this.core);
                        babylonExporter.createUI();
                    }

                    else if (selected.selected === this._projectConnectStorage) {
                        var storageExporter = new StorageExporter(this.core);
                        storageExporter.export();
                    }
                    else if (selected.selected === this._projectTemplateStorage) {
                        var storageExporter = new StorageExporter(this.core);
                        storageExporter.createTemplate();
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
                    if (selected.selected === this._addPointLight) {
                        SceneFactory.AddPointLight(this.core);
                    }
                    else if (selected.selected === this._addDirectionalLight) {
                        SceneFactory.AddDirectionalLight(this.core);
                    }
                    else if (selected.selected === this._addSpotLight) {
                        SceneFactory.AddSpotLight(this.core);
                    }
                    else if (selected.selected === this._addHemisphericLight) {
                        SceneFactory.AddHemisphericLight(this.core);
                    }

                    else if (selected.selected === this._addParticleSystem) {
                        SceneFactory.AddParticleSystem(this.core);
                    }

                    else if (selected.selected === this._addLensFlare) {
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

                    return true;
                }

                // Particles
                if (selected.parent === this._particlesMain) {
                    if (selected.selected === this._particlesCopy) {
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
            this.toolbar.createMenuItem(menu, "button", this._projectExportCode, "Export...", "icon-export");
            this.toolbar.createMenuItem(menu, "button", this._projectExportBabylonScene, "Export .babylon Scene...", "icon-export");
            this.toolbar.addBreak(menu);
            this.toolbar.createMenuItem(menu, "button", this._projectConnectStorage, "Save on OneDrive", "icon-one-drive");
            this.toolbar.createMenuItem(menu, "button", this._projectTemplateStorage, "Template on OneDrive", "icon-one-drive");
            //...

            menu = this.toolbar.createMenu("menu", "MAIN-EDIT", "Edit", "icon-edit");
            this.toolbar.createMenuItem(menu, "button", this._mainEditLaunch, "Animate at Launch...", "icon-play-game");
            this.toolbar.addBreak(menu);
            this.toolbar.createMenuItem(menu, "button", this._mainEditTextures, "Edit Textures...", "icon-copy");
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
            this.toolbar.createMenuItem(menu, "button", this._addWaterMesh, "Add Water", "icon-water");
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

            for (var i = 0; i < PluginManager.MainToolbarPlugin.length; i++)
                this._plugins.push(new PluginManager.MainToolbarPlugin[i](this));

            // Build element
            this.toolbar.buildElement(this.container);
        }
    }
}
