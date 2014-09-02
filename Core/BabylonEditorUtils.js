/// <reference path="./../index.html" />

/*

*/

var BabylonEditorUtils = BabylonEditorUtils || {}

/* UI utils */

BabylonEditorUtils.clearSideBar = function (sideBar) {
    /// Code taken from w2ui website (w2ui.com)
    var toRemove = [];
    for (var i=0; i < sideBar.nodes.length; i++) {
        toRemove.push(sideBar.nodes[i].id);
    }
    sideBar.remove.apply(sideBar, toRemove);
}

/* Parsers */
BabylonEditorUtils.toFloat = function (string) {
    return parseFloat(string.replace(',', '.'));
}

/* Core utils */
/// To Add

/* Events utils */
BabylonEditorUtils.sendEventObjectAdded = function (object, core) {
    var event = BabylonEditorEvent;
    event.EventType = BabylonEditorEventType.SceneEvent;
    event.SceneEvent.Type = BabylonEditorEvents.SceneEvents.ObjectAdded;
    event.SceneEvent.UserData = { mesh: object };
    core.sendEvent(event);
}

BabylonEditorUtils.sendEventObjectRemoved = function (object, core) {
    var event = BabylonEditorEvent;
    event.EventType = BabylonEditorEventType.SceneEvent;
    event.SceneEvent.Type = BabylonEditorEvents.SceneEvents.ObjectRemoved;
    event.SceneEvent.UserData = { mesh: object };
    core.sendEvent(event);
}
