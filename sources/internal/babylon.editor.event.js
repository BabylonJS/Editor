var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        /**
        * Event Type
        */
        (function (EventType) {
            EventType[EventType["SCENE_EVENT"] = 0] = "SCENE_EVENT";
            EventType[EventType["GUI_EVENT"] = 1] = "GUI_EVENT";
            EventType[EventType["UNKNOWN"] = 2] = "UNKNOWN";
        })(EDITOR.EventType || (EDITOR.EventType = {}));
        var EventType = EDITOR.EventType;
        (function (GUIEventType) {
            GUIEventType[GUIEventType["FORM_CHANGED"] = 0] = "FORM_CHANGED";
            GUIEventType[GUIEventType["LAYOUT_CHANGED"] = 1] = "LAYOUT_CHANGED";
            GUIEventType[GUIEventType["PANEL_CHANGED"] = 2] = "PANEL_CHANGED";
            GUIEventType[GUIEventType["UNKNOWN"] = 3] = "UNKNOWN";
        })(EDITOR.GUIEventType || (EDITOR.GUIEventType = {}));
        var GUIEventType = EDITOR.GUIEventType;
        (function (SceneEventType) {
            SceneEventType[SceneEventType["OBJECT_PICKED"] = 0] = "OBJECT_PICKED";
            SceneEventType[SceneEventType["OBJECT_ADDED"] = 1] = "OBJECT_ADDED";
            SceneEventType[SceneEventType["OBJECT_REMOVED"] = 2] = "OBJECT_REMOVED";
            SceneEventType[SceneEventType["OBJECT_CHANGED"] = 3] = "OBJECT_CHANGED";
            SceneEventType[SceneEventType["UNKNOWN"] = 4] = "UNKNOWN";
        })(EDITOR.SceneEventType || (EDITOR.SceneEventType = {}));
        var SceneEventType = EDITOR.SceneEventType;
        /**
        * Scene Event
        */
        var SceneEvent = (function () {
            /**
            * Constructor
            * @param object: the object generating the event
            */
            function SceneEvent(object, eventType) {
                this.object = object;
                this.eventType = eventType;
            }
            return SceneEvent;
        })();
        EDITOR.SceneEvent = SceneEvent;
        /**
        * GUI Event
        */
        var GUIEvent = (function () {
            /**
            * Constructor
            * @param caller: gui element calling the event
            * @param eventType: the gui event type
            */
            function GUIEvent(caller, eventType) {
                this.caller = caller;
                this.eventType = eventType;
            }
            return GUIEvent;
        })();
        EDITOR.GUIEvent = GUIEvent;
        /**
        * IEvent implementation
        */
        var Event = (function () {
            function Event() {
                this.eventType = EventType.UNKNOWN;
                this.sceneEvent = null;
                this.guiEvent = null;
            }
            return Event;
        })();
        EDITOR.Event = Event;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
