declare module BABYLON.EDITOR {
    /**
    * Event Type
    */
    enum EventType {
        SCENE_EVENT = 0,
        GUI_EVENT = 1,
        KEY_EVENT = 2,
        UNKNOWN = 3,
    }
    enum GUIEventType {
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
        DOCUMENT_CLICK = 19,
        DOCUMENT_UNCLICK = 20,
        DOCUMENT_KEY_DOWN = 21,
        DOCUMENT_KEY_UP = 22,
        UNKNOWN = 23,
    }
    enum SceneEventType {
        OBJECT_PICKED = 0,
        OBJECT_ADDED = 1,
        OBJECT_REMOVED = 2,
        OBJECT_CHANGED = 3,
        NEW_SCENE_CREATED = 4,
        UNKNOWN = 4,
    }
    /**
    * Base Event
    */
    class BaseEvent {
        data: any;
        constructor(data?: Object);
    }
    /**
    * Scene Event
    */
    class SceneEvent extends BaseEvent {
        object: any;
        eventType: SceneEventType;
        /**
        * Constructor
        * @param object: the object generating the event
        */
        constructor(object: any, eventType: number, data?: Object);
    }
    /**
    * GUI Event
    */
    class GUIEvent extends BaseEvent {
        caller: GUI.IGUIElement;
        eventType: GUIEventType;
        /**
        * Constructor
        * @param caller: gui element calling the event
        * @param eventType: the gui event type
        */
        constructor(caller: GUI.IGUIElement, eventType: number, data?: Object);
    }
    /**
    * Key Event
    */
    class KeyEvent extends BaseEvent {
        key: string;
        control: boolean;
        isDown: boolean;
        constructor(key: string, control: boolean, isDown: boolean, data?: Object);
    }
    /**
    * IEvent implementation
    */
    class Event implements IEvent {
        eventType: EventType;
        sceneEvent: SceneEvent;
        guiEvent: GUIEvent;
        keyEvent: KeyEvent;
        static sendSceneEvent(object: any, type: SceneEventType, core: EditorCore): void;
        static sendGUIEvent(object: GUI.IGUIElement, type: GUIEventType, core: EditorCore, data?: any): void;
        static sendKeyEvent(key: string, control: boolean, isDown: boolean, core: EditorCore, data?: any): void;
    }
}
