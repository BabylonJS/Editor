module BABYLON.EDITOR {
    export interface IMainPanelTab {
        tab: GUI.IGUITab;
        container: string;
        application?: ITabApplication;
    }

    export class EditorMain implements IDisposable, IEventReceiver {
        // public members
        public core: EditorCore;

        public editionTool: EditionTool;
        public sceneGraphTool: SceneGraphTool;
        public mainToolbar: MainToolbar;
        public toolsToolbar: ToolsToolbar;
        public sceneToolbar: SceneToolbar;
        public SceneHelpers: SceneHelpers;
        public transformer: ManipulationHelper;
        public editPanel: EditPanel;
        public timeline: Timeline;
        public statusBar: StatusBar;

        public container: string;
        public mainContainer: string;
        public antialias: boolean;
        public options: EngineOptions;

        public layouts: GUI.GUILayout = null;
        public playLayouts: GUI.GUILayout = null;

        public filesInput: FilesInput = null;
        public exporter: Exporter;

        public renderMainScene: boolean = true;
        public renderHelpers: boolean = true;

        // Private members
        private _saveCameraState: boolean = false;

        private _mainPanel: GUI.GUIPanel;
        private _mainPanelSceneTab: IMainPanelTab = null;
        private _mainPanelTabs: IStringDictionary<IMainPanelTab> = { };
        private _currentTab: IMainPanelTab = null;
        private _lastTabUsed: IMainPanelTab = null;

        // Statics
        private static _PlayLayoutContainerID: string = "BABYLON-EDITOR-MAIN-MAIN-PANEL-CONTAINER";
        public static get PlayLayoutContainerID(): string {
            return this._PlayLayoutContainerID;
        }

        /**
        * Constructor
        */
        constructor(containerID: string, antialias: boolean = false, options: EngineOptions = null) {
            // Initialize
            this.core = new EditorCore();
            this.core.editor = this;

            this.container = containerID;
            this.mainContainer = containerID + "MAIN";
            this.antialias = antialias;
            this.options = options;

            // Create Main UI
            this._createUI();
            this._createBabylonEngine();

            // Register this
            this.core.eventReceivers.push(this);

            // Edition tool
            this.editionTool = new EditionTool(this.core);
            this.editionTool.createUI();

            // Scene graph tool
            this.sceneGraphTool = new SceneGraphTool(this.core);
            this.sceneGraphTool.createUI();

            // Toolbars
            this.mainToolbar = new MainToolbar(this.core);
            this.mainToolbar.createUI();

            this.toolsToolbar = new ToolsToolbar(this.core);
            this.toolsToolbar.createUI();

            this.sceneToolbar = new SceneToolbar(this.core);
            this.sceneToolbar.createUI();

            // Transformer
            this.transformer = new ManipulationHelper(this.core);
            
            // Scene helpers
            this.SceneHelpers = new SceneHelpers(this.core);

            // Edit panel
            this.editPanel = new EditPanel(this.core);

            // Timeline
            this.timeline = new Timeline(this.core);
            this.timeline.createUI();

            // Status bar
            this.statusBar = new StatusBar(this.core);

            // Files input
            this.filesInput = new EDITOR.FilesInput(this.core, this._handleSceneLoaded(), null, null, null, null);
            this.filesInput.monitorElementForDragNDrop(this.core.canvas);
            // Override renderFunction to get full control on the render function
            (<any>this.filesInput).renderFunction = () => { };

            // Events
            this._createMainEvents();
        }

        /**
        * Event receiver
        */
        public onEvent(event: Event): boolean {
            if (event.eventType === EventType.GUI_EVENT) {
                if (event.guiEvent.eventType === GUIEventType.LAYOUT_CHANGED && event.guiEvent.caller === this.layouts) {
                    this.playLayouts.resize();
                    this.core.engine.resize();
                    return true;
                }

                else if (event.guiEvent.eventType === GUIEventType.TAB_CHANGED && event.guiEvent.caller === this._mainPanel) {
                    var tabID = event.guiEvent.data;
                    var newMainPanelTab = this._mainPanelTabs[tabID];
                    
                    GUI.GUIElement.CreateTransition(this._currentTab.container, newMainPanelTab.container, "flit-right", () => {
                        this.layouts.resize();
                        this.playLayouts.resize();

                        if (newMainPanelTab.application && newMainPanelTab.application.onFocus)
                            newMainPanelTab.application.onFocus();
                    });

                    if (newMainPanelTab.application)
                            newMainPanelTab.application.hasFocus = true;

                    if (this._currentTab.application)
                        this._currentTab.application.hasFocus = false;

                    this._lastTabUsed = this._currentTab;
                    this._currentTab = newMainPanelTab;
                    this.renderMainScene = this._currentTab.tab === this._mainPanelSceneTab.tab;

                    return false;
                }
                else if (event.guiEvent.eventType === GUIEventType.TAB_CLOSED && event.guiEvent.caller === this._mainPanel) {
                    var tabID = event.guiEvent.data;
                    var mainPanelTab = this._mainPanelTabs[tabID];

                    this._currentTab = this._lastTabUsed === mainPanelTab ? this._mainPanelSceneTab : this._lastTabUsed;

                    GUI.GUIElement.CreateTransition(mainPanelTab.container, this._currentTab.container, "pop-in", () => {
                        if (mainPanelTab.application) {
                            mainPanelTab.application.dispose();
                        }

                        $("#" + mainPanelTab.container).remove();

                        this._mainPanel.removeTab(mainPanelTab.tab.id);
                        this.layouts.resize();
                        this.playLayouts.resize();
                    });

                    delete this._mainPanelTabs[tabID];
                    
                    this.renderMainScene = this._currentTab.tab === this._mainPanelSceneTab.tab;

                    return false;
                }
            }

            return false;
        }

        /**
        * Creates a new project
        */
        public createNewProject(): void {
            BABYLON.FilesInput.FilesToLoad = { };

            this.core.currentScene.dispose();
            this._handleSceneLoaded()(null, new Scene(this.core.engine));
        }

        /**
        * Creates the render loop
        */
        public createRenderLoop(): void {
            this.core.engine.runRenderLoop(() => {
                this.update();
            });
        }

        /**
        * Simply update the scenes and updates
        */
        public update(): void {
            // Show we are loading some things
            if (this.core.currentScene.getWaitingItemsCount() > 0) {
                if (!this.statusBar.hasElement("WAITING-ITEMS-COUNT-STATUS")) {
                    this.statusBar.addElement("WAITING-ITEMS-COUNT-STATUS", "0", null);
                    this.statusBar.showSpinner("WAITING-ITEMS-COUNT-STATUS");
                }

                this.statusBar.setText("WAITING-ITEMS-COUNT-STATUS", "Loading " + this.core.currentScene.getWaitingItemsCount() + " items...");
            }
            else
                this.statusBar.removeElement("WAITING-ITEMS-COUNT-STATUS");

            // Pre update
            this.core.onPreUpdate();

            // Scenes
            if (this.renderMainScene) {
                for (var i = 0; i < this.core.scenes.length; i++) {
                    if (this.core.scenes[i].render) {
                        this.core.scenes[i].scene.render();
                    }
                }
            }

            // Render transformer
            this.transformer.getScene().render();
            this.SceneHelpers.getScene().render();

            // Post update
            this.core.onPostUpdate();
        }

        /**
        * Disposes the editor
        */
        public dispose(): void {

        }

        /**
        * Reloads the scene
        */
        public reloadScene(saveCameraState: boolean, data?: any): void {
            this._saveCameraState = saveCameraState;

            if (data)
                this.filesInput.loadFiles(data);
            else
                this.filesInput.reload();
        }

        /**
        * Creates a new tab
        */
        public createTab(caption: string, container: string, application: ITabApplication, closable: boolean = true): GUI.IGUITab {
            var tab: GUI.IGUITab = {
                caption: caption,
                id: SceneFactory.GenerateUUID(),
                closable: closable
            };

            this._mainPanel.createTab(tab);

            this._mainPanelTabs[tab.id] = {
                tab: tab,
                container: container,
                application: application
            };

            if (!this._currentTab)
                this._currentTab = this._mainPanelTabs[tab.id];

            this._mainPanel.setActiveTab(tab.id);

            return tab;
        }

        /**
        * Removes the given tab
        */
        public removeTab(tab: GUI.IGUITab): boolean {
            return this._mainPanel.removeTab(tab.id);
        }

        /**
        * Adds a new container and returns its id
        */
        public createContainer(): string {
            var id = SceneFactory.GenerateUUID();

            $("#" + EditorMain._PlayLayoutContainerID).append(GUI.GUIElement.CreateDivElement(id, "width: 100%; height: 100%;"));

            return id;
        }

        /**
        * Removes the given continer
        */
        public removeContainer(id: string): void {
            var container = $("#" + id);
            container.remove();
        }

        /**
        * Creates the UI
        */
        private _createUI() {
            // Layouts
            this.layouts = new GUI.GUILayout(this.container, this.core);

            this.layouts.createPanel("BABYLON-EDITOR-EDITION-TOOL-PANEL", "left", 380, true).setContent("<div id=\"BABYLON-EDITOR-EDITION-TOOL\"></div>");
            this.layouts.createPanel("BABYLON-EDITOR-TOP-TOOLBAR-PANEL", "top", 70, false).setContent(
                "<div id=\"BABYLON-EDITOR-MAIN-TOOLBAR\" style=\"height: 50%\"></div>" +
                "<div id=\"BABYLON-EDITOR-TOOLS-TOOLBAR\" style=\"height: 50%\"></div>"
            );
            this.layouts.createPanel("BABYLON-EDITOR-GRAPH-PANEL", "right", 350, true).setContent("<div id=\"BABYLON-EDITOR-SCENE-GRAPH-TOOL\" style=\"height: 100%;\"></div>");
            var mainPanel = this.layouts.createPanel("BABYLON-EDITOR-MAIN-PANEL", "main", undefined, undefined).setContent(
                "<div id=\"" + this.mainContainer + "\" style=\"height: 100%; width: 100%;\"></div>"
            );
            mainPanel.style = "overflow: hidden;";
            this.layouts.createPanel("BABYLON-EDITOR-PREVIEW-PANEL", "preview", 70, true).setContent(
                "<div style=\"width: 100%; height: 100%; overflow: hidden;\">" +
                "<div id=\"BABYLON-EDITOR-PREVIEW-PANEL\" style=\"height: 100%;\"></div>" +
                "</div>"
            );
            this.layouts.createPanel("BABYLON-EDITOR-BOTTOM-PANEL", "bottom", 0, false).setContent("<div id=\"BABYLON-EDITOR-BOTTOM-PANEL\" style=\"height: 100%; width: 100%\"></div>");

            this.layouts.buildElement(this.container);

            // Play Layouts
            this.playLayouts = new GUI.GUILayout(this.mainContainer, this.core);
            var mainPanel = this.playLayouts.createPanel("BABYLON-EDITOR-MAIN-MAIN-PANEL", "main", undefined, undefined).setContent(
                "<div id=\"" + EditorMain._PlayLayoutContainerID + "\" style=\"width: 100%; height: 100%;\">" +
                    "<div id=\"BABYLON-EDITOR-BOTTOM-PANEL-PREVIEW\">" +
                        //"<div id=\"BABYLON-EDITOR-MAIN-DEBUG-LAYER\"></div>" +
                        "<canvas id=\"BABYLON-EDITOR-MAIN-CANVAS\"></canvas>" +
                        "<div id=\"BABYLON-EDITOR-SCENE-TOOLBAR\"></div>" +
                    "</div>" +
                "</div>"
            );
            mainPanel.style = "overflow: hidden;";

            this.playLayouts.createPanel("BABYLON-EDITOR-MAIN-PREVIEW-PANEL", "preview", 0, false).setContent("<div id=\"BABYLON-EDITOR-PREVIEW-TIMELINE\" style=\"height: 100%; width: 100%; overflow: hidden;\"></div>");
            this.playLayouts.buildElement(this.mainContainer);

            this.playLayouts.on({ execute: "after", type: "resize" }, () => {
                if (!this.sceneToolbar)
                    return;

                var panelHeight = this.layouts.getPanelFromType("main").height;
                var toolbarHeight = this.sceneToolbar.toolbar.element.box.clientHeight;
                this.core.canvas.height = (panelHeight - toolbarHeight * 2.0 - 10 - this.playLayouts.getPanelFromType("preview").height) * devicePixelRatio;
            });

            this._mainPanel = this.playLayouts.getPanelFromType("main");
            this._mainPanelSceneTab = this._mainPanelTabs[this.createTab("Preview", "BABYLON-EDITOR-BOTTOM-PANEL-PREVIEW", null, false).id];
        }

        /**
        * Handles just opened scenes
        */
        private _handleSceneLoaded(): (file: File, scene: Scene) => void {
            return (file: File, scene: Scene) => {
                // Close already opened tabs
                for (var thing in this._mainPanelTabs) {
                    if (this._mainPanelTabs[thing].tab.id !== this._mainPanelSceneTab.tab.id)
                        Event.sendGUIEvent(this._mainPanel, GUIEventType.TAB_CLOSED, this.core, this._mainPanelTabs[thing].tab.id);
                }

                // Set active scene
                this.core.removeScene(this.core.currentScene);
                this.core.scenes.push({ scene: scene, render: true });
                this.core.currentScene = scene;

                // Attach control to cameras
                for (var i = 0; i < scene.cameras.length; i++) {
                    scene.cameras[i].attachControl(this.core.canvas, true);
                }

                // Set active camera
                var camera: any = scene.activeCamera;
                this._createBabylonCamera();

                if (camera) {
                    if (camera.speed) {
                        (<any>this.core.camera).speed = camera.speed;
                    }
                }
                
                this.core.currentScene.activeCamera = this.core.camera;
                this.core.playCamera = camera;

                // Set 2D scene
                this.core.removeScene(this.core.scene2d);
                this.core.scenes.push({ scene: this.core.scene2d, render: true });

                // Create render loop
                this.core.engine.stopRenderLoop();
                this.createRenderLoop();

                // Create parent node
                var parent = null;
                
                // Configure meshes
                for (var i = 0; i < scene.meshes.length; i++) {
                    SceneManager.ConfigureObject(scene.meshes[i], this.core, parent, false);
                }

                // Configure scene
                SceneManager._SceneConfiguration = {
                    scene: scene,
                    actionManager: scene.actionManager
                };
                scene.actionManager = null;

                // Set scale factor
                this.core.scaleFactor = new Mesh("ScaleFactor", this.core.currentScene);
                this.core.scaleFactor.id = SceneFactory.GenerateUUID();
                this.core.currentScene.meshes.pop();

                // Physics
                if (scene.getPhysicsEngine())
                    scene.getPhysicsEngine().setTimeStep(0);

                // Reset UI
                this.sceneGraphTool.createUI();
                this.sceneGraphTool.fillGraph();
                
                SceneFactory.NodesToStart = [];
                this.timeline.reset();
                
                Event.sendSceneEvent(this.core.currentScene, SceneEventType.NEW_SCENE_CREATED, this.core);

                // Adjust speed + sensibility
                var min = Vector3.Zero();
                var max = Vector3.Zero();

                for (var i = 0; i < this.core.currentScene.meshes.length; i++) {
                    var m = this.core.currentScene.meshes[i];
                    var b = m.getBoundingInfo();

                    if (b.minimum.x < min.x)
                        min.x = b.minimum.x;
                    if (b.minimum.y < min.y)
                        min.y = b.minimum.y;
                    if (b.minimum.z < min.z)
                        min.z = b.minimum.z;

                    if (b.maximum.x > max.x)
                        max.x = b.maximum.x;
                    if (b.maximum.y > max.y)
                        max.y = b.maximum.y;
                    if (b.maximum.z > max.z)
                        max.z = b.maximum.z;
                }

                var diff = Vector3.Distance(min, max);

                if (diff >= 1000) {
                    this.core.camera.panningSensibility = (1700 * 50) / diff;
                    this.core.camera.wheelPrecision = (1700 * 3) / diff;
                }
                else {
                    diff = 10000;
                    this.core.camera.panningSensibility = (diff * 50) / 1700;
                    this.core.camera.wheelPrecision = (diff * 3) / 1700;
                }

                // Apply settings
                Settings.Apply(this.core);
            };
        }

        /**
        * Creates the babylon engine
        */
        private _createBabylonEngine(): void {
            this.core.canvas = <HTMLCanvasElement>document.getElementById("BABYLON-EDITOR-MAIN-CANVAS");

            this.core.engine = new Engine(this.core.canvas, this.antialias, this.options);
            this.core.engine.setHardwareScalingLevel(1.0 / devicePixelRatio);

            // Main scene
            this.core.currentScene = new Scene(this.core.engine);
            (<any>this.core.currentScene).animations = [];
            this.core.scenes.push({ render: true, scene: this.core.currentScene });

            this._createBabylonCamera();

            // Create 2D scene
            this.core.scene2d = new Scene(this.core.engine);
            this.core.scene2d.activeCamera = new Camera("Camera2D", Vector3.Zero(), this.core.scene2d);
            this.core.scene2d.activeCamera.fov = 0;
            this.core.scene2d.autoClear = false;
            this.core.scene2d.clearColor = new Color4(0, 0, 0, 0);

            this.core.scenes.push({ render: true, scene: this.core.scene2d });

            // Events
            window.addEventListener("resize", (ev: UIEvent) => {
                if (this.core.isPlaying) {
                    this.core.isPlaying = false;
                }

                this.core.engine.resize();
            });
        }

        /**
        * Creates the editor camera
        */
        private _createBabylonCamera(): void {
            var cameraPosition = new Vector3(0, 0, 10);
            var cameraTarget = Vector3.Zero();
            var cameraRadius = 10;
            
            if (this.core.camera) {
                cameraPosition = this.core.camera.position;
                cameraTarget = this.core.camera.target;
                cameraRadius = this.core.camera.radius;
            }

            var camera = new ArcRotateCamera("EditorCamera", 0, 0, 10, Vector3.Zero(), this.core.currentScene);
            camera.panningSensibility = 50;
            camera.attachControl(this.core.canvas, false, false);
            camera.setPosition(new Vector3(100, 100, 100));

            this.core.camera = camera;

            if (this._saveCameraState) {
                camera.setPosition(cameraPosition);
                camera.setTarget(cameraTarget);
                camera.radius = cameraRadius;
            }
        }

        /**
        * Creates the main events (on "document")
        */
        private _createMainEvents(): void {
            document.addEventListener("mousedown", (event: MouseEvent) => {
                Event.sendGUIEvent(null, GUIEventType.DOCUMENT_CLICK, this.core, event);
            });

            document.addEventListener("mouseup", (event: MouseEvent) => {
                Event.sendGUIEvent(null, GUIEventType.DOCUMENT_UNCLICK, this.core, event);
            });

            document.addEventListener("keydown", (event: KeyboardEvent) => {
                Event.sendKeyEvent(event.key, event.ctrlKey, event.shiftKey, true, this.core, event);
            });

            document.addEventListener("keyup", (event: KeyboardEvent) => {
                Event.sendKeyEvent(event.key, event.ctrlKey, event.shiftKey, false, this.core, event);
            });
        }
    }
}