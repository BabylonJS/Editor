var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var SceneToolbar = (function () {
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function SceneToolbar(core) {
                // Public members
                this.container = "BABYLON-EDITOR-SCENE-TOOLBAR";
                this.toolbar = null;
                this.panel = null;
                this._fpsInput = null;
                this._wireframeID = "WIREFRAME";
                this._boundingBoxID = "BOUNDINGBOX";
                this._centerOnObjectID = "CENTER-ON-OBJECT";
                this._renderHelpersID = "RENDER-HELPERS";
                // Initialize
                this._editor = core.editor;
                this._core = core;
                this.panel = this._editor.layouts.getPanelFromType("main");
                // Register this
                this._core.updates.push(this);
                this._core.eventReceivers.push(this);
            }
            // Pre update
            SceneToolbar.prototype.onPreUpdate = function () {
            };
            // Post update
            SceneToolbar.prototype.onPostUpdate = function () {
            };
            // Event
            SceneToolbar.prototype.onEvent = function (event) {
                if (event.eventType === EDITOR.EventType.GUI_EVENT && event.guiEvent.eventType === EDITOR.GUIEventType.TOOLBAR_MENU_SELECTED) {
                    if (event.guiEvent.caller !== this.toolbar || !event.guiEvent.data) {
                        return false;
                    }
                    var id = event.guiEvent.data;
                    var finalID = id.split(":");
                    var item = this.toolbar.getItemByID(finalID[finalID.length - 1]);
                    var scene = this._core.currentScene;
                    if (item === null)
                        return false;
                    if (id.indexOf(this._wireframeID) !== -1) {
                        var checked = !this.toolbar.isItemChecked(id);
                        scene.forceWireframe = checked;
                        this.toolbar.setItemChecked(id, checked);
                        return true;
                    }
                    else if (id.indexOf(this._boundingBoxID) !== -1) {
                        var checked = !this.toolbar.isItemChecked(id);
                        scene.forceShowBoundingBoxes = checked;
                        this.toolbar.setItemChecked(id, checked);
                        return true;
                    }
                    else if (id.indexOf(this._renderHelpersID) !== -1) {
                        var checked = !this.toolbar.isItemChecked(id);
                        this._core.editor.renderHelpers = checked;
                        this.toolbar.setItemChecked(id, checked);
                        return true;
                    }
                    else if (id.indexOf(this._centerOnObjectID) !== -1) {
                        var object = this._core.editor.sceneGraphTool.sidebar.getSelectedData();
                        this.setFocusOnObject(object);
                        return true;
                    }
                }
                return false;
            };
            // Creates the UI
            SceneToolbar.prototype.createUI = function () {
                var _this = this;
                if (this.toolbar != null)
                    this.toolbar.destroy();
                this.toolbar = new EDITOR.GUI.GUIToolbar(this.container, this._core);
                // Play game
                this.toolbar.createMenu("button", this._wireframeID, "Wireframe", "icon-wireframe");
                this.toolbar.addBreak();
                this.toolbar.createMenu("button", this._boundingBoxID, "Bounding Box", "icon-bounding-box");
                this.toolbar.addBreak();
                this.toolbar.createMenu("button", this._renderHelpersID, "Helpers", "icon-helpers", true);
                this.toolbar.addBreak();
                this.toolbar.createMenu("button", this._centerOnObjectID, "Focus object", "icon-focus");
                this.toolbar.addBreak();
                this.toolbar.addSpacer();
                this.toolbar.createInput("SCENE-TOOLBAR-FPS", "SCENE-TOOLBAR-FPS-INPUT", "FPS :", 5);
                // Build element
                this.toolbar.buildElement(this.container);
                // Set events
                this._fpsInput = $("#SCENE-TOOLBAR-FPS-INPUT").w2field("int", { autoFormat: true });
                this._fpsInput.change(function (event) {
                    EDITOR.GUIAnimationEditor.FramesPerSecond = parseFloat(_this._fpsInput.val());
                    _this._configureFramesPerSecond();
                });
                this._fpsInput.val(String(EDITOR.GUIAnimationEditor.FramesPerSecond));
            };
            // Sets the focus of the camera
            SceneToolbar.prototype.setFocusOnObject = function (object) {
                if (!object || !object.position)
                    return;
                var scene = this._core.currentScene;
                var camera = this._core.camera;
                var position = object.position;
                if (object.getAbsolutePosition)
                    position = object.getAbsolutePosition();
                if (object.getBoundingInfo)
                    position = object.getBoundingInfo().boundingSphere.centerWorld;
                var keys = [
                    {
                        frame: 0,
                        value: camera.target
                    }, {
                        frame: 1,
                        value: position
                    }
                ];
                var animation = new BABYLON.Animation("FocusOnObjectAnimation", "target", 10, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
                animation.setKeys(keys);
                scene.stopAnimation(camera);
                scene.beginDirectAnimation(camera, [animation], 0, 1, false, 1);
            };
            // Sets frames per second in FPS input
            SceneToolbar.prototype.setFramesPerSecond = function (fps) {
                this._fpsInput.val(String(fps));
                this._configureFramesPerSecond();
            };
            // Set new frames per second
            SceneToolbar.prototype._configureFramesPerSecond = function () {
                var setFPS = function (objs) {
                    for (var objIndex = 0; objIndex < objs.length; objIndex++) {
                        for (var animIndex = 0; animIndex < objs[objIndex].animations.length; animIndex++) {
                            objs[objIndex].animations[animIndex].framePerSecond = EDITOR.GUIAnimationEditor.FramesPerSecond;
                        }
                    }
                };
                setFPS([this._core.currentScene]);
                setFPS(this._core.currentScene.meshes);
                setFPS(this._core.currentScene.lights);
                setFPS(this._core.currentScene.cameras);
                setFPS(this._core.currentScene.particleSystems);
                for (var sIndex = 0; sIndex < this._core.currentScene.skeletons.length; sIndex++)
                    setFPS(this._core.currentScene.skeletons[sIndex].bones);
            };
            return SceneToolbar;
        })();
        EDITOR.SceneToolbar = SceneToolbar;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
