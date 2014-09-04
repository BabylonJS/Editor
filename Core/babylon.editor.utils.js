/// <reference path="./../index.html" />

/*

*/

var BABYLON;
(function (BABYLON) { /// namespace BABYLON
var Editor;
(function (Editor) { /// namespace Editor

var Utils = (function () {

    /* UI utils */
    Utils = Utils || {};

    Utils.clearSideBar = function (sideBar) {
        /// Code taken from w2ui website (w2ui.com)
        var toRemove = [];
        for (var i = 0; i < sideBar.nodes.length; i++) {
            toRemove.push(sideBar.nodes[i].id);
        }
        sideBar.remove.apply(sideBar, toRemove);
    }

    /* Parsers */
    Utils.toFloat = function (string) {
        return parseFloat(string.replace(',', '.'));
    }

    /* Core utils */
    /// To Add

    /* Events utils */
    Utils.sendEventObjectAdded = function (object, core) {
        var ev = new BABYLON.Editor.Event();
        ev.eventType = BABYLON.Editor.EventType.SceneEvent;
        ev.event = new BABYLON.Editor.Event.SceneEvent();
        ev.event.eventType = BABYLON.Editor.Event.SceneEvent.OBJECT_ADDED;
        ev.event.object = object;
        core.sendEvent(ev);
    }

    Utils.sendEventObjectRemoved = function (object, core) {
        var ev = new BABYLON.Editor.Event();
        ev.eventType = BABYLON.Editor.EventType.SceneEvent;
        ev.event = new BABYLON.Editor.Event.SceneEvent();
        ev.event.eventType = BABYLON.Editor.Event.SceneEvent.OBJECT_REMOVED;
        ev.event.object = object;
        core.sendEvent(ev);
    }

    return Utils;

})();

BABYLON.Editor.Utils = Utils;

})(BABYLON.Editor || (BABYLON.Editor = {})); /// End namespace Editor
})(BABYLON || (BABYLON = {})); /// End namespace BABYLON