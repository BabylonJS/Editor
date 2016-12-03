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
            EventType[EventType["KEY_EVENT"] = 2] = "KEY_EVENT";
            EventType[EventType["UNKNOWN"] = 3] = "UNKNOWN";
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
            GUIEventType[GUIEventType["TAB_CLOSED"] = 7] = "TAB_CLOSED";
            GUIEventType[GUIEventType["TOOLBAR_MENU_SELECTED"] = 8] = "TOOLBAR_MENU_SELECTED";
            GUIEventType[GUIEventType["GRAPH_MENU_SELECTED"] = 9] = "GRAPH_MENU_SELECTED";
            GUIEventType[GUIEventType["GRID_SELECTED"] = 10] = "GRID_SELECTED";
            GUIEventType[GUIEventType["GRID_ROW_REMOVED"] = 11] = "GRID_ROW_REMOVED";
            GUIEventType[GUIEventType["GRID_ROW_ADDED"] = 12] = "GRID_ROW_ADDED";
            GUIEventType[GUIEventType["GRID_ROW_EDITED"] = 13] = "GRID_ROW_EDITED";
            GUIEventType[GUIEventType["GRID_ROW_CHANGED"] = 14] = "GRID_ROW_CHANGED";
            GUIEventType[GUIEventType["GRID_MENU_SELECTED"] = 15] = "GRID_MENU_SELECTED";
            GUIEventType[GUIEventType["GRID_RELOADED"] = 16] = "GRID_RELOADED";
            GUIEventType[GUIEventType["WINDOW_BUTTON_CLICKED"] = 17] = "WINDOW_BUTTON_CLICKED";
            GUIEventType[GUIEventType["OBJECT_PICKED"] = 18] = "OBJECT_PICKED";
            GUIEventType[GUIEventType["DOCUMENT_CLICK"] = 19] = "DOCUMENT_CLICK";
            GUIEventType[GUIEventType["DOCUMENT_UNCLICK"] = 20] = "DOCUMENT_UNCLICK";
            GUIEventType[GUIEventType["DOCUMENT_KEY_DOWN"] = 21] = "DOCUMENT_KEY_DOWN";
            GUIEventType[GUIEventType["DOCUMENT_KEY_UP"] = 22] = "DOCUMENT_KEY_UP";
            GUIEventType[GUIEventType["UNKNOWN"] = 23] = "UNKNOWN";
        })(EDITOR.GUIEventType || (EDITOR.GUIEventType = {}));
        var GUIEventType = EDITOR.GUIEventType;
        (function (SceneEventType) {
            SceneEventType[SceneEventType["OBJECT_PICKED"] = 0] = "OBJECT_PICKED";
            SceneEventType[SceneEventType["OBJECT_ADDED"] = 1] = "OBJECT_ADDED";
            SceneEventType[SceneEventType["OBJECT_REMOVED"] = 2] = "OBJECT_REMOVED";
            SceneEventType[SceneEventType["OBJECT_CHANGED"] = 3] = "OBJECT_CHANGED";
            SceneEventType[SceneEventType["NEW_SCENE_CREATED"] = 4] = "NEW_SCENE_CREATED";
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
        }());
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
        }(BaseEvent));
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
        }(BaseEvent));
        EDITOR.GUIEvent = GUIEvent;
        /**
        * Key Event
        */
        var KeyEvent = (function (_super) {
            __extends(KeyEvent, _super);
            function KeyEvent(key, control, shift, isDown, data) {
                _super.call(this, data);
                this.key = key;
                this.control = control;
                this.shift = shift;
                this.isDown = isDown;
            }
            return KeyEvent;
        }(BaseEvent));
        EDITOR.KeyEvent = KeyEvent;
        /**
        * IEvent implementation
        */
        var Event = (function () {
            function Event() {
                this.eventType = EventType.UNKNOWN;
                this.sceneEvent = null;
                this.guiEvent = null;
                this.keyEvent = null;
            }
            Event.sendSceneEvent = function (object, type, core) {
                var ev = new Event();
                ev.eventType = EventType.SCENE_EVENT;
                ev.sceneEvent = new SceneEvent(object, type);
                core.sendEvent(ev);
            };
            Event.sendGUIEvent = function (object, type, core, data) {
                var ev = new Event();
                ev.eventType = EventType.GUI_EVENT;
                ev.guiEvent = new GUIEvent(object, type, data);
                core.sendEvent(ev);
            };
            Event.sendKeyEvent = function (key, control, shift, isDown, core, data) {
                var ev = new Event();
                ev.eventType = EventType.KEY_EVENT;
                ev.keyEvent = new KeyEvent(key, control, shift, isDown, data);
                core.sendEvent(ev);
            };
            return Event;
        }());
        EDITOR.Event = Event;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.event.js.map
