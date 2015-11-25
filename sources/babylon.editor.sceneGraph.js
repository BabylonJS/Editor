var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var SceneGraphTool = (function () {
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function SceneGraphTool(core) {
                // Public members
                this.object = null;
                this.container = "BABYLON-EDITOR-EDITION-TOOL";
                this.editionTools = new Array();
                this.panel = null;
                // Initialize
                this._editor = core.editor;
                this._core = core;
                this._core.updates.push(this);
                this.panel = this._editor.layouts.getPanelFromType("left");
            }
            // Pre update
            SceneGraphTool.prototype.onPreUpdate = function () {
            };
            // Post update
            SceneGraphTool.prototype.onPostUpdate = function () {
            };
            // Event
            SceneGraphTool.prototype.onEvent = function (event) {
                if (event.eventType === EDITOR.EventType.SCENE_EVENT) {
                    if (event.sceneEvent.eventType === EDITOR.SceneEventType.OBJECT_PICKED) {
                        this.object = event.sceneEvent.object;
                        if (this.object !== null) {
                            this.isObjectSupported(this.object);
                        }
                    }
                }
                return false;
            };
            // Object supported
            SceneGraphTool.prototype.isObjectSupported = function (object) {
                for (var i = 0; i < this.editionTools.length; i++) {
                    var tool = this.editionTools[i];
                    var supported = tool.isObjectSupported(this.object);
                    for (var j = 0; j < tool.containers.length; j++) {
                        var element = $("#" + tool.containers[j]);
                        if (supported) {
                            element.show();
                            tool.update();
                        }
                        else {
                            element.hide();
                        }
                    }
                }
                return false;
            };
            // Creates the UI
            SceneGraphTool.prototype.createUI = function () {
            };
            return SceneGraphTool;
        })();
        EDITOR.SceneGraphTool = SceneGraphTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
