/* 

File defining events structures

Build an event (example with a picked mesh) :
var ev = new BABYLON.Editor.Event();
ev.eventType = BABYLON.Editor.EventType.GUIEvent;
ev.event = new BABYLON.Editor.Event.GUIEvent();
ev.event.eventType = BABYLON.Editor.Event.GUIEvent.TOOLBAR_SELECTED;
ev.event.caller = this.toolbar;
this.core.sendEvent(ev);

Work the received event :
MyTool.prototype.onEvent = function(ev) {
    if (ev.EventType == BABYLON.Editor.EventType.SceneEvent) {
        if (ev.event.eventType == BABYLON.Editor.SceneEvent.OBJECT_PICKED) {
            console.log('event successfuly analyzed');
        }
    }
}

*/

var BABYLON;
(function (BABYLON) { /// namespace BABYLON
var Editor;
(function (Editor) { /// namespace Editor

var Event = (function () {

    /// Gui event
    function GUIEvent() {
        this.eventType = null;
        this.caller = null;
        this.result = null;

        BABYLON.Editor.Event.GUIEvent.GRAPH_CHANGED = 0;
        BABYLON.Editor.Event.GUIEvent.FORM_CHANGED = 1;
        BABYLON.Editor.Event.GUIEvent.TOOLBAR_SELECTED = 2;
        BABYLON.Editor.Event.GUIEvent.CONFIRM_DIALOG = 3;
        BABYLON.Editor.Event.GUIEvent.DIALOG_BUTTON_CLICKED = 4;
        BABYLON.Editor.Event.GUIEvent.FILE_SELECTED = 5;
        BABYLON.Editor.Event.GUIEvent.GRID_SELECTED = 6;
    }

    /// Scene event
    function SceneEvent() {
        this.eventType = null;
        this.object = null;

        BABYLON.Editor.Event.SceneEvent.OBJECT_PICKED = 0;
        BABYLON.Editor.Event.SceneEvent.OBJECT_ADDED = 1;
        BABYLON.Editor.Event.SceneEvent.OBJECT_REMOVED = 2;
        BABYLON.Editor.Event.SceneEvent.OBJECT_CHANGED = 3;
    }

    /// Event
    function Event() {
        this.eventType = null;
        this.event = null;
    }

    return {
        Event: Event,
        GUIEvent: GUIEvent,
        SceneEvent: SceneEvent,
        EventType: {
            GUIEvent: 0,
            SceneEvent: 1,
        },
    }

})();

BABYLON.Editor.Event = Event.Event;
BABYLON.Editor.Event.GUIEvent = Event.GUIEvent;
BABYLON.Editor.Event.SceneEvent = Event.SceneEvent;
BABYLON.Editor.EventType = Event.EventType;

})(BABYLON.Editor || (BABYLON.Editor = {})); /// End namespace Editor
})(BABYLON || (BABYLON = {})); /// End namespace BABYLON