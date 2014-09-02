/// <reference path="./../index.html" />

/* 

Core class that handles core functions,
custom events management...

*/

function BabylonEditorCore(engine) {

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

    this.engine = null;
    this.currentScene = null;
    this.transformer = null;
}

BabylonEditorCore.prototype.update = function () {
    for (var i = 0; i < this.customUpdates.length; i++) {
        this.customUpdates[i].update();
    }
}

/// Sends the event "event" to all other event receivers
BabylonEditorCore.prototype.sendEvent = function (event) {
    for (var i = 0; i < this.eventReceivers.length; i++) {
        this.eventReceivers[i].onEvent(event);
    }
}

BabylonEditorCore.prototype.getPickedMesh = function (event, sendEvent) {
    if (!this.currentScene) return null;

    var result = this.currentScene.pick(event.layerX, event.layerY);

    if (sendEvent == false) {
        return result;
    } else {
        var event = BabylonEditorEvent;
        event.EventType = BabylonEditorEventType.SceneEvent;
        event.SceneEvent.Type = BabylonEditorEvents.SceneEvents.ObjectPicked;
        event.SceneEvent.UserData = { mesh: result.pickedMesh };
        this.sendEvent(event);
    }
}
