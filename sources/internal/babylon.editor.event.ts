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

        UNKNOWN = 3
    }

    export enum SceneEventType {
        OBJECT_PICKED = 0,
        OBJECT_ADDED = 1,
        OBJECT_REMOVED = 2,
        OBJECT_CHANGED = 3,

        UNKNOWN = 4
    }

    /**
    * Scene Event
    */
    export class SceneEvent {
        public object: any;
        public eventType: SceneEventType;

        /**
        * Constructor
        * @param object: the object generating the event
        */
        constructor(object: any, eventType: number) {
            this.object = object;
            this.eventType = eventType
        }
    }

    /**
    * GUI Event
    */
    export class GUIEvent {
        public caller: GUI.GUIElement;
        public eventType: GUIEventType;

        /**
        * Constructor
        * @param caller: gui element calling the event
        * @param eventType: the gui event type
        */
        constructor(caller: GUI.GUIElement, eventType: number)
        {
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
    }
}
