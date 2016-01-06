module BABYLON.EDITOR {
    export class EditorMain implements IDisposable, IEventReceiver {
        // public members
        public core: EditorCore;

        public editionTool: EditionTool;
        public sceneGraphTool: SceneGraphTool;
        public mainToolbar: MainToolbar;
        public toolsToolbar: ToolsToolbar;
        public sceneToolbar: SceneToolbar;
        public transformer: Transformer;
        public editPanel: EditPanel;

        public container: string;
        public antialias: boolean;
        public options: any;

        public layouts: GUI.GUILayout = null;

        public filesInput: FilesInput = null;
        public exporter: Exporter;

        public renderMainScene: boolean = true;
        public renderHelpers: boolean = true;

        // private members

        // Statics
        public static get DummyNodeID(): string {
            return "BABYLON-EDITOR-DUMMY-NODE";
        }

        /**
        * Constructor
        */
        constructor(containerID: string, antialias: boolean = false, options: any = null) {
            // Initialize
            this.core = new EditorCore();
            this.core.editor = this;

            this.container = containerID;
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
            this.transformer = new Transformer(this.core);

            // Edit panel
            this.editPanel = new EditPanel(this.core);

            // Files input
            this.filesInput = new EDITOR.FilesInput(this.core, this._handleSceneLoaded(), null, null, null, null);
            this.filesInput.monitorElementForDragNDrop(this.core.canvas);
            // Override renderFunction to get full control on the render function
            (<any>this.filesInput).renderFunction = () => { };

            // Exporter
            this.exporter = new Exporter(this.core);
        }

        /**
        * Event receiver
        */
        public onEvent(event: Event): boolean {
            if (event.eventType === EventType.GUI_EVENT) {
                if (event.guiEvent.eventType === GUIEventType.LAYOUT_CHANGED) {
                    this.core.engine.resize();
                    return true;
                }
            }

            return false;
        }

        /**
        * Creates the UI
        */
        private _createUI() {
            this.layouts = new GUI.GUILayout(this.container, this.core);

            this.layouts.createPanel("BABYLON-EDITOR-EDITION-TOOL-PANEL", "left", 380, true).setContent("<div id=\"BABYLON-EDITOR-EDITION-TOOL\"></div>");
            this.layouts.createPanel("BABYLON-EDITOR-TOP-TOOLBAR-PANEL", "top", 70, false).setContent(
                "<div id=\"BABYLON-EDITOR-MAIN-TOOLBAR\" style=\"height: 50%\"></div>" +
                "<div id=\"BABYLON-EDITOR-TOOLS-TOOLBAR\" style=\"height: 50%\"></div>"
            );
            this.layouts.createPanel("BABYLON-EDITOR-GRAPH-PANEL", "right", 350, true).setContent("<div id=\"BABYLON-EDITOR-SCENE-GRAPH-TOOL\" style=\"height: 100%;\"></div>");
            var mainPanel = this.layouts.createPanel("BABYLON-EDITOR-MAIN-PANEL", "main", undefined, undefined).setContent(
                "<div id=\"BABYLON-EDITOR-SCENE-TOOLBAR\"></div>" +
                "<canvas id=\"BABYLON-EDITOR-MAIN-CANVAS\"></canvas>"
            );
            mainPanel.style = "overflow: hidden;";
            this.layouts.createPanel("BABYLON-EDITOR-PREVIEW-PANEL", "preview", 70, true).setContent("<div id=\"BABYLON-EDITOR-PREVIEW-PANEL\" style=\"height: 100%;\"></div>");

            this.layouts.buildElement(this.container);
        }

        /**
        * Handles just opened scenes
        */
        private _handleSceneLoaded(): (file: File, scene: Scene) => void {
            return (file: File, scene: Scene) => {
                // Set active scene
                this.core.removeScene(this.core.currentScene);
                this.core.scenes.push({ scene: scene, render: true });
                this.core.currentScene = scene;

                // Set scene as IAnimatable
                if (!(<any>scene).animations)
                    (<any>scene).animations = [];

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

                // Create render loop
                this.core.engine.stopRenderLoop();
                this.createRenderLoop();

                // Create parent node
                var parent = null;

                // Configure meshes
                for (var i = 0; i < scene.meshes.length; i++) {
                    SceneManager.ConfigureObject(scene.meshes[i], this.core, parent);
                }

                // Reset UI
                this.sceneGraphTool.createUI();
                this.sceneGraphTool.fillGraph();
            };
        }

        /**
        * Creates the babylon engine
        */
        private _createBabylonEngine(): void {
            this.core.canvas = <HTMLCanvasElement>document.getElementById("BABYLON-EDITOR-MAIN-CANVAS");

            this.core.engine = new Engine(this.core.canvas, this.antialias, this.options);
            this.core.currentScene = new Scene(this.core.engine);
            this.core.scenes.push({ render: true, scene: this.core.currentScene });

            this._createBabylonCamera();

            window.addEventListener("resize", (ev: UIEvent) => {
                if (this.core.isPlaying) {
                    //$("#BABYLON-EDITOR-SCENE-TOOLBAR").after(this.core.canvas);
                    this.core.isPlaying = false;
                }

                this.core.engine.resize();
            });
        }

        /**
        * Creates the editor camera
        */
        private _createBabylonCamera(): void {
            //var camera = new FreeCamera("EditorCamera", new Vector3(10, 10, 10), this.core.currentScene);
            //camera.setTarget(new Vector3(0, 0, 0));
            //camera.attachControl(this.core.canvas);
            var camera = new ArcRotateCamera("EditorCamera", 0, 0, 10, Vector3.Zero(), this.core.currentScene);
            camera.attachControl(this.core.canvas, true, false);

            this.core.camera = camera;
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

            // Post update
            this.core.onPostUpdate();
        }

        public dispose(): void {

        }
    }
}