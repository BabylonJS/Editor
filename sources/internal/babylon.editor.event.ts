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
        LAYOUT_CHANGED = 1,
        PANEL_CHANGED = 2,
        GRAPH_SELECTED = 3,
        TAB_CHANGED = 4,
        TOOLBAR_MENU_SELECTED = 5,
        GRAPH_MENU_SELECTED = 6,

        GRID_SELECTED = 7,
        GRID_ROW_REMOVED = 8,
        GRID_ROW_ADDED = 9,
        GRID_ROW_EDITED = 10,

        WINDOW_BUTTON_CLICKED = 11,

        UNKNOWN = 12
    }

    export enum SceneEventType {
        OBJECT_PICKED = 0,
        OBJECT_ADDED = 1,
        OBJECT_REMOVED = 2,
        OBJECT_CHANGED = 3,

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
        constructor(caller: GUI.GUIElement, eventType: number, data?: Object)
        {
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

        static sendSceneEvent(object: any, type: SceneEventType, core: EditorCore): void {
            var ev = new Event();

            ev.eventType = EventType.SCENE_EVENT;
            ev.sceneEvent = new SceneEvent(object, type);

            core.sendEvent(ev);
        }

        static sendGUIEvent(object: any, type: GUIEventType, core: EditorCore): void {
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
