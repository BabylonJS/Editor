var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        /**
        * Event Type
        */
        var EventType = (function () {
            function EventType() {
            }
            Object.defineProperty(EventType, "SCENE_EVENT", {
                get: function () {
                    return EventType._SCENE_EVENT;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(EventType, "GUI_EVENT", {
                get: function () {
                    return EventType._GUI_EVENT;
                },
                enumerable: true,
                configurable: true
            });
            EventType._SCENE_EVENT = 0;
            EventType._GUI_EVENT = 1;
            return EventType;
        })();
        EDITOR.EventType = EventType;
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
            Object.defineProperty(SceneEvent, "OBJECT_PICKED", {
                get: function () {
                    return SceneEvent._OBJECT_PICKED;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SceneEvent, "OBJECT_ADDED", {
                get: function () {
                    return SceneEvent._OBJECT_ADDED;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SceneEvent, "OBJECT_REMOVED", {
                get: function () {
                    return SceneEvent._OBJECT_REMOVED;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SceneEvent, "OBJECT_CHANGED", {
                get: function () {
                    return SceneEvent._OBJECT_CHANGED;
                },
                enumerable: true,
                configurable: true
            });
            SceneEvent._OBJECT_PICKED = 0;
            SceneEvent._OBJECT_ADDED = 1;
            SceneEvent._OBJECT_REMOVED = 2;
            SceneEvent._OBJECT_CHANGED = 3;
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
            Object.defineProperty(GUIEvent, "EVENT_CHANGED", {
                get: function () {
                    return GUIEvent._EVENT_CHANGED;
                },
                enumerable: true,
                configurable: true
            });
            GUIEvent._EVENT_CHANGED = 0;
            return GUIEvent;
        })();
        EDITOR.GUIEvent = GUIEvent;
        /**
        * IEvent interface
        */
        var Event = (function () {
            function Event() {
                this.eventType = null;
                this.sceneEvent = null;
                this.guiEvent = null;
            }
            return Event;
        })();
        EDITOR.Event = Event;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
