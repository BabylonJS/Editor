var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var EditorCore = (function () {
            function EditorCore() {
                this.engine = null;
                this.canvas = null;
                this.camera = null;
                this.playCamera = null;
                this.isPlaying = false;
                this.scenes = new Array();
                this.updates = new Array();
                this.eventReceivers = new Array();
                this.editor = null;
            }
            EditorCore.prototype.removeScene = function (scene) {
                for (var i = 0; i < this.scenes.length; i++) {
                    if (this.scenes[i].scene === scene) {
                        this.scenes.splice(i, 1);
                        return true;
                    }
                }
                return false;
            };
            EditorCore.prototype.removeEventReceiver = function (receiver) {
                for (var i = 0; i < this.eventReceivers.length; i++) {
                    if (this.eventReceivers[i] === receiver) {
                        this.eventReceivers.splice(i, 1);
                        return true;
                    }
                }
                return false;
            };
            EditorCore.prototype.onPreUpdate = function () {
                for (var i = 0; i < this.updates.length; i++) {
                    this.updates[i].onPreUpdate();
                }
            };
            EditorCore.prototype.onPostUpdate = function () {
                for (var i = 0; i < this.updates.length; i++) {
                    this.updates[i].onPostUpdate();
                }
            };
            EditorCore.prototype.sendEvent = function (event) {
                for (var i = 0; i < this.eventReceivers.length; i++)
                    this.eventReceivers[i].onEvent(event);
            };
            EditorCore.prototype.dispose = function () {
            };
            return EditorCore;
        }());
        EDITOR.EditorCore = EditorCore;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
