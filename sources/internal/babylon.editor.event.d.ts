declare module BABYLON.EDITOR {
    /**
    * Event Type
    */
    class EventType {
        private static _SCENE_EVENT;
        private static _GUI_EVENT;
        static SCENE_EVENT: number;
        static GUI_EVENT: number;
    }
    /**
    * Scene Event
    */
    class SceneEvent {
        private static _OBJECT_PICKED;
        private static _OBJECT_ADDED;
        private static _OBJECT_REMOVED;
        private static _OBJECT_CHANGED;
        static OBJECT_PICKED: number;
        static OBJECT_ADDED: number;
        static OBJECT_REMOVED: number;
        static OBJECT_CHANGED: number;
        object: any;
        eventType: number;
        /**
        * Constructor
        * @param object: the object generating the event
        */
        constructor(object: any, eventType: number);
    }
    /**
    * GUI Event
    */
    class GUIEvent {
        private static _EVENT_CHANGED;
        static EVENT_CHANGED: number;
        caller: GUI.GUIElement;
        eventType: number;
        /**
        * Constructor
        * @param caller: gui element calling the event
        * @param eventType: the gui event type
        */
        constructor(caller: GUI.GUIElement, eventType: number);
    }
    /**
    * IEvent interface
    */
    class Event implements IEvent {
        eventType: number;
        sceneEvent: SceneEvent;
        guiEvent: GUIEvent;
    }
}
