module BABYLON.EDITOR {
    export class BabylonExporter implements IEventReceiver {
        // Public members

        // Private members
        private _core: EditorCore;

        private _window: GUI.GUIWindow = null;
        private _layout: GUI.GUILayout = null;

        private _editor: AceAjax.Editor = null;
        private _configForm: GUI.GUIForm = null;

        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore) {
            // Initialize
            this._core = core;
            this._core.eventReceivers.push(this);
        }

        // On Event
        public onEvent(event: Event): boolean {
            if (event.eventType !== EventType.GUI_EVENT)
                return false;

            if (event.guiEvent.eventType === GUIEventType.WINDOW_BUTTON_CLICKED && event.guiEvent.caller === this._window) {
                var button: string = event.guiEvent.data;

                if (button === "Generate") {
                    var obj = BabylonExporter.GenerateFinalBabylonFile(this._core);//BABYLON.SceneSerializer.Serialize(this._core.currentScene);
                    var camera = this._core.currentScene.getCameraByName(this._configForm.getRecord("activeCamera"));

                    obj.activeCameraID = camera ? camera.id : undefined;
                    this._editor.setValue(JSON.stringify(obj, null, "\t"), -1);
                }
                else if (button === "Close") {
                    this._window.close();
                }

                return true;
            }
            else if (event.guiEvent.eventType === GUIEventType.LAYOUT_CHANGED) {
                this._editor.resize(true);
            }

            return false;
        }

        // Create the UI
        public createUI(): void {
            // IDs
            var codeID = "BABYLON-EXPORTER-CODE-EDITOR";
            var codeDiv = GUI.GUIElement.CreateElement("div", codeID);

            var configID = "BABYLON-EXPORTER-CONFIG";
            var configDiv = GUI.GUIElement.CreateElement("div", configID);

            var layoutID = "BABYLON-EXPORTER-LAYOUT";
            var layoutDiv = GUI.GUIElement.CreateElement("div", layoutID);

            // Window
            this._window = new GUI.GUIWindow("BABYLON-EXPORTER-WINDOW", this._core, "Export to .babylon", layoutDiv);
            this._window.modal = true;
            this._window.showMax = true;
            this._window.buttons = [
                "Generate",
                "Close"
            ];

            this._window.setOnCloseCallback(() => {
                this._core.removeEventReceiver(this);
                this._layout.destroy();
                this._configForm.destroy();
            });

            this._window.buildElement(null);

            this._window.onToggle = (maximized: boolean, width: number, height: number) => {
                if (!maximized) {
                    width = this._window.size.x;
                    height = this._window.size.y;
                }
                this._layout.setPanelSize("left", width / 2);
                this._layout.setPanelSize("main", width / 2);
            };

            // Layout
            this._layout = new GUI.GUILayout(layoutID, this._core);
            this._layout.createPanel("CODE-PANEL", "left", 380, false).setContent(codeDiv);
            this._layout.createPanel("CONFIG-PANEL", "main", 380, false).setContent(configDiv);
            this._layout.buildElement(layoutID);

            // Code editor
            this._editor = ace.edit(codeID);
            this._editor.setValue("Click on \"Generate\" to generate the .babylon file\naccording to the following configuration", -1);

            this._editor.setTheme("ace/theme/clouds");
            this._editor.getSession().setMode("ace/mode/javascript");

            // Form
            var cameras: string[] = [];
            for (var i = 0; i < this._core.currentScene.cameras.length; i++) {
                var camera = this._core.currentScene.cameras[i];

                if (camera !== this._core.camera) {
                    cameras.push(camera.name);
                }
            }

            this._configForm = new GUI.GUIForm(configID, "Configuration", this._core);
            this._configForm.createField("activeCamera", "list", "Active Camera :", 5, "", { items: cameras });
            this._configForm.buildElement(configID);

            if (this._core.playCamera)
                this._configForm.setRecord("activeCamera", this._core.playCamera.name);
        }

        // Generates the final .babylon file
        public static GenerateFinalBabylonFile(core: EditorCore): any {
            var obj = BABYLON.SceneSerializer.Serialize(core.currentScene);

            if (core.playCamera)
                obj.activeCameraID = core.playCamera.id;

            // Set auto play
            var maxFrame = GUIAnimationEditor.GetSceneFrameCount(core.currentScene);

            var setAutoPlay = (objects: any[]) => {
                for (var i = 0; i < objects.length; i++) {
                    var name = objects[i].name;
                    for (var j = 0; j < SceneFactory.NodesToStart.length; j++) {
                        if ((<any>SceneFactory.NodesToStart[j]).name === name) {
                            objects[i].autoAnimate = true;
                            objects[i].autoAnimateFrom = 0;
                            objects[i].autoAnimateTo = maxFrame;
                            objects[i].autoAnimateLoop = false;
                            objects[i].autoAnimateSpeed = SceneFactory.AnimationSpeed;
                        }
                    }
                }
            };

            if (SceneFactory.NodesToStart.some((value: IAnimatable, index: number, array: IAnimatable[]) => { return value instanceof Scene })) {
                obj.autoAnimate = true;
                obj.autoAnimateFrom = 0;
                obj.autoAnimateTo = maxFrame;
                obj.autoAnimateLoop = false;
                obj.autoAnimateSpeed = SceneFactory.AnimationSpeed;
            }

            setAutoPlay(obj.cameras);
            setAutoPlay(obj.lights);
            setAutoPlay(obj.meshes);
            setAutoPlay(obj.particleSystems);

            return obj;
        }
    }
}