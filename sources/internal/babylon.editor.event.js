var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
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
            GUIEventType[GUIEventType["FORM_TOOLBAR_CLICKED"] = 1] = "FORM_TOOLBAR_CLICKED";
            GUIEventType[GUIEventType["LAYOUT_CHANGED"] = 2] = "LAYOUT_CHANGED";
            GUIEventType[GUIEventType["PANEL_CHANGED"] = 3] = "PANEL_CHANGED";
            GUIEventType[GUIEventType["GRAPH_SELECTED"] = 4] = "GRAPH_SELECTED";
            GUIEventType[GUIEventType["GRAPH_DOUBLE_SELECTED"] = 5] = "GRAPH_DOUBLE_SELECTED";
            GUIEventType[GUIEventType["TAB_CHANGED"] = 6] = "TAB_CHANGED";
            GUIEventType[GUIEventType["TOOLBAR_MENU_SELECTED"] = 7] = "TOOLBAR_MENU_SELECTED";
            GUIEventType[GUIEventType["GRAPH_MENU_SELECTED"] = 8] = "GRAPH_MENU_SELECTED";
            GUIEventType[GUIEventType["GRID_SELECTED"] = 9] = "GRID_SELECTED";
            GUIEventType[GUIEventType["GRID_ROW_REMOVED"] = 10] = "GRID_ROW_REMOVED";
            GUIEventType[GUIEventType["GRID_ROW_ADDED"] = 11] = "GRID_ROW_ADDED";
            GUIEventType[GUIEventType["GRID_ROW_EDITED"] = 12] = "GRID_ROW_EDITED";
            GUIEventType[GUIEventType["GRID_ROW_CHANGED"] = 13] = "GRID_ROW_CHANGED";
            GUIEventType[GUIEventType["GRID_MENU_SELECTED"] = 14] = "GRID_MENU_SELECTED";
            GUIEventType[GUIEventType["GRID_RELOADED"] = 15] = "GRID_RELOADED";
            GUIEventType[GUIEventType["WINDOW_BUTTON_CLICKED"] = 16] = "WINDOW_BUTTON_CLICKED";
            GUIEventType[GUIEventType["OBJECT_PICKED"] = 17] = "OBJECT_PICKED";
            GUIEventType[GUIEventType["UNKNOWN"] = 18] = "UNKNOWN";
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
        * Base Event
        */
        var BaseEvent = (function () {
            function BaseEvent(data) {
                this.data = data;
            }
            return BaseEvent;
        })();
        EDITOR.BaseEvent = BaseEvent;
        /**
        * Scene Event
        */
        var SceneEvent = (function (_super) {
            __extends(SceneEvent, _super);
            /**
            * Constructor
            * @param object: the object generating the event
            */
            function SceneEvent(object, eventType, data) {
                _super.call(this, data);
                this.object = object;
                this.eventType = eventType;
            }
            return SceneEvent;
        })(BaseEvent);
        EDITOR.SceneEvent = SceneEvent;
        /**
        * GUI Event
        */
        var GUIEvent = (function (_super) {
            __extends(GUIEvent, _super);
            /**
            * Constructor
            * @param caller: gui element calling the event
            * @param eventType: the gui event type
            */
            function GUIEvent(caller, eventType, data) {
                _super.call(this, data);
                this.caller = caller;
                this.eventType = eventType;
            }
            return GUIEvent;
        })(BaseEvent);
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
            Event.sendSceneEvent = function (object, type, core) {
                var ev = new Event();
                ev.eventType = EventType.SCENE_EVENT;
                ev.sceneEvent = new SceneEvent(object, type);
                core.sendEvent(ev);
            };
            Event.sendGUIEvent = function (object, type, core) {
                var ev = new Event();
                ev.eventType = EventType.GUI_EVENT;
                ev.guiEvent = new GUIEvent(object, type);
                core.sendEvent(ev);
            };
            return Event;
        })();
        EDITOR.Event = Event;
        /**
        * Statics
        */
        /**
        * Sends a scene event
        */
        var sendSceneEvent = function (object, type, core) {
            var ev = new Event();
            ev.eventType = EventType.SCENE_EVENT;
            ev.sceneEvent = new SceneEvent(object, type);
            core.sendEvent(ev);
        };
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
