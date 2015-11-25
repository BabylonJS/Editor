declare module BABYLON.EDITOR {
    /**
    * Event Type
    */
    enum EventType {
        SCENE_EVENT = 0,
        GUI_EVENT = 1,
        UNKNOWN = 2,
    }
    enum GUIEventType {
        FORM_CHANGED = 0,
        LAYOUT_CHANGED = 1,
        PANEL_CHANGED = 2,
        UNKNOWN = 3,
    }
    enum SceneEventType {
        OBJECT_PICKED = 0,
        OBJECT_ADDED = 1,
        OBJECT_REMOVED = 2,
        OBJECT_CHANGED = 3,
        UNKNOWN = 4,
    }
    /**
    * Scene Event
    */
    class SceneEvent {
        object: any;
        eventType: SceneEventType;
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
        caller: GUI.GUIElement;
        eventType: GUIEventType;
        /**
        * Constructor
        * @param caller: gui element calling the event
        * @param eventType: the gui event type
        */
        constructor(caller: GUI.GUIElement, eventType: number);
    }
    /**
    * IEvent implementation
    */
    class Event implements IEvent {
        eventType: EventType;
        sceneEvent: SceneEvent;
        guiEvent: GUIEvent;
    }
}
