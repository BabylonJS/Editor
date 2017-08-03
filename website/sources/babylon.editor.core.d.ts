declare module BABYLON.EDITOR {
    class EditorCore implements ICustomUpdate, IDisposable {
        engine: Engine;
        canvas: HTMLCanvasElement;
        camera: ArcRotateCamera;
        playCamera: Camera;
        isPlaying: boolean;
        scenes: Array<ICustomScene>;
        currentScene: Scene;
        scene2d: Scene;
        updates: Array<ICustomUpdate>;
        eventReceivers: Array<IEventReceiver>;
        editor: EditorMain;
        /**
        * Constructor
        */
        constructor();
        /**
        * Removes a scene
        */
        removeScene(scene: Scene): boolean;
        /**
        * Removes an event receiver
        */
        removeEventReceiver(receiver: IEventReceiver): boolean;
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
         * Emits an event to the event emitters
         */
        emitEvent<T>(event: EventEmitter<T>): void;
        /**
        * IDisposable
        */
        dispose(): void;
    }
}
