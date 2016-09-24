module BABYLON.EDITOR {
    /**
    * Event Type
    */
    export enum EventType {
        SCENE_EVENT = 0,
        GUI_EVENT = 1,

        UNKNOWN = 2
    }

    export enum GUIEventType {
        FORM_CHANGED = 0,
        FORM_TOOLBAR_CLICKED = 1,
        LAYOUT_CHANGED = 2,
        PANEL_CHANGED = 3,
        GRAPH_SELECTED = 4,
        GRAPH_DOUBLE_SELECTED = 5,
        TAB_CHANGED = 6,
        TAB_CLOSED = 7,
        TOOLBAR_MENU_SELECTED = 8,
        GRAPH_MENU_SELECTED = 9,

        GRID_SELECTED = 10,
        GRID_ROW_REMOVED = 11,
        GRID_ROW_ADDED = 12,
        GRID_ROW_EDITED = 13,
        GRID_ROW_CHANGED = 14,
        GRID_MENU_SELECTED = 15,
        GRID_RELOADED = 16,

        WINDOW_BUTTON_CLICKED = 17,

        OBJECT_PICKED = 18,

        UNKNOWN = 19
    }

    export enum SceneEventType {
        OBJECT_PICKED = 0,
        OBJECT_ADDED = 1,
        OBJECT_REMOVED = 2,
        OBJECT_CHANGED = 3,
        
        NEW_SCENE_CREATED = 4,

        UNKNOWN = 4
    }

    /**
    * Base Event
    */
    export class BaseEvent {
        public data: any;

        constructor(data?: Object) {
            this.data = data;
        }
    }

    /**
    * Scene Event
    */
    export class SceneEvent extends BaseEvent {
        public object: any;
        public eventType: SceneEventType;

        /**
        * Constructor
        * @param object: the object generating the event
        */
        constructor(object: any, eventType: number, data?: Object) {
            super(data);

            this.object = object;
            this.eventType = eventType
        }
    }

    /**
    * GUI Event
    */
    export class GUIEvent extends BaseEvent {
        public caller: GUI.IGUIElement;
        public eventType: GUIEventType;

        /**
        * Constructor
        * @param caller: gui element calling the event
        * @param eventType: the gui event type
        */
        constructor(caller: GUI.GUIElement<W2UI.IElement>, eventType: number, data?: Object) {
            super(data);

            this.caller = caller;
            this.eventType = eventType;
        }
    }

    /**
    * IEvent implementation
    */
    export class Event implements IEvent {
        public eventType: EventType = EventType.UNKNOWN;

        public sceneEvent: SceneEvent = null;
        public guiEvent: GUIEvent = null;

        public static sendSceneEvent(object: any, type: SceneEventType, core: EditorCore): void {
            var ev = new Event();

            ev.eventType = EventType.SCENE_EVENT;
            ev.sceneEvent = new SceneEvent(object, type);

            core.sendEvent(ev);
        }

        public static sendGUIEvent(object: any, type: GUIEventType, core: EditorCore): void {
            var ev = new Event();

            ev.eventType = EventType.GUI_EVENT;
            ev.guiEvent = new GUIEvent(object, type);

            core.sendEvent(ev);
        }
    }

    /**
    * Statics
    */

    /**
    * Sends a scene event
    */
    var sendSceneEvent = (object: any, type: SceneEventType, core: EditorCore) => {
        var ev = new Event();

        ev.eventType = EventType.SCENE_EVENT;
        ev.sceneEvent = new SceneEvent(object, type);

        core.sendEvent(ev);
    };
}
