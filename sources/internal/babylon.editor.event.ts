module BABYLON.EDITOR {
    /**
    * Event Type
    */
    export class EventType {
        private static _SCENE_EVENT = 0;
        private static _GUI_EVENT = 1;

        public static get SCENE_EVENT(): number {
            return EventType._SCENE_EVENT;
        }
        public static get GUI_EVENT(): number {
            return EventType._GUI_EVENT;
        }
    }

    /**
    * Scene Event
    */
    export class SceneEvent {
        private static _OBJECT_PICKED = 0;
        private static _OBJECT_ADDED = 1;
        private static _OBJECT_REMOVED = 2;
        private static _OBJECT_CHANGED = 3;

        public static get OBJECT_PICKED(): number {
            return SceneEvent._OBJECT_PICKED;
        }
        public static get OBJECT_ADDED(): number {
            return SceneEvent._OBJECT_ADDED;
        }
        public static get OBJECT_REMOVED(): number {
            return SceneEvent._OBJECT_REMOVED;
        }
        public static get OBJECT_CHANGED(): number {
            return SceneEvent._OBJECT_CHANGED;
        }

        public object: any;
        public eventType: number;
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
        private static _EVENT_CHANGED = 0;

        public static get EVENT_CHANGED(): number {
            return GUIEvent._EVENT_CHANGED;
        }

        public caller: GUI.GUIElement;
        public eventType: number;
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
    * IEvent interface
    */
    export class Event implements IEvent {
        public eventType: number = null;

        public sceneEvent: SceneEvent = null;
        public guiEvent: GUIEvent = null;
    }
}