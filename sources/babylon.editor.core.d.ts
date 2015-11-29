declare module BABYLON.EDITOR {
    class EditorCore implements ICustomUpdate, IDisposable {
        engine: Engine;
        canvas: HTMLCanvasElement;
        camera: Camera;
        scenes: Array<ICustomScene>;
        currentScene: Scene;
        updates: Array<ICustomUpdate>;
        eventReceivers: Array<IEventReceiver>;
        editor: EditorMain;
        /**
        * Constructor
        * @param canvasID: the id of the canvas to render the editor scenes
        */
        constructor();
        /**
        * On pre update
        */
        onPreUpdate(): void;
        /**
        * On post update
        */
        onPostUpdate(): void;
        /**
        * Send an event to the event receivers
        */
        sendEvent(event: IEvent): void;
        /**
        * IDisposable
        */
        dispose(): void;
    }
}
