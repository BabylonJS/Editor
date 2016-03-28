var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var BabylonExporter = (function () {
            /**
            * Constructor
            * @param core: the editor core
            */
            function BabylonExporter(core) {
                this._window = null;
                this._layout = null;
                this._editor = null;
                this._configForm = null;
                // Initialize
                this._core = core;
                this._core.eventReceivers.push(this);
            }
            // On Event
            BabylonExporter.prototype.onEvent = function (event) {
                if (event.eventType !== EDITOR.EventType.GUI_EVENT)
                    return false;
                if (event.guiEvent.eventType === EDITOR.GUIEventType.WINDOW_BUTTON_CLICKED && event.guiEvent.caller === this._window) {
                    var button = event.guiEvent.data;
                    if (button === "Generate") {
                        var obj = BabylonExporter.GenerateFinalBabylonFile(this._core); //BABYLON.SceneSerializer.Serialize(this._core.currentScene);
                        var camera = this._core.currentScene.getCameraByName(this._configForm.getRecord("activeCamera"));
                        obj.activeCameraID = camera ? camera.id : undefined;
                        this._editor.setValue(JSON.stringify(obj, null, "\t"), -1);
                    }
                    else if (button === "Close") {
                        this._window.close();
                    }
                    return true;
                }
                else if (event.guiEvent.eventType === EDITOR.GUIEventType.LAYOUT_CHANGED) {
                    this._editor.resize(true);
                }
                return false;
            };
            // Create the UI
            BabylonExporter.prototype.createUI = function () {
                var _this = this;
                // IDs
                var codeID = "BABYLON-EXPORTER-CODE-EDITOR";
                var codeDiv = EDITOR.GUI.GUIElement.CreateElement("div", codeID);
                var configID = "BABYLON-EXPORTER-CONFIG";
                var configDiv = EDITOR.GUI.GUIElement.CreateElement("div", configID);
                var layoutID = "BABYLON-EXPORTER-LAYOUT";
                var layoutDiv = EDITOR.GUI.GUIElement.CreateElement("div", layoutID);
                // Window
                this._window = new EDITOR.GUI.GUIWindow("BABYLON-EXPORTER-WINDOW", this._core, "Export to .babylon", layoutDiv);
                this._window.modal = true;
                this._window.showMax = true;
                this._window.buttons = [
                    "Generate",
                    "Close"
                ];
                this._window.setOnCloseCallback(function () {
                    _this._core.removeEventReceiver(_this);
                    _this._layout.destroy();
                    _this._configForm.destroy();
                });
                this._window.buildElement(null);
                this._window.onToggle = function (maximized, width, height) {
                    if (!maximized) {
                        width = _this._window.size.x;
                        height = _this._window.size.y;
                    }
                    _this._layout.setPanelSize("left", width / 2);
                    _this._layout.setPanelSize("main", width / 2);
                };
                // Layout
                this._layout = new EDITOR.GUI.GUILayout(layoutID, this._core);
                this._layout.createPanel("CODE-PANEL", "left", 380, false).setContent(codeDiv);
                this._layout.createPanel("CONFIG-PANEL", "main", 380, false).setContent(configDiv);
                this._layout.buildElement(layoutID);
                // Code editor
                this._editor = ace.edit(codeID);
                this._editor.setValue("Click on \"Generate\" to generate the .babylon file\naccording to the following configuration", -1);
                this._editor.setTheme("ace/theme/clouds");
                this._editor.getSession().setMode("ace/mode/javascript");
                // Form
                var cameras = [];
                for (var i = 0; i < this._core.currentScene.cameras.length; i++) {
                    var camera = this._core.currentScene.cameras[i];
                    if (camera !== this._core.camera) {
                        cameras.push(camera.name);
                    }
                }
                this._configForm = new EDITOR.GUI.GUIForm(configID, "Configuration", this._core);
                this._configForm.createField("activeCamera", "list", "Active Camera :", 5, "", { items: cameras });
                this._configForm.buildElement(configID);
                if (this._core.playCamera)
                    this._configForm.setRecord("activeCamera", this._core.playCamera.name);
            };
            // Generates the final .babylon file
            BabylonExporter.GenerateFinalBabylonFile = function (core) {
                var obj = BABYLON.SceneSerializer.Serialize(core.currentScene);
                if (core.playCamera)
                    obj.activeCameraID = core.playCamera.id;
                // Set auto play
                var maxFrame = EDITOR.GUIAnimationEditor.GetSceneFrameCount(core.currentScene);
                var setAutoPlay = function (objects) {
                    for (var i = 0; i < objects.length; i++) {
                        var name = objects[i].name;
                        for (var j = 0; j < EDITOR.SceneFactory.NodesToStart.length; j++) {
                            if (EDITOR.SceneFactory.NodesToStart[j].name === name) {
                                objects[i].autoAnimate = true;
                                objects[i].autoAnimateFrom = 0;
                                objects[i].autoAnimateTo = maxFrame;
                                objects[i].autoAnimateLoop = false;
                                objects[i].autoAnimateSpeed = EDITOR.SceneFactory.AnimationSpeed;
                            }
                        }
                    }
                };
                if (EDITOR.SceneFactory.NodesToStart.some(function (value, index, array) { return value instanceof BABYLON.Scene; })) {
                    obj.autoAnimate = true;
                    obj.autoAnimateFrom = 0;
                    obj.autoAnimateTo = maxFrame;
                    obj.autoAnimateLoop = false;
                    obj.autoAnimateSpeed = EDITOR.SceneFactory.AnimationSpeed;
                }
                setAutoPlay(obj.cameras);
                setAutoPlay(obj.lights);
                setAutoPlay(obj.meshes);
                setAutoPlay(obj.particleSystems);
                return obj;
            };
            return BabylonExporter;
        })();
        EDITOR.BabylonExporter = BabylonExporter;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
