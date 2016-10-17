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
                    var selected = this.toolbar.decomposeSelectedMenu(id);
                    if (!selected || !selected.parent)
                        return false;
                    id = selected.parent;
                    if (id === this._transformerPositionID) {
                        var checked = this.toolbar.isItemChecked(id);
                        this.toolbar.setItemChecked(id, !checked);
                        this._editor.transformer.enabled = !checked;
                        return true;
                    }
                    else if (id === this._playGameID) {
                        var checked = !this.toolbar.isItemChecked(id);
                        this._core.isPlaying = checked;
                        //if (this._core.playCamera) {
                        //this._core.currentScene.activeCamera = checked ? this._core.playCamera : this._core.camera;
                        if (checked) {
                            // Save states
                            //SceneManager.SaveObjectStates(this._core.currentScene);
                            // Transformers
                            this._editor.transformer.setNode(null);
                            this._editor.transformer.enabled = false;
                            this.toolbar.setItemChecked(this._transformerPositionID, false);
                            this._core.engine.resize();
                            var time = (this._editor.timeline.currentTime * 1) / EDITOR.GUIAnimationEditor.FramesPerSecond / EDITOR.SceneFactory.AnimationSpeed;
                            // Animate at launch
                            for (var i = 0; i < EDITOR.SceneFactory.NodesToStart.length; i++) {
                                var node = EDITOR.SceneFactory.NodesToStart[i];
                                if (node instanceof BABYLON.Sound) {
                                    node.stop();
                                    node.play(0, time);
                                    continue;
                                }
                                this._core.currentScene.stopAnimation(node);
                                this._core.currentScene.beginAnimation(node, this._editor.timeline.currentTime, Number.MAX_VALUE, false, EDITOR.SceneFactory.AnimationSpeed);
                            }
                            if (EDITOR.SceneFactory.NodesToStart.length > 0)
                                this._editor.timeline.play();
                        }
                        else {
                            // Restore states
                            //SceneManager.RestoreObjectsStates(this._core.currentScene);
                            this._core.engine.resize();
                            // Animate at launch
                            for (var i = 0; i < EDITOR.SceneFactory.NodesToStart.length; i++) {
                                var node = EDITOR.SceneFactory.NodesToStart[i];
                                this._core.currentScene.stopAnimation(node);
                                if (node instanceof BABYLON.Sound) {
                                    node.stop();
                                }
                            }
                            this._core.editor.timeline.stop();
                        }
                        this.toolbar.setItemChecked(id, checked);
                        EDITOR.SceneManager.SwitchActionManager();
                        for (var i = 0; i < this._core.currentScene.meshes.length; i++)
                            this._core.currentScene.meshes[i].showBoundingBox = false;
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
                this.toolbar.createMenu("button", this._playGameID, "Play...", "icon-play-game", undefined, "Play Game...");
                this.toolbar.addBreak();
                this.toolbar.createMenu("button", this._transformerPositionID, "", "icon-position", undefined, "Draw / Hide Manipulators");
                // Build element
                this.toolbar.buildElement(this.container);
            };
            return ToolsToolbar;
        }());
        EDITOR.ToolsToolbar = ToolsToolbar;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
