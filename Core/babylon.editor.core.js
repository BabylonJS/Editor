/// <reference path="./../index.html" />

/* 

Core class that handles core functions,
custom events management...

BabylonEditorCore is the mediator of the editor.
Then, all plugins must be able to create everything
and dialog with the editor using on the BabylonEditorCore object.
*/

var BABYLON;
(function (BABYLON) { /// namespace BABYLON
var Editor;
(function (Editor) { /// namespace Editor


var Core = (function () {
    function Core(engine) {

        /// Array that contains all the instances that need to be updated.
        /// Just declare "update" in your prototype
        /// 
        /// It also allows you to create elements with custom behaviors like the
        /// BabylonEditorTransformer object that must draw its own scene
        this.customUpdates = new Array();

        /// Array that contains all the instances that need to receive
        /// events from other classes and from other events.
        /// See example in getPickedMesh();
        /// Each class you add to this array must implement
        /// myClass.prototype.onEvent = function(event);
        this.eventReceivers = new Array();

        this.canvas = null;
        this.engine = null;
        this.currentScene = null;
        this.transformer = null;

        this.filesInput = null;
    }

    Core.prototype.update = function () {
        for (var i = 0; i < this.customUpdates.length; i++) {
            this.customUpdates[i].update();
        }
    }

    /// Sends the event "event" to all other event receivers
    Core.prototype.sendEvent = function (event) {
        for (var i = 0; i < this.eventReceivers.length; i++) {
            this.eventReceivers[i].onEvent(event);
        }
    }

    Core.prototype.removeEventReceiver = function (receiver) {
        var index = this.eventReceivers.indexOf(receiver);
        if (index !== -1)
            this.eventReceivers.splice(index, 1);
    }

    Core.prototype.removeCustomUpdate = function (updater) {
        var index = this.customUpdates.indexOf(updater);
        if (index !== -1)
            this.customUpdates.splice(index, 1);
    }

    Core.prototype.getPickedMesh = function (event, sendEvent, optionalScene) {
        var scene = (optionalScene != null) ? optionalScene : this.currentScene;
        if (!scene) return null;

        var result = scene.pick(event.layerX, event.layerY);

        if (sendEvent == false) {
            return result;
        } else {
            var event = new BABYLON.Editor.Event();
            event.eventType = BABYLON.Editor.EventType.SceneEvent;
            event.event = new BABYLON.Editor.Event.SceneEvent();
            event.event.eventType = BABYLON.Editor.Event.SceneEvent.OBJECT_PICKED;
            event.event.object = result.pickedMesh;
            this.sendEvent(event);
        }
    }

    Core.prototype.executeScript = function (path, onPreExec, onPostExec) {

        BABYLON.Tools.LoadFile(path, function (result) {
            if (onPreExec != null)
                onPreExec();

            eval(result);

            if (onPostExec != null)
                onPostExec();
        });

    }

    return Core;
})();

BABYLON.Editor.Core = Core;

})(BABYLON.Editor || (BABYLON.Editor = {})); /// End namespace Editor
})(BABYLON || (BABYLON = {})); /// End namespace BABYLON