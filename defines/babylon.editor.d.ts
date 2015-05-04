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
    { }

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
        * DOM element ID to create
        */
        containers: Array<string>;
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
        update(): void;
        /**
        * Apply values to object
        */
        apply(): void;
    }
}
