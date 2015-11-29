module BABYLON.EDITOR {
    export class EditorMain implements IDisposable, IEventReceiver {
        // public members
        public core: EditorCore;

        public editionTool: EditionTool;
        public sceneGraphTool: SceneGraphTool;
        public mainToolbar: MainToolbar;

        public container: string;
        public antialias: boolean;
        public options: any;

        public layouts: GUI.IGUILayout = null;

        public filesInput: FilesInput = null;

        // private members

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

            // Files input
            this.filesInput = new FilesInput(this.core.engine, this.core.currentScene, this.core.canvas, this._handleSceneLoaded(), null, null, null, null);
            this.filesInput.monitorElementForDragNDrop(this.core.canvas);
            this.filesInput.appendScene = true;
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
            this.layouts.createPanel("BABYLON-EDITOR-TOP-TOOLBAR-PANEL", "top", 70, false).setContent("<div id=\"BABYLON-EDITOR-MAIN-TOOLBAR\" style=\"height: 50 %\"></div>");
            this.layouts.createPanel("BABYLON-EDITOR-GRAPH-PANEL", "right", 350, true).setContent("<div id=\"BABYLON-EDITOR-SCENE-GRAPH-TOOL\" style=\"height: 100%;\"></div>");
            this.layouts.createPanel("BABYLON-EDITOR-MAIN-PANEL", "main", undefined, undefined).setContent('<canvas id="BABYLON-EDITOR-MAIN-CANVAS"></canvas>');
            this.layouts.createPanel("BABYLON-EDITOR-PREVIEW-PANEL", "preview", 70, true).setContent("");

            this.layouts.buildElement(this.container);
        }

        /**
        * Handles just opened scenes
        */
        private _handleSceneLoaded(): (file, scene: Scene) => void {
            return (file, scene: Scene) => {

                // Set active camera
                this.core.currentScene.activeCamera = this.core.camera;

                // Create parent node
                var parent = new Mesh(file.name, scene, null, null, true);

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

            var camera = new FreeCamera("MainCamera", new Vector3(10, 10, 10), this.core.currentScene);
            camera.setTarget(new Vector3(0, 0, 0));
            camera.attachControl(this.core.canvas);
            this.core.camera = camera;
        }

        /**
        * Simply update the scenes and updates
        */
        public update(): void {
            // Pre update
            this.core.onPreUpdate();

            // Scenes
            for (var i = 0; i < this.core.scenes.length; i++) {
                if (this.core.scenes[i].render) {
                    this.core.scenes[i].scene.render();
                }
            }

            // Post update
            this.core.onPostUpdate();
        }

        public dispose(): void {

        }
    }
}