var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ToolsToolbar = (function () {
            function ToolsToolbar(core) {
                this.container = "BABYLON-EDITOR-TOOLS-TOOLBAR";
                this.toolbar = null;
                this.panel = null;
                this._playGameID = "PLAY-GAME";
                this._transformerPositionID = "TRANSFORMER-POSITION";
                this._editor = core.editor;
                this._core = core;
                this.panel = this._editor.layouts.getPanelFromType("top");
                this._core.updates.push(this);
                this._core.eventReceivers.push(this);
            }
            ToolsToolbar.prototype.onPreUpdate = function () {
            };
            ToolsToolbar.prototype.onPostUpdate = function () {
            };
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
                        if (checked) {
                            this._editor.transformer.setNode(null);
                            this._editor.transformer.enabled = false;
                            this.toolbar.setItemChecked(this._transformerPositionID, false);
                            this._core.engine.resize();
                            var time = (this._editor.timeline.currentTime * 1) / EDITOR.GUIAnimationEditor.FramesPerSecond / EDITOR.SceneFactory.AnimationSpeed;
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
                            this._core.engine.resize();
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
            ToolsToolbar.prototype.createUI = function () {
                if (this.toolbar != null)
                    this.toolbar.destroy();
                this.toolbar = new EDITOR.GUI.GUIToolbar(this.container, this._core);
                this.toolbar.createMenu("button", this._playGameID, "Play...", "icon-play-game", undefined, "Play Game...");
                this.toolbar.addBreak();
                this.toolbar.createMenu("button", this._transformerPositionID, "", "icon-position", undefined, "Draw / Hide Manipulators");
                this.toolbar.buildElement(this.container);
            };
            return ToolsToolbar;
        }());
        EDITOR.ToolsToolbar = ToolsToolbar;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
