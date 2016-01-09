var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ToolsToolbar = (function () {
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function ToolsToolbar(core) {
                // Public members
                this.container = "BABYLON-EDITOR-TOOLS-TOOLBAR";
                this.toolbar = null;
                this.panel = null;
                this._playGameID = "PLAY-GAME";
                this._transformerPositionID = "TRANSFORMER-POSITION";
                this._transformerRotationID = "TRANSFORMER-ROTATION";
                this._transformerScalingID = "TRANSFORMER-SCALING";
                // Initialize
                this._editor = core.editor;
                this._core = core;
                this.panel = this._editor.layouts.getPanelFromType("top");
                // Register this
                this._core.updates.push(this);
                this._core.eventReceivers.push(this);
            }
            // Pre update
            ToolsToolbar.prototype.onPreUpdate = function () {
            };
            // Post update
            ToolsToolbar.prototype.onPostUpdate = function () {
            };
            // Event
            ToolsToolbar.prototype.onEvent = function (event) {
                if (event.eventType === EDITOR.EventType.GUI_EVENT && event.guiEvent.eventType === EDITOR.GUIEventType.TOOLBAR_MENU_SELECTED) {
                    if (event.guiEvent.caller !== this.toolbar || !event.guiEvent.data) {
                        return false;
                    }
                    var id = event.guiEvent.data;
                    var finalID = id.split(":");
                    var item = this.toolbar.getItemByID(finalID[finalID.length - 1]);
                    if (item === null)
                        return false;
                    var transformerIndex = [this._transformerPositionID, this._transformerRotationID, this._transformerScalingID].indexOf(id);
                    if (transformerIndex !== -1) {
                        var checked = this.toolbar.isItemChecked(id);
                        this.toolbar.setItemChecked(this._transformerPositionID, false);
                        this.toolbar.setItemChecked(this._transformerRotationID, false);
                        this.toolbar.setItemChecked(this._transformerScalingID, false);
                        this.toolbar.setItemChecked(id, !checked);
                        this._editor.transformer.transformerType = checked ? EDITOR.TransformerType.NOTHING : transformerIndex;
                        return true;
                    }
                    else if (id.indexOf(this._playGameID) !== -1) {
                        var checked = !this.toolbar.isItemChecked(id);
                        //if (this._core.playCamera) {
                        //this._core.currentScene.activeCamera = checked ? this._core.playCamera : this._core.camera;
                        if (checked) {
                            this._core.engine.resize();
                            this._core.isPlaying = true;
                            // Animate at launch
                            for (var i = 0; i < EDITOR.SceneFactory.NodesToStart.length; i++) {
                                var node = EDITOR.SceneFactory.NodesToStart[i];
                                this._core.currentScene.stopAnimation(node);
                                this._core.currentScene.beginAnimation(node, 0, Number.MAX_VALUE, false, EDITOR.SceneFactory.AnimationSpeed);
                            }
                        }
                        else {
                            this._core.engine.resize();
                        }
                        this.toolbar.setItemChecked(id, checked);
                        EDITOR.SceneManager.SwitchActionManager();
                        for (var i = 0; i < this._core.currentScene.meshes.length; i++)
                            this._core.currentScene.meshes[i].showBoundingBox = false;
                        //}
                        return true;
                    }
                }
                return false;
            };
            // Creates the UI
            ToolsToolbar.prototype.createUI = function () {
                if (this.toolbar != null)
                    this.toolbar.destroy();
                this.toolbar = new EDITOR.GUI.GUIToolbar(this.container, this._core);
                // Play game
                this.toolbar.createMenu("button", this._playGameID, "Play...", "icon-play-game");
                this.toolbar.addBreak();
                this.toolbar.createMenu("button", this._transformerPositionID, "", "icon-position");
                this.toolbar.createMenu("button", this._transformerRotationID, "", "icon-rotation");
                this.toolbar.createMenu("button", this._transformerScalingID, "", "icon-scaling");
                // Build element
                this.toolbar.buildElement(this.container);
            };
            return ToolsToolbar;
        })();
        EDITOR.ToolsToolbar = ToolsToolbar;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.toolsToolbar.js.map