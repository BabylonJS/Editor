var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var EditionTool = (function () {
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function EditionTool(core) {
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
            EditionTool.prototype.onPreUpdate = function () {
            };
            // Post update
            EditionTool.prototype.onPostUpdate = function () {
            };
            // Event
            EditionTool.prototype.onEvent = function (event) {
                if (event.eventType === EDITOR.EventType.SCENE_EVENT) {
                    if (event.sceneEvent.eventType === EDITOR.SceneEvent.OBJECT_PICKED) {
                        this.object = event.sceneEvent.object;
                        if (this.object !== null) {
                            this.isObjectSupported(this.object);
                        }
                    }
                }
                return false;
            };
            // Object supported
            EditionTool.prototype.isObjectSupported = function (object) {
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
            EditionTool.prototype.createUI = function () {
                // Add default tools
                this.addTool(new EDITOR.GeneralTool(this));
            };
            // Adds a tool
            EditionTool.prototype.addTool = function (tool) {
                var currentForm = this.container;
                $("#" + currentForm).append("<div id=\"" + tool.containers[0] + "\"></div>");
                for (var i = 1; i < tool.containers.length; i++) {
                    $('#' + currentForm).after('<div id="' + tool.containers[i] + '"></div>');
                    currentForm = tool.containers[i];
                }
                tool.createUI();
                this.editionTools.push(tool);
            };
            return EditionTool;
        })();
        EDITOR.EditionTool = EditionTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
