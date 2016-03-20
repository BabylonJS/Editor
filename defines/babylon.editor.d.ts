declare module BABYLON.EDITOR {
    /**
    * Custom Update Interface
    */
    interface ICustomUpdate {
        /**
        * Called before rendering the scene(s)
        */
        onPreUpdate(): void;
        /**
        * Called after the scene(s) was rendered
        */
        onPostUpdate(): void;
    }

    /**
    * Custom Scenes
    */
    interface ICustomScene {
        /**
        * If render the scene or not
        */
        render: boolean;
        /**
        * The scene to render
        */
        scene: Scene;
    }

    /**
    * IEvent interface
    */
    interface IEvent
    {
        eventType: EventType;

        // GUI
        guiEvent: GUIEvent;

        // Scene
        sceneEvent: SceneEvent;
    }

    /**
    * Event Receiver interface
    */
    interface IEventReceiver {
        onEvent(event: IEvent): boolean;
    }

    /**
    * Custom Edition Tools
    */
    interface ICustomEditionTool {
        /**
        * The object to modify
        */
        object: Object;

        /**
        * DOM element ID to create
        */
        containers: Array<string>;
        /**
        * Tabs ids
        */
        tab: string;
        /**
        * Returns if the object is supported by the tool
        */
        isObjectSupported(object: any): boolean;
        /**
        * Creates the tool's UI
        */
        createUI(): void;
        /**
        * Update forms
        */
        update(): boolean;
        /**
        * Apply values to object
        */
        apply(): void;
        /**
        *
        */
        resize(): void;
    }

    /**
    * Custom main toolbar plugin
    */
    interface ICustomToolbarMenu {
        /**
        * The ID of the menu
        */
        menuID: string;

        /**
        * Called when a menu item is selected by the user
        * Returns true if a menu of the plugin was selected, false if no one selected
        * @param selected: the id of the selected menu item
        */
        onMenuItemSelected(selected: string): void;
    }
}
