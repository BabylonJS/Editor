module BABYLON.EDITOR {
    export class EditorMain implements IDisposable, IEventReceiver {
        // public members
        public core: EditorCore;

        public editionTool: EditionTool;
        public sceneGraphTool: SceneGraphTool;
        public mainToolbar: MainToolbar;
        public toolsToolbar: ToolsToolbar;
        public transformer: Transformer = null;

        public container: string;
        public antialias: boolean;
        public options: any;

        public layouts: GUI.IGUILayout = null;

        public filesInput: FilesInput = null;
        public exporter: Exporter;

        public renderMainScene: boolean = true;

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

            // Transformer
            this.transformer = new Transformer(this.core);

            // Files input
            this.filesInput = new EDITOR.FilesInput(this.core, this._handleSceneLoaded(), null, null, null, null);
            this.filesInput.monitorElementForDragNDrop(this.core.canvas);

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
                "<div id=\"BABYLON-EDITOR-MAIN-TOOLBAR\" style=\"height: 50 %\"></div>" +
                "<div id=\"BABYLON-EDITOR-TOOLS-TOOLBAR\" style=\"height: 50 %\"></div>"
            );
            this.layouts.createPanel("BABYLON-EDITOR-GRAPH-PANEL", "right", 350, true).setContent("<div id=\"BABYLON-EDITOR-SCENE-GRAPH-TOOL\" style=\"height: 100%;\"></div>");
            this.layouts.createPanel("BABYLON-EDITOR-MAIN-PANEL", "main", undefined, undefined).setContent('<canvas id="BABYLON-EDITOR-MAIN-CANVAS"></canvas>');
            this.layouts.createPanel("BABYLON-EDITOR-PREVIEW-PANEL", "preview", 70, true).setContent("");

            this.layouts.buildElement(this.container);
        }

        /**
        * Handles just opened scenes
        */
        private _handleSceneLoaded(): (file, scene: Scene) => void {
            return (file: File, scene: Scene) => {
                // Set active scene
                this.core.removeScene(this.core.currentScene);
                this.core.scenes.push({ scene: scene, render: true });
                this.core.currentScene = scene;

                // Set active camera
                this._createBabylonCamera();
                this.core.currentScene.activeCamera = this.core.camera;

                // Create render loop
                this.core.engine.stopRenderLoop();
                this.createRenderLoop();

                // Create parent node
                var parent = null;//new Mesh(file.name, scene, null, null, true);
                //parent.id = EditorMain.DummyNodeID + SceneFactory.GenerateUUID();

                // Configure meshes
                for (var i = 0; i < scene.meshes.length; i++) {
                    SceneManager.configureObject(scene.meshes[i], this.core, parent);
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
                this.core.engine.resize();
            });
        }

        /**
        * Creates the editor camera
        */
        private _createBabylonCamera(): void {
            var camera = new FreeCamera("EditorCamera", new Vector3(10, 10, 10), this.core.currentScene);
            camera.setTarget(new Vector3(0, 0, 0));
            camera.attachControl(this.core.canvas);
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